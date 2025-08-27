import mongoose from 'mongoose';

// use globalThis to cache connection in dev/hot-reload
type GlobalCache = { mongooseClient?: mongoose.Connection | mongoose.Mongoose } & typeof globalThis;
const g = globalThis as GlobalCache;

export async function connectToDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  if (g.mongooseClient) return g.mongooseClient;

  const conn = await (await import('mongoose')).connect(uri);
  g.mongooseClient = conn;
  return conn;
}

export default connectToDB;
