import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
// runtime require for mercadopago to avoid bundler/type issues when SDK isn't installed
import { connectToDB } from '../../../../lib/mongodb';
import { getProductModel } from '../../../../models/Product';
import { getOrderModel } from '../../../../models/Order';

const SECRET = process.env.MP_WEBHOOK_SECRET || '';

function timingSafeEqual(a: string | Buffer, b: string | Buffer) {
  const ab = Buffer.isBuffer(a) ? a : Buffer.from(a);
  const bb = Buffer.isBuffer(b) ? b : Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function buildMpSignatureString(bodyRaw: string, requestId: string | null, ts: string | null) {
  // Following MP Secret Signature guide: typically concat requestId + ts + body
  // Use what MP recommends; this is a conservative approach.
  return `${requestId || ''}${ts || ''}${bodyRaw}`;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get('x-signature') || '';
  const requestId = req.headers.get('x-request-id') || null;
  const ts = req.headers.get('x-timestamp') || null;

  const MP_MOCK = process.env.MP_MOCK === '1' || (!process.env.MP_WEBHOOK_SECRET && process.env.NODE_ENV === 'development');
  if (!sig || !SECRET) {
    if (!MP_MOCK) return NextResponse.json({ error: 'Missing signature or secret' }, { status: 401 });
  }

  // verify (skip verification in MP_MOCK mode)
  if (!MP_MOCK) {
    try {
      const payloadToSign = buildMpSignatureString(raw, requestId, ts);
      const expected = crypto.createHmac('sha256', SECRET).update(payloadToSign).digest('hex');
      if (!timingSafeEqual(expected, sig)) {
        console.warn('Invalid MP webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (e) {
      console.error('signature verify error', e);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data, type } = payload;
  if (!data?.id) return NextResponse.json({ error: 'Missing data.id' }, { status: 400 });

  try {
    let payment: any = null;
    if (MP_MOCK && String(data.id).startsWith('MOCK_')) {
      // handle mock event without requiring the SDK
      payment = { id: String(data.id), status: 'approved', metadata: { items: payload?.data?.metadata?.items || [] } };
    } else {
      // require mercadopago SDK only when needed
      let mp: any;
      try {
        // eslint-disable-next-line no-eval
        const reqfn = eval('require') as NodeRequire;
        const Mercadopago = reqfn('mercadopago');
        mp = new Mercadopago({ accessToken: process.env.MP_ACCESS_TOKEN! });
      } catch (e) {
        console.error('mercadopago SDK not available at runtime', e);
        return NextResponse.json({ error: 'Mercado Pago SDK not available' }, { status: 500 });
      }
      const paymentRes = await mp.payment.get({ id: String(data.id) });
      payment = paymentRes?.response ?? paymentRes;
    }
    const status = payment?.status;
    if (status !== 'approved' && status !== 'succeeded') return NextResponse.json({ received: true });

    await connectToDB();
    const Order = getOrderModel();
    const Product = getProductModel();

    const meta = payment.metadata || {};
    const items = meta.items || [];
    const key = meta.idempotencyKey || String(payment.id);

    const existing = await Order.findOne({ 'metadata.idempotencyKey': key }).lean();
    if (existing) return NextResponse.json({ success: true, order: existing });

    const mongoose = await import('mongoose');
    const ObjectId = (await import('mongodb')).ObjectId;

    // Detect whether the MongoDB server supports transactions (i.e. is a replica set or mongos).
    // If not, avoid creating sessions or passing session options to operations to prevent
    // errors like "Transaction numbers are only allowed on a replica set member or mongos".
    let useTransactions = true;
    let session: any = null;
    try {
      // Check server role / replica set status using the admin ismaster/hello command.
      const admin = mongoose.connection.db.admin();
      let isMasterRes: any = null;
      try {
        isMasterRes = await admin.command({ ismaster: 1 });
      } catch (cmdErr) {
        // Some server versions prefer 'hello'
        try {
          isMasterRes = await admin.command({ hello: 1 });
        } catch (helloErr) {
          // if both commands fail, we can't assume transactions are supported
            console.warn('Could not determine MongoDB replica set status, disabling transactions:', String(helloErr || cmdErr));
          useTransactions = false;
        }
      }

      if (isMasterRes && (!isMasterRes.setName && !isMasterRes.msg)) {
        // No replica set name and no mongos message -> standalone
        useTransactions = false;
      }

      if (useTransactions) {
        try {
          session = await mongoose.startSession();
          session.startTransaction();
        } catch (txErr: any) {
          console.warn('Unable to start transaction, falling back to non-transactional flow:', txErr && txErr.message);
          useTransactions = false;
          if (session) {
            try { await session.endSession(); } catch (_) {}
            session = null;
          }
        }
      }
    } catch (err: any) {
      console.warn('Error while checking transaction support, falling back to non-transactional flow:', err && err.message);
      useTransactions = false;
      if (session) {
        try { await session.endSession(); } catch (_) {}
        session = null;
      }
    }

    try {
      // update stock
      for (const it of items) {
        const pid = it.productId;
        const qty = Number(it.qty || it.quantity || 0);
        // debug: log product lookup and qty
        try {
          const existingProd = await Product.findOne({ _id: new ObjectId(pid) }).lean();
          console.log('[MP WEBHOOK] item', { pid, qty, existingProd });
        } catch (lookupErr) {
          console.log('[MP WEBHOOK] product lookup error', { pid, err: String(lookupErr) });
        }

        const updateOpts: any = {};
        if (useTransactions && session) updateOpts.session = session;
        const res = await Product.updateOne({ _id: new ObjectId(pid), stock: { $gte: qty } }, { $inc: { stock: -Number(qty) } }, updateOpts);
        console.log('[MP WEBHOOK] updateOne result', { pid, res: { matchedCount: res.matchedCount, modifiedCount: res.modifiedCount } });
        if (res.modifiedCount === 0) {
          if (MP_MOCK) {
            const doc = await Product.findOne({ _id: new ObjectId(pid) }).lean();
            if (useTransactions && session) {
              try { await session.abortTransaction(); } catch (_) {}
              try { await session.endSession(); } catch (_) {}
            }
            return NextResponse.json({ error: 'Insufficient stock', debug: { pid, qty, product: doc } }, { status: 409 });
          }
          throw new Error('Insufficient stock');
        }
      }

      // compute amounts
      const subtotal = items.reduce((s: number, it: any) => s + (Number(it.lineTotal ?? (it.unitPrice * it.qty)) || 0), 0);
      const shippingPrice = Number(meta.shipping?.price || 0);
      const total = subtotal + shippingPrice + (Number(meta.tax || 0) || 0);

      const orderDoc: any = {
        items: items.map((it: any) => ({ productId: new ObjectId(it.productId), name: it.name || it.title || '', qty: Number(it.qty), unitPrice: Number(it.unitPrice || 0), lineTotal: Number(it.lineTotal || (it.unitPrice * it.qty) || 0) })),
        amounts: { subtotal, shipping: shippingPrice, tax: Number(meta.tax || 0), total },
        payment: { provider: 'mercado_pago', providerId: String(payment.id), method: 'yape', status: 'succeeded', approvedAt: new Date() },
        status: 'paid',
        user: { email: meta.email || '', name: meta.name || '' },
        metadata: { idempotencyKey: key }
      };

      let created: any;
      if (useTransactions && session) {
        created = await Order.create([orderDoc], { session });
        await session.commitTransaction();
        await session.endSession();
      } else {
        // non-transactional fallback: perform ops sequentially
        created = await Order.create([orderDoc]);
      }

      return NextResponse.json({ success: true, order: created[0] });
    } catch (e: any) {
      if (useTransactions && session) {
        try { await session.abortTransaction(); } catch (_) {}
        try { await session.endSession(); } catch (_) {}
      }
      const code = String(e).includes('Insufficient stock') ? 409 : 500;
      if (MP_MOCK) {
        // surface the original error for local debugging
        return NextResponse.json({ error: 'Order creation failed', message: e?.message, stack: e?.stack }, { status: code });
      }
      return NextResponse.json({ error: 'Order creation failed' }, { status: code });
    }
  } catch (e: any) {
    console.error('error fetching payment from mp', e && e.message ? e.message : e);
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 });
  }
}
