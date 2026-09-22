import { prisma } from '../lib/prisma.js';

export const auditRepository = {
  async list(
    filters: { entity?: string | undefined; actorId?: string | undefined },
    cursor: string | undefined,
    limit: number,
  ) {
    const rows = await prisma.auditLog.findMany({
      where: {
        ...(filters.entity ? { entity: filters.entity } : {}),
        ...(filters.actorId ? { actorId: filters.actorId } : {}),
      },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: [{ at: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  },
};
