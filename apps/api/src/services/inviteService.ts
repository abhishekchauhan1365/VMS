import type { CreateInviteInput } from '@vms/shared';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors.js';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { inviteRepository } from '../repositories/inviteRepository.js';
import { getPolicyNumber } from './policyService.js';
import { resolveVisitor, assertNotWatchlisted } from './visitorService.js';
import { issuePass } from './passService.js';
import { notify } from './notificationService.js';
import { scheduleVisitExpiry } from '../jobs/queue.js';

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

/**
 * O(1) daily pre-approval quota via a single Redis INCR + conditional EXPIRE, instead of a
 * COUNT(*) query per request. The counter self-resets at local midnight.
 */
async function reserveDailyQuota(hostId: string): Promise<void> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `preapprovals:${hostId}:${dateKey}`;
  const limit = await getPolicyNumber('MAX_PREAPPROVALS_PER_HOST_PER_DAY', 5);

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, secondsUntilMidnight());
  }
  if (current > limit) {
    await redis.decr(key);
    throw new AppError('LIMIT_EXCEEDED', `Daily pre-approval limit of ${limit} reached`);
  }
}

export async function remainingDailyQuota(hostId: string): Promise<number> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `preapprovals:${hostId}:${dateKey}`;
  const [limit, used] = await Promise.all([
    getPolicyNumber('MAX_PREAPPROVALS_PER_HOST_PER_DAY', 5),
    redis.get(key),
  ]);
  return Math.max(0, limit - Number(used ?? 0));
}

export async function createInvite(hostId: string, input: CreateInviteInput) {
  await reserveDailyQuota(hostId);

  const visitors = await Promise.all(input.guests.map((g) => resolveVisitor(g)));
  visitors.forEach(assertNotWatchlisted);

  const invite = await inviteRepository.create({
    host: { connect: { id: hostId } },
    title: input.title,
    visitType: input.visitType,
    office: { connect: { id: input.officeId } },
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    note: input.note ?? null,
    guests: { create: visitors.map((v) => ({ visitor: { connect: { id: v.id } } })) },
  });

  const visits = await Promise.all(
    visitors.map(async (visitor) => {
      const visit = await prisma.visit.create({
        data: {
          visitor: { connect: { id: visitor.id } },
          host: { connect: { id: hostId } },
          invite: { connect: { id: invite.id } },
          office: { connect: { id: input.officeId } },
          visitType: input.visitType,
          status: 'APPROVED',
          decidedAt: new Date(),
          decidedBy: { connect: { id: hostId } },
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
        },
        include: { visitor: true },
      });
      await prisma.auditLog.create({
        data: {
          actorId: hostId,
          action: 'VISIT_CREATED',
          entity: 'Visit',
          entityId: visit.id,
          visitId: visit.id,
          before: Prisma.DbNull,
          after: 'APPROVED',
        },
      });
      const { token } = await issuePass(visit.id, input.windowEnd);
      await notify(hostId, 'VISIT_APPROVED', { visitId: visit.id, visitorName: visitor.fullName });
      await scheduleVisitExpiry(visit.id, input.windowEnd);
      return { visit, qrToken: token };
    }),
  );

  return { invite, visits };
}
