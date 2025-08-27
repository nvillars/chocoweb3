This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

![Smoke test](https://github.com/nvillars/chocoweb3/actions/workflows/smoke-test.yml/badge.svg)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Smoke tests (concurrency + idempotency)

There is an automated smoke-test that verifies the order flow (idempotency and concurrent stock race). It is run in CI and can be executed locally.

CI: The workflow `.github/workflows/smoke-test.yml` starts a Mongo service, builds the app and runs `scripts/smoke-test.ts`.

Locally:

1. Ensure you have a MongoDB server running and reachable via `MONGODB_URI` or use the default `mongodb://127.0.0.1:27017/chocoweb`.
2. Start the dev server (or production build):

```powershell
$env:MONGODB_URI='mongodb://127.0.0.1:27017/chocoweb'
npm run dev
```

3. In a separate shell run the smoke test (the script expects BASE_URL to point to your running app):

```powershell
#$env:BASE_URL='http://localhost:3000'; npm run smoke:orders --silent
```

Stripe: Stripe is optional. If `STRIPE_SECRET_KEY` is not present the server will run in offline payment mode for testing.

## Stripe webhooks

If you enable Stripe payments you should also enable webhooks so the server receives asynchronous payment updates.

1. Set environment variables in your deployment or `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

2. The app exposes a webhook endpoint at `/api/webhooks/stripe` which validates the signature when `STRIPE_WEBHOOK_SECRET` is present and updates the corresponding order status (looks up orders by `payment.providerId`).

3. To test locally you can use the Stripe CLI:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Then trigger events with the CLI, e.g.:

```powershell
stripe trigger payment_intent.succeeded
```

Note: the webhook handler persists processed Stripe event ids to avoid double-processing (`ProcessedWebhook` model). If you replay events, only the first delivery will be applied.

