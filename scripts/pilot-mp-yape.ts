import crypto from 'crypto';

// cargar variables de entorno desde .env.local si existe (para ejecución directa con npx/tsx)
try {
  // eslint-disable-next-line no-eval
  const reqfn = eval('require') as NodeRequire;
  const dotenv = reqfn('dotenv');
  dotenv.config({ path: '.env.local' });
} catch (e) {
  // no hacer nada si dotenv no está disponible
}

// small pilot: calls /api/mercadopago/payments to create a (mock) payment, then sends a webhook
// and verifies the order was created in MongoDB. Requires dev server running and MP_MOCK=1 in .env.local

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const PAYMENTS_URL = `${BASE}/api/mercadopago/payments`;
const WEBHOOK_URL = `${BASE}/api/webhooks/mercadopago`;

// request helper using undici or global fetch
let doRequest: any = null;
try {
  // eslint-disable-next-line no-eval
  const reqfn = eval('require') as NodeRequire;
  const undici = reqfn('undici');
  doRequest = undici.request;
} catch (e) {
  if (typeof (globalThis as any).fetch === 'function') {
    doRequest = async (url: string, opts: any) => {
      const res = await (globalThis as any).fetch(url, opts);
      const text = await res.text();
      return { statusCode: res.status, body: { text: async () => text } };
    };
  } else {
    throw new Error('no request implementation available (install undici or run on Node18+)');
  }
}

async function ensureMockProduct() {
  const uri = process.env.MONGODB_URI ?? process.env.MONGODB_URI_LOCAL;
  if (!uri) throw new Error('MONGODB_URI or MONGODB_URI_LOCAL required');
  const mod = await import('mongodb');
  const MongoClient = mod.MongoClient;
  const ObjectId = mod.ObjectId;
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('products');
  const slug = 'pilot-product';
  const now = new Date();
  const doc = { slug, name: 'Pilot product', price: 10, stock: 10, published: true, createdAt: now, updatedAt: now };
  const res = await col.findOneAndUpdate({ slug }, { $set: doc }, { upsert: true, returnDocument: 'after' as any });
  let final = res.value;
  if (!final) final = await col.findOne({ slug });
  await client.close();
  if (!final) {
    throw new Error('Failed to find or create the mock product');
  }
  return String(final._id);
}

async function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('Pilot: ensuring mock product...');
  const productId = await ensureMockProduct();
  console.log('Pilot: product id', productId);

  // create payment (mock)
  const items = [{ productId, qty: 1, unitPrice: 10, lineTotal: 10, name: 'Pilot product' }];
  const payload = { token: 'MOCK_TOKEN', items, idempotencyKey: `pilot_${Date.now()}` };
  console.log('Pilot: creating payment at', PAYMENTS_URL);
  const r1 = await doRequest(PAYMENTS_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const txt1 = await r1.body.text();
  console.log('payments response', r1.statusCode, txt1);
  let res1: any; try { res1 = JSON.parse(txt1); } catch { res1 = null; }
  const paymentId = res1?.paymentId || res1?.paymentSession || `MOCK_${Date.now()}`;

  // wait a bit
  await wait(500);

  // send webhook matching paymentId
  const body = { action: 'payment.updated', data: { id: paymentId, metadata: { items } }, type: 'payment' };
  const raw = JSON.stringify(body);
  const requestId = 'pilot_req_' + Date.now();
  const ts = String(Date.now());
  const secret = process.env.MP_WEBHOOK_SECRET || 'pilot_secret';
  const sig = crypto.createHmac('sha256', secret).update(`${requestId}${ts}${raw}`).digest('hex');
  console.log('Pilot: sending webhook to', WEBHOOK_URL, 'paymentId', paymentId);
  const r2 = await doRequest(WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig, 'x-request-id': requestId, 'x-timestamp': ts }, body: raw });
  const txt2 = await r2.body.text();
  console.log('webhook response', r2.statusCode, txt2);

  // fetch created order by payment.providerId via MongoDB
  const mod = await import('mongodb');
  const uri = process.env.MONGODB_URI ?? process.env.MONGODB_URI_LOCAL;
  if (!uri) throw new Error('MONGODB_URI or MONGODB_URI_LOCAL required');
  const client = new mod.MongoClient(uri);
  await client.connect();
  const ord = await client.db().collection('orders').findOne({ 'payment.providerId': paymentId });
  console.log('order found', ord);
  await client.close();
}

run().catch(e => { console.error('pilot error', e); process.exit(1); });
