import { Schema, models, model } from 'mongoose';

const OrderTokenSchema = new Schema({
  token: { type: String, required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

OrderTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function getOrderTokenModel() {
  return models.OrderToken || model('OrderToken', OrderTokenSchema);
}
