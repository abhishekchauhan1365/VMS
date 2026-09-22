import type { Response } from 'express';
import { updatePolicySchema, watchlistCreateSchema, auditLogQuerySchema } from '@vms/shared';
import type { AuthedRequest } from '../middleware/auth.js';
import * as policyService from '../services/policyService.js';
import * as visitorService from '../services/visitorService.js';
import * as analyticsService from '../services/analyticsService.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { requireParam } from '../lib/params.js';

export async function getPolicies(_req: AuthedRequest, res: Response) {
  res.json({ policies: await policyService.getPolicies() });
}

export async function putPolicies(req: AuthedRequest, res: Response) {
  const input = updatePolicySchema.parse(req.body);
  res.json({ policies: await policyService.updatePolicies(input) });
}

export async function listWatchlist(_req: AuthedRequest, res: Response) {
  res.json({ watchlist: await visitorService.listWatchlist() });
}

export async function addWatchlist(req: AuthedRequest, res: Response) {
  const input = watchlistCreateSchema.parse(req.body);
  const visitor = await visitorService.addToWatchlist(input.phone, input.fullName);
  res.status(201).json({ visitor });
}

export async function removeWatchlist(req: AuthedRequest, res: Response) {
  const visitor = await visitorService.removeFromWatchlist(requireParam(req, 'visitorId'));
  res.json({ visitor });
}

export async function analytics(_req: AuthedRequest, res: Response) {
  res.json(await analyticsService.getAnalytics());
}

export async function audit(req: AuthedRequest, res: Response) {
  const query = auditLogQuerySchema.parse(req.query);
  const result = await auditRepository.list(
    { entity: query.entity, actorId: query.actorId },
    query.cursor,
    query.limit,
  );
  res.json(result);
}
