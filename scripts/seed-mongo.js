#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Create a .env.local with MONGODB_URI and try again.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // sample products
  const products = [
    {
      slug: 'chocolate-70',
      name: 'Chocolate 70% Cacao',
      description: 'Cacao orgánico, sin conservantes, endulzado con panela.',
  price: 18,
      stock: 100,
      published: true,
      image: '/productos/chocolate-70.svg',
      tags: ['Orgánico','70% cacao']
    },
    {
      slug: 'choco-almendras',
      name: 'Chocolate con Almendras',
      description: 'Chocolate oscuro con trozos de almendra.',
  price: 22,
      stock: 25,
      published: true,
      image: '/productos/chocolate-almendras.svg',
      tags: ['Almendras']
    }
  ];

  // upsert products
  for (const p of products) {
    await db.collection('products').updateOne(
      { slug: p.slug },
      { $set: p },
      { upsert: true }
    );
    console.log('Upserted product', p.slug);
  }

  // sample users
  const users = [
    { email: 'admin@local', name: 'Admin Local', role: 'admin' },
    { email: 'user@local', name: 'Cliente Demo', role: 'user' }
  ];
  for (const u of users) {
    await db.collection('users').updateOne(
      { email: u.email },
      { $set: { ...u, createdAt: new Date() } },
      { upsert: true }
    );
    console.log('Upserted user', u.email);
  }

  // create a sample order referencing products and user
  const admin = await db.collection('users').findOne({ email: 'user@local' });
  const prod1 = await db.collection('products').findOne({ slug: 'chocolate-70' });
  if (admin && prod1) {
    const order = {
      userId: admin._id,
      items: [ { productId: prod1._id, qty: 2, unitPrice: prod1.price } ],
      status: 'pending',
      createdAt: new Date()
    };
    await db.collection('orders').insertOne(order);
    console.log('Inserted sample order');
  } else {
    console.log('Skipping sample order (users/products missing)');
  }

  console.log('Seeding finished.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
