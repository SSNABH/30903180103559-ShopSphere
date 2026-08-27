import { app } from './app.js';
import { connectMongo, disconnectMongo } from './config/mongo.js';
import { env } from './config/env.js';

let server;

async function start() {
  await connectMongo();
  server = app.listen(env.PORT, () => {
    console.log(`ShopSphere Review Service listening on http://localhost:${env.PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectMongo();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('Failed to start the review service:', error);
  process.exit(1);
});
