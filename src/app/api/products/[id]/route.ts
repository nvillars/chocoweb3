import { NextResponse } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { updateProduct, softDeleteProduct } from '@/server/repositories/products';
import { publish } from '@/lib/events';

export async function GET(req: Request, context: any) {
  // optional: fetch single product (not implemented in repo currently)
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

export async function PATCH(req: Request, context: any) {
  try {
    const body = await req.json();
  const params = context?.params;
  const { id } = (await params) as { id: string };
  const prod = await updateProduct(id, body);
    publish({ type: 'product.changed', payload: { action: 'update', product: prod } });
    return NextResponse.json(prod);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: any) {
  try {
  const params = context?.params;
  const { id } = (await params) as { id: string };
  const prod = await softDeleteProduct(id);
    publish({ type: 'product.changed', payload: { action: 'delete', product: prod } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
