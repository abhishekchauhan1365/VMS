import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/jwt.js';
import type { UserRole } from '@vms/shared';

/** Unique-enough suffix per test run so parallel/rerun test data never collides. */
export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function createTestOffice() {
  return prisma.office.create({ data: { name: `Test Office ${uniqueSuffix()}`, capacity: 50 } });
}

export async function createTestUser(role: UserRole, officeId?: string) {
  const suffix = uniqueSuffix();
  const passwordHash = await bcrypt.hash('Passw0rd!', 4);
  return prisma.user.create({
    data: {
      name: `Test ${role} ${suffix}`,
      email: `test-${role.toLowerCase()}-${suffix}@example.test`,
      passwordHash,
      role,
      officeId: officeId ?? null,
    },
  });
}

export async function createTestVisitor() {
  const suffix = uniqueSuffix();
  return prisma.visitor.create({
    data: { fullName: `Test Visitor ${suffix}`, phone: `+1-test-${suffix}` },
  });
}

export function tokenFor(user: { id: string; role: UserRole; officeId: string | null }): string {
  return signAccessToken({ sub: user.id, role: user.role, officeId: user.officeId });
}

export async function createTestVisit(overrides: {
  visitorId: string;
  hostId: string;
  officeId: string;
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'CHECKED_IN';
  windowStart?: Date;
  windowEnd?: Date;
}) {
  const windowStart = overrides.windowStart ?? new Date(Date.now() - 5 * 60_000);
  const windowEnd = overrides.windowEnd ?? new Date(Date.now() + 60 * 60_000);
  return prisma.visit.create({
    data: {
      visitor: { connect: { id: overrides.visitorId } },
      host: { connect: { id: overrides.hostId } },
      office: { connect: { id: overrides.officeId } },
      visitType: 'BUSINESS_GUEST',
      status: overrides.status ?? 'PENDING_APPROVAL',
      windowStart,
      windowEnd,
    },
  });
}
