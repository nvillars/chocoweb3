import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const { token, items, idempotencyKey, description = 'Compra La Dulcerina' } = await req.json();
  // allow local mock mode when MP credentials aren't available
  const MP_MOCK = process.env.MP_MOCK === '1' || (!process.env.MP_ACCESS_TOKEN && process.env.NODE_ENV === 'development');
  if (MP_MOCK) {
    // simulate a payment response for local/dev testing
    const fakeId = `MOCK_${Date.now()}`;
    const status = 'approved';
    return NextResponse.json({ paymentId: fakeId, status, paymentSession: fakeId });
  }

  // runtime require to avoid bundler/type issues when mercadopago isn't installed in all environments
  let mp: any;
  try {
    // eslint-disable-next-line no-eval
    const reqfn = eval('require') as NodeRequire;
    const Mercadopago = reqfn('mercadopago');
    mp = new Mercadopago({ accessToken: process.env.MP_ACCESS_TOKEN! });
  } catch (e) {
    console.error('mercadopago SDK not available at runtime', e);
    return NextResponse.json({ error: 'Mercado Pago SDK not available' }, { status: 500 });
  }

  const amount = (items || []).reduce((s: number, it: any) => s + Number((it.lineTotal ?? (it.unitPrice * it.qty)) || 0), 0);

  const body: any = {
    transaction_amount: Number(amount),
    description,
    payment_method_id: 'yape',
    token,
    metadata: { items, idempotencyKey }
  };

  try {
    const res = await mp.payment.create({ body, requestOptions: { idempotencyKey } });
    // Mercado Pago SDK returns an object where id/status may live in response
    const paymentId = res?.response?.id ?? res?.id ?? undefined;
    const status = res?.response?.status ?? res?.status ?? undefined;
    return NextResponse.json({ paymentId, status, paymentSession: paymentId });
  } catch (e: any) {
    console.error('mercadopago payment create error', e && e.message ? e.message : e);
    return NextResponse.json({ error: 'payment creation failed' }, { status: 500 });
  }
}
