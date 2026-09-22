import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test' },
    globalSetup: ['./tests/globalTeardown.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.ts', 'src/domain/**/*.ts'],
      reporter: ['text', 'html'],
    },
  },
});
