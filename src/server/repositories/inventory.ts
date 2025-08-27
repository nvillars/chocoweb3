import { ClientSession, Types } from 'mongoose';
import { getProductModel } from '../../models/Product';

const Product = getProductModel();

export async function decrementStockOrThrow(session: ClientSession | null, items: { productId: string, qty: number }[]) {
  const applied: { productId: string, qty: number }[] = [];
  for (const it of items) {
  const pid = new Types.ObjectId(it.productId);
  const res = await Product.updateOne({ _id: pid, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty } }, session ? { session } : undefined);
    if (res.matchedCount === 0) {
    // find available
  const doc: { stock?: number } | null = await Product.findById(pid).lean();
  throw { code: 'OUT_OF_STOCK', productId: it.productId, available: doc?.stock ?? 0 };
    }
    applied.push({ productId: it.productId, qty: it.qty });
  }
  return applied;
}

export async function restockItems(session: ClientSession | null, items: { productId: string, qty: number }[]) {
  for (const it of items) {
    const pid = new Types.ObjectId(it.productId);
  await Product.updateOne({ _id: pid }, { $inc: { stock: it.qty } }, session ? { session } : undefined);
  }
}
