export const userRoom = (userId: string) => `user:${userId}`;
export const officeRoom = (officeId: string) => `office:${officeId}`;

export const SOCKET_EVENTS = {
  VISIT_CREATED: 'visit.created',
  VISIT_UPDATED: 'visit.updated',
  VISIT_OVERSTAY: 'visit.overstay',
  VISIT_REJECTED: 'visit.rejected',
} as const;
