import { describe, expect, it } from 'vitest';
import { VISIT_STATUSES, VISIT_TRANSITIONS, canTransition, type VisitStatus } from '@vms/shared';

describe('visit state machine transition table (§5)', () => {
  const expectedAllowed = new Set<string>([
    'PENDING_APPROVAL->APPROVED',
    'PENDING_APPROVAL->REJECTED',
    'PENDING_APPROVAL->EXPIRED',
    'APPROVED->CHECKED_IN',
    'APPROVED->EXPIRED',
    'APPROVED->CANCELLED',
    'CHECKED_IN->CHECKED_OUT',
  ]);

  // Exhaustively check every (from, to) pair in the 7x7 status matrix — every valid
  // transition from the diagram is allowed, and everything else (including self-loops
  // and reversals) is rejected.
  for (const from of VISIT_STATUSES) {
    for (const to of VISIT_STATUSES) {
      const key = `${from}->${to}`;
      const shouldBeAllowed = expectedAllowed.has(key);

      it(`${key} is ${shouldBeAllowed ? 'allowed' : 'rejected'}`, () => {
        expect(canTransition(from, to)).toBe(shouldBeAllowed);
      });
    }
  }

  it('terminal statuses allow no further transitions', () => {
    const terminal: VisitStatus[] = ['REJECTED', 'EXPIRED', 'CHECKED_OUT', 'CANCELLED'];
    for (const status of terminal) {
      expect(VISIT_TRANSITIONS[status]).toHaveLength(0);
    }
  });
});
