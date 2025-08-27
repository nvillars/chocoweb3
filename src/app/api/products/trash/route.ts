import { NextResponse } from 'next/server';
import { listProducts, restoreProduct, deleteProductPermanent } from '../../../../server/repositories/products';
import { publish } from '../../../../lib/events';

export async function GET() {
  try {
    const docs = await listProducts({ includeDeleted: true });
    const trashed = docs.filter(d => d.deletedAt);
    return NextResponse.json(trashed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, id } = body as { action: string; id: string };
    if (action === 'restore') {
      const prod = await restoreProduct(id);
      publish({ type: 'product.changed', payload: { action: 'restore', product: prod } });
      return NextResponse.json(prod);
    } else if (action === 'deletePermanent') {
      const prod = await deleteProductPermanent(id);
      publish({ type: 'product.changed', payload: { action: 'deletePermanent', product: prod } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
