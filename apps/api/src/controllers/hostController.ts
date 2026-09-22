import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import * as visitService from '../services/visitService.js';
import { userRepository } from '../repositories/userRepository.js';

export async function list(_req: AuthedRequest, res: Response) {
  const hosts = await userRepository.findHosts();
  res.json({
    hosts: hosts.map((h) => ({ id: h.id, name: h.name, email: h.email, officeId: h.officeId })),
  });
}

export async function pending(req: AuthedRequest, res: Response) {
  const visits = await visitService.pendingForHost(req.user!.sub);
  res.json({ visits });
}

export async function history(req: AuthedRequest, res: Response) {
  const visits = await visitService.historyForHost(req.user!.sub);
  res.json({ visits });
}
