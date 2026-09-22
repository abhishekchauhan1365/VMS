import { Router } from 'express';
import * as visitController from '../controllers/visitController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadPhoto } from '../middleware/upload.js';

export const visitsRouter: Router = Router();

visitsRouter.post(
  '/walk-in',
  requireAuth,
  requireRole('SECURITY', 'ADMIN'),
  uploadPhoto.single('photo'),
  asyncHandler(visitController.createWalkIn),
);
visitsRouter.post(
  '/:id/approve',
  requireAuth,
  requireRole('HOST'),
  asyncHandler(visitController.approve),
);
visitsRouter.post(
  '/:id/reject',
  requireAuth,
  requireRole('HOST'),
  asyncHandler(visitController.reject),
);
visitsRouter.post(
  '/:id/cancel',
  requireAuth,
  requireRole('HOST'),
  asyncHandler(visitController.cancel),
);
visitsRouter.post(
  '/:id/check-in',
  requireAuth,
  requireRole('SECURITY', 'ADMIN'),
  asyncHandler(visitController.checkIn),
);
visitsRouter.post(
  '/:id/check-out',
  requireAuth,
  requireRole('SECURITY', 'ADMIN'),
  asyncHandler(visitController.checkOut),
);
visitsRouter.get('/', requireAuth, asyncHandler(visitController.list));
visitsRouter.get('/:id', requireAuth, asyncHandler(visitController.detail));
