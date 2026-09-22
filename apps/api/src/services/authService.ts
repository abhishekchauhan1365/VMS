import bcrypt from 'bcryptjs';
import { AppError } from '../lib/errors.js';
import { userRepository } from '../repositories/userRepository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';

export async function login(email: string, password: string) {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new AppError('UNAUTHORIZED', 'Invalid email or password');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid email or password');

  const accessToken = signAccessToken({ sub: user.id, role: user.role, officeId: user.officeId });
  const refreshToken = signRefreshToken(user.id);
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
    },
  };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token');
  }
  const user = await userRepository.findById(payload.sub);
  if (!user) throw new AppError('UNAUTHORIZED', 'User no longer exists');

  const accessToken = signAccessToken({ sub: user.id, role: user.role, officeId: user.officeId });
  const nextRefreshToken = signRefreshToken(user.id);
  return {
    accessToken,
    refreshToken: nextRefreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      officeId: user.officeId,
    },
  };
}
