import { Router } from 'express';
import { createCategoryController } from '../controllers/categoryController.js';
import { authorize, createAuthenticate } from '../middlewares/authenticate.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createCategorySchema, updateCategorySchema } from '../validators/commerceSchemas.js';

export function createCategoryRouter({ categoryService, userRepository }) {
  const router = Router();
  const controller = createCategoryController(categoryService);
  const authenticate = createAuthenticate(userRepository);
  router.get('/', asyncHandler(controller.list));
  router.post('/', authenticate, authorize('ADMIN'), validateBody(createCategorySchema), asyncHandler(controller.create));
  router.patch('/:id', authenticate, authorize('ADMIN'), validateBody(updateCategorySchema), asyncHandler(controller.update));
  router.delete('/:id', authenticate, authorize('ADMIN'), asyncHandler(controller.delete));
  return router;
}
