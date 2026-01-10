import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { LikeController } from '../controllers/LikeController';

const router = Router();

/**
 * @route   POST /api/posts/:postId/like
 * @desc    Like a post
 * @access  Private
 */
router.post('/posts/:postId/like', authenticateToken, LikeController.likePost);

/**
 * @route   DELETE /api/posts/:postId/like
 * @desc    Unlike a post
 * @access  Private
 */
router.delete('/posts/:postId/like', authenticateToken, LikeController.unlikePost);

/**
 * @route   GET /api/posts/:postId/likes
 * @desc    Get list of users who liked a post
 * @access  Public
 */
router.get('/posts/:postId/likes', LikeController.getPostLikes);

/**
 * @route   GET /api/posts/:postId/liked
 * @desc    Check if user liked a post
 * @access  Private
 */
router.get('/posts/:postId/liked', authenticateToken, LikeController.checkLikedStatus);

/**
 * @route   POST /api/likes/status
 * @desc    Batch check liked status for multiple posts
 * @access  Private
 */
router.post('/likes/status', authenticateToken, LikeController.getLikedStatus);

export default router;
