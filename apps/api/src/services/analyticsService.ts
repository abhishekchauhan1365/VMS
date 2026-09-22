import { prisma } from '../lib/prisma.js';

export async function getAnalytics() {
  const [visitsPerDay, byType, peakHours, overstayCount, avgApprovalSeconds] = await Promise.all([
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "requestedAt") AS day, COUNT(*)::bigint AS count
      FROM visits
      WHERE "requestedAt" > NOW() - INTERVAL '60 days'
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.visit.groupBy({ by: ['visitType'], _count: { _all: true } }),
    prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
      SELECT EXTRACT(HOUR FROM "checkInAt")::int AS hour, COUNT(*)::bigint AS count
      FROM visits
      WHERE "checkInAt" IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.visit.count({
      where: {
        status: 'CHECKED_IN',
        checkInAt: { not: null },
        windowEnd: { lt: new Date() },
      },
    }),
    prisma.$queryRaw<Array<{ avg_seconds: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("decidedAt" - "requestedAt")))::float AS avg_seconds
      FROM visits
      WHERE "decidedAt" IS NOT NULL
    `,
  ]);

  return {
    visitsPerDay: visitsPerDay.map((r) => ({ day: r.day, count: Number(r.count) })),
    byType: byType.map((r) => ({ visitType: r.visitType, count: r._count._all })),
    peakHours: peakHours.map((r) => ({ hour: r.hour, count: Number(r.count) })),
    overstayCount,
    avgApprovalSeconds: avgApprovalSeconds[0]?.avg_seconds ?? null,
  };
}
