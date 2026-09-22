import { Router } from 'express';
import * as passController from '../controllers/passController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { publicRateLimiter } from '../middleware/rateLimit.js';

export const passesRouter: Router = Router();

// Unattended kiosk + public e-pass page: no login, rate limited instead.
passesRouter.post('/verify', publicRateLimiter, asyncHandler(passController.verify));
passesRouter.get('/:token/public', publicRateLimiter, asyncHandler(passController.publicPass));
