import { NextResponse, NextRequest } from 'next/server';
/* eslint-disable @typescript-eslint/no-explicit-any */
import connectToDB from '../../../../lib/mongodb';
import { getOrderModel } from '../../../../models/Order';
import { getOrderTokenModel } from '../../../../models/OrderToken';
import { verifyToken } from '@/server/auth';

export async function GET(req: NextRequest, context: any) {
  try {
    await connectToDB();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();
    // Next.js requires awaiting context.params when it can be a Promise
    let id: string | undefined;
    const maybeParams = context?.params;
    if (maybeParams && typeof (maybeParams as unknown as PromiseLike<Record<string, unknown>>).then === 'function') {
      const resolved = await (maybeParams as unknown as PromiseLike<Record<string, unknown>>);
      if (resolved && typeof resolved.id === 'string') id = resolved.id;
    } else if (maybeParams && typeof maybeParams === 'object' && 'id' in (maybeParams as Record<string, unknown>)) {
      const val = (maybeParams as Record<string, unknown>).id;
      if (typeof val === 'string') id = val;
    }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Verify secure session token from HttpOnly cookie
    let session: { email?: string; role?: string } | null = null;
    try {
      const header = req.headers.get('cookie') || '';
      const map = Object.fromEntries(header.split(';').map((c) => c.split('=').map(s => s.trim())).map(([k, ...v]) => [k, v.join('=')]));
      const token = map[process.env.SESSION_COOKIE_NAME || 'ld_session'];
      if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const payload = await verifyToken(token);
      if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
      session = { email: payload.email, role: payload.role };
    } catch (e) { return NextResponse.json({ error: 'Invalid session' }, { status: 400 }); }

    // allow access by token: ?token=xxx
    const url = new URL(req.url);
    const tokenQuery = url.searchParams.get('token');

    // If token provided, validate it atomically and mark used in one step
    if (tokenQuery) {
      // find a token that matches, is not used and not expired, and mark it used atomically
      const now = new Date();
      const ot = await OrderToken.findOneAndUpdate(
        { token: tokenQuery, orderId: id, used: false, expiresAt: { $gt: now } },
        { $set: { used: true } },
        { new: true }
      ).exec();
      if (!ot) {
        // could be invalid, expired, already used, or not matching order
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      // ensure token references requested order (defensive)
      if (String(ot.orderId) !== id) return NextResponse.json({ error: 'Token does not match order' }, { status: 403 });
    }

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
