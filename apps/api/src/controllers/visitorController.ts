import type { Response } from 'express';
import { visitorSearchQuerySchema } from '@vms/shared';
import type { AuthedRequest } from '../middleware/auth.js';
import * as visitorService from '../services/visitorService.js';

export async function search(req: AuthedRequest, res: Response) {
  const { q } = visitorSearchQuerySchema.parse(req.query);
  const results = await visitorService.searchVisitors(q);
  res.json({ visitors: results });
}
