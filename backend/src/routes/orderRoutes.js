import { Router } from 'express';
import { createOrderController } from '../controllers/orderController.js';
import { createAuthenticate } from '../middlewares/authenticate.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkoutSchema } from '../validators/commerceSchemas.js';

export function createOrderRouter({ orderService, userRepository }) {
  const router = Router();
  const controller = createOrderController(orderService);
  const authenticate = createAuthenticate(userRepository);
  router.use(authenticate);
  router.post('/checkout', validateBody(checkoutSchema), asyncHandler(controller.checkout));
  router.get('/mine', asyncHandler(controller.listMine));
  router.get('/:id', asyncHandler(controller.get));
  return router;
}
