import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'ld_session';
const SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || '';
const MAX_AGE = 60 * 60 * 2; // 2 hours

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(payload: string) {
  if (!SECRET) throw new Error('Missing AUTH_SECRET env var');
  return base64url(crypto.createHmac('sha256', SECRET).update(payload).digest());
}

export async function POST(req: NextRequest) {
  if (!SECRET) {
    console.error('[auth/login] missing AUTH_SECRET');
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    // In this project we support demo mode: if no credentials are provided, create a demo user.
    const role = String(body?.role || 'user') === 'admin' ? 'admin' : 'user';
    const email = String(body?.email || (role === 'admin' ? 'admin@ladulcerina.test' : 'usuario@ladulcerina.test'));

    const user = {
      id: role === 'admin' ? 1 : 2,
      name: role === 'admin' ? 'Admin Demo' : 'Usuario Demo',
      email,
      role,
    };

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + MAX_AGE;
    const payload = base64url(JSON.stringify({ sub: String(user.id), email: user.email, role: user.role, iat, exp }));
    const sig = sign(payload);
    const token = `${payload}.${sig}`;

    const res = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    const secure = process.env.NODE_ENV === 'production';
    // Set cookie HttpOnly so client JS can't tamper it
    const cookie = `${COOKIE_NAME}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax;${secure ? ' Secure;' : ''}`;
    res.headers.set('Set-Cookie', cookie);
    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth/login] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
