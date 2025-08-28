import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import connectToDB from '../../../../../lib/mongodb';
import { getOrderModel } from '../../../../../models/Order';
import { getOrderTokenModel } from '../../../../../models/OrderToken';
import { verifyToken } from '@/server/auth';

type RouteContext = { params?: Record<string, string> | Promise<Record<string, string>> };

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await connectToDB();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();

    // await params if needed
    let id: string | undefined;
    const maybeParams = context?.params;
    if (maybeParams) {
      if (typeof (maybeParams as Promise<Record<string, string>>).then === 'function') {
        const resolved = await (maybeParams as Promise<Record<string, string>>);
        if (resolved && typeof resolved.id === 'string') id = resolved.id;
      } else if (typeof maybeParams === 'object' && 'id' in maybeParams) {
        const val = (maybeParams as Record<string, string>).id;
        if (typeof val === 'string') id = val;
      }
    }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // verify secure session token
    let session: { email?: string; role?: string } | null = null;
    try {
      const header = req.headers.get('cookie') || '';
      const map = Object.fromEntries(header.split(';').map((c) => c.split('=').map(s => s.trim())).map(([k, ...v]) => [k, v.join('=')]));
      const token = map[process.env.SESSION_COOKIE_NAME || 'ld_session'];
      if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
      const payload = await verifyToken(token);
      if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
      session = { email: payload.email, role: payload.role };
    } catch (e) { return NextResponse.json({ error: 'Invalid session' }, { status: 400 }); }

    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const ord = order as { user?: { email?: string } } & Record<string, unknown>;
    const isAdmin = session?.role === 'admin';
    const sameUser = !!(session?.email && ord.user && (ord.user as { email?: string }).email === session.email);
    if (!isAdmin && !sameUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // create secure token
  const tokenValue = crypto.randomBytes(12).toString('base64url');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  const doc = await OrderToken.create({ token: tokenValue, orderId: id, expiresAt, used: false });

  return NextResponse.json({ token: doc.token, expiresAt: doc.expiresAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await connectToDB();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();

    // await params
    let id: string | undefined;
    const maybeParams = context?.params;
    if (maybeParams) {
      if (typeof (maybeParams as Promise<Record<string, string>>).then === 'function') {
        const resolved = await (maybeParams as Promise<Record<string, string>>);
        if (resolved && typeof resolved.id === 'string') id = resolved.id;
      } else if (typeof maybeParams === 'object' && 'id' in maybeParams) {
        const val = (maybeParams as Record<string, string>).id;
        if (typeof val === 'string') id = val;
      }
    }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // verify secure session token
    let session: { email?: string; role?: string } | null = null;
    try {
      const header = req.headers.get('cookie') || '';
      const map = Object.fromEntries(header.split(';').map((c) => c.split('=').map(s => s.trim())).map(([k, ...v]) => [k, v.join('=')]));
      const token = map[process.env.SESSION_COOKIE_NAME || 'ld_session'];
      if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
      const payload = await verifyToken(token);
      if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
      session = { email: payload.email, role: payload.role };
    } catch (e) { return NextResponse.json({ error: 'Invalid session' }, { status: 400 }); }

    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const ord = order as { user?: { email?: string } } & Record<string, unknown>;
    const isAdmin = session?.role === 'admin';
    const sameUser = !!(session?.email && ord.user && (ord.user as { email?: string }).email === session.email);
    if (!isAdmin && !sameUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tokens = await OrderToken.find({ orderId: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(tokens.map(t => ({ token: t.token, expiresAt: t.expiresAt, used: t.used, createdAt: t.createdAt })));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await connectToDB();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();

    // params
    let id: string | undefined;
    const maybeParams = context?.params;
    if (maybeParams) {
      if (typeof (maybeParams as Promise<Record<string, string>>).then === 'function') {
        const resolved = await (maybeParams as Promise<Record<string, string>>);
        if (resolved && typeof resolved.id === 'string') id = resolved.id;
      } else if (typeof maybeParams === 'object' && 'id' in maybeParams) {
        const val = (maybeParams as Record<string, string>).id;
        if (typeof val === 'string') id = val;
      }
    }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // expecting ?token=<token> to revoke
    const url = new URL(req.url);
    const tokenQuery = url.searchParams.get('token');
    if (!tokenQuery) return NextResponse.json({ error: 'Missing token query' }, { status: 400 });

    // verify secure session token
    let session: { email?: string; role?: string } | null = null;
    try {
      const header = req.headers.get('cookie') || '';
      const map = Object.fromEntries(header.split(';').map((c) => c.split('=').map(s => s.trim())).map(([k, ...v]) => [k, v.join('=')]));
      const token = map[process.env.SESSION_COOKIE_NAME || 'ld_session'];
      if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
      const payload = await verifyToken(token);
      if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
      session = { email: payload.email, role: payload.role };
    } catch (e) { return NextResponse.json({ error: 'Invalid session' }, { status: 400 }); }

    const order = await Order.findById(id).lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const ord = order as { user?: { email?: string } } & Record<string, unknown>;
    const isAdmin = session?.role === 'admin';
    const sameUser = !!(session?.email && ord.user && (ord.user as { email?: string }).email === session.email);
    if (!isAdmin && !sameUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const res = await OrderToken.updateOne({ token: tokenQuery, orderId: id }, { $set: { used: true } }).exec();
    if (res.matchedCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
