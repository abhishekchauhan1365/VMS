import type { Request, Response } from 'express';
import { verifyPassSchema } from '@vms/shared';
import * as visitService from '../services/visitService.js';
import * as passService from '../services/passService.js';
import { requireParam } from '../lib/params.js';

export async function verify(req: Request, res: Response) {
  const { token } = verifyPassSchema.parse(req.body);
  const visit = await visitService.checkInWithPass(token);
  res.json({ visit });
}

export async function publicPass(req: Request, res: Response) {
  const pass = await passService.getPublicPassData(requireParam(req, 'token'));
  res.json({ pass });
}
