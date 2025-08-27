import { Schema, models, model } from 'mongoose';

const ProductSchema = new Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, default: 0 },
  stock: { type: Number, required: true, default: 0 },
  published: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  image: { type: String, default: '' },
  tags: { type: [String], default: [] }
}, { timestamps: true });

export function getProductModel() {
  return models.Product || model('Product', ProductSchema);
}
