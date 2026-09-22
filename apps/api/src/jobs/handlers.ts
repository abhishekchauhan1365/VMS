import type { Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { transition } from '../domain/visitStateMachine.js';
import { notify } from '../services/notificationService.js';
import { broadcastVisitEvent } from '../realtime/broadcast.js';
import { SOCKET_EVENTS } from '../realtime/rooms.js';
import { logger } from '../lib/logger.js';
import { JOB_NAMES } from './queue.js';

interface VisitJobData {
  visitId: string;
}

/** Flips an unused APPROVED visit to EXPIRED once its window has closed. No-op if it already
 *  moved on (checked in, cancelled, etc.) — the delayed job may fire after that happened. */
async function handleExpireVisit(data: VisitJobData) {
  const visit = await prisma.visit.findUnique({ where: { id: data.visitId } });
  if (!visit || visit.status !== 'APPROVED') return;

  await prisma.$transaction((tx) =>
    transition(tx, {
      visitId: visit.id,
      from: 'APPROVED',
      to: 'EXPIRED',
      expectedVersion: visit.version,
      actorId: null,
      action: 'VISIT_EXPIRED',
    }),
  );
  await notify(visit.hostId, 'VISIT_EXPIRED', { visitId: visit.id });
  broadcastVisitEvent(SOCKET_EVENTS.VISIT_UPDATED, visit.officeId, {
    visitId: visit.id,
    status: 'EXPIRED',
  });
}

/** Flips a stale PENDING_APPROVAL visit to EXPIRED after the host doesn't respond in time. */
async function handleExpirePending(data: VisitJobData) {
  const visit = await prisma.visit.findUnique({ where: { id: data.visitId } });
  if (!visit || visit.status !== 'PENDING_APPROVAL') return;

  await prisma.$transaction((tx) =>
    transition(tx, {
      visitId: visit.id,
      from: 'PENDING_APPROVAL',
      to: 'EXPIRED',
      expectedVersion: visit.version,
      actorId: null,
      action: 'VISIT_EXPIRED',
    }),
  );
  await notify(visit.hostId, 'VISIT_EXPIRED', { visitId: visit.id });
  broadcastVisitEvent(SOCKET_EVENTS.VISIT_UPDATED, visit.officeId, {
    visitId: visit.id,
    status: 'EXPIRED',
  });
}

/** OVERSTAY is a derived flag (§5), not a stored status: still CHECKED_IN past the threshold,
 *  with no checkout. Pushes a live alert instead of mutating the row. */
async function handleOverstayCheck(data: VisitJobData) {
  const visit = await prisma.visit.findUnique({ where: { id: data.visitId } });
  if (!visit || visit.status !== 'CHECKED_IN' || visit.checkOutAt) return;

  await notify(visit.hostId, 'VISIT_OVERSTAY', { visitId: visit.id });
  broadcastVisitEvent(SOCKET_EVENTS.VISIT_OVERSTAY, visit.officeId, { visitId: visit.id });
}

export async function processVisitJob(job: Job<VisitJobData>) {
  switch (job.name) {
    case JOB_NAMES.EXPIRE_VISIT:
      return handleExpireVisit(job.data);
    case JOB_NAMES.EXPIRE_PENDING:
      return handleExpirePending(job.data);
    case JOB_NAMES.OVERSTAY_CHECK:
      return handleOverstayCheck(job.data);
    default:
      logger.warn({ jobName: job.name }, 'Unknown job name, skipping');
  }
}
