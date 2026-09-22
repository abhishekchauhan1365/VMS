import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import {
  addToWatchlist,
  assertNotWatchlisted,
  findOrCreateVisitor,
  listWatchlist,
  removeFromWatchlist,
  resolveVisitor,
  searchVisitors,
} from '../src/services/visitorService.js';
import { AppError } from '../src/lib/errors.js';
import { uniqueSuffix } from './helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('visitorService', () => {
  it('findOrCreateVisitor dedupes by phone', async () => {
    const suffix = uniqueSuffix();
    const phone = `+1-dedupe-${suffix}`;

    const first = await findOrCreateVisitor({ fullName: `Dedupe ${suffix}`, phone });
    const second = await findOrCreateVisitor({ fullName: `Different Name`, phone });

    expect(second.id).toBe(first.id);
    expect(second.fullName).toBe(first.fullName); // not overwritten by the second call
  });

  it('resolveVisitor returns an existing visitor by id, throws NOT_FOUND for a bad id', async () => {
    const suffix = uniqueSuffix();
    const created = await findOrCreateVisitor({
      fullName: `Resolve ${suffix}`,
      phone: `+1-res-${suffix}`,
    });

    const resolved = await resolveVisitor({ visitorId: created.id });
    expect(resolved.id).toBe(created.id);

    await expect(resolveVisitor({ visitorId: 'nonexistent-id' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('assertNotWatchlisted throws WATCHLISTED for a flagged visitor', () => {
    expect(() => assertNotWatchlisted({ isWatchlisted: true, fullName: 'X' })).toThrow(AppError);
    expect(() => assertNotWatchlisted({ isWatchlisted: false, fullName: 'X' })).not.toThrow();
  });

  it('searchVisitors finds by exact phone', async () => {
    const suffix = uniqueSuffix();
    const phone = `+1-search-${suffix}`;
    await findOrCreateVisitor({ fullName: `Searchable ${suffix}`, phone });

    const results = await searchVisitors(phone);
    expect(results.some((v) => v.phone === phone)).toBe(true);
  });

  it('watchlist add/list/remove round-trip', async () => {
    const suffix = uniqueSuffix();
    const phone = `+1-watch-${suffix}`;

    const added = await addToWatchlist(phone, `Watchlisted ${suffix}`);
    expect(added.isWatchlisted).toBe(true);

    const list = await listWatchlist();
    expect(list.some((v) => v.id === added.id)).toBe(true);

    const removed = await removeFromWatchlist(added.id);
    expect(removed.isWatchlisted).toBe(false);
  });

  it('addToWatchlist flips an existing visitor instead of duplicating', async () => {
    const suffix = uniqueSuffix();
    const phone = `+1-existing-${suffix}`;
    const existing = await findOrCreateVisitor({ fullName: `Existing ${suffix}`, phone });

    const flagged = await addToWatchlist(phone);
    expect(flagged.id).toBe(existing.id);
    expect(flagged.isWatchlisted).toBe(true);
  });

  it('removeFromWatchlist throws NOT_FOUND for a bad id', async () => {
    await expect(removeFromWatchlist('nonexistent-id')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
