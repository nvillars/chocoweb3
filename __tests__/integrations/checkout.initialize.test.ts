import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { POST as initializePOST } from '../../src/app/api/checkout/initialize/route';
import { getProductModel } from '../../src/models/Product';

function makeRequest(body: any): Partial<Request> & { json: () => any } {
  return {
    async json() { return body; },
    headers: new Map(),
  } as any;
}

describe('checkout initialize transactional', () => {
  let mongod: MongoMemoryReplSet;
  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    await mongoose.connect(uri);
    // seed a product with stock 1
    const Product = getProductModel();
    await Product.create({ slug: 'test-prod', name: 'Test', price: 100, stock: 1, published: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  test('concurrent reservations should only allow one successful order', async () => {
    const body = {
      items: [{ productId: null, qty: 1 }],
      paymentMethod: 'card',
    };

    // find the product id
    const Product = getProductModel();
  const prod = (await Product.findOne({ slug: 'test-prod' }).lean()) as any;
  if (!prod) throw new Error('Seed product not found');
  body.items[0].productId = prod._id.toString();

    // run two concurrent initialize calls
    const r1 = initializePOST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }) as any as any as any);
    const r2 = initializePOST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }) as any as any as any);

    const results = await Promise.all([r1, r2]);

    // map statuses
    const statuses = await Promise.all(results.map(async (res: any) => ({ status: res.status, body: await res.json() })));

    const okCount = statuses.filter(s => s.status === 200).length;
    const conflictCount = statuses.filter(s => s.status === 409).length;

    expect(okCount).toBe(1);
    expect(conflictCount).toBe(1);
  });

  test('idempotency: repeated initialize with same key returns same order', async () => {
    const Product = getProductModel();
    // replenish stock
    await Product.updateOne({ slug: 'test-prod' }, { $set: { stock: 2 } });
  const prod = (await Product.findOne({ slug: 'test-prod' }).lean()) as any;
  if (!prod) throw new Error('Seed product not found (idempotency test)');

  const idempotencyKey = 'test-key-123';
    const body = {
      items: [{ productId: prod._id.toString(), qty: 1 }],
      paymentMethod: 'card',
      idempotencyKey,
    };

    const res1 = await initializePOST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }) as any);
    const res2 = await initializePOST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }) as any);

    const j1 = await res1.json();
    const j2 = await res2.json();

    expect(j1.order).toBeDefined();
    expect(j2.order).toBeDefined();
    expect(j1.order._id || j1.order.id).toEqual(j2.order._id || j2.order.id);
  });
});
