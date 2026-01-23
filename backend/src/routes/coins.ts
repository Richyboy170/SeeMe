import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { CoinsController } from '../controllers/CoinsController';

const router = Router();

/**
 * @route   GET /api/coins/me
 * @desc    Get user's coin balance and status
 * @access  Private
 */
router.get('/me', authenticateToken, CoinsController.getMyCoins);

/**
 * @route   POST /api/coins/claim-cooldown
 * @desc    Claim cooldown coins
 * @access  Private
 */
router.post('/claim-cooldown', authenticateToken, CoinsController.claimCooldown);

/**
 * @route   POST /api/coins/give
 * @desc    Give coins to another user
 * @access  Private
 */
router.post('/give', authenticateToken, CoinsController.giveCoins);

/**
 * @route   GET /api/coins/history
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/history', authenticateToken, CoinsController.getHistory);

/**
 * @route   GET /api/coins/received
 * @desc    Get recent coins received from other users (notifications)
 * @access  Private
 */
router.get('/received', authenticateToken, CoinsController.getReceivedCoins);

/**
 * @route   GET /api/coins/leaderboard
 * @desc    Get leaderboard of top givers
 * @access  Public
 */
router.get('/leaderboard', CoinsController.getLeaderboard);

/**
 * @route   GET /api/coins/activity
 * @desc    Get giving activity feed
 * @access  Public
 */
router.get('/activity', CoinsController.getGivingActivity);

/**
 * @route   POST /api/coins/reward-ad
 * @desc    Record ad watch and reward coins (internal)
 * @access  Private
 */
router.post('/reward-ad', authenticateToken, CoinsController.rewardAdWatch);

/**
 * @route   GET /api/coins/user/:userId
 * @desc    Get public coins info for a specific user
 * @access  Public
 */
router.get('/user/:userId', CoinsController.getUserCoinsPublic);

export default router;
