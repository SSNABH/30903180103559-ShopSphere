import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/review_test';
process.env.SHOPSPHERE_API_URL = 'http://localhost:5000';
process.env.CORS_ORIGIN = 'http://localhost:3000';

const { createReviewService } = await import('../src/services/reviewService.js');

// Moved from the monolith along with the code it covers. The product lookup was
// a Postgres repository there and is a REST call here, so the fixture supplies
// it as an injected function rather than a repository object.
function createFixture() {
  const products = [
    { id: 'product-a', slug: 'product-a', isActive: true },
    { id: 'product-b', slug: 'product-b', isActive: true },
  ];
  const reviews = [
    {
      id: '507f1f77bcf86cd799439011',
      _id: '507f1f77bcf86cd799439011',
      productId: 'product-b',
      userId: 'customer-1',
      userName: 'Customer',
      rating: 5,
      comment: 'Excellent product.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const calls = { findById: 0, update: 0, delete: 0, record: 0 };

  const productLookup = async (identifier) =>
    products.find((product) => product.id === identifier || product.slug === identifier) ?? null;

  const reviewRepository = {
    async findById(id) {
      calls.findById += 1;
      return reviews.find((review) => review.id === id) ?? null;
    },
    async update(id, input) {
      calls.update += 1;
      const review = reviews.find((item) => item.id === id);
      Object.assign(review, input, { updatedAt: new Date() });
      return review;
    },
    async delete(id) {
      calls.delete += 1;
      return reviews.splice(reviews.findIndex((review) => review.id === id), 1)[0];
    },
  };

  const activityLogService = {
    async record() {
      calls.record += 1;
      return null;
    },
  };

  const service = createReviewService(reviewRepository, activityLogService, productLookup);
  return { service, calls };
}

const customer = { id: 'customer-1', name: 'Customer', role: 'CUSTOMER' };

test('rejects updating a review through a different product URL', async () => {
  const { service, calls } = createFixture();

  await assert.rejects(
    () => service.update('product-a', '507f1f77bcf86cd799439011', customer, { rating: 4 }),
    (error) => error.statusCode === 404 && error.code === 'REVIEW_NOT_FOUND',
  );
  assert.equal(calls.update, 0);
});

test('rejects deleting a review through a different product URL', async () => {
  const { service, calls } = createFixture();

  await assert.rejects(
    () => service.delete('product-a', '507f1f77bcf86cd799439011', customer),
    (error) => error.statusCode === 404 && error.code === 'REVIEW_NOT_FOUND',
  );
  assert.equal(calls.delete, 0);
});

test('rejects malformed review identifiers before querying MongoDB', async () => {
  const { service, calls } = createFixture();

  await assert.rejects(
    () => service.update('product-b', 'not-an-object-id', customer, { rating: 4 }),
    (error) => error.statusCode === 404 && error.code === 'REVIEW_NOT_FOUND',
  );
  await assert.rejects(
    () => service.delete('product-b', 'not-an-object-id', customer),
    (error) => error.statusCode === 404 && error.code === 'REVIEW_NOT_FOUND',
  );

  assert.equal(calls.findById, 0);
  assert.equal(calls.update, 0);
  assert.equal(calls.delete, 0);
});

test('preserves valid owner update and deletion behaviour', async () => {
  const { service, calls } = createFixture();

  const updated = await service.update('product-b', '507f1f77bcf86cd799439011', customer, { rating: 4 });
  assert.equal(updated.rating, 4);
  assert.equal(calls.update, 1);

  await service.delete('product-b', '507f1f77bcf86cd799439011', customer);
  assert.equal(calls.delete, 1);
  assert.equal(calls.record, 2);
});

test('a product the main API does not know is a 404', async () => {
  const { service } = createFixture();

  await assert.rejects(
    () => service.list('product-that-does-not-exist', { page: 1, limit: 10 }),
    (error) => error.statusCode === 404 && error.code === 'PRODUCT_NOT_FOUND',
  );
});
