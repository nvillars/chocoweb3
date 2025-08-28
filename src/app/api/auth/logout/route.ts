import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'ld_session';

export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  // Clear cookie by setting Max-Age=0
  res.headers.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax;${process.env.NODE_ENV === 'production' ? ' Secure;' : ''}`);
  return res;
}
