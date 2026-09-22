import type { Prisma, VisitStatus } from '@prisma/client';
import { canTransition } from '@vms/shared';
import { AppError } from '../lib/errors.js';

export interface TransitionInput {
  visitId: string;
  from: VisitStatus;
  to: VisitStatus;
  /** Optimistic concurrency token read alongside `from` by the caller. */
  expectedVersion: number;
  actorId: string | null;
  action: string;
  /** Extra columns to set atomically with the status change (e.g. checkInAt, rejectionReason). */
  data?: Prisma.VisitUncheckedUpdateManyInput;
}

/**
 * The single choke point every Visit status change must go through (§5).
 * Runs a conditional UPDATE (`WHERE id = ? AND status = ? AND version = ?`) so a concurrent
 * transition loses the race cleanly instead of corrupting state — O(1) index lookup on the
 * primary key, no row lock held across a network round trip.
 */
export async function transition(tx: Prisma.TransactionClient, input: TransitionInput) {
  if (!canTransition(input.from, input.to)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Cannot move a visit from ${input.from} to ${input.to}`,
    );
  }

  const result = await tx.visit.updateMany({
    where: { id: input.visitId, status: input.from, version: input.expectedVersion },
    data: { ...input.data, status: input.to, version: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new AppError('CONFLICT', 'Visit was modified by someone else — refresh and try again');
  }

  const visit = await tx.visit.findUniqueOrThrow({ where: { id: input.visitId } });

  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entity: 'Visit',
      entityId: input.visitId,
      visitId: input.visitId,
      before: input.from,
      after: input.to,
    },
  });

  return visit;
}
