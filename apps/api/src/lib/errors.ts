import type { ErrorCode } from '@vms/shared';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  LIMIT_EXCEEDED: 429,
  PASS_EXPIRED: 410,
  PASS_ALREADY_USED: 409,
  PASS_NOT_YET_VALID: 409,
  INVALID_TRANSITION: 409,
  WATCHLISTED: 409,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}
