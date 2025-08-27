import { Schema, models, model } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  // do not return passwordHash by default from queries
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
}, { timestamps: true });

export function getUserModel() {
  return models.User || model('User', UserSchema);
}
