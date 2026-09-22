import { Router } from 'express';
import * as inviteController from '../controllers/inviteController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const invitesRouter: Router = Router();

invitesRouter.post('/', requireAuth, requireRole('HOST'), asyncHandler(inviteController.create));
invitesRouter.get(
  '/quota',
  requireAuth,
  requireRole('HOST'),
  asyncHandler(inviteController.remainingQuota),
);
