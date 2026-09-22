import type { Response } from 'express';
import { createInviteSchema } from '@vms/shared';
import type { AuthedRequest } from '../middleware/auth.js';
import * as inviteService from '../services/inviteService.js';

export async function create(req: AuthedRequest, res: Response) {
  const hostId = req.user!.sub;
  const input = createInviteSchema.parse(req.body);
  const result = await inviteService.createInvite(hostId, input);
  res.status(201).json(result);
}

export async function remainingQuota(req: AuthedRequest, res: Response) {
  const hostId = req.user!.sub;
  const remaining = await inviteService.remainingDailyQuota(hostId);
  res.json({ remaining });
}
