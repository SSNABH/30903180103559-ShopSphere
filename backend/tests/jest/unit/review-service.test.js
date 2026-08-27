import { jest } from '@jest/globals';
import { createReviewService } from '../../../src/services/reviewService.js';

function createFixture() {
  const products = [
    { id: 'product-a', slug: 'product-a', isActive: true },
    { id: 'product-b', slug: 'product-b', isActive: true },
  ];
  const reviews = [{
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    productId: 'product-b',
    userId: 'customer-1',
    userName: 'Customer',
    rating: 5,
    comment: 'Excellent product.',
    createdAt: new Date(),
    updatedAt: new Date(),
  }];

  const productRepository = {
    findById: async (id) => products.find((product) => product.id === id) ?? null,
    findBySlug: async (slug) => products.find((product) => product.slug === slug) ?? null,
  };
  const reviewRepository = {
    findById: jest.fn(async (id) => reviews.find((review) => review.id === id) ?? null),
    update: jest.fn(async (id, input) => {
      const review = reviews.find((item) => item.id === id);
      Object.assign(review, input, { updatedAt: new Date() });
      return review;
    }),
    delete: jest.fn(async (id) => reviews.splice(reviews.findIndex((review) => review.id === id), 1)[0]),
  };
  const activityLogService = { record: jest.fn(async () => null) };
  const service = createReviewService(reviewRepository, productRepository, activityLogService);

  return { service, reviewRepository, activityLogService };
}

describe('review product relationship validation', () => {
  const customer = { id: 'customer-1', name: 'Customer', role: 'CUSTOMER' };

  test('rejects updating a review through a different product URL', async () => {
    const { service, reviewRepository } = createFixture();

    await expect(service.update('product-a', '507f1f77bcf86cd799439011', customer, { rating: 4 }))
      .rejects.toMatchObject({ statusCode: 404, code: 'REVIEW_NOT_FOUND' });
    expect(reviewRepository.update).not.toHaveBeenCalled();
  });

  test('rejects deleting a review through a different product URL', async () => {
    const { service, reviewRepository } = createFixture();

    await expect(service.delete('product-a', '507f1f77bcf86cd799439011', customer))
      .rejects.toMatchObject({ statusCode: 404, code: 'REVIEW_NOT_FOUND' });
    expect(reviewRepository.delete).not.toHaveBeenCalled();
  });

  test('rejects malformed review identifiers before querying MongoDB', async () => {
    const { service, reviewRepository } = createFixture();

    await expect(service.update('product-b', 'not-an-object-id', customer, { rating: 4 }))
      .rejects.toMatchObject({ statusCode: 404, code: 'REVIEW_NOT_FOUND' });
    await expect(service.delete('product-b', 'not-an-object-id', customer))
      .rejects.toMatchObject({ statusCode: 404, code: 'REVIEW_NOT_FOUND' });

    expect(reviewRepository.findById).not.toHaveBeenCalled();
    expect(reviewRepository.update).not.toHaveBeenCalled();
    expect(reviewRepository.delete).not.toHaveBeenCalled();
  });

  test('preserves valid owner update and deletion behavior', async () => {
    const { service, reviewRepository, activityLogService } = createFixture();

    const updated = await service.update('product-b', '507f1f77bcf86cd799439011', customer, { rating: 4 });
    expect(updated.rating).toBe(4);
    expect(reviewRepository.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', { rating: 4 });

    await service.delete('product-b', '507f1f77bcf86cd799439011', customer);
    expect(reviewRepository.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(activityLogService.record).toHaveBeenCalledTimes(2);
  });
});
