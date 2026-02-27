import { Response } from 'express';
import bcrypt from 'bcrypt';
import { AdminRequest } from '../middleware/adminAuth';
import { AdminService } from '../services/AdminService';
import { generateToken } from '../middleware/auth';
import { APIError } from '../middleware/errorHandler';
import User from '../models/User';

export class AdminController {

  // ========== AUTH ==========

  static async adminLogin(req: AdminRequest, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new APIError('Email and password are required', 400);
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new APIError('Invalid credentials', 401);
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new APIError('Invalid credentials', 401);
    }

    if (!user.passwordHash) {
      throw new APIError('Admin account requires a password', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new APIError('Invalid credentials', 401);
    }

    if (user.status !== 'active') {
      throw new APIError('Account is not active', 403);
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    await AdminService.logAction(user.id, 'admin_login', 'user', user.id, {}, req.ip);

    res.json({
      message: 'Admin login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  }

  // ========== DASHBOARD ==========

  static async getDashboardStats(_req: AdminRequest, res: Response): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      res.json({ stats });
    } catch (err: any) {
      throw new APIError(err.message || 'Failed to load dashboard stats', 500);
    }
  }

  static async getGrowthData(req: AdminRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await AdminService.getGrowthData(days);
      res.json({ data });
    } catch (err: any) {
      throw new APIError(err.message || 'Failed to load growth data', 500);
    }
  }

  // ========== USER MANAGEMENT ==========

  static async listUsers(req: AdminRequest, res: Response): Promise<void> {
    const result = await AdminService.listUsers({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
      status: req.query.status as string,
      role: req.query.role as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as string,
    });
    res.json(result);
  }

  static async getUserDetails(req: AdminRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const details = await AdminService.getUserDetails(userId);
    res.json(details);
  }

  // ========== ACCOUNT ACTIONS ==========

  static async suspendUser(req: AdminRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const { reason, durationHours } = req.body;

    if (!reason) {
      throw new APIError('Reason is required', 400);
    }
    if (!durationHours || durationHours < 1) {
      throw new APIError('Duration must be at least 1 hour', 400);
    }

    const user = await AdminService.suspendUser(
      req.adminUser!.id, userId, reason, durationHours, req.ip
    );

    res.json({ message: 'User suspended', user: { id: user.id, status: user.status, suspendedUntil: user.suspendedUntil } });
  }

  static async unsuspendUser(req: AdminRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const user = await AdminService.unsuspendUser(req.adminUser!.id, userId, req.ip);
    res.json({ message: 'User unsuspended', user: { id: user.id, status: user.status } });
  }

  static async banUser(req: AdminRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new APIError('Reason is required', 400);
    }

    const user = await AdminService.banUser(req.adminUser!.id, userId, reason, req.ip);
    res.json({ message: 'User banned', user: { id: user.id, status: user.status } });
  }

  static async unbanUser(req: AdminRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const user = await AdminService.unbanUser(req.adminUser!.id, userId, req.ip);
    res.json({ message: 'User unbanned', user: { id: user.id, status: user.status } });
  }

  static async resetPassword(req: AdminRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      throw new APIError('Password must be at least 8 characters', 400);
    }

    await AdminService.resetPassword(req.adminUser!.id, userId, newPassword, req.ip);
    res.json({ message: 'Password reset successfully' });
  }

  // ========== CONTENT MODERATION ==========

  static async listPosts(req: AdminRequest, res: Response): Promise<void> {
    const result = await AdminService.listPosts({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      search: req.query.search as string,
      userId: req.query.userId as string,
    });
    res.json(result);
  }

  static async deletePost(req: AdminRequest, res: Response): Promise<void> {
    const { postId } = req.params;
    await AdminService.deletePost(req.adminUser!.id, postId, req.ip);
    res.json({ message: 'Post deleted' });
  }

  static async deleteComment(req: AdminRequest, res: Response): Promise<void> {
    const { commentId } = req.params;
    await AdminService.deleteComment(req.adminUser!.id, commentId, req.ip);
    res.json({ message: 'Comment deleted' });
  }

  // ========== ROLE MANAGEMENT ==========

  static async setUserRole(req: AdminRequest, res: Response): Promise<void> {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin', 'super_admin'].includes(role)) {
      throw new APIError('Invalid role', 400);
    }

    const user = await AdminService.setUserRole(req.adminUser!.id, userId, role, req.ip);
    res.json({ message: 'Role updated', user: { id: user.id, role: user.role } });
  }

  // ========== AUDIT LOG ==========

  static async getAuditLog(req: AdminRequest, res: Response): Promise<void> {
    const result = await AdminService.getAuditLog({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      action: req.query.action as string,
      adminUserId: req.query.adminUserId as string,
    });
    res.json(result);
  }
}
