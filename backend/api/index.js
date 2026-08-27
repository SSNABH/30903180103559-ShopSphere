// Serverless entry point for Vercel.
//
// The Express application is exported instead of being started with
// app.listen(), because Vercel invokes it per request rather than running a
// long-lived server. src/server.js is still the entry point for Docker and for
// the Kubernetes pods, where a listening server is what is wanted.
//
// src/server.js also opens the database connections before listening, and that
// step has to happen here too. Prisma connects lazily on its first query, so it
// needs nothing. Mongoose does not, and the Review model disables command
// buffering, so a query issued before the connection is up fails outright.
// The connection is therefore established on the first request and cached on
// globalThis, which survives for the life of a warm instance.
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { connectMongo } from '../src/config/mongo.js';

function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();

  globalThis.__shopsphereMongoConnection ??= connectMongo().catch((error) => {
    // Clear the cache so the next request retries rather than reusing a
    // rejected promise for the rest of the instance's life.
    globalThis.__shopsphereMongoConnection = undefined;
    throw error;
  });

  return globalThis.__shopsphereMongoConnection;
}

export default async function handler(request, response) {
  try {
    await ensureMongoConnection();
  } catch (error) {
    // Reviews and activity logs need Mongo, but products, cart, and checkout
    // run on Postgres alone. Logging and continuing keeps the rest of the API
    // available, and /api/health still reports mongodb as down.
    console.error('MongoDB connection failed:', error.message);
  }

  return app(request, response);
}
