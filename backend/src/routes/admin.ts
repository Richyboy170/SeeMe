import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin } from '../middleware/adminAuth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Admin login (no auth required)
router.post('/login', asyncHandler(AdminController.adminLogin));

// All routes below require authentication + admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard/stats', asyncHandler(AdminController.getDashboardStats));
router.get('/dashboard/growth', asyncHandler(AdminController.getGrowthData));

// User management
router.get('/users', asyncHandler(AdminController.listUsers));
router.get('/users/:userId', asyncHandler(AdminController.getUserDetails));

// Account actions
router.post('/users/:userId/suspend', asyncHandler(AdminController.suspendUser));
router.post('/users/:userId/unsuspend', asyncHandler(AdminController.unsuspendUser));
router.post('/users/:userId/ban', asyncHandler(AdminController.banUser));
router.post('/users/:userId/unban', asyncHandler(AdminController.unbanUser));
router.post('/users/:userId/reset-password', asyncHandler(AdminController.resetPassword));

// Content moderation
router.get('/posts', asyncHandler(AdminController.listPosts));
router.delete('/posts/:postId', asyncHandler(AdminController.deletePost));
router.delete('/comments/:commentId', asyncHandler(AdminController.deleteComment));

// Role management (super_admin only)
router.post('/users/:userId/role', requireSuperAdmin, asyncHandler(AdminController.setUserRole));

// Audit log
router.get('/audit-log', asyncHandler(AdminController.getAuditLog));

export default router;
