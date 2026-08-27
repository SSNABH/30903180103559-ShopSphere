import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://deci:test@localhost:5432/deci_test?schema=public';
process.env.MONGODB_URI = 'mongodb://localhost:27017/deci_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_123';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_456';
process.env.DATABASE_CONNECTION_REQUIRED = 'false';

const [{ prisma }, { ActivityLog }] = await Promise.all([
  import('../src/config/prisma.js'),
  import('../src/models/ActivityLog.js'),
]);

test('Prisma client exposes the planned relational models', () => {
  assert.equal(typeof prisma.user.findMany, 'function');
  assert.equal(typeof prisma.product.findMany, 'function');
  assert.equal(typeof prisma.cart.findUnique, 'function');
  assert.equal(typeof prisma.order.create, 'function');
});

test('MongoDB activity-log model enforces its structure', () => {
  assert.equal(ActivityLog.schema.path('action').options.required, true);
  assert.equal(ActivityLog.schema.path('entityType').options.required, true);
});
