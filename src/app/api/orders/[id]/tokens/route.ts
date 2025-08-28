import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import connectToDB from '../../../../../lib/mongodb';
import { getOrderModel } from '../../../../../models/Order';
import { getOrderTokenModel } from '../../../../../models/OrderToken';

export async function POST(req: NextRequest, context: any) {
  try {
    await connectToDB();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();

    // await params if needed
    let id: string | undefined;
    const maybeParams = context?.params;
    if (maybeParams && typeof (maybeParams as any).then === 'function') {
      const resolved = (await maybeParams) as Record<string, unknown>;
      if (resolved && typeof resolved.id === 'string') id = resolved.id;
    } else if (maybeParams && typeof maybeParams === 'object' && 'id' in (maybeParams as Record<string, unknown>)) {
      const val = (maybeParams as Record<string, unknown>).id;
      if (typeof val === 'string') id = val;
    }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // parse cookie session
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
    const ord = order as { user?: { email?: string } } & Record<string, unknown>;
    const isAdmin = session?.role === 'admin';
    const sameUser = !!(session?.email && ord.user && (ord.user as { email?: string }).email === session.email);
    if (!isAdmin && !sameUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // create secure token
    const token = crypto.randomBytes(12).toString('base64url');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    const doc = await OrderToken.create({ token, orderId: id, expiresAt, used: false });

    return NextResponse.json({ token: doc.token, expiresAt: doc.expiresAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: any) {
  try {
    await connectToDB();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();

    // await params
    let id: string | undefined;
    const maybeParams = context?.params;
    if (maybeParams && typeof (maybeParams as any).then === 'function') {
      const resolved = (await maybeParams) as Record<string, unknown>;
      if (resolved && typeof resolved.id === 'string') id = resolved.id;
    } else if (maybeParams && typeof maybeParams === 'object' && 'id' in (maybeParams as Record<string, unknown>)) {
      const val = (maybeParams as Record<string, unknown>).id;
      if (typeof val === 'string') id = val;
    }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // parse cookie session
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

export async function DELETE(req: NextRequest, context: any) {
  try {
    await connectToDB();
    const Order = getOrderModel();
    const OrderToken = getOrderTokenModel();

    // params
    let id: string | undefined;
    const maybeParams = context?.params;
    if (maybeParams && typeof (maybeParams as any).then === 'function') {
      const resolved = (await maybeParams) as Record<string, unknown>;
      if (resolved && typeof resolved.id === 'string') id = resolved.id;
    } else if (maybeParams && typeof maybeParams === 'object' && 'id' in (maybeParams as Record<string, unknown>)) {
      const val = (maybeParams as Record<string, unknown>).id;
      if (typeof val === 'string') id = val;
    }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // expecting ?token=<token> to revoke
    const url = new URL(req.url);
    const tokenQuery = url.searchParams.get('token');
    if (!tokenQuery) return NextResponse.json({ error: 'Missing token query' }, { status: 400 });

    // parse cookie session
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
