// Script para mover el campo price después de stock en todos los documentos de la colección products
// Ejecuta: node scripts/move-price-field.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI no definido');

async function movePriceField() {
  await mongoose.connect(uri);
  const Product = mongoose.connection.collection('products');

  const products = await Product.find({ price: { $exists: true } }).toArray();
  for (const prod of products) {
    // Construir nuevo documento con price después de stock
    const { price, ...rest } = prod;
    const reordered = {};
    for (const key of Object.keys(rest)) {
      reordered[key] = rest[key];
      if (key === 'stock') {
        reordered['price'] = price;
      }
    }
    // Actualizar el documento con el nuevo orden
    await Product.replaceOne({ _id: prod._id }, reordered);
    console.log(`Reordenado producto ${prod._id}`);
  }
  console.log('Campo price movido después de stock en todos los productos.');
  await mongoose.disconnect();
}

movePriceField().catch(e => { console.error(e); process.exit(1); });
