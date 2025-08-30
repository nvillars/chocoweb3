import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { POST as createPaymentPOST } from '../../src/app/api/mercadopago/payments/route';
import { POST as webhookPOST } from '../../src/app/api/webhooks/mercadopago/route';
import { getProductModel } from '../../src/models/Product';

describe('mercadopago webhook (MP_MOCK) integration', () => {
  let mongod: MongoMemoryReplSet;
  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;
    // enable mock mode for tests to avoid external SDK/signature
    process.env.MP_MOCK = '1';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  test('happy path: payment -> webhook creates order and decrements stock', async () => {
    const Product = getProductModel();
    // seed product with stock 2
    const prod = await Product.create({ slug: 'mp-test-prod', name: 'MP Test', price: 10, stock: 2, published: true });

    const items = [{ productId: prod._id.toString(), qty: 1, unitPrice: 10, lineTotal: 10, name: 'MP Test' }];
    const paymentPayload = { token: 'MOCK_TOKEN', items, idempotencyKey: `mp_test_${Date.now()}` };

    const payRes = await createPaymentPOST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(paymentPayload) }) as any);
    expect(payRes).toBeDefined();
    const payJson = await payRes.json();
    expect(payJson.paymentId).toBeDefined();

    // send webhook (MP_MOCK will accept MOCK_ ids)
    const webhookBody = { action: 'payment.updated', data: { id: payJson.paymentId, metadata: { items } }, type: 'payment' };
    const whRes = await webhookPOST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(webhookBody) }) as any);
    const whJson = await whRes.json();
    expect(whRes.status).toBe(200);
    expect(whJson.success).toBeTruthy();
    expect(whJson.order).toBeDefined();

    // product stock should be decremented by 1
    const updated = await Product.findOne({ _id: prod._id }).lean();
    expect(updated).not.toBeNull();
    expect((updated as any).stock).toBe(1);
  });

  test('insufficient stock: webhook returns 409 and does not create order', async () => {
    const Product = getProductModel();
    // seed product with stock 0
    const prod = await Product.create({ slug: 'mp-test-prod-2', name: 'MP Test 2', price: 5, stock: 0, published: true });

    const items = [{ productId: prod._id.toString(), qty: 1, unitPrice: 5, lineTotal: 5, name: 'MP Test 2' }];
    const paymentPayload = { token: 'MOCK_TOKEN', items, idempotencyKey: `mp_test_insuff_${Date.now()}` };

    const payRes = await createPaymentPOST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(paymentPayload) }) as any);
    const payJson = await payRes.json();
    expect(payJson.paymentId).toBeDefined();

    const webhookBody = { action: 'payment.updated', data: { id: payJson.paymentId, metadata: { items } }, type: 'payment' };
    const whRes = await webhookPOST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(webhookBody) }) as any);
    const whJson = await whRes.json();

    expect(whRes.status).toBe(409);
    expect(whJson.error).toBeDefined();
    // ensure product stock remains 0
    const after = await Product.findOne({ _id: prod._id }).lean();
    expect((after as any).stock).toBe(0);
  });
});
