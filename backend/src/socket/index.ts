import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifySocketToken } from '../middleware/socketAuth';
import { handleChatEvents } from './chatHandler';
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
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info(`User connected via Socket.io`, {
      userId,
      socketId: socket.id
    });

    // Join user's personal room for receiving messages
    socket.join(`user:${userId}`);

    // Mark user as online in Redis (expires in 5 minutes)
    if (redisAvailable && redisClient) {
      redisClient.setEx(`user:${userId}:online`, 300, 'true')
        .catch(err => logger.error('Failed to set user online status', { userId, error: err }));
    }

    // Handle chat events
    handleChatEvents(io, socket);

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected`, {
        userId,
        socketId: socket.id,
        reason
      });

      // Remove online status
      if (redisAvailable && redisClient) {
        redisClient.del(`user:${userId}:online`)
          .catch(err => logger.error('Failed to remove user online status', { userId, error: err }));
      }
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

  // Heartbeat to keep connections alive
  const heartbeatInterval = setInterval(() => {
    io.emit('ping', { timestamp: Date.now() });
  }, 25000);

  // Cleanup on server shutdown
  io.on('close', () => {
    clearInterval(heartbeatInterval);
    logger.info('Socket.io server closed');
  });

  logger.info('Socket.io server initialized successfully');

  return io;
};
