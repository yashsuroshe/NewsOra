import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { JwtPayload } from '../types/index.js';

let io: SocketServer | null = null;

/**
 * Initialize Socket.io server attached to the HTTP server.
 * Uses JWT auth in the handshake — clients pass token as auth.token.
 */
export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      socket.data['userId'] = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data['userId'] as string;
    logger.debug({ userId, socketId: socket.id }, 'Socket connected');

    // Join user-specific room for targeted alerts
    void socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      logger.debug({ userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  logger.info('Socket.io server initialized');
  return io;
}

/**
 * Emit an alert to a specific user's room.
 */
export function emitAlertToUser(userId: string, alert: object): void {
  if (!io) {
    logger.warn('Socket.io not initialized — cannot emit alert');
    return;
  }
  io.to(`user:${userId}`).emit('alert', alert);
}

export function getSocketServer(): SocketServer | null {
  return io;
}
