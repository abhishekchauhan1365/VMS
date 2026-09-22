import { describe, expect, it } from 'vitest';
import { cn } from '../src/lib/cn';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b', false, undefined, 'c')).toBe('a b c');
  });

  it('merges conflicting Tailwind utilities, keeping the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
