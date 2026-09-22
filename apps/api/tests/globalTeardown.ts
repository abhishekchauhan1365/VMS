import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '..', '.env') });

/**
 * Tests run against the same dev/demo Postgres as `pnpm db:seed` (no isolated test DB in this
 * environment). Every fixture created by tests/helpers.ts is tagged with a "Test " name prefix
 * or a "+1-...-test" phone prefix, so the returned teardown can find and remove exactly that
 * data — never the real seeded demo rows — leaving the database in its pre-test-run state.
 * Vitest's globalSetup contract: the default export runs before the suite; a function it
 * returns runs after, so cleanup is wired as that returned function.
 */
export default function globalSetup() {
  return async function teardown() {
    const prisma = new PrismaClient();
    try {
      const testOffices = await prisma.office.findMany({
        where: { name: { startsWith: 'Test Office ' } },
        select: { id: true },
      });
      const officeIds = testOffices.map((o) => o.id);

      const testUsers = await prisma.user.findMany({
        where: { email: { endsWith: '@example.test' } },
        select: { id: true },
      });
      const userIds = testUsers.map((u) => u.id);

      const testVisitors = await prisma.visitor.findMany({
        where: { phone: { startsWith: '+1-' } },
        select: { id: true },
      });
      const visitorIds = testVisitors.map((v) => v.id);

      const visitWhere = {
        OR: [
          officeIds.length ? { officeId: { in: officeIds } } : undefined,
          userIds.length ? { hostId: { in: userIds } } : undefined,
          visitorIds.length ? { visitorId: { in: visitorIds } } : undefined,
        ].filter(Boolean) as object[],
      };
      const testVisits = visitWhere.OR.length
        ? await prisma.visit.findMany({ where: visitWhere, select: { id: true } })
        : [];
      const visitIds = testVisits.map((v) => v.id);

      const testInvites = userIds.length
        ? await prisma.invite.findMany({ where: { hostId: { in: userIds } }, select: { id: true } })
        : [];
      const inviteIds = testInvites.map((i) => i.id);

      if (visitIds.length) {
        await prisma.visitPass.deleteMany({ where: { visitId: { in: visitIds } } });
        await prisma.auditLog.deleteMany({ where: { visitId: { in: visitIds } } });
        await prisma.visit.deleteMany({ where: { id: { in: visitIds } } });
      }
      if (inviteIds.length) {
        await prisma.inviteGuest.deleteMany({ where: { inviteId: { in: inviteIds } } });
        await prisma.invite.deleteMany({ where: { id: { in: inviteIds } } });
      }
      if (visitorIds.length) {
        await prisma.visitor.deleteMany({ where: { id: { in: visitorIds } } });
      }
      if (userIds.length) {
        await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
      if (officeIds.length) {
        await prisma.office.deleteMany({ where: { id: { in: officeIds } } });
      }
    } finally {
      await prisma.$disconnect();
    }
  };
}
