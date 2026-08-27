import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://deci:test@localhost:5432/deci_test?schema=public';
process.env.MONGODB_URI = 'mongodb://localhost:27017/deci_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_123';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_456';
process.env.DATABASE_CONNECTION_REQUIRED = 'false';

const [{ prisma }, { Review }, { ActivityLog }] = await Promise.all([
  import('../src/config/prisma.js'),
  import('../src/models/Review.js'),
  import('../src/models/ActivityLog.js'),
]);

test('Prisma client exposes the planned relational models', () => {
  assert.equal(typeof prisma.user.findMany, 'function');
  assert.equal(typeof prisma.product.findMany, 'function');
  assert.equal(typeof prisma.cart.findUnique, 'function');
  assert.equal(typeof prisma.order.create, 'function');
});

test('MongoDB models enforce review and activity-log structure', () => {
  assert.equal(Review.schema.path('rating').options.min, 1);
  assert.equal(Review.schema.path('rating').options.max, 5);
  assert.equal(ActivityLog.schema.path('action').options.required, true);
  assert.equal(ActivityLog.schema.path('entityType').options.required, true);
});
