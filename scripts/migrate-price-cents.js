// Script para migrar priceCents a price (en soles) en la colección products
// Ejecuta: node scripts/migrate-price-cents.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI no definido');

async function migrate() {
  await mongoose.connect(uri);
  const Product = mongoose.connection.collection('products');

  // 1. Migrar priceCents a price (en soles)
  const productsWithPriceCents = await Product.find({ priceCents: { $exists: true } }).toArray();
  for (const prod of productsWithPriceCents) {
    const priceSoles = typeof prod.priceCents === 'number' ? prod.priceCents / 100 : 0;
    await Product.updateOne(
      { _id: prod._id },
      { $set: { price: priceSoles }, $unset: { priceCents: "" } }
    );
    console.log(`Migrado producto ${prod._id}: priceCents ${prod.priceCents} -> price ${priceSoles}`);
  }

  // 2. Asegurar que todos los productos tengan el campo price
  await Product.updateMany(
    { price: { $exists: false } },
    { $set: { price: 0 } }
  );

  console.log('Migración completada.');
  await mongoose.disconnect();
}

migrate().catch(e => { console.error(e); process.exit(1); });
