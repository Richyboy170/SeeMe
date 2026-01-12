import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import User from '../models/User';

/**
 * JWT payload interface for socket authentication
 */
interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Extended socket data interface
 */
declare module 'socket.io' {
  interface SocketData {
    userId: string;
    username: string;
    email: string;
  }
}

/**
 * Socket.io authentication middleware
 * Verifies JWT token from handshake auth or query params
 */
export const verifySocketToken = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    // Get token from handshake auth or query params
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token || typeof token !== 'string') {
      logger.warn('Socket connection attempt without token', {
        socketId: socket.id,
        address: socket.handshake.address
      });
      return next(new Error('Authentication token required'));
    }

    // Verify JWT secret is configured
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured for socket authentication');
      return next(new Error('Authentication service unavailable'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

    // Verify user exists in database
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      logger.warn('Socket authentication failed - user not found', {
        userId: decoded.userId,
        socketId: socket.id
      });
      return next(new Error('User not found - please log in again'));
    }

    // Attach user data to socket
    socket.data = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email
    };

    logger.info('Socket authenticated successfully', {
      userId: decoded.userId,
      socketId: socket.id
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid socket token', {
        socketId: socket.id,
        error: error.message
      });
      return next(new Error('Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired socket token', { socketId: socket.id });
      return next(new Error('Authentication token expired'));
    } else {
      logger.error('Socket authentication error', {
        socketId: socket.id,
        error
      });
      return next(new Error('Authentication failed'));
    }
  }
};
