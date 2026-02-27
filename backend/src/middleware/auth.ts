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
  role?: string;
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
    role?: string;
  };
}

/**
 * Middleware to authenticate JWT tokens
 * Verifies the token and attaches user info to the request
 */
export const authenticateToken = async (
  req: AuthRequest,
  _res: Response,
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

    // Verify user exists in database
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw new APIError('User not found - please log in again', 403);
    }

    // Check if user is banned
    if (user.status === 'banned') {
      throw new APIError('Your account has been permanently banned', 403, true, {
        accountStatus: 'banned',
        reason: user.banReason || undefined,
      });
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
        // Suspension expired — auto-unsuspend
        user.status = 'active';
        user.suspendedUntil = null;
        user.suspendReason = null;
        await user.save();
      } else {
        throw new APIError('Your account is temporarily suspended', 403, true, {
          accountStatus: 'suspended',
          reason: user.suspendReason || undefined,
          suspendedUntil: user.suspendedUntil || undefined,
        });
      }
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: user.role
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
  _res: Response,
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
export const generateToken = (user: { id: string; username: string; email: string; role?: string }): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'user'
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  // If JWT_EXPIRES_IN is set to 'never', don't set an expiration
  const options: jwt.SignOptions = expiresIn === 'never' ? {} : { expiresIn: expiresIn as any };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Middleware to verify user owns the resource
 * Requires authenticateToken to run first
 */
export const verifyResourceOwnership = (userIdParam: string = 'userId') => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
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
  _res: Response,
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
