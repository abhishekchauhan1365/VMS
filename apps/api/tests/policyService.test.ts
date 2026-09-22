import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma.js';
import { getPolicies, getPolicyNumber, updatePolicies } from '../src/services/policyService.js';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('policyService', () => {
  it('getPolicies returns the seeded defaults as a key/value map', async () => {
    const policies = await getPolicies();
    expect(policies).toHaveProperty('MAX_PREAPPROVALS_PER_HOST_PER_DAY');
    expect(policies).toHaveProperty('OVERSTAY_MINUTES');
    expect(policies).toHaveProperty('PENDING_APPROVAL_TIMEOUT_MINUTES');
  });

  it('getPolicyNumber parses a stored value, falls back for a missing key', async () => {
    const overstay = await getPolicyNumber('OVERSTAY_MINUTES', -1);
    expect(overstay).toBeGreaterThan(0);

    const missing = await getPolicyNumber('DOES_NOT_EXIST_KEY', 42);
    expect(missing).toBe(42);
  });

  it('updatePolicies upserts and getPolicies reflects the change', async () => {
    const original = await getPolicies();
    const originalValue = original.OVERSTAY_MINUTES ?? '480';

    await updatePolicies({ OVERSTAY_MINUTES: '600' });
    expect((await getPolicies()).OVERSTAY_MINUTES).toBe('600');

    // restore so other tests/manual runs see the original policy value
    await updatePolicies({ OVERSTAY_MINUTES: originalValue });
    expect((await getPolicies()).OVERSTAY_MINUTES).toBe(originalValue);
  });
});
