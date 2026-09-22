import type { Request } from 'express';
import { AppError } from './errors.js';

/**
 * Express 5's `ParamsDictionary` types every value as `string | string[]` (to cover repeated
 * wildcard segments); a plain `:id` route param is always a single string at runtime.
 */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError('VALIDATION_ERROR', `Missing route parameter: ${name}`);
  }
  return value;
}
