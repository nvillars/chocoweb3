import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/server/auth';

export async function GET(req: NextRequest) {
  try {
    const header = req.headers.get('cookie') || '';
    const map = Object.fromEntries(header.split(';').map((c) => c.split('=').map(s => s.trim())).map(([k, ...v]) => [k, v.join('=')]));
    const token = map[process.env.SESSION_COOKIE_NAME || 'ld_session'];
    if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    return NextResponse.json({ user: { email: payload.email, role: payload.role } });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
}
