export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function POST(req: Request, _ctx: unknown) {
  try {
    const mongoose = await import('mongoose');
    const uri = process.env.MONGODB_URI;
    if (!uri) return NextResponse.json({ error: 'NO_MONGODB_URI' }, { status: 500 });
    // connect if not connected
    if (!mongoose.connection || (mongoose.connection && mongoose.connection.readyState === 0)) {
      await mongoose.connect(uri);
    }
  // extract id from request URL to avoid using `params` directly (Next warns to await params)
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // path: /api/orders/{id}/cancel -> id is second-to-last segment
  const id = parts[parts.length - 2];
    const ordersColl = mongoose.connection.collection('orders');
    const productsColl = mongoose.connection.collection('products');

    const ord = await ordersColl.findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!ord) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (ord.status === 'pending') {
      const items = (ord.items || []).map((i: { productId?: unknown; qty?: number }) => ({ productId: String(i.productId), qty: i.qty || 0 }));
      // restock each product
      for (const it of items) {
        await productsColl.updateOne({ _id: new mongoose.Types.ObjectId(it.productId) }, { $inc: { stock: it.qty } });
      }
      await ordersColl.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { status: 'cancelled' } });
      try { (globalThis as unknown as { publish?: (e: unknown) => void }).publish?.({ type: 'product.changed', payload: { action: 'update' } }); } catch(e){}
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
