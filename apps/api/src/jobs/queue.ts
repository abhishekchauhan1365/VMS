import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';

export const JOB_NAMES = {
  EXPIRE_VISIT: 'expire-visit',
  EXPIRE_PENDING: 'expire-pending',
  OVERSTAY_CHECK: 'overstay-check',
  SEND_NOTIFICATION: 'send-notification',
} as const;

export const visitQueue = new Queue('visits', { connection: redis });

/** Delayed job that flips an unused APPROVED visit to EXPIRED at windowEnd (§6.2). */
export async function scheduleVisitExpiry(visitId: string, windowEnd: Date) {
  const delay = Math.max(0, windowEnd.getTime() - Date.now());
  await visitQueue.add(
    JOB_NAMES.EXPIRE_VISIT,
    { visitId },
    { delay, jobId: `expire-visit-${visitId}` },
  );
}

/** Delayed job that flips a stale PENDING_APPROVAL visit to EXPIRED after N minutes (§9). */
export async function schedulePendingExpiry(visitId: string, timeoutMinutes: number) {
  await visitQueue.add(
    JOB_NAMES.EXPIRE_PENDING,
    { visitId },
    { delay: timeoutMinutes * 60 * 1000, jobId: `expire-pending-${visitId}` },
  );
}

/** Delayed job that flags an overstay after check-in if no checkout occurs in time. */
export async function scheduleOverstayCheck(visitId: string, afterMinutes: number) {
  await visitQueue.add(
    JOB_NAMES.OVERSTAY_CHECK,
    { visitId },
    { delay: afterMinutes * 60 * 1000, jobId: `overstay-check-${visitId}` },
  );
}
