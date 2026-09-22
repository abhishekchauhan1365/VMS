import { prisma } from '../lib/prisma.js';

export const passRepository = {
  findByTokenHash: (tokenHash: string) =>
    prisma.visitPass.findUnique({
      where: { tokenHash },
      include: { visit: { include: { visitor: true, host: true, office: true } } },
    }),

  findByVisitToken: (tokenHash: string) =>
    prisma.visitPass.findUnique({
      where: { tokenHash },
      include: {
        visit: {
          include: { visitor: true, host: { select: { id: true, name: true } }, office: true },
        },
      },
    }),

  markUsed: (id: string, usedAt: Date) =>
    prisma.visitPass.update({ where: { id }, data: { usedAt } }),
};
