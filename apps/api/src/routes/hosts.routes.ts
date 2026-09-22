import { Router } from 'express';
import * as hostController from '../controllers/hostController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const hostsRouter: Router = Router();

hostsRouter.get('/', requireAuth, asyncHandler(hostController.list));
hostsRouter.get(
  '/me/pending',
  requireAuth,
  requireRole('HOST'),
  asyncHandler(hostController.pending),
);
hostsRouter.get(
  '/me/history',
  requireAuth,
  requireRole('HOST'),
  asyncHandler(hostController.history),
);
