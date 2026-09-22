import type { NewGuestInput } from '@vms/shared';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { visitorRepository } from '../repositories/visitorRepository.js';

/** Trigram fuzzy search on name, exact on phone/email, capped at 10 results per §3 endpoint spec. */
export async function searchVisitors(q: string) {
  return visitorRepository.search(q, 10);
}

/** Dedup by phone: returning visitors auto-fill instead of creating a duplicate row. */
export async function findOrCreateVisitor(input: NewGuestInput) {
  const existing = await visitorRepository.findByPhone(input.phone);
  if (existing) return existing;
  return visitorRepository.create({
    fullName: input.fullName,
    phone: input.phone,
    email: input.email ?? null,
    company: input.company ?? null,
  });
}

export async function resolveVisitor(input: { visitorId?: string } | NewGuestInput) {
  if ('visitorId' in input && input.visitorId) {
    const visitor = await visitorRepository.findById(input.visitorId);
    if (!visitor) throw new AppError('NOT_FOUND', 'Visitor not found');
    return visitor;
  }
  return findOrCreateVisitor(input as NewGuestInput);
}

export function assertNotWatchlisted(visitor: { isWatchlisted: boolean; fullName: string }) {
  if (visitor.isWatchlisted) {
    throw new AppError('WATCHLISTED', `${visitor.fullName} is on the watchlist`);
  }
}

export async function listWatchlist() {
  return prisma.visitor.findMany({ where: { isWatchlisted: true }, orderBy: { fullName: 'asc' } });
}

export async function addToWatchlist(phone: string, fullName?: string) {
  const existing = await visitorRepository.findByPhone(phone);
  if (existing) {
    return prisma.visitor.update({ where: { id: existing.id }, data: { isWatchlisted: true } });
  }
  return prisma.visitor.create({
    data: { phone, fullName: fullName ?? phone, isWatchlisted: true },
  });
}

export async function removeFromWatchlist(visitorId: string) {
  const visitor = await visitorRepository.findById(visitorId);
  if (!visitor) throw new AppError('NOT_FOUND', 'Visitor not found');
  return prisma.visitor.update({ where: { id: visitorId }, data: { isWatchlisted: false } });
}
