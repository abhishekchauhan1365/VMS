import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/** Applied to public/kiosk endpoints (no auth) to blunt scraping and brute force. */
export const publicRateLimiter = rateLimit({
  windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS,
  limit: env.PUBLIC_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down.' } },
});
