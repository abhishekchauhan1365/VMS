export const ROLES = ['ADMIN', 'HOST', 'SECURITY'] as const;
export type UserRole = (typeof ROLES)[number];

export const VISIT_TYPES = [
  'BUSINESS_GUEST',
  'VENDOR',
  'PERSONNEL',
  'GOVT_OFFICIAL',
  'INTERVIEW',
  'CONTRACT_STAFF',
  'DELIVERY',
  'OTHER',
] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export const VISIT_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'VISIT_CREATED',
  'VISIT_APPROVED',
  'VISIT_REJECTED',
  'VISIT_CHECKED_IN',
  'VISIT_CHECKED_OUT',
  'VISIT_OVERSTAY',
  'VISIT_EXPIRED',
  'WATCHLIST_ALERT',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'LIMIT_EXCEEDED',
  'PASS_EXPIRED',
  'PASS_ALREADY_USED',
  'PASS_NOT_YET_VALID',
  'INVALID_TRANSITION',
  'WATCHLISTED',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
