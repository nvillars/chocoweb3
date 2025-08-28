import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || '';

function b64uToStr(b64u: string) {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
}

export function verifyToken(token?: string) {
  if (!token) return null;
  if (!SECRET) throw new Error('Missing AUTH_SECRET');
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expected = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (expected !== sig) return null;
    const json = b64uToStr(payloadB64);
    const payload = JSON.parse(json);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload as { sub?: string; email?: string; role?: string; iat?: number; exp?: number };
  } catch {
    return null;
  }
}
