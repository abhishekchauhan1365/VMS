import { prisma } from '../lib/prisma.js';

export const policyRepository = {
  findAll: () => prisma.policy.findMany({ orderBy: { key: 'asc' } }),

  findByKey: (key: string) => prisma.policy.findUnique({ where: { key } }),

  upsertMany: (entries: Record<string, string>) =>
    prisma.$transaction(
      Object.entries(entries).map(([key, value]) =>
        prisma.policy.upsert({ where: { key }, create: { key, value }, update: { value } }),
      ),
    ),
};
