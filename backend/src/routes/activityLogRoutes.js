import { Router } from 'express';
import { createActivityLogController } from '../controllers/activityLogController.js';
import { authorize, createAuthenticate } from '../middlewares/authenticate.js';
import { validateQuery } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { activityLogQuerySchema } from '../validators/serviceSchemas.js';

export function createActivityLogRouter({ activityLogService, userRepository }) {
  const router = Router();
  const controller = createActivityLogController(activityLogService);
  const authenticate = createAuthenticate(userRepository);
  router.get('/', authenticate, authorize('ADMIN'), validateQuery(activityLogQuerySchema), asyncHandler(controller.list));
  return router;
}
