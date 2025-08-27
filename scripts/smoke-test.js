/**
 * Simple smoke test that calls the local Next dev server APIs.
 * Usage: node scripts/smoke-test.js
 */
(async function(){
  const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
  console.log('Base URL:', base);
  try {
    const r1 = await fetch(`${base}/api/products`);
    if (!r1.ok) throw new Error('/api/products GET failed: ' + r1.status);
    const initial = await r1.json();
    console.log('Initial products count:', initial.length);

    const slug = 'smoke-' + Math.floor(Math.random()*100000);
    const payload = { name: 'Smoke Test', slug, description: 'Prueba automatizada', image: '', priceCents: 999, stock: 3, published: true, tags: [] };
    console.log('Creating product', slug);
    const r2 = await fetch(`${base}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r2.ok) {
      const txt = await r2.text();
      throw new Error('Create failed: ' + r2.status + ' ' + txt);
    }
    const created = await r2.json();
    console.log('Created id:', created._id || created.id || created.slug);

    console.log('Deleting created product...');
    const r3 = await fetch(`${base}/api/products/${created._id || created.id || created.slug}`, { method: 'DELETE' });
    if (!r3.ok) {
      const txt = await r3.text();
      throw new Error('Delete failed: ' + r3.status + ' ' + txt);
    }
    console.log('Delete response OK');

    console.log('Restoring product...');
    const r4 = await fetch(`${base}/api/products/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: created._id || created.id || created.slug }) });
    if (!r4.ok) {
      const txt = await r4.text();
      throw new Error('Restore failed: ' + r4.status + ' ' + txt);
    }
    const restored = await r4.json();
    console.log('Restore returned id:', restored._id || restored.id || restored.slug);

    const r5 = await fetch(`${base}/api/products`);
    const after = await r5.json();
    const found = after.find(p => p._id === (restored._id || restored.id) || p.slug === slug);
    console.log('Final products count:', after.length, 'restored found:', Boolean(found));
    process.exit(found ? 0 : 2);
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
})();
