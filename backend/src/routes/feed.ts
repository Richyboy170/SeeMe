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

/**
 * @route   GET /api/feed/algorithmic
 * @desc    Get algorithmically ranked feed personalized for the user
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Number of posts per page (default: 20)
 */
router.get('/algorithmic', authenticateToken, FeedController.getAlgorithmicFeed);

/**
 * @route   POST /api/feed/track-interaction
 * @desc    Track user interaction for feed algorithm
 * @access  Private
 * @body    targetId - ID of the post or user being interacted with
 * @body    interactionType - Type of interaction (view, like, comment, etc.)
 * @body    metadata - Optional additional data
 */
router.post('/track-interaction', authenticateToken, FeedController.trackInteraction);

export default router;
