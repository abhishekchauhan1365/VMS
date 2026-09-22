import type { VisitStatus } from './enums.js';

/**
 * Whitelist of valid Visit status transitions (§5 of ARCHITECTURE.md).
 * Shared so the frontend can disable actions the backend would reject anyway;
 * the backend is the sole source of truth and re-validates every transition.
 */
export const VISIT_TRANSITIONS: Record<VisitStatus, readonly VisitStatus[]> = {
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'EXPIRED'],
  APPROVED: ['CHECKED_IN', 'EXPIRED', 'CANCELLED'],
  REJECTED: [],
  EXPIRED: [],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [],
  CANCELLED: [],
};

export function canTransition(from: VisitStatus, to: VisitStatus): boolean {
  return VISIT_TRANSITIONS[from].includes(to);
}
