import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: 'Route not found', details: undefined } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten() },
    });
    return;
  }
  logger.error({ err, path: req.path }, 'Unhandled error');
  res
    .status(500)
    .json({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: undefined },
    });
}

/** Wraps an async route handler so rejected promises reach errorHandler instead of hanging. */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as Req, res, next).catch(next);
  };
}
