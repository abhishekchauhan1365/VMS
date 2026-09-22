import { describe, expect, it, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { createTestOffice, createTestUser, tokenFor } from './helpers.js';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('RBAC and auth guards', () => {
  it('rejects an unauthenticated request with 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/visits');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a wrong-role request with 403 FORBIDDEN', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const token = tokenFor(host);

    // Walk-in registration is SECURITY/ADMIN only.
    const res = await request(app)
      .post('/api/v1/visits/walk-in')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an invalid/garbage token with 401', async () => {
    const res = await request(app).get('/api/v1/visits').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });

  it('allows a correctly-scoped role through the guard (may still 400 on body)', async () => {
    const office = await createTestOffice();
    const security = await createTestUser('SECURITY', office.id);
    const token = tokenFor(security);

    const res = await request(app)
      .post('/api/v1/visits/walk-in')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    // Passed RBAC — the 400 here is a validation error, not 401/403.
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('admin-only routes reject HOST and SECURITY', async () => {
    const office = await createTestOffice();
    const host = await createTestUser('HOST', office.id);
    const security = await createTestUser('SECURITY', office.id);

    for (const user of [host, security]) {
      const res = await request(app)
        .get('/api/v1/admin/policies')
        .set('Authorization', `Bearer ${tokenFor(user)}`);
      expect(res.status).toBe(403);
    }
  });
});
