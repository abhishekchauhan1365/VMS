import { Prisma, type VisitStatus, type VisitType } from '@prisma/client';
import type { WalkInInput } from '@vms/shared';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { visitRepository, type VisitListFilters } from '../repositories/visitRepository.js';
import { transition } from '../domain/visitStateMachine.js';
import { resolveVisitor, assertNotWatchlisted } from './visitorService.js';
import { issuePass, verifyPassToken } from './passService.js';
import { notify } from './notificationService.js';
import { getPolicyNumber } from './policyService.js';
import { schedulePendingExpiry, scheduleOverstayCheck } from '../jobs/queue.js';
import { broadcastVisitEvent } from '../realtime/broadcast.js';
import { SOCKET_EVENTS } from '../realtime/rooms.js';

export async function createWalkIn(input: WalkInInput, photoUrl: string | null) {
  const visitorInput = input.visitorId ? { visitorId: input.visitorId } : input.visitor;
  if (!visitorInput) throw new AppError('VALIDATION_ERROR', 'visitorId or visitor is required');

  const visitor = await resolveVisitor(visitorInput);
  assertNotWatchlisted(visitor);
  if (photoUrl && !visitor.photoUrl) {
    await prisma.visitor.update({ where: { id: visitor.id }, data: { photoUrl } });
  }

  const visit = await visitRepository.create({
    visitor: { connect: { id: visitor.id } },
    host: { connect: { id: input.hostId } },
    office: { connect: { id: input.officeId } },
    visitType: input.visitType,
    purpose: input.purpose ?? null,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
  });

  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: 'VISIT_CREATED',
      entity: 'Visit',
      entityId: visit.id,
      visitId: visit.id,
      before: Prisma.DbNull,
      after: 'PENDING_APPROVAL',
    },
  });

  await notify(input.hostId, 'VISIT_CREATED', { visitId: visit.id, visitorName: visitor.fullName });
  broadcastVisitEvent(SOCKET_EVENTS.VISIT_CREATED, input.officeId, { visitId: visit.id });

  const timeoutMinutes = await getPolicyNumber('PENDING_APPROVAL_TIMEOUT_MINUTES', 30);
  await schedulePendingExpiry(visit.id, timeoutMinutes);

  return visit;
}

export async function approveVisit(visitId: string, actorId: string) {
  const visit = await visitRepository.findById(visitId);
  if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
  if (visit.hostId !== actorId)
    throw new AppError('FORBIDDEN', 'Only the host can approve this visit');

  await prisma.$transaction(async (tx) => {
    await transition(tx, {
      visitId,
      from: visit.status,
      to: 'APPROVED',
      expectedVersion: visit.version,
      actorId,
      action: 'VISIT_APPROVED',
      data: { decidedAt: new Date(), decidedById: actorId },
    });
  });

  const { pass } = await issuePass(visitId, visit.windowEnd);
  await notify(visit.hostId, 'VISIT_APPROVED', { visitId });
  broadcastVisitEvent(SOCKET_EVENTS.VISIT_UPDATED, visit.officeId, { visitId, status: 'APPROVED' });
  const updated = await visitRepository.findById(visitId);
  return { visit: updated, passId: pass.id };
}

export async function rejectVisit(visitId: string, actorId: string, reason: string) {
  const visit = await visitRepository.findById(visitId);
  if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
  if (visit.hostId !== actorId)
    throw new AppError('FORBIDDEN', 'Only the host can reject this visit');

  await prisma.$transaction(async (tx) => {
    await transition(tx, {
      visitId,
      from: visit.status,
      to: 'REJECTED',
      expectedVersion: visit.version,
      actorId,
      action: 'VISIT_REJECTED',
      data: { decidedAt: new Date(), decidedById: actorId, rejectionReason: reason },
    });
  });

  await notify(visit.hostId, 'VISIT_REJECTED', { visitId, reason });
  broadcastVisitEvent(SOCKET_EVENTS.VISIT_REJECTED, visit.officeId, { visitId, reason });
  return visitRepository.findById(visitId);
}

export async function cancelVisit(visitId: string, actorId: string) {
  const visit = await visitRepository.findById(visitId);
  if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
  if (visit.hostId !== actorId)
    throw new AppError('FORBIDDEN', 'Only the host can cancel this visit');

  await prisma.$transaction(async (tx) => {
    await transition(tx, {
      visitId,
      from: visit.status,
      to: 'CANCELLED',
      expectedVersion: visit.version,
      actorId,
      action: 'VISIT_CANCELLED',
      data: {},
    });
  });

  broadcastVisitEvent(SOCKET_EVENTS.VISIT_UPDATED, visit.officeId, {
    visitId,
    status: 'CANCELLED',
  });
  return visitRepository.findById(visitId);
}

