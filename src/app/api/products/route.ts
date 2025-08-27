import { NextResponse } from 'next/server';
import { listProducts, createProduct } from '../../../server/repositories/products';
import { publish } from '../../../lib/events';

export async function GET() {
  try {
    const docs = await listProducts();
    return NextResponse.json(docs);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prod = await createProduct(body);
    publish({ type: 'product.changed', payload: { action: 'create', product: prod } });
    return NextResponse.json(prod, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
