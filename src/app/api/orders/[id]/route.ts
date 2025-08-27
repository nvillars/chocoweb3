import { NextResponse, NextRequest } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */
import connectToDB from '../../../../lib/mongodb';
import { getOrderModel } from '../../../../models/Order';

export async function GET(req: NextRequest, context: any) {
  try {
    await connectToDB();
    const Order = getOrderModel();
    // Normalize params which can be a Promise or an object in different Next versions
    let id: string | undefined;
    const maybeParams = context?.params;
    if (maybeParams && typeof maybeParams === 'object' && 'id' in (maybeParams as Record<string, unknown>)) {
      const val = (maybeParams as Record<string, unknown>).id;
      if (typeof val === 'string') id = val;
    } else if (maybeParams && typeof (maybeParams as any).then === 'function') {
      const resolved = (await maybeParams) as Record<string, unknown>;
      if (resolved && typeof resolved.id === 'string') id = resolved.id;
    }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // parse cookie like other endpoints: demo session ladulcerina_auth
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader
        .split(';')
        .map((c) => c.split('='))
        .map(([k = '', ...v]) => [k.trim(), v.join('=')])
        .filter(([k]) => k)
    );
    const raw = cookies['ladulcerina_auth'];
    if (!raw) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  let session: { email?: string; role?: string } | null = null;
  try { session = JSON.parse(decodeURIComponent(raw)); } catch (e) { return NextResponse.json({ error: 'Invalid session' }, { status: 400 }); }

    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // only admins or the owning user may view the order
  const ord = order as { user?: { email?: string } } & Record<string, unknown>;
  const isAdmin = session?.role === 'admin';
  const sameUser = !!(session?.email && ord.user && (ord.user as { email?: string }).email === session.email);
  if (isAdmin || sameUser) {
        return NextResponse.json(ord);
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
