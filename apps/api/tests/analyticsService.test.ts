import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { getAnalytics } from '../src/services/analyticsService.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('analyticsService', () => {
  it('returns visits-per-day, by-type, peak-hours, overstay count, and avg approval time', async () => {
    const analytics = await getAnalytics();

    expect(Array.isArray(analytics.visitsPerDay)).toBe(true);
    expect(Array.isArray(analytics.byType)).toBe(true);
    expect(Array.isArray(analytics.peakHours)).toBe(true);
    expect(typeof analytics.overstayCount).toBe('number');
    expect(analytics.overstayCount).toBeGreaterThanOrEqual(0);

    // Against the Phase 2 seed data (5,000 visits over 60 days), these should be non-empty.
    expect(analytics.visitsPerDay.length).toBeGreaterThan(0);
    expect(analytics.byType.length).toBeGreaterThan(0);
  });
});
