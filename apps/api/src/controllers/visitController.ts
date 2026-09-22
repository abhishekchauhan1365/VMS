import type { Response } from 'express';
import { walkInSchema, rejectVisitSchema, listVisitsQuerySchema } from '@vms/shared';
import type { AuthedRequest } from '../middleware/auth.js';
import * as visitService from '../services/visitService.js';
import { uploadVisitorPhoto } from '../lib/storage.js';
import { withIdempotency } from '../lib/idempotency.js';
import { AppError } from '../lib/errors.js';
import { requireParam } from '../lib/params.js';

export async function createWalkIn(
  req: AuthedRequest & { file?: Express.Multer.File },
  res: Response,
) {
  const rawBody = { ...req.body } as Record<string, unknown>;
  if (typeof rawBody.visitor === 'string') {
    try {
      rawBody.visitor = JSON.parse(rawBody.visitor);
    } catch {
      throw new AppError('VALIDATION_ERROR', 'visitor must be valid JSON when sent as a string');
    }
  }
  const input = walkInSchema.parse(rawBody);

  let photoUrl: string | null = null;
  if (req.file) {
    photoUrl = await uploadVisitorPhoto(req.file.buffer, req.file.mimetype);
  }

  const visit = await visitService.createWalkIn(input, photoUrl);
  res.status(201).json({ visit });
}

export async function approve(req: AuthedRequest, res: Response) {
  const actorId = req.user!.sub;
  const result = await visitService.approveVisit(requireParam(req, 'id'), actorId);
  res.json(result);
}

export async function reject(req: AuthedRequest, res: Response) {
  const actorId = req.user!.sub;
  const { reason } = rejectVisitSchema.parse(req.body);
  const visit = await visitService.rejectVisit(requireParam(req, 'id'), actorId, reason);
  res.json({ visit });
}

export async function cancel(req: AuthedRequest, res: Response) {
  const actorId = req.user!.sub;
  const visit = await visitService.cancelVisit(requireParam(req, 'id'), actorId);
  res.json({ visit });
}

export async function checkIn(req: AuthedRequest, res: Response) {
  const idempotencyKey = req.header('Idempotency-Key');
  const visit = await withIdempotency(idempotencyKey, () =>
    visitService.checkIn(requireParam(req, 'id'), req.user?.sub ?? null),
  );
  res.json({ visit });
}

export async function checkOut(req: AuthedRequest, res: Response) {
  const idempotencyKey = req.header('Idempotency-Key');
  const visit = await withIdempotency(idempotencyKey, () =>
    visitService.checkOut(requireParam(req, 'id'), req.user?.sub ?? null),
  );
  res.json({ visit });
}

export async function list(req: AuthedRequest, res: Response) {
  const query = listVisitsQuerySchema.parse(req.query);
  const result = await visitService.listVisits({
    cursor: query.cursor,
    limit: query.limit,
    officeId: query.officeId,
    status: query.status,
    visitType: query.visitType,
    hostId: query.hostId,
    search: query.search,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  res.json(result);
}

export async function detail(req: AuthedRequest, res: Response) {
  const result = await visitService.getVisitDetail(requireParam(req, 'id'));
  res.json(result);
}
