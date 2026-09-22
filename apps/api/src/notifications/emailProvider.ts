import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import type { NotificationProvider } from './types.js';

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

function subjectFor(type: string): string {
  return `VMS — ${type.replace(/_/g, ' ').toLowerCase()}`;
}

/** Real SMTP send against Mailpit (mock provider — nothing leaves the local network). */
export const emailProvider: NotificationProvider = {
  async send(user, type, payload) {
    try {
      await transport.sendMail({
        from: env.MAIL_FROM,
        to: user.email,
        subject: subjectFor(type),
        text: JSON.stringify(payload, null, 2),
      });
    } catch (err) {
      logger.warn({ err, userId: user.id, type }, 'Email notification failed');
    }
  },
};
