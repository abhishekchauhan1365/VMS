import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const inviteRepository = {
  create: (data: Prisma.InviteCreateInput) =>
    prisma.invite.create({
      data,
      include: { guests: { include: { visitor: true } }, office: true },
    }),
};
