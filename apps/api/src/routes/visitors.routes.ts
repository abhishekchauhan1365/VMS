import { Router } from 'express';
import * as visitorController from '../controllers/visitorController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const visitorsRouter: Router = Router();

visitorsRouter.post('/search', requireAuth, asyncHandler(visitorController.search));
