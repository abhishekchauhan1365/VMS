import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { redis } from '../src/lib/redis.js';
import { createInvite, remainingDailyQuota } from '../src/services/inviteService.js';
import { AppError } from '../src/lib/errors.js';
import { createTestOffice, createTestUser, uniqueSuffix } from './helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('pre-approval daily quota (Redis O(1) counter)', () => {
  it('allows up to the policy limit then rejects with LIMIT_EXCEEDED', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const limit = 5; // MAX_PREAPPROVALS_PER_HOST_PER_DAY default from policy

    expect(await remainingDailyQuota(host.id)).toBe(limit);

    for (let i = 0; i < limit; i++) {
      const suffix = uniqueSuffix();
      await createInvite(host.id, {
        title: `Test invite ${suffix}`,
        visitType: 'VENDOR',
        officeId: office.id,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60 * 60_000),
        guests: [{ fullName: `Quota Guest ${suffix}`, phone: `+1-quota-${suffix}` }],
      });
    }

    expect(await remainingDailyQuota(host.id)).toBe(0);

    const suffix = uniqueSuffix();
    await expect(
      createInvite(host.id, {
        title: `Over limit ${suffix}`,
        visitType: 'VENDOR',
        officeId: office.id,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 60 * 60_000),
        guests: [{ fullName: `Over Guest ${suffix}`, phone: `+1-over-${suffix}` }],
      }),
    ).rejects.toThrow(AppError);

    // Rejecting must not consume the counter further.
    expect(await remainingDailyQuota(host.id)).toBe(0);
  });
});
