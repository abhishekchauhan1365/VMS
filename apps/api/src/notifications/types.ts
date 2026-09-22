import type { NotificationType, User } from '@prisma/client';

export interface NotificationProvider {
  send(user: User, type: NotificationType, payload: Record<string, unknown>): Promise<void>;
}
