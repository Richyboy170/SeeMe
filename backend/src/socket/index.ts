import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifySocketToken } from '../middleware/socketAuth';
import { handleChatEvents } from './chatHandler';
import { handleFriendshipEvents } from './friendshipHandler';
import { redisClient, redisAvailable } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Initialize Socket.io server with authentication and event handlers
 */
export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(verifySocketToken);

  // Connection handler
  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    logger.info(`User connected via Socket.io`, {
      userId,
      socketId: socket.id
    });

    // Disconnect any existing sockets for this user (prevent duplicates)
    const room = `user:${userId}`;
    const existingSockets = await io.in(room).fetchSockets();
    for (const existing of existingSockets) {
      if (existing.id !== socket.id) {
        logger.info('Disconnecting stale socket for user', {
          userId,
          staleSocketId: existing.id,
          newSocketId: socket.id
        });
        existing.disconnect(true);
      }
    }

    // Join user's personal room for receiving messages
    socket.join(room);

    // Mark user as online in Redis (expires in 5 minutes)
    if (redisAvailable && redisClient) {
      redisClient.setEx(`user:${userId}:online`, 300, 'true')
        .catch(err => logger.error('Failed to set user online status', { userId, error: err }));
    }

    // Handle chat events
    handleChatEvents(io, socket);

    // Handle friendship meetup events
    handleFriendshipEvents(io, socket);

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected`, {
        userId,
        socketId: socket.id,
        reason
      });

      // Only remove online status if no other sockets remain for this user
      io.in(room).fetchSockets().then(remaining => {
        if (remaining.length === 0 && redisAvailable && redisClient) {
          redisClient.del(`user:${userId}:online`)
            .catch(err => logger.error('Failed to remove user online status', { userId, error: err }));
        }
      }).catch(() => {
        // Fallback: remove anyway
        if (redisAvailable && redisClient) {
          redisClient.del(`user:${userId}:online`)
            .catch(err => logger.error('Failed to remove user online status', { userId, error: err }));
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        userId,
        socketId: socket.id,
        error
      });
    });
  });

  // No custom heartbeat — Socket.io's built-in pingInterval/pingTimeout handles keep-alive

  logger.info('Socket.io server initialized successfully');

  return io;
};
