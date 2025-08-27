import connectToDB from '@/lib/mongodb';
import { getOrderModel } from '@/models/Order';
import { getProcessedWebhookModel } from '@/models/ProcessedWebhook';

// Stripe webhook handler (runtime-optional). When STRIPE_WEBHOOK_SECRET is set
// we attempt to validate the signature using the stripe SDK if available.

export async function POST(req: Request) {
  await connectToDB();
  const Order = getOrderModel();

  const bodyText = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event: unknown = null;

  if (process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      // runtime require to avoid bundler issues when stripe isn't installed
      // eslint-disable-next-line no-eval
      const reqfn = eval('require') as NodeRequire;
      type StripeWebhooks = { constructEvent: (body: string, sig: string, secret: string) => unknown };
      type StripeFactory = (key: string) => { webhooks: StripeWebhooks };
      const Stripe = reqfn('stripe') as unknown as StripeFactory;
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');
      event = stripe.webhooks.constructEvent(bodyText, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Stripe webhook signature verification failed:', msg);
      return new Response('Invalid signature', { status: 400 });
    }
  } else {
    try {
      event = JSON.parse(bodyText);
    } catch (e) {
      console.error('Invalid JSON payload to stripe webhook');
      return new Response('Invalid payload', { status: 400 });
    }
  }

  try {
  type StripeEvent = { type?: string; id?: string; data?: { object?: Record<string, unknown> } };
  const evt = event as StripeEvent;
  const type = evt.type;
    const ProcessedWebhook = getProcessedWebhookModel();

    // dedupe by event id if present
  const eventId = evt.id;
  if (eventId) {
      try {
        // use raw collection insert to avoid TS overload ambiguity on Model.create
        await ProcessedWebhook.collection.insertOne({ id: eventId });
      } catch (e: unknown) {
        // duplicate key -> already processed
        const errObj = e as { code?: number | string } | undefined;
        if (errObj && (errObj.code === 11000 || errObj.code === 'E11000')) {
          console.log('Webhook event already processed:', eventId);
          return new Response('ok', { status: 200 });
        }
        throw e;
      }
    }

  if (type === 'payment_intent.succeeded' || type === 'payment_intent.payment_failed') {
  const pi = (evt.data && evt.data.object) as Record<string, unknown> | undefined;
      // find the order by providerId (stored as payment.providerId)
  const providerId = typeof pi?.['id'] === 'string' ? (pi!['id'] as string) : undefined;
  const ord = providerId ? await Order.findOne({ 'payment.providerId': providerId }) : null;
  if (!ord) {
        console.warn('Webhook: could not find order for payment intent', providerId);
        return new Response('ok', { status: 200 });
      }

      if (type === 'payment_intent.succeeded') {
        ord.payment = ord.payment || {};
        ord.payment.status = 'succeeded';
        ord.status = 'paid';
      } else {
        ord.payment = ord.payment || {};
        ord.payment.status = 'failed';
        ord.status = 'failed';
      }

  await ord.save();

      // publish SSE event to notify clients
      try {
        const pub = (globalThis as unknown as { publish?: (e: unknown) => void }).publish;
        if (pub) pub({ type: 'order.updated', payload: { id: ord._id.toString(), status: ord.status } });
      } catch (e: unknown) {
        console.warn('Failed publishing webhook SSE', e instanceof Error ? e.message : e);
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err: unknown) {
    console.error('Error handling stripe webhook', err instanceof Error ? err.message : err);
    return new Response('internal error', { status: 500 });
  }
}
