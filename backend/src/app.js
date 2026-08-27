import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { activityLogRepository as defaultActivityLogRepository } from './repositories/activityLogRepository.js';
import { cartRepository as defaultCartRepository } from './repositories/cartRepository.js';
import { categoryRepository as defaultCategoryRepository } from './repositories/categoryRepository.js';
import { orderRepository as defaultOrderRepository } from './repositories/orderRepository.js';
import { productRepository as defaultProductRepository } from './repositories/productRepository.js';
import { reviewRepository as defaultReviewRepository } from './repositories/reviewRepository.js';
import { statisticsRepository as defaultStatisticsRepository } from './repositories/statisticsRepository.js';
import { userRepository as defaultUserRepository } from './repositories/userRepository.js';
import { createActivityLogRouter } from './routes/activityLogRoutes.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createCartRouter } from './routes/cartRoutes.js';
import { createCategoryRouter } from './routes/categoryRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { createOrderRouter } from './routes/orderRoutes.js';
import { createProductRouter } from './routes/productRoutes.js';
import { createStatisticsRouter } from './routes/statisticsRoutes.js';
import { createUserRouter } from './routes/userRoutes.js';
import { createActivityLogService } from './services/activityLogService.js';
import { createAuthService } from './services/authService.js';
import { createCartService } from './services/cartService.js';
import { createCategoryService } from './services/categoryService.js';
import { emailService as defaultEmailService } from './services/emailService.js';
import { createOrderService } from './services/orderService.js';
import { createProductService } from './services/productService.js';
import { createReviewService } from './services/reviewService.js';
import { createStatisticsService } from './services/statisticsService.js';
import { createUserService } from './services/userService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const noOpActivityLogService = {
  record: async () => null,
  list: async () => ({ items: [], total: 0, page: 1, limit: 20, pages: 0 }),
  countAll: async () => 0,
};
const testEmailService = { sendWelcomeEmail: async () => ({ messageId: 'test-message' }) };

// Rate limiting is disabled under test so the suite is not throttled by its own
// request volume. The stricter auth limiter exists because credential endpoints
// are the ones worth protecting from brute force.
const rateLimitDisabled = env.NODE_ENV === 'test';
const limiterDefaults = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => rateLimitDisabled,
};
const generalLimiter = rateLimit({
  ...limiterDefaults,
  limit: 300,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
const authLimiter = rateLimit({
  ...limiterDefaults,
  limit: 20,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

export function createApp(options = {}) {
  const userRepository = options.userRepository ?? defaultUserRepository;
  const categoryRepository = options.categoryRepository ?? defaultCategoryRepository;
  const productRepository = options.productRepository ?? defaultProductRepository;
  const cartRepository = options.cartRepository ?? defaultCartRepository;
  const orderRepository = options.orderRepository ?? defaultOrderRepository;
  const reviewRepository = options.reviewRepository ?? defaultReviewRepository;
  const statisticsRepository = options.statisticsRepository ?? defaultStatisticsRepository;
  const activityLogService = options.activityLogService ?? (env.NODE_ENV === 'test' ? noOpActivityLogService : createActivityLogService(defaultActivityLogRepository));
  const emailService = options.emailService ?? (env.NODE_ENV === 'test' ? testEmailService : defaultEmailService);
  const authService = options.authService ?? createAuthService(userRepository, { emailService, activityLogService });
  const userService = options.userService ?? createUserService(userRepository);
  const categoryService = options.categoryService ?? createCategoryService(categoryRepository, activityLogService);
  const productService = options.productService ?? createProductService(productRepository, categoryRepository, activityLogService);
  const cartService = options.cartService ?? createCartService(cartRepository, productRepository);
  const orderService = options.orderService ?? createOrderService(orderRepository);
  const reviewService = options.reviewService ?? createReviewService(reviewRepository, productRepository, activityLogService);
  const statisticsService = options.statisticsService ?? createStatisticsService(statisticsRepository, reviewRepository, activityLogService);
  const application = express();

  // Vercel terminates TLS at its edge, so the real client IP arrives in
  // X-Forwarded-For. Without this the limiter sees one shared address and
  // would throttle every user together.
  application.set('trust proxy', 1);

  application.disable('x-powered-by');
  application.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  application.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()), credentials: true }));
  application.use(compression());
  application.use(express.json({ limit: '1mb' }));
  application.use(express.urlencoded({ extended: true, limit: '1mb' }));
  application.use(cookieParser());
  if (env.NODE_ENV !== 'test') application.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  application.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));
  application.use('/api', generalLimiter);

  application.get('/api', (req, res) => {
    void req;
    res.json({ success: true, name: 'DECI.Project API', version: '1.0.0', documentation: '/api/health' });
  });
  application.use('/api/health', healthRouter);
  application.use('/api/auth', authLimiter, createAuthRouter({ authService, userRepository }));
  application.use('/api/users', createUserRouter({ userService, userRepository }));
  application.use('/api/categories', createCategoryRouter({ categoryService, userRepository }));
  application.use('/api/products', createProductRouter({ productService, reviewService, userRepository }));
  application.use('/api/cart', createCartRouter({ cartService, userRepository }));
  application.use('/api/orders', createOrderRouter({ orderService, userRepository }));
  application.use('/api/statistics', createStatisticsRouter({ statisticsService, userRepository }));
  application.use('/api/activity-logs', createActivityLogRouter({ activityLogService, userRepository }));

  application.use(notFound);
  application.use(errorHandler);
  return application;
}

export const app = createApp();
