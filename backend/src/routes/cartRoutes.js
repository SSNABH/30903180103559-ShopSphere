import { Router } from 'express';
import { createCartController } from '../controllers/cartController.js';
import { createAuthenticate } from '../middlewares/authenticate.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { addCartItemSchema, updateCartItemSchema } from '../validators/commerceSchemas.js';

export function createCartRouter({ cartService, userRepository }) {
  const router = Router();
  const controller = createCartController(cartService);
  const authenticate = createAuthenticate(userRepository);
  router.use(authenticate);
  router.get('/', asyncHandler(controller.get));
  router.post('/items', validateBody(addCartItemSchema), asyncHandler(controller.add));
  router.patch('/items/:itemId', validateBody(updateCartItemSchema), asyncHandler(controller.update));
  router.delete('/items/:itemId', asyncHandler(controller.remove));
  router.delete('/', asyncHandler(controller.clear));
  return router;
}
