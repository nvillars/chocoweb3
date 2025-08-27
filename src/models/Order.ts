import { Schema, models, model, Types } from 'mongoose';

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true }
}, { _id: false });

const OrderSchema = new Schema({
  items: { type: [OrderItemSchema], required: true },
  amounts: {
  subtotal: { type: Number, required: true },
  // store shipping/tax/total as decimal values (units)
  shipping: { type: Number, required: true, default: 0 },
  tax: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true }
  },
  payment: {
    method: { type: String, enum: ['stripe','yape','plin','transfer','cod'], required: true },
    providerId: { type: String },
    status: { type: String, enum: ['requires_payment','succeeded','failed'], default: 'requires_payment' }
  },
  status: { type: String, enum: ['pending','paid','cancelled','failed'], default: 'pending' },
  user: {
    email: { type: String },
    name: { type: String }
  },
  metadata: {
    idempotencyKey: { type: String, index: true },
    idempotencyKeyCreatedAt: { type: Date }
  }
}, { timestamps: true });

OrderSchema.index({ createdAt: -1 });

export function getOrderModel() {
  return models.Order || model('Order', OrderSchema);
}
