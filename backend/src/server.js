import { app } from './app.js';
import { connectMongo, disconnectMongo } from './config/mongo.js';
import { connectPostgres, disconnectPostgres } from './config/prisma.js';
import { env } from './config/env.js';

async function connectDatabases() {
  const results = await Promise.allSettled([connectPostgres(), connectMongo()]);
  const failures = results.filter((result) => result.status === 'rejected');

  if (failures.length > 0) {
    failures.forEach((failure) => console.error('Database connection failed:', failure.reason));
    if (env.DATABASE_CONNECTION_REQUIRED) {
      throw new Error('Required database connection could not be established.');
    }
  }
}

let server;

async function start() {
  await connectDatabases();
  server = app.listen(env.PORT, () => {
    console.log(`DECI.Project API listening on http://localhost:${env.PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await Promise.allSettled([disconnectPostgres(), disconnectMongo()]);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
