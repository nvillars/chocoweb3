import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { confirmPayment } from '../../../../lib/mock-db';

const SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'dev-secret';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const sig = req.headers.get('x-pay-sig') || '';
  // simple verification for local/dev: HMAC or exact match; here we do string compare for demo
  if (!sig || sig !== SECRET) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const { eventId, type, data } = body as any;
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

  // idempotent: map certain event types to confirmPayment
  if (type === 'payment.succeeded') {
    const { orderToken, orderId } = data || {};
    const result = confirmPayment({ orderToken, orderId, idempotencyKey: eventId });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, order: result.order });
  }

  // other event types can be handled here
  return NextResponse.json({ received: true });
}
