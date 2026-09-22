import { redis } from './redis.js';

/**
 * Caches a handler's result under `Idempotency-Key` for 5 minutes so a retried/double-clicked
 * request (check-in, check-out) replays the original response instead of re-running side effects.
 */
export async function withIdempotency<T>(
  key: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!key) return fn();
  const cacheKey = `idempotency:${key}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached) as T;

  const result = await fn();
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  return result;
}
