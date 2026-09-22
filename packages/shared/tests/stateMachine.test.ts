import { describe, expect, it } from 'vitest';
import { canTransition, VISIT_STATUSES } from '../src/index.js';

describe('canTransition', () => {
  it('allows the documented happy path', () => {
    expect(canTransition('PENDING_APPROVAL', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'CHECKED_IN')).toBe(true);
    expect(canTransition('CHECKED_IN', 'CHECKED_OUT')).toBe(true);
  });

  it('rejects skipping states', () => {
    expect(canTransition('PENDING_APPROVAL', 'CHECKED_IN')).toBe(false);
    expect(canTransition('APPROVED', 'CHECKED_OUT')).toBe(false);
  });

  it('rejects every self-transition', () => {
    for (const status of VISIT_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});
