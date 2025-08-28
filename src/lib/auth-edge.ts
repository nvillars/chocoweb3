const SECRET = process.env.AUTH_SECRET || process.env.SESSION_SECRET || '';

function b64uToStr(b64u: string): string {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  if (typeof atob === 'function') return atob(b64 + pad);
  // fallback for environments with Buffer
  if (typeof Buffer !== 'undefined') return Buffer.from(b64 + pad, 'base64').toString('utf8');
  return '';
}

function b64uToUint8Array(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const full = b64 + pad;
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(full, 'base64'));
  const bin = atob(full);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function verifyHmac(payloadB64: string, sigB64u: string): Promise<boolean> {
  if (!SECRET) return false;
  const subtle = (globalThis as unknown as { crypto?: SubtleCrypto }).crypto;
  if (!subtle) return false;

  const keyData = new TextEncoder().encode(SECRET);
  // HMAC import parameters
  const importAlg: HmacImportParams = { name: 'HMAC', hash: { name: 'SHA-256' } };
  try {
    const key = await subtle.importKey('raw', keyData, importAlg, false, ['verify']);
  const sig = b64uToUint8Array(sigB64u);
  const sigArr = new Uint8Array(sig);
  const data = new TextEncoder().encode(payloadB64);
  return await subtle.verify({ name: 'HMAC' }, key, sigArr, data);
  } catch {
    return false;
  }
}

export async function verifyToken(token?: string) {
  if (!token) return null;
  if (!SECRET) throw new Error('Missing AUTH_SECRET');
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const ok = await verifyHmac(payloadB64, sig).catch(() => false);
  if (!ok) return null;
  const json = b64uToStr(payloadB64);
  try {
    const payload = JSON.parse(json);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload as { sub?: string; email?: string; role?: string; iat?: number; exp?: number };
  } catch {
    return null;
  }
}
