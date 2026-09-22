import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './tokenStore';

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  if (!socket) {
    socket = io(SOCKET_URL, { auth: { token }, autoConnect: false });
  }
  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
