import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { UserController } from '../controllers/UserController';

const router = Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/me', authenticateToken, UserController.getCurrentUser);

/**
 * @route   PATCH /api/users/me
 * @desc    Update current user's profile
 * @access  Private
 */
router.patch('/me', authenticateToken, UserController.updateCurrentUser);

/**
 * @route   POST /api/users/fcm-token
 * @desc    Register FCM token for push notifications
 * @access  Private
 */
router.post('/fcm-token', authenticateToken, UserController.registerFCMToken);

/**
 * @route   GET /api/users/notification-settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/notification-settings', authenticateToken, UserController.getNotificationSettings);

/**
 * @route   PATCH /api/users/notification-settings
 * @desc    Update notification settings
 * @access  Private
 */
router.patch('/notification-settings', authenticateToken, UserController.updateNotificationSettings);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user profile by ID
 * @access  Public
 */
router.get('/:userId', UserController.getUserById);

export default router;
