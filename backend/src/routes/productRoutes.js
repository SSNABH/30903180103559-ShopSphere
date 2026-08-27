import { Router } from 'express';
import { createProductController } from '../controllers/productController.js';
import { authorize, createAuthenticate } from '../middlewares/authenticate.js';
import { uploadProductImages } from '../middlewares/productUpload.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createProductSchema, productQuerySchema, updateProductSchema } from '../validators/commerceSchemas.js';

// Review routes used to be nested here. They now belong to the independently
// deployed review service, which resolves products by calling GET
// /api/products/:identifier below.
export function createProductRouter({ productService, userRepository }) {
  const router = Router();
  const controller = createProductController(productService);
  const authenticate = createAuthenticate(userRepository);

  router.get('/', validateQuery(productQuerySchema), asyncHandler(controller.list));
  router.get('/:identifier', asyncHandler(controller.get));
  router.post('/', authenticate, authorize('ADMIN'), validateBody(createProductSchema), asyncHandler(controller.create));
  router.patch('/:id', authenticate, authorize('ADMIN'), validateBody(updateProductSchema), asyncHandler(controller.update));
  router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(controller.delete));
  router.post('/:id/images', authenticate, authorize('ADMIN'), uploadProductImages, asyncHandler(controller.addImages));
  router.delete('/:id/images/:imageId', authenticate, authorize('ADMIN'), asyncHandler(controller.deleteImage));
  return router;
}
