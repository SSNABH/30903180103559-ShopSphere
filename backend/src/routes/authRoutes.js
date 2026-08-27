import { Router } from 'express';
import { createAuthController } from '../controllers/authController.js';
import { createOptionalAuthenticate } from '../middlewares/authenticate.js';
import { validateBody } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';

export function createAuthRouter({ authService, userRepository }) {
  const router = Router();
  const controller = createAuthController(authService);
  const optionalAuthenticate = createOptionalAuthenticate(userRepository);

  router.post('/register', validateBody(registerSchema), asyncHandler(controller.register));
  router.post('/login', validateBody(loginSchema), asyncHandler(controller.login));
  router.post('/refresh', asyncHandler(controller.refresh));
  router.post('/logout', optionalAuthenticate, asyncHandler(controller.logout));
  return router;
}
