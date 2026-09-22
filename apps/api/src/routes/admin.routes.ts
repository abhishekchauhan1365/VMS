import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const adminRouter: Router = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/policies', asyncHandler(adminController.getPolicies));
adminRouter.put('/policies', asyncHandler(adminController.putPolicies));
adminRouter.get('/watchlist', asyncHandler(adminController.listWatchlist));
adminRouter.post('/watchlist', asyncHandler(adminController.addWatchlist));
adminRouter.delete('/watchlist/:visitorId', asyncHandler(adminController.removeWatchlist));
adminRouter.get('/analytics', asyncHandler(adminController.analytics));
adminRouter.get('/audit', asyncHandler(adminController.audit));
