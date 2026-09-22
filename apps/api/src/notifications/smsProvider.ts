import { logger } from '../lib/logger.js';
import type { NotificationProvider } from './types.js';

/** Mock SMS provider — logs instead of calling a real gateway (swap for Twilio later). */
export const smsProvider: NotificationProvider = {
  async send(user, type, payload) {
    if (!user.phone) return;
    logger.info({ to: user.phone, type, payload }, '[SMS mock]');
  },
};
