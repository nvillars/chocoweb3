export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import connectToDB from '@/lib/mongodb';
import { getOrderModel } from '@/models/Order';
import { restockItems } from '@/server/repositories/inventory';

export async function POST(req: Request, _ctx: unknown) {
  await connectToDB();
  const Order = getOrderModel();
  // extract id from URL to avoid Next's params Promise typing issues
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[parts.length - 2];
  const body = await req.json().catch(() => ({}));
  const ord = await Order.findById(id);
  if (!ord) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  if (ord.payment.method === 'stripe' && process.env.STRIPE_SECRET_KEY) {
    // in real life we'd confirm via stripe SDK/webhook; for now assume client handled it
    ord.status = 'paid';
    ord.payment.status = 'succeeded';
    await ord.save();
    return NextResponse.json({ ok: true });
  }

  // offline mock
  const approved = Boolean(body.approved);
  if (approved) {
    ord.status = 'paid';
    ord.payment.status = 'succeeded';
    await ord.save();
    return NextResponse.json({ ok: true });
  } else {
    // failed => restock
    const items = (ord.items || []).map((i: { productId?: unknown; qty?: number }) => ({ productId: String(i.productId), qty: i.qty || 0 }));
    await restockItems(null, items);
    ord.status = 'failed';
    ord.payment.status = 'failed';
    await ord.save();
    // publish SSE
    try { (globalThis as unknown as { publish?: (e: unknown) => void }).publish?.({ type: 'product.changed', payload: { action: 'update' } }); } catch(e){}
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
