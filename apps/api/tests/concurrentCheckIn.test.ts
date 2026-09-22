import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { checkIn } from '../src/services/visitService.js';
import { createTestOffice, createTestUser, createTestVisitor, createTestVisit } from './helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('concurrent double check-in (§7 "double check-in race")', () => {
  it('only one of two simultaneous check-ins succeeds; the other gets a conflict', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const security = await createTestUser('SECURITY', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
      status: 'APPROVED',
    });

    const results = await Promise.allSettled([
      checkIn(visit.id, security.id),
      checkIn(visit.id, security.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const final = await prisma.visit.findUniqueOrThrow({ where: { id: visit.id } });
    expect(final.status).toBe('CHECKED_IN');
    expect(final.version).toBe(visit.version + 1);
  });
});
