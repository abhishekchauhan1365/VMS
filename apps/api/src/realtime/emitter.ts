import { Emitter } from '@socket.io/redis-emitter';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';

/**
 * A Redis-backed Socket.IO emitter: lets any process (API request handlers, the BullMQ worker)
 * push a room event without holding a live Socket.IO server — the connected gateway (in
 * src/realtime/io.ts) relays it to clients via the same Redis pub/sub the adapter uses.
 */
const emitterRedis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const socketEmitter = new Emitter(emitterRedis);
