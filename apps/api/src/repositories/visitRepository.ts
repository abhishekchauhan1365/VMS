import type { Prisma, VisitStatus, VisitType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface VisitListFilters {
  officeId?: string;
  status?: VisitStatus;
  visitType?: VisitType;
  hostId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

const detailInclude = {
  visitor: true,
  host: { select: { id: true, name: true, email: true } },
  office: true,
  decidedBy: { select: { id: true, name: true } },
  pass: true,
} satisfies Prisma.VisitInclude;

export const visitRepository = {
  create: (data: Prisma.VisitCreateInput) => prisma.visit.create({ data, include: detailInclude }),

  findById: (id: string) => prisma.visit.findUnique({ where: { id }, include: detailInclude }),

  /**
   * Cursor pagination on (checkInAt, id) — no OFFSET scan, O(log n + page) via the
   * (officeId, status, checkInAt) index from §4 when those filters are supplied.
   */
  async list(filters: VisitListFilters, cursor: string | undefined, limit: number) {
    const where: Prisma.VisitWhereInput = {
      ...(filters.officeId ? { officeId: filters.officeId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.visitType ? { visitType: filters.visitType } : {}),
      ...(filters.hostId ? { hostId: filters.hostId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            windowStart: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { visitor: { fullName: { contains: filters.search, mode: 'insensitive' } } },
              { visitor: { phone: { contains: filters.search } } },
              { host: { name: { contains: filters.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const rows = await prisma.visit.findMany({
      where,
      include: detailInclude,
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  },

  findPendingForHost: (hostId: string) =>
    prisma.visit.findMany({
      where: { hostId, status: 'PENDING_APPROVAL' },
      include: detailInclude,
      orderBy: { requestedAt: 'asc' },
    }),

  findHistoryForHost: (hostId: string, limit: number) =>
    prisma.visit.findMany({
      where: { hostId, status: { not: 'PENDING_APPROVAL' } },
      include: detailInclude,
      orderBy: { requestedAt: 'desc' },
      take: limit,
    }),

  countApprovalsForHostToday: (hostId: string, dayStart: Date, dayEnd: Date) =>
    prisma.visit.count({
      where: {
        hostId,
        status: { in: ['APPROVED', 'CHECKED_IN', 'CHECKED_OUT'] },
        requestedAt: { gte: dayStart, lte: dayEnd },
      },
    }),

  timeline: (visitId: string) =>
    prisma.auditLog.findMany({
      where: { visitId },
      orderBy: { at: 'asc' },
      include: { actor: { select: { id: true, name: true } } },
    }),
};
