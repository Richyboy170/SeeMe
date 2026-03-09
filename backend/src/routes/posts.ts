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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    // Accept known image types, or octet-stream / empty mime (mobile clients may not send exact types)
    if (allowedTypes.includes(file.mimetype) || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else if (/\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname)) {
      // Fallback: allow if the filename has a valid image extension
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type "${file.mimetype}". Only JPEG, PNG, WebP, and HEIC images are allowed.`));
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
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'originalImage', maxCount: 1 }
  ]),
  PostController.createPost
);

/**
 * @route   GET /api/posts/me/posts
 * @desc    Get current user's posts (including processing ones)
 * @access  Private
 */
router.get('/me/posts', authenticateToken, PostController.getMyPosts);

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
 * @route   GET /api/posts/:postId/status
 * @desc    Get post processing status
 * @access  Public
 */
router.get('/:postId/status', PostController.getPostStatus);

/**
 * @route   GET /api/posts/:postId
 * @desc    Get post by ID
 * @access  Public
 */
router.get('/:postId', PostController.getPost);

/**
 * @route   PUT /api/posts/:postId
 * @desc    Update post (edit caption and optionally re-cropped image)
 * @access  Private (owner only)
 */
router.put(
  '/:postId',
  authenticateToken,
  upload.single('image'),
  PostController.updatePost
);

/**
 * @route   PUT /api/posts/:postId/archive
 * @desc    Archive post (hide from feeds)
 * @access  Private (owner only)
 */
router.put(
  '/:postId/archive',
  authenticateToken,
  PostController.archivePost
);

/**
 * @route   PUT /api/posts/:postId/unarchive
 * @desc    Unarchive post (restore to feeds)
 * @access  Private (owner only)
 */
router.put(
  '/:postId/unarchive',
  authenticateToken,
  PostController.unarchivePost
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

export default router;
