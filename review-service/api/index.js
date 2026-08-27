// Serverless entry point for Vercel.
//
// As in the main API, the Express app is exported rather than started with
// app.listen(). Mongoose does not connect lazily and the Review model disables
// command buffering, so the connection is opened on the first request and
// cached on globalThis for the life of a warm instance.
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { connectMongo } from '../src/config/mongo.js';

function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();

  globalThis.__reviewServiceMongoConnection ??= connectMongo().catch((error) => {
    // Clear the cache so the next request retries rather than reusing a
    // rejected promise for the rest of the instance's life.
    globalThis.__reviewServiceMongoConnection = undefined;
    throw error;
  });

  return globalThis.__reviewServiceMongoConnection;
}

export default async function handler(request, response) {
  try {
    await ensureMongoConnection();
  } catch (error) {
    // Every route in this service needs Mongo, so /api/health reporting the
    // failure is more useful than a crashed instance with no explanation.
    console.error('MongoDB connection failed:', error.message);
  }

  return app(request, response);
}
