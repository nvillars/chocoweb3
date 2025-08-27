/*
  Smoke concurrency test: send two parallel orders for the same product (stock=1 expected)
  Usage: node scripts/smoke-concurrency.js --product=<productId> --base=http://localhost:3000
*/
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const argv = Object.fromEntries(process.argv.slice(2).map(a => { const [k,v]=a.split('='); return [k.replace(/^--/,'')||k,v||true]; }));
const BASE = argv.base || process.env.BASE_URL || 'http://127.0.0.1:3000';
const PRODUCT = argv.product || process.env.SMOKE_PRODUCT_ID;

if (!PRODUCT) {
  console.error('Provide --product=<id> or set SMOKE_PRODUCT_ID');
  process.exit(2);
}

async function place(idempotencyKey) {
  const body = { user: { name: 'Smoke', email: 'smoke@example.com' }, items: [{ productId: PRODUCT, qty: 1 }] };
  const res = await fetch(`${BASE}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) });
  const txt = await res.text();
  return { status: res.status, body: txt };
}

(async ()=>{
  const k1 = uuidv4();
  const k2 = uuidv4();
  console.log('Running two parallel orders for product', PRODUCT);
  const p1 = place(k1);
  const p2 = place(k2);
  const [r1, r2] = await Promise.all([p1,p2]);
  console.log('Result A:', r1.status, r1.body);
  console.log('Result B:', r2.status, r2.body);
  process.exit(0);
})();
