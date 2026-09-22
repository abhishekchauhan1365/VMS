import { prisma } from '../lib/prisma.js';

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  findHosts: () => prisma.user.findMany({ where: { role: 'HOST' }, orderBy: { name: 'asc' } }),
};
