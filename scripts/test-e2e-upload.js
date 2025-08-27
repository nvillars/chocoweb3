const fs = require('fs');
const fetch = global.fetch || require('node-fetch');

async function main() {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='; // 1x1 png
  const dataUrl = `data:image/png;base64,${base64}`;
  console.log('Uploading image...');
  const upl = await fetch('http://localhost:3000/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: 'tiny.png', data: dataUrl }) });
  if (!upl.ok) { console.error('upload failed', await upl.text()); process.exit(1); }
  const uj = await upl.json();
  console.log('Uploaded ->', uj.url);

  const name = 'E2E Test ' + Date.now();
  const slug = 'e2e-test-' + Date.now();
  console.log('Creating product...');
  const create = await fetch('http://localhost:3000/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, slug, description: 'desc', image: uj.url, priceCents: 1000, stock: 5, published: true, tags: [] }) });
  if (!create.ok) { console.error('create failed', await create.text()); process.exit(1); }
  const created = await create.json();
  console.log('Created product id:', created._id || created.id || '(unknown)');
  const id = created._id || created.id;

  console.log('Editing product name...');
  const edit = await fetch(`http://localhost:3000/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name + ' EDITED' }) });
  console.log('Edit status', edit.status);

  console.log('Toggling publish to false...');
  const pub = await fetch(`http://localhost:3000/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: false }) });
  console.log('Publish toggle status', pub.status);

  console.log('Deleting product...');
  const del = await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' });
  console.log('Delete status', del.status);

  console.log('Done E2E');
}

main().catch(e => { console.error(e); process.exit(1); });
