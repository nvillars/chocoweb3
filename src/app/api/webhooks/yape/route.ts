import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Yape webhook endpoint (production-style)
 * - Verifies HMAC-SHA256 signature using YAPE_WEBHOOK_SECRET
 * - Expects the webhook payload to include: event, data.paymentSession, data.metadata (items, shipping, address, paymentMethod, idempotencyKey)
 * - Performs an atomic transaction: check idempotency, decrement stock, create order, commit
 * - Returns 200 for idempotent replays
 *
 * DEPRECATED: This endpoint is deprecated. Use `src/app/api/webhooks/mercadopago/route.ts` which validates
 * the Mercado Pago `x-signature` Secret Signature and creates orders atomically.
 */

const USE_DB = !!process.env.MONGODB_URI;

export async function POST(req: NextRequest) {
  if (!USE_DB) return NextResponse.json({ error: 'Webhooks require a real DB (MONGODB_URI).' }, { status: 400 });

  const secret = process.env.YAPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('YAPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const raw = await req.text();
  const headerSig = req.headers.get('x-yape-signature') || req.headers.get('x-signature');
  if (!headerSig) return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });

  // verify HMAC-SHA256
  try {
    const { createHmac, timingSafeEqual } = await import('crypto');
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(headerSig, 'utf8');
    // timingSafeEqual requires same length
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (err) {
    console.error('signature verify error', err);
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = payload.event || payload.type || 'unknown';
  const data = payload.data || payload.object || {};
  const paymentSession = data.paymentSession || data.id || null; // provider-specific
  const metadata = data.metadata || {};
  const idempotencyKey = metadata?.idempotencyKey || payload.id || null;

  try {
    const { connectToDB } = await import('../../../../lib/mongodb');
    const { getOrderModel } = await import('../../../../models/Order');
    const { getProductModel } = await import('../../../../models/Product');
    const mongoose = await import('mongoose');
    const ObjectId = (await import('mongodb')).ObjectId;

    await connectToDB();
    const Order = getOrderModel();
    const Product = getProductModel();

    // For payment succeeded events we create the order atomically
    if (event !== 'payment.succeeded' && event !== 'payment:paid' && event !== 'checkout.session.completed') {
      // Non-success events: return 200 so provider retries won't be considered errors.
      return NextResponse.json({ received: true });
    }

    // Expect metadata to contain items/shipping/address/paymentMethod
    const items = metadata.items || data.items || null;
    const shipping = metadata.shipping || data.shipping || { method: 'envio', price: 0 };
    const address = metadata.address || data.address || null;
    const paymentMethod = metadata.paymentMethod || 'yape';

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Webhook missing items in metadata');
      return NextResponse.json({ error: 'Missing items in metadata' }, { status: 400 });
    }

    // Idempotency: return existing order if we've already processed this idempotency key
    if (idempotencyKey) {
      const existing = await Order.findOne({ 'metadata.idempotencyKey': idempotencyKey }).lean();
      if (existing) return NextResponse.json({ success: true, order: existing });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // decrement stock for each item (fail if any product has insufficient stock)
      for (const it of items) {
        const pid = it.productId;
        const qty = Number(it.qty || it.quantity || it._qty || 0);
        if (!qty || qty <= 0) throw new Error('Invalid item qty');
        const res = await Product.updateOne({ _id: new ObjectId(pid), stock: { $gte: qty } }, { $inc: { stock: -qty } }, { session });
        if (res.modifiedCount === 0) {
          // rollback
          await session.abortTransaction();
          return NextResponse.json({ error: 'Insufficient stock for product ' + pid }, { status: 409 });
        }
      }

      // compute amounts (assume items contain unitPrice/lineTotal)
      const subtotal = items.reduce((s: number, it: any) => s + (Number(it.lineTotal ?? (it.unitPrice * it.qty)) || 0), 0);
      const shippingPrice = Number(shipping?.price || 0);
      const total = subtotal + shippingPrice + (Number(metadata.tax || 0) || 0);

      const orderDoc: any = {
        items: items.map((it: any) => ({ productId: new ObjectId(it.productId), name: it.name || it.title || '', qty: Number(it.qty), unitPrice: Number(it.unitPrice), lineTotal: Number(it.lineTotal) })),
        amounts: { subtotal, shipping: shippingPrice, tax: Number(metadata.tax || 0), total },
        payment: { method: paymentMethod, providerId: paymentSession, status: 'succeeded', approvedAt: new Date() },
        status: 'paid',
        user: { email: metadata.email || address?.email || '', name: metadata.name || address?.name || '' },
        metadata: { idempotencyKey: idempotencyKey || undefined, idempotencyKeyCreatedAt: idempotencyKey ? new Date() : undefined }
      };

      const created = await Order.create([orderDoc], { session });
      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ success: true, order: created[0] });
    } catch (err: any) {
      await session.abortTransaction();
      session.endSession();
      console.error('webhook transaction error', err);
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('webhook handling error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
