const key = process.env.STRIPE_SECRET_KEY;

type StripeClient = {
  paymentIntents: {
    create: (opts: { amount: number; currency: string; automatic_payment_methods?: { enabled: boolean } }) => Promise<{ id: string; client_secret?: string }>;
    retrieve: (id: string) => Promise<unknown>;
  };
};

let stripe: StripeClient | null = null;
async function ensureStripe(): Promise<StripeClient | null> {
  if (stripe) return stripe;
  if (!key) return null;
  try {
    // avoid static analysis by using eval to obtain require
    // eslint-disable-next-line no-eval
    const req = eval("require") as NodeRequire;
    const StripePkg = req('stripe') as unknown;
    // construct stripe client at runtime; typing kept loose
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stripe = (new (StripePkg as any)(key, { apiVersion: '2022-11-15' })) as StripeClient;
  } catch (e) {
    // stripe unavailable at runtime
    return null;
  }
  return stripe;
}

export async function createPaymentIntent(amountCents: number, currency = 'pen'): Promise<{ id: string; clientSecret?: string }> {
  const s = await ensureStripe();
  if (!s) throw new Error('NO_STRIPE');
  const stripeClient = s as StripeClient;
  const pi = await stripeClient.paymentIntents.create({ amount: amountCents, currency, automatic_payment_methods: { enabled: true } });
  return { id: pi.id, clientSecret: pi.client_secret };
}

export async function retrievePaymentIntent(id: string) {
  const s = await ensureStripe();
  if (!s) throw new Error('NO_STRIPE');
  const stripeClient = s as StripeClient;
  return stripeClient.paymentIntents.retrieve(id);
}
