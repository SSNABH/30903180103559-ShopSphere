import { Router } from 'express';
import { live, overview, ready } from '../controllers/healthController.js';

export const healthRouter = Router();

healthRouter.get('/', overview);
healthRouter.get('/live', live);
healthRouter.get('/ready', ready);
