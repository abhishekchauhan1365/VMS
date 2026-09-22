import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/lib/api';

describe('ApiError', () => {
  it('carries status, code, message, and optional details', () => {
    const err = new ApiError(409, 'CONFLICT', 'Visit was modified', { foo: 'bar' });
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('Visit was modified');
    expect(err.details).toEqual({ foo: 'bar' });
  });
});
