import jwt from 'jsonwebtoken';
import type { UserRole } from '@vms/shared';
import { env } from '../config/env.js';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  officeId: string | null;
}

type Expiry = NonNullable<jwt.SignOptions['expiresIn']>;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as Expiry });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as Expiry,
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
}
