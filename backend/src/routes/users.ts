import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { UserController } from '../controllers/UserController';
import { UserRecommendationController } from '../controllers/UserRecommendationController';

const router = Router();

// Configure multer for profile image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for profile images
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed.'));
    }
  }
});

/**
 * @route   GET /api/users/recommendations
 * @desc    Get recommended users to follow
 * @access  Private
 */
router.get('/recommendations', authenticateToken, UserRecommendationController.getRecommendedUsers);

/**
 * @route   GET /api/users/search
 * @desc    Search users by username
 * @access  Private
 */
router.get('/search', authenticateToken, UserController.searchUsers);

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
 * @route   POST /api/users/me/avatar
 * @desc    Upload a profile image
 * @access  Private
 */
router.post('/me/avatar', authenticateToken, upload.single('image'), UserController.uploadProfileImage);

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
 * @route   GET /api/users/privacy-settings
 * @desc    Get privacy settings for authenticated user
 * @access  Private
 */
router.get('/privacy-settings', authenticateToken, UserController.getPrivacySettings);

/**
 * @route   PATCH /api/users/privacy-settings
 * @desc    Update privacy settings
 * @access  Private
 */
router.patch('/privacy-settings', authenticateToken, UserController.updatePrivacySettings);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user profile by ID
 * @access  Public
 */
router.get('/:userId', UserController.getUserById);

export default router;
