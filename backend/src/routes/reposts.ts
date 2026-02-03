import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { RepostController } from '../controllers/RepostController';

const router = Router();

/**
 * @route   POST /api/reposts/:postId
 * @desc    Create a repost or quote post
 * @access  Private
 * @body    { type: 'repost' | 'quote', comment?: string }
 */
router.post(
  '/:postId',
  authenticateToken,
  RepostController.createRepost
);

/**
 * @route   DELETE /api/reposts/:postId
 * @desc    Remove a repost
 * @access  Private
 */
router.delete(
  '/:postId',
  authenticateToken,
  RepostController.removeRepost
);

/**
 * @route   GET /api/reposts/:postId/status
 * @desc    Check if current user has reposted a post
 * @access  Private
 */
router.get(
  '/:postId/status',
  authenticateToken,
  RepostController.getRepostStatus
);

/**
 * @route   GET /api/reposts/:postId/list
 * @desc    Get all reposts for a post
 * @access  Public
 */
router.get(
  '/:postId/list',
  RepostController.getPostReposts
);

/**
 * @route   GET /api/reposts/user/:userId
 * @desc    Get user's reposts
 * @access  Public
 */
router.get(
  '/user/:userId',
  RepostController.getUserReposts
);

export default router;
