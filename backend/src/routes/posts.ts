import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { PostController } from '../controllers/PostController';

const router = Router();

/**
 * Configure multer for file uploads
 * Using memory storage for direct buffer access
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

/**
 * @route   POST /api/posts
 * @desc    Create a new post with image upload
 * @access  Private
 */
router.post(
  '/',
  authenticateToken,
  upload.single('image'),
  PostController.createPost
);

/**
 * @route   GET /api/posts/:postId
 * @desc    Get post by ID
 * @access  Public
 */
router.get('/:postId', PostController.getPost);

/**
 * @route   GET /api/posts/:postId/status
 * @desc    Get post processing status
 * @access  Public
 */
router.get('/:postId/status', PostController.getPostStatus);

/**
 * @route   PUT /api/posts/:postId
 * @desc    Update post (edit caption)
 * @access  Private (owner only)
 */
router.put(
  '/:postId',
  authenticateToken,
  PostController.updatePost
);

/**
 * @route   DELETE /api/posts/:postId
 * @desc    Delete post
 * @access  Private (owner only)
 */
router.delete(
  '/:postId',
  authenticateToken,
  PostController.deletePost
);

/**
 * @route   GET /api/posts/user/:username
 * @desc    Get user's posts by username
 * @access  Public
 */
router.get('/user/:username', PostController.getUserPosts);

/**
 * @route   GET /api/posts
 * @desc    Get all posts (paginated feed)
 * @access  Public
 */
router.get('/', PostController.getAllPosts);

/**
 * @route   GET /api/posts/me/posts
 * @desc    Get current user's posts (including processing ones)
 * @access  Private
 */
router.get('/me/posts', authenticateToken, PostController.getMyPosts);

export default router;
