import { policyRepository } from '../repositories/policyRepository.js';

export async function getPolicies(): Promise<Record<string, string>> {
  const rows = await policyRepository.findAll();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getPolicyNumber(key: string, fallback: number): Promise<number> {
  const row = await policyRepository.findByKey(key);
  if (!row) return fallback;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : fallback;
}

export async function updatePolicies(entries: Record<string, string>) {
  await policyRepository.upsertMany(entries);
  return getPolicies();
}
