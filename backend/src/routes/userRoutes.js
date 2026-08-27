import { Router } from 'express';
import { createUserController } from '../controllers/userController.js';
import { authorize, createAuthenticate } from '../middlewares/authenticate.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { changePasswordSchema, updateProfileSchema } from '../validators/authSchemas.js';

export function createUserRouter({ userService, userRepository }) {
  const router = Router();
  const controller = createUserController(userService);
  const authenticate = createAuthenticate(userRepository);

  router.get('/me', authenticate, asyncHandler(controller.getProfile));
  router.patch('/me', authenticate, validateBody(updateProfileSchema), asyncHandler(controller.updateProfile));
  router.patch(
    '/me/password',
    authenticate,
    validateBody(changePasswordSchema),
    asyncHandler(controller.changePassword),
  );
  router.get('/', authenticate, authorize('ADMIN'), asyncHandler(controller.listUsers));
  return router;
}
