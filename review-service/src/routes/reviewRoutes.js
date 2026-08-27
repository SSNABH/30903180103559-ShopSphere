import { Router } from 'express';
import { createReviewController } from '../controllers/reviewController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paginationSchema, reviewSchema, updateReviewSchema } from '../validators/reviewSchemas.js';

// The paths mirror the routes the monolith served, so the storefront changes
// only which origin it calls, not how it calls it.
export function createReviewRouter({ reviewService }) {
  const router = Router();
  const reviews = createReviewController(reviewService);

  router.get('/reviews/count', asyncHandler(reviews.count));

  router.get('/products/:identifier/reviews', validateQuery(paginationSchema), asyncHandler(reviews.list));
  router.post(
    '/products/:identifier/reviews',
    authenticate,
    validateBody(reviewSchema),
    asyncHandler(reviews.create),
  );
  router.patch(
    '/products/:identifier/reviews/:reviewId',
    authenticate,
    validateBody(updateReviewSchema),
    asyncHandler(reviews.update),
  );
  router.delete('/products/:identifier/reviews/:reviewId', authenticate, asyncHandler(reviews.delete));

  return router;
}
