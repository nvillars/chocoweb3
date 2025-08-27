import mongoose from 'mongoose';

const ProcessedWebhookSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

export function getProcessedWebhookModel() {
  try {
    return mongoose.model('ProcessedWebhook');
  } catch (e) {
    return mongoose.model('ProcessedWebhook', ProcessedWebhookSchema);
  }
}

export default getProcessedWebhookModel;
