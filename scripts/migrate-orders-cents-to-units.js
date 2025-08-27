#!/usr/bin/env node
require('dotenv').config();
const { MongoClient } = require('mongodb');

const argv = process.argv.slice(2);
// allow passing --mongo "<uri>" or using MONGODB_URI env var
let MONGODB_URI = process.env.MONGODB_URI;
const mongoIndex = argv.indexOf('--mongo');
if (mongoIndex !== -1 && argv[mongoIndex + 1]) {
  MONGODB_URI = argv[mongoIndex + 1];
}
if (!MONGODB_URI) {
  console.error('MONGODB_URI no está configurada. Pasa --mongo "<uri>" o exporta MONGODB_URI.');
  process.exit(1);
}

const apply = argv.includes('--apply');

async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const orders = db.collection('orders');

  const q = {
    $or: [
      { 'items.unitPriceCents': { $exists: true } },
      { 'items.lineTotalCents': { $exists: true } },
      { 'amounts.subtotalCents': { $exists: true } },
      { 'amounts.shippingCents': { $exists: true } },
      { 'amounts.taxCents': { $exists: true } },
      { 'amounts.totalCents': { $exists: true } }
    ]
  };

  const cursor = orders.find(q).batchSize(100);
  let count = 0;
  let examples = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    count++;
  const update = {};

    // items
    const items = Array.isArray(doc.items) ? doc.items : [];
    const newItems = items.map(it => {
      const ni = { ...it };
      if (ni.unitPrice == null && ni.unitPriceCents != null) {
        ni.unitPrice = Number((ni.unitPriceCents / 100));
      }
      if (ni.lineTotal == null && ni.lineTotalCents != null) {
        ni.lineTotal = Number((ni.lineTotalCents / 100));
      }
      // remove old cents fields if present
      delete ni.unitPriceCents;
      delete ni.lineTotalCents;
      return ni;
    });

    // amounts
    const amt = doc.amounts || {};
    const newAmounts = { ...amt };
    if (newAmounts.subtotal == null && newAmounts.subtotalCents != null) {
      newAmounts.subtotal = Number((newAmounts.subtotalCents / 100));
    }
    if (newAmounts.shipping == null && newAmounts.shippingCents != null) {
      newAmounts.shipping = Number((newAmounts.shippingCents / 100));
    }
    if (newAmounts.tax == null && newAmounts.taxCents != null) {
      newAmounts.tax = Number((newAmounts.taxCents / 100));
    }
    if (newAmounts.total == null && newAmounts.totalCents != null) {
      newAmounts.total = Number((newAmounts.totalCents / 100));
    }
    // remove old cents fields
    delete newAmounts.subtotalCents;
    delete newAmounts.shippingCents;
    delete newAmounts.taxCents;
    delete newAmounts.totalCents;

    update.$set = { items: newItems, amounts: newAmounts };

    // In dry-run we just collect examples
    if (!apply) {
      if (examples.length < 5) {
        examples.push({ _id: doc._id, before: { items: items.slice(0,2), amounts: doc.amounts }, after: { items: newItems.slice(0,2), amounts: newAmounts } });
      }
    } else {
      await orders.updateOne({ _id: doc._id }, update);
    }
  }

  console.log(`Encontrados ${count} documentos que necesitan migración.`);
  if (!apply) {
    console.log('Modo dry-run (no se aplicaron cambios). Para aplicar, ejecuta con --apply');
    console.log('Ejemplos de cambios (hasta 5):');
    console.dir(examples, { depth: 4, colors: false });
  } else {
    console.log('Migración aplicada: los campos *_Cents fueron convertidos a unidades y reemplazados.');
  }

  await client.close();
}

migrate().catch(err => {
  console.error('Error en migración:', err);
  process.exit(1);
});
