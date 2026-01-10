import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { FeedController } from '../controllers/FeedController';

const router = Router();

/**
 * @route   GET /api/feed
 * @desc    Get personalized feed for authenticated user
 * @access  Private
 * @query   page - Page number (default: 1)
 */
router.get('/', authenticateToken, FeedController.getFeed);

/**
 * @route   GET /api/feed/discover
 * @desc    Get discover feed (all recent posts)
 * @access  Public (optional authentication for likedByMe status)
 * @query   page - Page number (default: 1)
 */
router.get('/discover', optionalAuth, FeedController.getDiscoverFeed);

export default router;
