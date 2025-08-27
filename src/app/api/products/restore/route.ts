import { NextResponse } from 'next/server';
import { restoreProduct } from '../../../../server/repositories/products';
import { publish } from '../../../../lib/events';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body as { id: string };
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const prod = await restoreProduct(id);
    publish({ type: 'product.changed', payload: { action: 'restore', product: prod } });
    return NextResponse.json(prod);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
