import { connectToDB } from '../src/lib/mongodb';
import { getProductModel } from '../src/models/Product';

async function seed() {
  await connectToDB();
  const Product = getProductModel();
  const items = [
  { slug: 'chocolate-70', name: 'Chocolate 70% Cacao', description: 'Cacao orgánico, sin conservantes, endulzado con panela.', price: 18, stock: 100, published: true, image: '/productos/chocolate-70.svg', tags: ['Orgánico','70%'] },
  { slug: 'chocolate-almendras', name: 'Chocolate con Almendras', description: 'Chocolate oscuro con trozos de almendra.', price: 22, stock: 5, published: true, image: '/productos/chocolate-almendras.svg' },
  { slug: 'chocolate-blanco', name: 'Chocolate Blanco Artesanal', description: 'Chocolate blanco cremoso.', price: 20, stock: 8, published: true, image: '/productos/chocolate-blanco.svg' },
  { slug: 'chocolate-nibs', name: 'Chocolate con Nibs de Cacao', description: 'Chocolate intenso con nibs.', price: 24, stock: 2, published: true, image: '/productos/chocolate-nibs.svg' },
  { slug: 'chocolate-panela', name: 'Chocolate con Panela', description: 'Endulzado con panela.', price: 19, stock: 20, published: true, image: '/productos/chocolate-panela.svg' },
  ];
  for (const it of items) {
    const ex = await Product.findOne({ slug: it.slug }).exec();
    if (!ex) await Product.create(it as any);
  }
  console.log('seeded');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
