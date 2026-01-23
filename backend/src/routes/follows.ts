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

/**
 * @route   GET /api/follow-requests
 * @desc    Get pending follow requests for authenticated user
 * @access  Private
 */
router.get('/follow-requests', authenticateToken, FollowController.getFollowRequests);

/**
 * @route   GET /api/follow-requests/count
 * @desc    Get count of pending follow requests
 * @access  Private
 */
router.get('/follow-requests/count', authenticateToken, FollowController.getFollowRequestCount);

/**
 * @route   POST /api/follow-requests/:requestId/accept
 * @desc    Accept a follow request
 * @access  Private
 */
router.post('/follow-requests/:requestId/accept', authenticateToken, FollowController.acceptFollowRequest);

/**
 * @route   POST /api/follow-requests/:requestId/reject
 * @desc    Reject a follow request
 * @access  Private
 */
router.post('/follow-requests/:requestId/reject', authenticateToken, FollowController.rejectFollowRequest);

/**
 * @route   DELETE /api/follow-requests/:username
 * @desc    Cancel a sent follow request
 * @access  Private
 */
router.delete('/follow-requests/:username', authenticateToken, FollowController.cancelFollowRequest);

export default router;
