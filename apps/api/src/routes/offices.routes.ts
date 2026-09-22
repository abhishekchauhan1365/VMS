import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../lib/prisma.js';

export const officesRouter: Router = Router();

officesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const offices = await prisma.office.findMany({ orderBy: { name: 'asc' } });
    res.json({ offices });
  }),
);
