import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Single source of truth for env vars lives at the repo root.
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
