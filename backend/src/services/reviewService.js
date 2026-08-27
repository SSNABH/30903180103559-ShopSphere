import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

function serializeReview(review) {
  if (!review) return null;
  return {
    id: String(review._id ?? review.id),
    productId: review.productId,
    userId: review.userId,
    userName: review.userName,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export function createReviewService(reviewRepository, productRepository, activityLogService) {
  async function productFor(identifier) {
    const product = await productRepository.findById(identifier) ?? await productRepository.findBySlug(identifier);
    if (!product || !product.isActive) throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
    return product;
  }

  function ensureValidReviewId(reviewId) {
    if (!mongoose.isValidObjectId(reviewId)) {
      throw new AppError('Review was not found.', 404, 'REVIEW_NOT_FOUND');
    }
  }

  return {
    async list(identifier, pagination) {
      const product = await productFor(identifier);
      const result = await reviewRepository.listByProduct(product.id, pagination);
      return {
        ...result,
        items: result.items.map(serializeReview),
        summary: {
          averageRating: Number(result.summary.averageRating ?? 0),
          reviewCount: Number(result.summary.reviewCount ?? result.total ?? 0),
        },
      };
    },
    async create(identifier, user, input) {
      const product = await productFor(identifier);
      const existing = await reviewRepository.findByProductAndUser(product.id, user.id);
      if (existing) throw new AppError('You have already reviewed this product.', 409, 'REVIEW_EXISTS');
      const review = await reviewRepository.create({
        productId: product.id,
        userId: user.id,
        userName: user.name,
        rating: input.rating,
        comment: input.comment,
      });
      await activityLogService.record({ actor: user, action: 'REVIEW_CREATED', entityType: 'REVIEW', entityId: String(review._id ?? review.id), metadata: { productId: product.id, rating: input.rating } });
      return serializeReview(review);
    },
    async update(identifier, reviewId, user, input) {
      const product = await productFor(identifier);
      ensureValidReviewId(reviewId);
      const current = await reviewRepository.findById(reviewId);
      if (!current || current.productId !== product.id) {
        throw new AppError('Review was not found.', 404, 'REVIEW_NOT_FOUND');
      }
      if (current.userId !== user.id) throw new AppError('You can only edit your own review.', 403, 'FORBIDDEN');
      const review = await reviewRepository.update(reviewId, input);
      await activityLogService.record({ actor: user, action: 'REVIEW_UPDATED', entityType: 'REVIEW', entityId: reviewId, metadata: { productId: current.productId } });
      return serializeReview(review);
    },
    async delete(identifier, reviewId, user) {
      const product = await productFor(identifier);
      ensureValidReviewId(reviewId);
      const current = await reviewRepository.findById(reviewId);
      if (!current || current.productId !== product.id) {
        throw new AppError('Review was not found.', 404, 'REVIEW_NOT_FOUND');
      }
      if (current.userId !== user.id && user.role !== 'ADMIN') throw new AppError('You can only delete your own review.', 403, 'FORBIDDEN');
      await reviewRepository.delete(reviewId);
      await activityLogService.record({ actor: user, action: 'REVIEW_DELETED', entityType: 'REVIEW', entityId: reviewId, metadata: { productId: current.productId } });
      return { id: reviewId };
    },
  };
}
