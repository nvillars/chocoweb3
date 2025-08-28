export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import connectToDB from '@/lib/mongodb';
import { getOrderModel } from '@/models/Order';
import { restockItems } from '@/server/repositories/inventory';
import { verifyToken } from '@/server/auth';

export async function POST(req: Request, _ctx: unknown) {
  await connectToDB();
  const Order = getOrderModel();
  // extract id from URL to avoid Next's params Promise typing issues
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[parts.length - 2];
  // Accept form-encoded (from admin form) or JSON
  let body: Record<string, unknown> = {};
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await req.json().catch(() => ({}));
  } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      for (const [k, v] of formData.entries()) {
        body[k] = typeof v === 'string' ? v : String(v);
      }
    } catch (e) { body = {}; }
  } else {
    // fallback to json parse attempt
    body = await req.json().catch(() => ({}));
  }
  
  const ord = await Order.findById(id);
  if (!ord) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  // Require admin session to perform manual marking of paid, capture payload for audit
  let adminPayload: { email?: string; role?: string } | null = null;
  try {
    const header = req.headers.get('cookie') || '';
    const map = Object.fromEntries(header.split(';').map((c) => c.split('=').map(s => s.trim())).map(([k, ...v]) => [k, v.join('=')]));
    const token = map[process.env.SESSION_COOKIE_NAME || 'ld_session'];
    if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    const payload = await verifyToken(token as string);
    if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    adminPayload = payload as { email?: string; role?: string };
  } catch (e) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  // If stripe payment, prefer webhook to mark succeeded; admin can still mark manually but we record providerRef if present
  const approved = Boolean(body.approved);
  const providerRef = typeof body.providerRef === 'string' ? body.providerRef : (typeof body.providerRef === 'number' ? String(body.providerRef) : undefined);

  if (approved) {
    ord.status = 'paid';
    ord.payment = ord.payment || {};
    ord.payment.status = 'succeeded';
  if (providerRef) ord.payment.providerId = providerRef;
  // audit trail
  if (adminPayload?.email) ord.payment.approvedBy = adminPayload.email;
  ord.payment.approvedAt = new Date();
    await ord.save();

    // publish SSE event for order update
    try { (globalThis as unknown as { publish?: (e: unknown) => void }).publish?.({ type: 'order.updated', payload: { id: ord._id.toString(), status: ord.status } }); } catch(e){}

  return NextResponse.json({ ok: true, providerRef: ord.payment.providerId, approvedBy: ord.payment.approvedBy, approvedAt: ord.payment.approvedAt });
  }

  // not approved => treat as failed and restock
  const items = (ord.items || []).map((i: { productId?: unknown; qty?: number }) => ({ productId: String(i.productId), qty: i.qty || 0 }));
  await restockItems(null, items);
  ord.status = 'failed';
  ord.payment = ord.payment || {};
  ord.payment.status = 'failed';
  await ord.save();
  // publish SSE
  try { (globalThis as unknown as { publish?: (e: unknown) => void }).publish?.({ type: 'product.changed', payload: { action: 'update' } }); } catch(e){}
  return NextResponse.json({ ok: false }, { status: 400 });
}
