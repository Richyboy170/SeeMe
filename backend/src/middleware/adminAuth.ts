import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { APIError } from './errorHandler';
import User from '../models/User';

export interface AdminRequest extends AuthRequest {
  adminUser?: User;
}

/**
 * Middleware that requires admin or super_admin role
 */
export const requireAdmin = async (
  req: AdminRequest,
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

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new APIError('Admin access required', 403);
    }

    if (user.status !== 'active') {
      throw new APIError('Account is not active', 403);
    }

    req.adminUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware that requires super_admin role only
 */
export const requireSuperAdmin = async (
  req: AdminRequest,
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

    if (user.role !== 'super_admin') {
      throw new APIError('Super admin access required', 403);
    }

    if (user.status !== 'active') {
      throw new APIError('Account is not active', 403);
    }

    req.adminUser = user;
    next();
  } catch (error) {
    next(error);
  }
};
