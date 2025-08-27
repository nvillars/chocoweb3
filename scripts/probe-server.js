(async function(){
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const endpoints = ['/', '/admin/lista-productos', '/admin/orders', '/api/products', '/api/orders', '/api/events'];
  console.log('Base URL:', base);
  for (const ep of endpoints) {
    try {
      const res = await fetch(base + ep, { method: 'GET' });
      const text = await res.text().catch(()=>'');
      console.log(ep, '=>', res.status, `(len ${text.length})`);
    } catch (err) {
      console.error(ep, 'ERROR =>', err.message || err);
    }
  }
})();
