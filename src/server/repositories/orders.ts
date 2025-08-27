import { z } from 'zod';
import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { getProductModel } from '../../models/Product';
import { getOrderModel } from '../../models/Order';
import { createPaymentIntent } from '../services/payments/stripe';
import { decrementStockOrThrow, restockItems } from './inventory';
import connectToDB from '../../lib/mongodb';

const Product = getProductModel();
const Order = getOrderModel();

const CreateOrderSchema = z.object({
  userId: z.string().optional(),
  user: z.object({ email: z.string().optional(), name: z.string().optional() }).optional(),
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1) })),
  paymentMethod: z.enum(['stripe','yape','plin','transfer','cod']).optional()
});

export async function createOrder(input: unknown, opts?: { idempotencyKey?: string }) {
  const parsed = CreateOrderSchema.parse(input);
  await connectToDB();

  // idempotency: if key provided, return existing order created within 5 minutes
  if (opts?.idempotencyKey) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existing = await Order.findOne({ 'metadata.idempotencyKey': opts.idempotencyKey, 'metadata.idempotencyKeyCreatedAt': { $gte: fiveMinutesAgo } }).lean();
    if (existing) return { order: existing };
  }

  // load products
  const pids = parsed.items.map(i => new Types.ObjectId(i.productId));
  const products = await Product.find({ _id: { $in: pids } }).lean();
  const prodMap = new Map(products.map(p => [String(p._id), p]));

  // build items using unit amounts (decimal units). Keep subtotal in cents for payments but store amounts in units on the document.
  type ItemSnapshot = { productId: Types.ObjectId; name?: string; qty: number; unitPrice: number; lineTotal: number };
  type DBProduct = { _id?: Types.ObjectId; price?: number; deletedAt?: string | null; published?: boolean; name?: string; slug?: string };
  const itemsSnapshot: ItemSnapshot[] = [];
  let subtotalCents = 0; // used for payment intents and precise math
  for (const it of parsed.items) {
    const p = prodMap.get(it.productId) as DBProduct | undefined;
    if (!p || p.deletedAt || !p.published) throw { code: 'VALIDATION_ERROR', message: 'Product not available', productId: it.productId };
    const unitPrice = Number((p.price ?? 0));
    const unitPriceCents = Math.round(unitPrice * 100);
    const lineCents = unitPriceCents * it.qty;
    const line = lineCents / 100;
  itemsSnapshot.push({ productId: new Types.ObjectId(it.productId), name: p.name, qty: it.qty, unitPrice: unitPrice, lineTotal: line });
    subtotalCents += lineCents;
  }

  const session = await mongoose.startSession();
  // Try transaction first (works on replica sets). If transactions are unavailable
  // (standalone Mongo), fall back to a best-effort, per-document conditional update strategy.
  let usedTransaction = false;
  let appliedItems: { productId: string, qty: number }[] = [];
  try {
    session.startTransaction();
    usedTransaction = true;
  // decrement stock atomically within the session
  appliedItems = await decrementStockOrThrow(session, parsed.items);

  // amounts: store subtotal/shipping/tax/total as decimal units. Keep subtotalCents for payment where needed.
  const amounts = { subtotal: subtotalCents / 100, shipping: 0, tax: 0, total: subtotalCents / 100 };
    const orderPayload: Record<string, unknown> = {
      items: itemsSnapshot,
      amounts,
      payment: { method: parsed.paymentMethod || 'cod', status: 'requires_payment' },
      status: 'pending',
      user: parsed.user || {},
    };
    if (opts?.idempotencyKey) {
      orderPayload.metadata = { idempotencyKey: opts.idempotencyKey, idempotencyKeyCreatedAt: new Date() };
    }

    const orderDoc = await Order.create([orderPayload], { session });

    let clientSecret: string | undefined;
    if (parsed.paymentMethod === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      // createPaymentIntent expects amount in cents
  const piRes = await createPaymentIntent(subtotalCents, 'pen');
  const pi: { id?: string; clientSecret?: string } = { id: piRes.id, clientSecret: piRes.clientSecret };
      await Order.updateOne({ _id: orderDoc[0]._id }, { $set: { 'payment.providerId': String(pi.id) } }, { session });
      clientSecret = pi.clientSecret;
    }

  await session.commitTransaction();
  session.endSession();

    // publish SSE for each affected product (minimal payload)
    try {
      const publish = (globalThis as unknown as { publish?: (e: unknown) => void }).publish;
      if (publish) {
        for (const it of itemsSnapshot) {
          publish({ type: 'product.changed', payload: { action: 'update', product: { _id: it.productId, stock: undefined } } });
        }
      }
    } catch (e) { }

    const created = await Order.findById(orderDoc[0]._id).lean();
    return { order: created, clientSecret };
  } catch (err: unknown) {
    // If error indicates transactions aren't supported, try fallback.
  let msg = '';
  if (typeof err === 'string') msg = err;
  else if (err instanceof Error) msg = err.message;
  else msg = String(err);
  if (msg.includes('replica set') || msg.includes('Transaction numbers are only allowed')) {
      // abort/cleanup the session if it was started
      try { await session.abortTransaction(); } catch (_) {}
      try { session.endSession(); } catch (_) {}
      // Fallback: perform per-document conditional updates (no session)
        try {
          appliedItems = await decrementStockOrThrow(null, parsed.items);

  const amounts = { subtotal: subtotalCents / 100, shipping: 0, tax: 0, total: subtotalCents / 100 };
          const orderPayload: Record<string, unknown> = {
            items: itemsSnapshot,
            amounts,
            payment: { method: parsed.paymentMethod || 'cod', status: 'requires_payment' },
            status: 'pending',
            user: parsed.user || {},
          };
        if (opts?.idempotencyKey) {
          orderPayload.metadata = { idempotencyKey: opts.idempotencyKey, idempotencyKeyCreatedAt: new Date() };
        }

  const orderDoc = await Order.create(orderPayload as Record<string, unknown>);

        let clientSecret: string | undefined;
        if (parsed.paymentMethod === 'stripe' && process.env.STRIPE_SECRET_KEY) {
          const piRes = await createPaymentIntent(subtotalCents, 'pen');
          const pi: { id?: string; clientSecret?: string } = { id: piRes.id, clientSecret: piRes.clientSecret };
      const createdId = (orderDoc as { _id?: unknown })._id;
      await Order.updateOne({ _id: createdId }, { $set: { 'payment.providerId': String(pi.id) } });
          clientSecret = pi.clientSecret;
        }

        // publish SSE events
        try {
          const publish = (globalThis as unknown as { publish?: (e: unknown) => void }).publish;
          if (publish) {
            for (const it of itemsSnapshot) {
              publish({ type: 'product.changed', payload: { action: 'update', product: { _id: it.productId, stock: undefined } } });
            }
          }
        } catch (e) { }

        const created = await Order.findById(orderDoc._id).lean();
        return { order: created, clientSecret };
      } catch (fallbackErr) {
        // rollback any applied decrements
        try { await restockItems(null, appliedItems); } catch (_) {}
        throw fallbackErr;
      }
    }

    // other errors - abort transaction and rethrow
    try { await session.abortTransaction(); } catch (_) {}
    try { session.endSession(); } catch (_) {}
    throw err;
  }
}
