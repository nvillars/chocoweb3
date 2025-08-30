import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { reserveStock, createOrderPending } from '../../../../lib/mock-db';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { items, paymentMethod, shipping, idempotencyKey } = body as any;

  // validate items
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 });
  }

  // If no real DB configured, use the lightweight mock
  const USE_DB = !!process.env.MONGODB_URI;

  if (!USE_DB) {
    // Reserve stock for the requested items
    const reserveResult = reserveStock(items.map((it: any) => ({ productId: it.productId, qty: it.qty })));
    if (!reserveResult.ok) {
      return NextResponse.json({ error: 'Insufficient stock', details: reserveResult.insufficient }, { status: 409 });
    }

    if (paymentMethod === 'card') {
      // For card, simulate immediate creation of a payment session; we may still create an order after confirmation via webhook
      return NextResponse.json({ clientSecret: 'mock_client_secret', redirectUrl: '/mock-redirect' });
    }

    if (paymentMethod === 'wallet') {
      // Simulate returning a paymentSession/QR; do NOT create DB order yet. Provide a temporary session token and payTo metadata
      const session = {
        provider: 'Yape',
        instructions: 'Escanea el QR',
        qrDataUrl: 'data:image/png;base64,...',
        paymentSession: `ps_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`,
        payTo: { label: 'La dulcerina', phone: '955336217', owner: 'Neil Villar' }
      };
      return NextResponse.json({ pending: true, ...session });
    }
  }

  // Real DB path
  try {
    const { connectToDB } = await import('../../../../lib/mongodb');
    const { getProductModel } = await import('../../../../models/Product');
    const { getOrderModel } = await import('../../../../models/Order');
    const { getOrderTokenModel } = await import('../../../../models/OrderToken');

    await connectToDB();
    const Product = getProductModel();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();

    // Simpler atomic approach: perform per-item atomic updates (updateOne with stock >= qty)
    // If any update fails, rollback previous updates by incrementing back.
    const mongoose = await import('mongoose');
    const ObjectId = mongoose.Types.ObjectId;
    const decremented: { productId: string; qty: number }[] = [];
    try {
      for (const it of items) {
        const pid = it.productId;
        const qty = Number(it.qty || 0);
        if (!qty || qty <= 0) {
          // rollback
          for (const d of decremented) await Product.collection.updateOne({ _id: new ObjectId(d.productId) }, { $inc: { stock: d.qty } });
          return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
        }

        const res = await Product.collection.updateOne({ _id: new ObjectId(pid), stock: { $gte: qty } }, { $inc: { stock: -qty } });
        if (res.matchedCount === 0) {
          // rollback
          for (const d of decremented) await Product.collection.updateOne({ _id: new ObjectId(d.productId) }, { $inc: { stock: d.qty } });
          return NextResponse.json({ error: 'Insufficient stock', details: { productId: pid } }, { status: 409 });
        }
        decremented.push({ productId: pid, qty });
      }

      // Build order items and amounts
      const orderItems = [] as any[];
      let subtotal = 0;
      for (const it of items) {
        const prod = (await Product.findById(it.productId).lean()) as any;
        const unit = typeof it.unitPrice === 'number' ? it.unitPrice : (prod?.price ?? 0);
        const line = unit * it.qty;
        subtotal += line;
        orderItems.push({ productId: it.productId, name: prod?.name ?? it.name ?? 'Producto', qty: it.qty, unitPrice: unit, lineTotal: line });
      }

      const shippingPrice = shipping?.price ?? 0;
      const tax = 0;
      const total = subtotal + shippingPrice + tax;

      // normalize payment method to the values used in Order schema
      const paymentMethodNormalized = paymentMethod === 'card' ? 'stripe' : paymentMethod === 'wallet' ? 'yape' : paymentMethod;

      // For real DB: do not create persistent orders here. Instead, return a payment session/client secret
      if (paymentMethod === 'card') {
        // create a payment intent/session with the provider (mocked here)
        return NextResponse.json({ clientSecret: 'real_client_secret_placeholder', redirectUrl: '/mock-redirect' });
      }

      if (paymentMethod === 'wallet') {
        // create a temporary payment session (do not create order yet)
        const session = {
          provider: 'Yape',
          instructions: 'Escanea el QR',
          qrDataUrl: 'data:image/png;base64,...',
          paymentSession: `ps_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`,
        };
        return NextResponse.json({ pending: true, ...session });
      }

      // By design COD is not supported; return error for unknown methods
      return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
    } catch (err: any) {
      // if any unexpected error, attempt rollback of decremented
      for (const d of decremented) {
        try { await Product.collection.updateOne({ _id: new ObjectId(d.productId) }, { $inc: { stock: d.qty } }); } catch (e) { /* ignore */ }
      }
      throw err;
    }

    
  } catch (err: any) {
    console.error('initialize error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
