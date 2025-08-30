import crypto from 'crypto';

// use undici if available at runtime, otherwise rely on global fetch (node 18+)
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

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/mercadopago';
const SECRET = process.env.MP_WEBHOOK_SECRET || 'test_secret';

async function ensureMockProduct() {
  // upsert a mock product into MongoDB and return its string id
  // prefer MONGODB_URI (Atlas) like connectToDB, fall back to MONGODB_URI_LOCAL
  const uri = process.env.MONGODB_URI ?? process.env.MONGODB_URI_LOCAL;
  if (!uri) throw new Error('MONGODB_URI_LOCAL or MONGODB_URI required');
  // dynamic import to support ESM/CommonJS
  const mod = await import('mongodb');
  const MongoClient = mod.MongoClient;
  const ObjectId = mod.ObjectId;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const col = db.collection('products');
  const slug = 'mock-product';
  const now = new Date();
  const doc = {
    slug,
    name: 'Mock product',
    description: 'Producto de prueba',
    price: 10,
    stock: 100,
    published: false,
    createdAt: now,
    updatedAt: now
  };
  const res = await col.findOneAndUpdate({ slug }, { $set: doc }, { upsert: true, returnDocument: 'after' as any });
  let final = res.value;
  if (!final) {
    final = await col.findOne({ slug });
  }
  await client.close();
  const id = (final && final._id) ? String(final._id) : String(new ObjectId());
  return id;
}

async function run() {
  const productId = await ensureMockProduct();

  const body = {
    action: 'payment.updated',
    data: {
      id: 'MOCK_' + Date.now(),
      metadata: {
        items: [ { productId, qty: 1, unitPrice: 10, lineTotal: 10, name: 'Mock product' } ]
      }
    },
    type: 'payment'
  };
  const raw = JSON.stringify(body);
  const requestId = 'req_' + Date.now();
  const ts = String(Date.now());
  const payloadToSign = `${requestId}${ts}${raw}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payloadToSign).digest('hex');

  const r = await doRequest(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-signature': sig,
      'x-request-id': requestId,
      'x-timestamp': ts
    },
    body: raw
  });
  console.log('status', r.statusCode);
  const text = await r.body.text();
  console.log(text);
}

run().catch(e => { console.error(e); process.exit(1); });
