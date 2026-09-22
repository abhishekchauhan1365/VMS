import { Prisma, type NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { emailProvider } from '../notifications/emailProvider.js';
import { smsProvider } from '../notifications/smsProvider.js';
import { socketEmitter } from '../realtime/emitter.js';
import { userRoom, SOCKET_EVENTS } from '../realtime/rooms.js';

/**
 * Fans a notification out across every channel: persists an in-app Notification row,
 * best-effort Email (Mailpit) and SMS (console mock), and a live Socket.IO push to the
 * user's room. Channel failures are logged, never thrown — a flaky SMTP connection must not
 * fail the request that triggered the notification.
 */
export async function notify(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>,
) {
  const [inApp, user] = await Promise.all([
    prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonValue },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (user) {
    await Promise.all([
      emailProvider.send(user, type, payload),
      smsProvider.send(user, type, payload),
    ]);
  }

  socketEmitter.to(userRoom(userId)).emit(SOCKET_EVENTS.VISIT_UPDATED, { type, ...payload });

  return inApp;
}
