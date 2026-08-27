import { Router } from 'express';
import { createStatisticsController } from '../controllers/statisticsController.js';
import { authorize, createAuthenticate } from '../middlewares/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function createStatisticsRouter({ statisticsService, userRepository }) {
  const router = Router();
  const controller = createStatisticsController(statisticsService);
  const authenticate = createAuthenticate(userRepository);
  router.get('/overview', authenticate, authorize('ADMIN'), asyncHandler(controller.overview));
  return router;
}
