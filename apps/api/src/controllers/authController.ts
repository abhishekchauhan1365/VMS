import type { Request, Response } from 'express';
import { loginSchema } from '@vms/shared';
import * as authService from '../services/authService.js';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'vms_refresh_token';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/api/v1/auth',
};

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input.email, input.password);
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
  res.json({ accessToken: result.accessToken, user: result.user });
}

export async function refresh(req: Request, res: Response) {
  const token = (req.cookies as Record<string, string | undefined>)?.[REFRESH_COOKIE];
  if (!token) throw new AppError('UNAUTHORIZED', 'Missing refresh token');
  const result = await authService.refresh(token);
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
  res.json({ accessToken: result.accessToken, user: result.user });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).send();
}
