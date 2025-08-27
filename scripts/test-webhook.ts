// Simple script to POST a fake stripe webhook event to the local server.
// Usage: dotenv -e .env.local -- tsx scripts/test-webhook.ts

const base = process.env.BASE_URL || 'http://localhost:3000';

async function run() {
  // ensure fetch is available (Node 18+ has global fetch)
  let _fetch: typeof fetch;
  if (typeof globalThis.fetch === 'function') {
    // @ts-ignore
    _fetch = globalThis.fetch.bind(globalThis);
  } else {
    // dynamic require to avoid static type checks for node-fetch
    // eslint-disable-next-line no-eval
    const req: any = eval('require');
    // @ts-ignore
    const nf = req('node-fetch');
    // @ts-ignore
    _fetch = nf.default || nf;
  }

  const fakeEvent = {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_${Math.random().toString(36).slice(2)}`,
        amount: 398,
        currency: 'pen'
      }
    }
  };

  const res = await _fetch(`${base}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fakeEvent)
  });

  console.log('status', res.status);
  console.log(await res.text());
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
