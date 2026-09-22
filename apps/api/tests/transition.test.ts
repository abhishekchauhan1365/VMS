import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { transition } from '../src/domain/visitStateMachine.js';
import { AppError } from '../src/lib/errors.js';
import { createTestOffice, createTestUser, createTestVisitor, createTestVisit } from './helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('transition() — the single choke point for Visit status changes', () => {
  it('performs a valid transition, bumps version, and writes an AuditLog row', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
    });

    const updated = await prisma.$transaction((tx) =>
      transition(tx, {
        visitId: visit.id,
        from: 'PENDING_APPROVAL',
        to: 'APPROVED',
        expectedVersion: visit.version,
        actorId: host.id,
        action: 'VISIT_APPROVED',
        data: { decidedAt: new Date(), decidedById: host.id },
      }),
    );

    expect(updated.status).toBe('APPROVED');
    expect(updated.version).toBe(visit.version + 1);

    const audit = await prisma.auditLog.findFirst({
      where: { visitId: visit.id, action: 'VISIT_APPROVED' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.before).toBe('PENDING_APPROVAL');
    expect(audit?.after).toBe('APPROVED');
  });

  it('rejects a transition not on the whitelist with INVALID_TRANSITION', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
    });

    let caught: unknown;
    try {
      await prisma.$transaction((tx) =>
        transition(tx, {
          visitId: visit.id,
          from: 'PENDING_APPROVAL',
          to: 'CHECKED_OUT',
          expectedVersion: visit.version,
          actorId: null,
          action: 'VISIT_CHECKED_OUT',
        }),
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe('INVALID_TRANSITION');
  });

  it('rejects a stale version with CONFLICT (optimistic concurrency)', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
    });

    await expect(
      prisma.$transaction((tx) =>
        transition(tx, {
          visitId: visit.id,
          from: 'PENDING_APPROVAL',
          to: 'APPROVED',
          expectedVersion: visit.version + 1, // wrong on purpose
          actorId: host.id,
          action: 'VISIT_APPROVED',
        }),
      ),
    ).rejects.toThrow(/modified by someone else/);
  });
});
