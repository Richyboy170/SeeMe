import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { FollowController } from '../controllers/FollowController';

const router = Router();

/**
 * @route   POST /api/users/:username/follow
 * @desc    Follow a user
 * @access  Private
 */
router.post('/:username/follow', authenticateToken, FollowController.followUser);

/**
 * @route   DELETE /api/users/:username/follow
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete('/:username/follow', authenticateToken, FollowController.unfollowUser);

/**
 * @route   GET /api/users/:username/followers
 * @desc    Get list of followers
 * @access  Public
 */
router.get('/:username/followers', FollowController.getFollowers);

/**
 * @route   GET /api/users/:username/following
 * @desc    Get list of users being followed
 * @access  Public
 */
router.get('/:username/following', FollowController.getFollowing);

/**
 * @route   GET /api/users/:username/following-status
 * @desc    Check if authenticated user is following this user
 * @access  Private
 */
router.get('/:username/following-status', authenticateToken, FollowController.checkFollowing);

/**
 * @route   GET /api/users/:username/follow-counts
 * @desc    Get follower and following counts
 * @access  Public
 */
router.get('/:username/follow-counts', FollowController.getFollowCounts);

export default router;
