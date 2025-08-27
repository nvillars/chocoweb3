#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env.local');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  const productsCount = await db.collection('products').countDocuments();
  const usersCount = await db.collection('users').countDocuments();
  const ordersCount = await db.collection('orders').countDocuments();
  console.log('DB verification:');
  console.log(' products:', productsCount);
  console.log(' users:   ', usersCount);
  console.log(' orders:  ', ordersCount);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(2); });
