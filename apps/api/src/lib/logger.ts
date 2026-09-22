import pino from 'pino';
import { env } from '../config/env.js';

export const logger =
  env.NODE_ENV === 'development'
    ? pino({ level: 'debug', transport: { target: 'pino-pretty' } })
    : pino({ level: env.NODE_ENV === 'test' ? 'silent' : 'info' });
