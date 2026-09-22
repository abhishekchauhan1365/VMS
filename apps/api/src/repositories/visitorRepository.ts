import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export const visitorRepository = {
  findByPhone: (phone: string) => prisma.visitor.findUnique({ where: { phone } }),
  findById: (id: string) => prisma.visitor.findUnique({ where: { id } }),

  create: (data: Prisma.VisitorCreateInput) => prisma.visitor.create({ data }),

  /**
   * Trigram + exact search: `%` similarity on fullName hits the GIN index from the Phase 2
   * migration; phone/email get an exact match. O(log n) via the index for the common case.
   */
  search: (q: string, limit: number) =>
    prisma.$queryRaw<
      Array<{
        id: string;
        fullName: string;
        phone: string;
        email: string | null;
        company: string | null;
        photoUrl: string | null;
        isWatchlisted: boolean;
      }>
    >`
      SELECT id, "fullName", phone, email, company, "photoUrl", "isWatchlisted"
      FROM visitors
      WHERE "fullName" % ${q} OR phone = ${q} OR email = ${q}
      ORDER BY similarity("fullName", ${q}) DESC
      LIMIT ${limit}
    `,
};
