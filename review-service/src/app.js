import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { mongoStatus } from './config/mongo.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { reviewRepository as defaultReviewRepository } from './repositories/reviewRepository.js';
import { createReviewRouter } from './routes/reviewRoutes.js';
import { activityLogService as defaultActivityLogService } from './services/activityLogService.js';
import { createReviewService } from './services/reviewService.js';

const rateLimitDisabled = env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => rateLimitDisabled,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

export function createApp(options = {}) {
  const reviewRepository = options.reviewRepository ?? defaultReviewRepository;
  const activityLogService = options.activityLogService ?? defaultActivityLogService;
  const reviewService =
    options.reviewService ?? createReviewService(reviewRepository, activityLogService);

  const application = express();

  application.disable('x-powered-by');
  application.set('trust proxy', 1);
  application.use(helmet());
  application.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  application.use(express.json({ limit: '256kb' }));
  application.use('/api', generalLimiter);

  application.get('/api', (req, res) => {
    void req;
    res.json({
      success: true,
      name: 'ShopSphere Review Service',
      version: '1.0.0',
      documentation: '/api/health',
    });
  });

  application.get('/api/health', (req, res) => {
    void req;
    const mongodb = mongoStatus() === 'connected';
    res.status(mongodb ? 200 : 503).json({
      success: mongodb,
      service: 'shopsphere-review-service',
      status: mongodb ? 'healthy' : 'degraded',
      checks: { api: true, mongodb },
      timestamp: new Date().toISOString(),
    });
  });

  application.use('/api', createReviewRouter({ reviewService }));

  application.use(notFound);
  application.use(errorHandler);
  return application;
}

export const app = createApp();
