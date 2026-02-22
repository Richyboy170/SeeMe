import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { TrustController } from '../controllers/TrustController';

const router = Router();

/**
 * @route   GET /api/trust/score/:userId
 * @desc    Get trust score with a specific user
 * @access  Private
 */
router.get(
  '/score/:userId',
  authenticateToken,
  TrustController.getTrustScore
);

/**
 * @route   GET /api/trust/friendship/:userId
 * @desc    Get detailed friendship data with daily logs and insights
 * @access  Private
 * @query   month - Optional month filter (YYYY-MM)
 */
router.get(
  '/friendship/:userId',
  authenticateToken,
  TrustController.getFriendshipDetail
);

/**
 * @route   GET /api/trust/connections
 * @desc    List all trust connections (paginated)
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 50)
 * @query   sortBy - Sort order: 'score' | 'streak' | 'recent' (default: 'score')
 */
router.get(
  '/connections',
  authenticateToken,
  TrustController.getTrustConnections
);

/**
 * @route   GET /api/trust/stats
 * @desc    Get trust statistics summary
 * @access  Private
 */
router.get(
  '/stats',
  authenticateToken,
  TrustController.getTrustStats
);

export default router;
