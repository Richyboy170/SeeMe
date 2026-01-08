import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { APIError } from './errorHandler';
import { logger } from '../utils/logger';
import User from '../models/User';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Extended Request interface with user information
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

/**
 * Middleware to authenticate JWT tokens
 * Verifies the token and attaches user info to the request
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new APIError('Authentication required', 401);
    }

    // Verify JWT secret is configured
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      throw new APIError('Authentication service unavailable', 500);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email
    };

    logger.debug('User authenticated', { userId: decoded.userId });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new APIError('Invalid token', 403));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new APIError('Token expired', 403));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

      req.user = {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email
      };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

/**
 * Generates a JWT token for a user
 */
export const generateToken = (user: { id: string; username: string; email: string }): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    email: user.email
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Middleware to verify user owns the resource
 * Requires authenticateToken to run first
 */
export const verifyResourceOwnership = (userIdParam: string = 'userId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new APIError('Authentication required', 401);
      }

      const resourceUserId = req.params[userIdParam] || req.body[userIdParam];

      if (req.user.id !== resourceUserId) {
        throw new APIError('Access denied - you do not own this resource', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to verify user age
 * Requires authenticateToken to run first
 */
export const requireAgeVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new APIError('Authentication required', 401);
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      throw new APIError('User not found', 404);
    }

    if (!user.ageVerified) {
      throw new APIError('Age verification required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