export async function checkIn(visitId: string, actorId: string | null) {
  const visit = await visitRepository.findById(visitId);
  if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

  await prisma.$transaction(async (tx) => {
    await transition(tx, {
      visitId,
      from: visit.status,
      to: 'CHECKED_IN',
      expectedVersion: visit.version,
      actorId,
      action: 'VISIT_CHECKED_IN',
      data: { checkInAt: new Date() },
    });
  });

  const overstayMinutes = await getPolicyNumber('OVERSTAY_MINUTES', 480);
  await scheduleOverstayCheck(visitId, overstayMinutes);
  broadcastVisitEvent(SOCKET_EVENTS.VISIT_UPDATED, visit.officeId, {
    visitId,
    status: 'CHECKED_IN',
  });

  return visitRepository.findById(visitId);
}

/**
 * QR scan check-in: verify → single conditional UPDATE (APPROVED → CHECKED_IN, inside the
 * window) → mark the pass single-use, all inside one transaction so a double-scan race can
 * only ever succeed once (§6.3, §7 "double check-in race").
 */
export async function checkInWithPass(token: string) {
  const verified = await verifyPassToken(token);
  const visit = await visitRepository.findById(verified.visitId);
  if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
  if (visit.windowEnd.getTime() < Date.now()) {
    throw new AppError('PASS_EXPIRED', 'This pass has expired');
  }

  await prisma.$transaction(async (tx) => {
    await transition(tx, {
      visitId: visit.id,
      from: visit.status,
      to: 'CHECKED_IN',
      expectedVersion: visit.version,
      actorId: null,
      action: 'VISIT_CHECKED_IN',
      data: { checkInAt: new Date() },
    });
    await tx.visitPass.update({ where: { id: verified.passId }, data: { usedAt: new Date() } });
  });

  const overstayMinutes = await getPolicyNumber('OVERSTAY_MINUTES', 480);
  await scheduleOverstayCheck(visit.id, overstayMinutes);
  broadcastVisitEvent(SOCKET_EVENTS.VISIT_UPDATED, visit.officeId, {
    visitId: visit.id,
    status: 'CHECKED_IN',
  });

  return visitRepository.findById(visit.id);
}

export async function checkOut(visitId: string, actorId: string | null) {
  const visit = await visitRepository.findById(visitId);
  if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');

  await prisma.$transaction(async (tx) => {
    await transition(tx, {
      visitId,
      from: visit.status,
      to: 'CHECKED_OUT',
      expectedVersion: visit.version,
      actorId,
      action: 'VISIT_CHECKED_OUT',
      data: { checkOutAt: new Date() },
    });
  });

  broadcastVisitEvent(SOCKET_EVENTS.VISIT_UPDATED, visit.officeId, {
    visitId,
    status: 'CHECKED_OUT',
  });
  return visitRepository.findById(visitId);
}

export interface ListVisitsInput {
  cursor?: string | undefined;
  limit: number;
  officeId?: string | undefined;
  status?: VisitStatus | undefined;
  visitType?: VisitType | undefined;
  hostId?: string | undefined;
  search?: string | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
}

export async function listVisits(input: ListVisitsInput) {
  const filters: VisitListFilters = {
    ...(input.officeId ? { officeId: input.officeId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.visitType ? { visitType: input.visitType } : {}),
    ...(input.hostId ? { hostId: input.hostId } : {}),
    ...(input.search ? { search: input.search } : {}),
    ...(input.dateFrom ? { dateFrom: input.dateFrom } : {}),
    ...(input.dateTo ? { dateTo: input.dateTo } : {}),
  };
  return visitRepository.list(filters, input.cursor, input.limit);
}

export async function getVisitDetail(id: string) {
  const visit = await visitRepository.findById(id);
  if (!visit) throw new AppError('NOT_FOUND', 'Visit not found');
  const timeline = await visitRepository.timeline(id);
  return { visit, timeline };
}

export const pendingForHost = visitRepository.findPendingForHost;
export const historyForHost = (hostId: string) => visitRepository.findHistoryForHost(hostId, 50);
