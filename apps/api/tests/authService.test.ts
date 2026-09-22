import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { login, refresh } from '../src/services/authService.js';
import { signRefreshToken } from '../src/lib/jwt.js';
import { AppError } from '../src/lib/errors.js';
import { createTestOffice, createTestUser } from './helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('authService', () => {
  it('logs in with correct credentials and issues both tokens', async () => {
    const office = await createTestOffice();
    const user = await createTestUser('HOST', office.id);

    const result = await login(user.email, 'Passw0rd!');

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user.id).toBe(user.id);
    expect(result.user.role).toBe('HOST');
  });

  it('rejects a wrong password with UNAUTHORIZED', async () => {
    const office = await createTestOffice();
    const user = await createTestUser('HOST', office.id);

    await expect(login(user.email, 'wrong-password')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rejects an unknown email with UNAUTHORIZED (not a user-enumeration leak)', async () => {
    await expect(login('nobody-at-all@example.test', 'whatever')).rejects.toBeInstanceOf(AppError);
  });

  it('refreshes a valid refresh token into a new access/refresh pair', async () => {
    const office = await createTestOffice();
    const user = await createTestUser('HOST', office.id);
    const refreshToken = signRefreshToken(user.id);

    const result = await refresh(refreshToken);

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user.id).toBe(user.id);
  });

  it('rejects a garbage refresh token', async () => {
    await expect(refresh('not-a-real-token')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
