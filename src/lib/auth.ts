const SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || '';

function b64uToUint8Array(input: string) {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const full = b64 + pad;
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(full, 'base64');
    return new Uint8Array(buf);
  }
  const bin = (typeof atob === 'function') ? atob(full) : '';
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function verifyHmacWebCrypto(payloadB64: string, sigB64u: string): Promise<boolean> {
  if (!globalThis?.crypto || !globalThis.crypto.subtle) return false;
  const keyData = new TextEncoder().encode(SECRET);
  const subtle = globalThis.crypto.subtle as SubtleCrypto;
  try {
    const key = await subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = b64uToUint8Array(sigB64u);
    const data = new TextEncoder().encode(payloadB64);
    return await subtle.verify({ name: 'HMAC' }, key, sig, data);
  } catch {
    return false;
  }
}

export async function verifyToken(token?: string) {
  if (!token) return null;
  if (!SECRET) throw new Error('Missing AUTH_SECRET');
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    let ok = false;
    if (typeof globalThis !== 'undefined' && globalThis.crypto && (globalThis.crypto as unknown as { subtle?: SubtleCrypto }).subtle) {
      ok = await verifyHmacWebCrypto(payloadB64, sig);
    } else {
      // Node.js fallback via dynamic import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const crypto = await import('crypto');
      const expected = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      ok = expected === sig;
    }
    if (!ok) return null;
    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    let json = '';
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(b64 + pad, 'base64').toString('utf8');
    } else if (typeof atob === 'function') {
      json = decodeURIComponent(escape(atob(b64 + pad)));
    }
    const payload = JSON.parse(json);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload as { sub?: string; email?: string; role?: string; iat?: number; exp?: number };
  } catch (_e) {
    return null;
  }
}
