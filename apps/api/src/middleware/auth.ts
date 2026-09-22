import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@vms/shared';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';

export interface AuthedRequest extends Request {
  user?: AccessTokenPayload;
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    next(new AppError('UNAUTHORIZED', 'Missing access token'));
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError('UNAUTHORIZED', 'Invalid or expired access token'));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError('UNAUTHORIZED', 'Missing access token'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('FORBIDDEN', `Requires one of roles: ${roles.join(', ')}`));
      return;
    }
    next();
  };
}
