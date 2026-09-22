import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const authRouter: Router = Router();

authRouter.post('/login', asyncHandler(authController.login));
authRouter.post('/refresh', asyncHandler(authController.refresh));
authRouter.post('/logout', asyncHandler(authController.logout));
