import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '..', '..', '.env') });

// Render (and most PaaS hosts) inject the port to listen on as `PORT`, not `API_PORT` — fall
// back to it so the same code works locally (API_PORT from .env) and on a host like Render.
const DEFAULT_PORT = Number(process.env.PORT) || 4000;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().default(DEFAULT_PORT),
  API_URL: z.string().default('http://localhost:4000'),
  WEB_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ROOT_USER: z.string().default('vms_minio'),
  MINIO_ROOT_PASSWORD: z.string().default('vms_minio_password'),
  MINIO_BUCKET: z.string().default('vms-photos'),
  MINIO_USE_SSL: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  MAIL_FROM: z.string().default('vms@example.com'),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  QR_SIGNING_SECRET: z.string().min(10),
  MAX_PREAPPROVALS_PER_HOST_PER_DAY: z.coerce.number().default(5),
  OVERSTAY_MINUTES: z.coerce.number().default(480),
  PENDING_APPROVAL_TIMEOUT_MINUTES: z.coerce.number().default(30),
  PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().default(30),
});

export const env = envSchema.parse(process.env);
