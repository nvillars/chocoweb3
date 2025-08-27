export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createOrder } from '../../../server/repositories/orders';
import { publish } from '../../../lib/events';
import connectToDB from '../../../lib/mongodb';
import { getOrderModel } from '../../../models/Order';

export async function GET(req: Request) {
  try {
    await connectToDB();
    const Order = getOrderModel();

    // Read demo session cookie set by the client: ladulcerina_auth
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader
        .split(';')
        .map((c) => c.split('='))
        .map(([k = '', ...v]) => [k.trim(), v.join('=')])
        .filter(([k]) => k)
    );

    const raw = cookies['ladulceria_auth'];
    if (!raw) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    let session: { email?: string; role?: string } | null = null;
    try {
      session = JSON.parse(decodeURIComponent(raw));
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    let orders;
    // Admins can list all orders, regular users only their own
    if (session?.role === 'admin') {
      orders = await Order.find().sort({ createdAt: -1 }).limit(100).lean().exec();
    } else if (session?.email) {
      orders = await Order.find({ 'user.email': session.email }).sort({ createdAt: -1 }).limit(100).lean().exec();
    } else {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    return NextResponse.json(orders);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDB();
    const idempotencyKey = req.headers.get('Idempotency-Key') || undefined;
    const body = await req.json().catch(() => null);
  const created = await createOrder(body, { idempotencyKey }) as { order?: unknown; updatedProducts?: unknown[] } | unknown;
  // created may be an object { order, updatedProducts } or just the order
  let order: unknown = created;
  let updatedProducts: unknown[] = [];
  if (created && typeof created === 'object') {
    const c = created as { order?: unknown; updatedProducts?: unknown[] };
    if (c.order !== undefined) order = c.order;
    if (Array.isArray(c.updatedProducts)) updatedProducts = c.updatedProducts;
  }
    for (const p of updatedProducts) {
      publish({ type: 'product.changed', payload: { action: 'update', product: p } });
    }
    return NextResponse.json({ order }, { status: 201 });
  } catch (err: unknown) {
    const errObj = err as { code?: string; productId?: string; available?: number; message?: string } | undefined;
    if (errObj && errObj.code === 'OUT_OF_STOCK') {
      return NextResponse.json({ error: 'OUT_OF_STOCK', productId: errObj.productId, available: errObj.available }, { status: 409 });
    }
    if (errObj && errObj.message && errObj.message.includes('Insufficient')) {
      return NextResponse.json({ error: errObj.message }, { status: 409 });
    }
    return NextResponse.json({ error: errObj?.message || String(err) }, { status: 400 });
  }
}
