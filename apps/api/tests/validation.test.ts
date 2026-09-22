import { describe, expect, it, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('validation errors', () => {
  it('rejects a malformed login body with 400 VALIDATION_ERROR and field errors', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.fieldErrors).toHaveProperty('email');
    expect(res.body.error.details.fieldErrors).toHaveProperty('password');
  });

  it('rejects wrong credentials with 401, not a crash', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.test', password: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('404s an unknown route with the stable NOT_FOUND shape', async () => {
    const res = await request(app).get('/api/v1/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
