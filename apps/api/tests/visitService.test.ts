import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import {
  approveVisit,
  cancelVisit,
  checkIn,
  checkInWithPass,
  checkOut,
  createWalkIn,
  getVisitDetail,
  historyForHost,
  listVisits,
  pendingForHost,
  rejectVisit,
} from '../src/services/visitService.js';
import { issuePass } from '../src/services/passService.js';
import { AppError } from '../src/lib/errors.js';
import {
  createTestOffice,
  createTestUser,
  createTestVisitor,
  createTestVisit,
  uniqueSuffix,
} from './helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('visitService — full lifecycle', () => {
  it('walk-in -> approve -> check-in -> check-out, with pending/history queries along the way', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const security = await createTestUser('SECURITY', office.id);
    const suffix = uniqueSuffix();

    const visit = await createWalkIn(
      {
        visitor: { fullName: `Lifecycle Visitor ${suffix}`, phone: `+1-life-${suffix}` },
        hostId: host.id,
        officeId: office.id,
        visitType: 'BUSINESS_GUEST',
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + 2 * 60 * 60_000),
      },
      null,
    );
    expect(visit.status).toBe('PENDING_APPROVAL');

    const pending = await pendingForHost(host.id);
    expect(pending.some((v) => v.id === visit.id)).toBe(true);

    const { visit: approved, passId } = await approveVisit(visit.id, host.id);
    expect(approved?.status).toBe('APPROVED');
    expect(passId).toEqual(expect.any(String));

    const checkedIn = await checkIn(visit.id, security.id);
    expect(checkedIn?.status).toBe('CHECKED_IN');
    expect(checkedIn?.checkInAt).not.toBeNull();

    const checkedOut = await checkOut(visit.id, security.id);
    expect(checkedOut?.status).toBe('CHECKED_OUT');
    expect(checkedOut?.checkOutAt).not.toBeNull();

    const history = await historyForHost(host.id);
    expect(history.some((v) => v.id === visit.id)).toBe(true);

    const detail = await getVisitDetail(visit.id);
    expect(detail.visit.id).toBe(visit.id);
    expect(detail.timeline.length).toBeGreaterThanOrEqual(3); // created, approved, checked in, checked out
  });

  it('rejects a walk-in for a watchlisted visitor', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const suffix = uniqueSuffix();
    const visitor = await prisma.visitor.create({
      data: { fullName: `Blocked ${suffix}`, phone: `+1-block-${suffix}`, isWatchlisted: true },
    });

    await expect(
      createWalkIn(
        {
          visitorId: visitor.id,
          hostId: host.id,
          officeId: office.id,
          visitType: 'BUSINESS_GUEST',
          windowStart: new Date(),
          windowEnd: new Date(Date.now() + 60 * 60_000),
        },
        null,
      ),
    ).rejects.toMatchObject({ code: 'WATCHLISTED' });
  });

  it('rejects approve/reject/cancel by someone other than the host', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const otherHost = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
    });

    await expect(approveVisit(visit.id, otherHost.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(rejectVisit(visit.id, otherHost.id, 'no')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(cancelVisit(visit.id, otherHost.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('reject requires a reason and records it', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
    });

    const rejected = await rejectVisit(visit.id, host.id, 'Not expected today');
    expect(rejected?.status).toBe('REJECTED');
    expect(rejected?.rejectionReason).toBe('Not expected today');
  });

  it('cancel only works from APPROVED', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const approvedVisit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
      status: 'APPROVED',
    });

    const cancelled = await cancelVisit(approvedVisit.id, host.id);
    expect(cancelled?.status).toBe('CANCELLED');

    const pendingVisit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
    });
    await expect(cancelVisit(pendingVisit.id, host.id)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  it('checkInWithPass checks in via a valid QR token and rejects a second scan', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
      status: 'APPROVED',
    });
    const { token } = await issuePass(visit.id, visit.windowEnd);

    const checkedIn = await checkInWithPass(token);
    expect(checkedIn?.status).toBe('CHECKED_IN');

    await expect(checkInWithPass(token)).rejects.toBeInstanceOf(AppError);
  });

  it('listVisits filters by office and status with cursor pagination shape', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
      status: 'APPROVED',
    });

    const result = await listVisits({ officeId: office.id, status: 'APPROVED', limit: 10 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((v) => v.officeId === office.id && v.status === 'APPROVED')).toBe(
      true,
    );
    expect(result).toHaveProperty('nextCursor');
  });

  it('getVisitDetail throws NOT_FOUND for an unknown id', async () => {
    await expect(getVisitDetail('does-not-exist')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
