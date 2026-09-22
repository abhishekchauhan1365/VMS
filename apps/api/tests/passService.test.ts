import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { issuePass, verifyPassToken } from '../src/services/passService.js';
import { AppError } from '../src/lib/errors.js';
import { createTestOffice, createTestUser, createTestVisitor, createTestVisit } from './helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('QR pass: sign, verify, single-use, expiry, window', () => {
  it('verifies a freshly issued pass exactly once, then rejects reuse', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
      status: 'APPROVED',
      windowStart: new Date(Date.now() - 5 * 60_000),
      windowEnd: new Date(Date.now() + 60 * 60_000),
    });

    const { token, pass } = await issuePass(visit.id, visit.windowEnd);

    const verified = await verifyPassToken(token);
    expect(verified.visitId).toBe(visit.id);
    expect(verified.passId).toBe(pass.id);

    // Verifying doesn't mark it used by itself — that's the caller's job inside the
    // check-in transaction — so simulate that here to test single-use enforcement.
    await prisma.visitPass.update({ where: { id: pass.id }, data: { usedAt: new Date() } });

    await expect(verifyPassToken(token)).rejects.toMatchObject({ code: 'PASS_ALREADY_USED' });
  });

  it('rejects a pass whose window has not started yet', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
      status: 'APPROVED',
      windowStart: new Date(Date.now() + 60 * 60_000), // starts an hour from now
      windowEnd: new Date(Date.now() + 2 * 60 * 60_000),
    });

    const { token } = await issuePass(visit.id, visit.windowEnd);

    await expect(verifyPassToken(token)).rejects.toMatchObject({ code: 'PASS_NOT_YET_VALID' });
  });

  it('rejects an expired pass', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const visitor = await createTestVisitor();
    const visit = await createTestVisit({
      visitorId: visitor.id,
      hostId: host.id,
      officeId: office.id,
      status: 'APPROVED',
      windowStart: new Date(Date.now() - 2 * 60 * 60_000),
      windowEnd: new Date(Date.now() - 60 * 60_000), // already ended
    });

    // issuePass signs a JWT with expiresIn computed from (expiresAt - now); a past expiresAt
    // clamps to 1s, so wait it out to exercise the real expiry path.
    const { token } = await issuePass(visit.id, visit.windowEnd);
    await new Promise((resolve) => setTimeout(resolve, 1100));

    await expect(verifyPassToken(token)).rejects.toMatchObject({ code: 'PASS_EXPIRED' });
  });

  it('rejects an unknown/tampered token', async () => {
    await expect(verifyPassToken('not-a-real-token')).rejects.toBeInstanceOf(AppError);
  });
});
