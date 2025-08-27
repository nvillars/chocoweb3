import { z } from 'zod';
import { connectToDB } from '../../lib/mongodb';
import { getProductModel } from '../../models/Product';

const createProductSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  published: z.boolean().optional(),
  image: z.string().optional(),
  tags: z.array(z.string()).optional()
});

const updateProductSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().optional(),
  published: z.boolean().optional(),
  image: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export async function listProducts({ includeDeleted = false } = {}) {
  await connectToDB();
  const Product = getProductModel();
  const filter = includeDeleted ? {} : { deletedAt: null };
  const docs = await Product.find(filter).lean().exec();
  return docs;
}

export async function createProduct(input: unknown) {
  const data = createProductSchema.parse(input);
  await connectToDB();
  const Product = getProductModel();
  const existing = await Product.findOne({ slug: data.slug }).exec();
  if (existing) throw new Error('Slug already exists');
  const doc = await Product.create(data);
  return doc.toJSON();
}

export async function updateProduct(idOrSlug: string, patch: unknown) {
  const data = updateProductSchema.parse(patch);
  await connectToDB();
  const Product = getProductModel();

  const query = /^[0-9a-fA-F]{24}$/.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

  if (data.stock !== undefined && data.stock < 0) throw new Error('stock cannot be negative');

  const doc = await Product.findOneAndUpdate(query, { $set: data }, { new: true }).lean().exec();
  if (!doc) throw new Error('Not found');
  return doc;
}

export async function softDeleteProduct(idOrSlug: string) {
  await connectToDB();
  const Product = getProductModel();
  const query = /^[0-9a-fA-F]{24}$/.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const doc = await Product.findOneAndUpdate(query, { $set: { deletedAt: new Date() } }, { new: true }).lean().exec();
  if (!doc) throw new Error('Not found');
  return doc;
}

export async function restoreProduct(idOrSlug: string) {
  await connectToDB();
  const Product = getProductModel();
  const query = /^[0-9a-fA-F]{24}$/.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const doc = await Product.findOneAndUpdate(query, { $set: { deletedAt: null } }, { new: true }).lean().exec();
  if (!doc) throw new Error('Not found');
  return doc;
}

export async function deleteProductPermanent(idOrSlug: string) {
  await connectToDB();
  const Product = getProductModel();
  const query = /^[0-9a-fA-F]{24}$/.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const doc = await Product.findOneAndDelete(query).lean().exec();
  if (!doc) throw new Error('Not found');
  return doc;
}

export async function togglePublish(idOrSlug: string, published: boolean) {
  await connectToDB();
  const Product = getProductModel();
  const query = /^[0-9a-fA-F]{24}$/.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const doc = await Product.findOneAndUpdate(query, { $set: { published } }, { new: true }).lean().exec();
  if (!doc) throw new Error('Not found');
  return doc;
}
