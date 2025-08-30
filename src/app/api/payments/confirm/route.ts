import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { confirmPayment } from '../../../../lib/mock-db';

const USE_DB = !!process.env.MONGODB_URI;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { idempotencyKey, orderId, orderToken, paymentSession, items, shipping, address, paymentMethod } = body as any;

  if (!USE_DB) {
    if (paymentSession && items) {
      // Create order at payment confirmation time
      const created = (await import('../../../../lib/mock-db')).createOrderFromPayment({ items, shipping, address, paymentMethod, idempotencyKey });
      return NextResponse.json({ success: true, order: created.order });
    }
    const result = confirmPayment({ orderId, orderToken, idempotencyKey });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, order: result.order });
  }

  try {
    const { connectToDB } = await import('../../../../lib/mongodb');
    const { getOrderModel } = await import('../../../../models/Order');
    const { getOrderTokenModel } = await import('../../../../models/OrderToken');
    await connectToDB();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();
    const { getProductModel } = await import('../../../../models/Product');
    const mongoose = await import('mongoose');
    const ObjectId = (await import('mongodb')).ObjectId;

    // If request contains paymentSession + items, create the order atomically (idempotent)
    if (paymentSession && items) {
      // idempotency: if already processed, return existing
      if (idempotencyKey) {
        const existing = await Order.findOne({ 'metadata.idempotencyKey': idempotencyKey }).lean();
        if (existing) return NextResponse.json({ success: true, order: existing });
      }

      const Product = getProductModel();
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // decrement stock
        for (const it of items) {
          const pid = it.productId;
          const qty = Number(it.qty || it.quantity || 0);
          if (!qty || qty <= 0) throw new Error('Invalid qty');
          const res = await Product.updateOne({ _id: new ObjectId(pid), stock: { $gte: qty } }, { $inc: { stock: -qty } }, { session });
          if (res.modifiedCount === 0) {
            await session.abortTransaction();
            return NextResponse.json({ error: 'Insufficient stock for product ' + pid }, { status: 409 });
          }
        }

        const subtotal = items.reduce((s: number, it: any) => s + (Number(it.lineTotal ?? (it.unitPrice * it.qty)) || 0), 0);
        const shippingPrice = Number(shipping?.price || 0);
        const total = subtotal + shippingPrice + (Number((address && address.tax) || 0) || 0);

        const orderDoc: any = {
          items: items.map((it: any) => ({ productId: new ObjectId(it.productId), name: it.name || it.title || '', qty: Number(it.qty), unitPrice: Number(it.unitPrice), lineTotal: Number(it.lineTotal) })),
          amounts: { subtotal, shipping: shippingPrice, tax: Number((address && address.tax) || 0), total },
          payment: { method: paymentMethod || 'yape', providerId: paymentSession, status: 'succeeded', approvedAt: new Date() },
          status: 'paid',
          user: { email: address?.email || '', name: address?.name || '' },
          metadata: { idempotencyKey: idempotencyKey || undefined, idempotencyKeyCreatedAt: idempotencyKey ? new Date() : undefined }
        };

        const created = await Order.create([orderDoc], { session });
        await session.commitTransaction();
        session.endSession();

        return NextResponse.json({ success: true, order: created[0] });
      } catch (err: any) {
        await session.abortTransaction();
        session.endSession();
        console.error('confirm create order transaction error', err);
        return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
      }
    }

    // existing confirm-by-token/orderId flow
    // idempotency: if idempotencyKey already processed for confirms, return 200
    if (idempotencyKey) {
      const existing = await Order.findOne({ 'metadata.confirmIdempotencyKey': idempotencyKey }).lean();
      if (existing) return NextResponse.json({ success: true, order: existing });
    }

    let order: any = null;
    if (orderToken) {
      const tokenDoc = await OrderToken.findOne({ token: orderToken });
      if (!tokenDoc) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      if (tokenDoc.used) return NextResponse.json({ error: 'Token already used' }, { status: 400 });
      order = await Order.findById(tokenDoc.orderId);
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

      // mark token used
      tokenDoc.used = true;
      await tokenDoc.save();
    } else if (orderId) {
      order = await Order.findById(orderId);
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    } else {
      return NextResponse.json({ error: 'orderToken or orderId required' }, { status: 400 });
    }

    // mark paid
    order.payment = { ...order.payment, status: 'succeeded', approvedAt: new Date() };
    order.status = 'paid';
    // store confirm idempotency key
    if (idempotencyKey) order.metadata = { ...(order.metadata || {}), confirmIdempotencyKey: idempotencyKey };
    await order.save();

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    console.error('payments/confirm error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
