/**
 * Lightweight in-memory mock DB for checkout flows used in local/dev.
 * Not for production. Provides small API: reserveStock, createOrderPending, confirmPayment.
 */
export type Product = { _id: string; name: string; stock: number; price: number };
export type OrderItem = { productId: string; name: string; qty: number; unitPrice: number; lineTotal: number };
export type Order = {
  id: string;
  items: OrderItem[];
  amounts: { subtotal: number; shipping: number; tax: number; total: number };
  payment: { method: string; status: string; approvedAt?: string; providerId?: string };
  status: string;
  user?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
};

export type OrderToken = { token: string; orderId: string; expiresAt: number; used: boolean; createdAt: number };

const products = new Map<string, Product>();
const ordersById = new Map<string, Order>();
const ordersByIdempotency = new Map<string, Order>();
const tokens = new Map<string, OrderToken>();
const confirmIdempotency = new Map<string, any>();

function nowIso() {
  return new Date().toISOString();
}

function ensureProduct(id: string) {
  if (!products.has(id)) {
    // seed with a default product for dev: stock 10, price 10
    products.set(id, { _id: id, name: `Producto ${id}`, stock: 10, price: 10 });
  }
  return products.get(id)!;
}

export function inspectProductStock(productId: string) {
  ensureProduct(productId);
  return products.get(productId)!.stock;
}

export function reserveStock(items: { productId: string; qty: number }[]) {
  // Check availability first
  const insufficient: { productId: string; have: number; need: number }[] = [];
  for (const it of items) {
    const p = ensureProduct(it.productId);
    if (p.stock < it.qty) insufficient.push({ productId: it.productId, have: p.stock, need: it.qty });
  }
  if (insufficient.length) return { ok: false, insufficient };

  // Deduct
  for (const it of items) {
    const p = products.get(it.productId)!;
    p.stock = Math.max(0, p.stock - it.qty);
    products.set(it.productId, p);
  }
  return { ok: true };
}

function genId(prefix = '') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createOrderPending(payload: {
  items: { productId: string; qty: number; name?: string; unitPrice?: number }[];
  shipping: { method: string; price: number } | null;
  address?: any;
  paymentMethod?: string;
  idempotencyKey?: string;
}) {
  // idempotency
  if (payload.idempotencyKey && ordersByIdempotency.has(payload.idempotencyKey)) {
    return { order: ordersByIdempotency.get(payload.idempotencyKey)!, created: false };
  }

  // compute amounts
  const itemsDetailed: OrderItem[] = payload.items.map((it) => {
    const p = ensureProduct(it.productId);
    const unit = typeof it.unitPrice === 'number' ? it.unitPrice : p.price;
    const lineTotal = unit * it.qty;
    return { productId: it.productId, name: it.name ?? p.name, qty: it.qty, unitPrice: unit, lineTotal };
  });
  const subtotal = itemsDetailed.reduce((s, i) => s + i.lineTotal, 0);
  const shippingPrice = payload.shipping?.price ?? 0;
  const tax = 0;
  const total = subtotal + shippingPrice + tax;

  const order: Order = {
    id: genId('ord_'),
    items: itemsDetailed,
    amounts: { subtotal, shipping: shippingPrice, tax, total },
    payment: { method: payload.paymentMethod ?? 'unknown', status: 'pending' },
    status: 'pending',
    user: payload.address ? { name: payload.address.name, email: payload.address.email } : undefined,
    metadata: { idempotencyKey: payload.idempotencyKey, idempotencyKeyCreatedAt: nowIso() },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  ordersById.set(order.id, order);
  if (payload.idempotencyKey) ordersByIdempotency.set(payload.idempotencyKey, order);

  let orderToken: OrderToken | null = null;
  if (payload.paymentMethod === 'wallet') {
    const token = genId('tok_');
    orderToken = { token, orderId: order.id, expiresAt: Date.now() + 1000 * 60 * 15, used: false, createdAt: Date.now() };
    tokens.set(token, orderToken);
  }

  return { order, orderToken, created: true };
}

// New helper: create a payment session for wallet flows without creating an order.
export function createPaymentSession(payload: { items: { productId: string; qty: number }[]; provider: string }) {
  // do minimal validation and return a session token and QR placeholder
  for (const it of payload.items) ensureProduct(it.productId);
  const paymentSession = `ps_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
  const qr = 'data:image/png;base64,...';
  // include payTo metadata so the client can show recipient info
  return { paymentSession, provider: payload.provider, qrDataUrl: qr, instructions: 'Escanea el QR para pagar', payTo: { label: 'La dulcerina', phone: '955336217', owner: 'Neil Villar' } };
}

// Create an order at payment confirmation time (idempotent with idempotencyKey)
export function createOrderFromPayment(payload: { items: { productId: string; qty: number; name?: string; unitPrice?: number }[]; shipping?: { method: string; price: number } | null; address?: any; paymentMethod?: string; idempotencyKey?: string }) {
  // Reuse createOrderPending internals but ensure created status is 'paid'
  const result = createOrderPending({ ...payload, shipping: payload.shipping ?? null });
  const order = result.order;
  order.payment = { ...order.payment, status: 'paid', approvedAt: nowIso() };
  order.status = 'paid';
  ordersById.set(order.id, order);
  if (payload.idempotencyKey) confirmIdempotency.set(payload.idempotencyKey, { orderId: order.id, status: 'paid' });
  return { order, created: result.created };
}

export function confirmPayment({ orderToken, orderId, idempotencyKey }: { orderToken?: string; orderId?: string; idempotencyKey?: string }) {
  // idempotency guard for confirms
  if (idempotencyKey && confirmIdempotency.has(idempotencyKey)) {
    return { ok: true, previous: confirmIdempotency.get(idempotencyKey) };
  }

  let foundOrder: Order | undefined;
  if (orderToken) {
    const t = tokens.get(orderToken);
    if (!t) return { ok: false, error: 'Invalid token' };
    if (t.used) return { ok: false, error: 'Token already used' };
    foundOrder = ordersById.get(t.orderId);
    if (!foundOrder) return { ok: false, error: 'Order not found for token' };
    // mark token used
    t.used = true;
    tokens.set(orderToken, t);
  } else if (orderId) {
    foundOrder = ordersById.get(orderId);
    if (!foundOrder) return { ok: false, error: 'Order not found' };
  } else {
    return { ok: false, error: 'orderToken or orderId required' };
  }

  // mark paid
  foundOrder.payment = { ...foundOrder.payment, status: 'paid', approvedAt: nowIso() };
  foundOrder.status = 'paid';
  foundOrder.updatedAt = nowIso();
  ordersById.set(foundOrder.id, foundOrder);

  if (idempotencyKey) confirmIdempotency.set(idempotencyKey, { orderId: foundOrder.id, status: 'paid' });

  return { ok: true, order: foundOrder };
}

export function dumpState() {
  return {
    products: Array.from(products.values()),
    orders: Array.from(ordersById.values()),
    tokens: Array.from(tokens.values()),
  };
}
