import { socketEmitter } from './emitter.js';
import { officeRoom, SOCKET_EVENTS } from './rooms.js';

/** Pushes a visit event to everyone watching that office's live board (front desk, admin). */
export function broadcastVisitEvent(
  event: (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS],
  officeId: string,
  payload: Record<string, unknown>,
) {
  socketEmitter.to(officeRoom(officeId)).emit(event, payload);
}
