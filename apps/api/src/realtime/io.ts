import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { userRoom, officeRoom } from './rooms.js';

/**
 * Socket.IO gateway with the Redis adapter (§8 "Socket.IO Redis adapter for multi-instance
 * broadcast") so events published via the Emitter from any process (this server or the worker)
 * reach clients connected to any instance. Clients authenticate with the same JWT access token
 * used for REST calls, passed as `socket.handshake.auth.token`.
 */
export function attachSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.WEB_URL, credentials: true },
  });

  const pubClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      next(new Error('Missing auth token'));
      return;
    }
    try {
      socket.data.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { sub: string; officeId: string | null };
    socket.join(userRoom(user.sub));
    if (user.officeId) {
      socket.join(officeRoom(user.officeId));
    }
  });

  return io;
}
