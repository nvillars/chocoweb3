// DEPRECATED: utilities to persist and read app data in localStorage (mock backend).
// The project now uses MongoDB via src/server/repositories. This file remains for
// local demo and backwards compatibility but should be migrated away from.
export const STORAGE_KEY = 'ladulcerina:data';

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  published: boolean;
  deletedAt?: string | null;
  image: string;
  tags: string[];
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
};

export type Order = {
  id: number;
  userId: number | null;
  items: { productId: number; qty: number; price: number }[];
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
};

type StorageShape = {
  products: Product[];
  users: User[];
  orders: Order[];
 };

const defaultData: StorageShape = {
  products: [
  { id: 1, name: 'Chocolate 70% Cacao', description: 'Cacao orgánico, sin conservantes, endulzado con panela.', price: 18.0, stock: 100, published: true, image: '/productos/chocolate-70.svg', tags: ['Orgánico','70% cacao'] },
  { id: 2, name: 'Chocolate con Almendras', description: 'Chocolate oscuro con trozos de almendra.', price: 22.0, stock: 5, published: true, image: '/productos/chocolate-almendras.svg', tags: ['Almendras'] },
  { id: 3, name: 'Chocolate Blanco Artesanal', description: 'Chocolate blanco cremoso, elaborado artesanalmente.', price: 20.0, stock: 8, published: true, image: '/productos/chocolate-blanco.svg', tags: ['Artesanal'] },
  { id: 4, name: 'Chocolate con Nibs de Cacao', description: 'Chocolate intenso con nibs.', price: 24.0, stock: 2, published: true, image: '/productos/chocolate-nibs.svg', tags: ['Nibs'] },
  { id: 5, name: 'Chocolate con Panela', description: 'Chocolate endulzado con panela.', price: 19.0, stock: 0, published: true, image: '/productos/chocolate-panela.svg', tags: ['Panela'] }
  ],
  users: [
    { id: 1, name: 'Admin Demo', email: 'admin@ladulceria.test', role: 'admin' },
    { id: 2, name: 'Usuario Demo', email: 'user@ladulceria.test', role: 'user' }
  ],
  orders: []
};

export function readData(): StorageShape {
  if (typeof window === 'undefined') return defaultData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw) as StorageShape;
  } catch (e) {
    console.error('readData error', e);
    return defaultData;
  }
}

export function writeData(next: StorageShape) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function resetData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
}

export function findProduct(id: number) {
  const d = readData();
  return d.products.find(p => p.id === id) || null;
}

export function updateProduct(updated: Product) {
  const d = readData();
  d.products = d.products.map(p => (p.id === updated.id ? updated : p));
  writeData(d);
}

export function softDeleteProduct(id: number) {
  const d = readData();
  d.products = d.products.map(p => p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p);
  writeData(d);
}

export function restoreProduct(id: number) {
  const d = readData();
  d.products = d.products.map(p => p.id === id ? { ...p, deletedAt: null } : p);
  writeData(d);
}

export function createOrder(order: Omit<Order, 'id' | 'createdAt'>) {
  const d = readData();
  const id = Date.now();
  const newOrder: Order = { ...order, id, createdAt: new Date().toISOString() };
  // check stock and decrement
  for (const item of order.items) {
    const prod = d.products.find(p => p.id === item.productId);
    if (!prod || prod.stock < item.qty) {
      throw new Error('STOCK');
    }
  }
  for (const item of order.items) {
    const prod = d.products.find(p => p.id === item.productId)!;
    prod.stock = Math.max(0, prod.stock - item.qty);
  }
  d.orders.push(newOrder);
  writeData(d);
  return newOrder;
}

export function listProducts() {
  return readData().products;
}

export function listUsers() {
  return readData().users;
}

export function listOrders() {
  return readData().orders;
}
