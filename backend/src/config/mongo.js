import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function getMongoStatus() {
  const labels = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return labels[mongoose.connection.readyState] ?? 'unknown';
}
