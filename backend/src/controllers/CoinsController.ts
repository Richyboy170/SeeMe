import { Request, Response } from 'express';
import { CoinsService } from '../services/CoinsService';
import { AuthRequest } from '../middleware/auth';
import { CoinGivingActivity } from '../models/CoinGivingActivity';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * CoinsController - Handles all coins-related HTTP requests
 */
export class CoinsController {
  /**
   * Get user's coin balance and status
   * @route GET /api/coins/me
   * @access Private
   */
  static async getMyCoins(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const coins = await CoinsService.getUserCoins(userId);

      res.json({ coins });
    } catch (error) {
      logger.error('Error getting coins', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get coins' });
    }
  }

  /**
   * Claim cooldown coins
   * @route POST /api/coins/claim-cooldown
   * @access Private
   */
  static async claimCooldown(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await CoinsService.claimCooldownCoins(userId);

      res.json({
        message: `Claimed ${result.coinsClaimed} cooldown coins!`,
        ...result
      });
    } catch (error) {
      logger.error('Error claiming cooldown', { error, userId: req.user?.id });

      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to claim cooldown coins' });
      }
    }
  }

  /**
   * Give coins to another user
   * @route POST /api/coins/give
   * @access Private
   */
  static async giveCoins(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fromUserId = req.user!.id;
      const { toUserId, amount, message, contextType, contextId } = req.body;

      // Validation
      if (!toUserId) {
        res.status(400).json({ error: 'Recipient required' });
        return;
      }

      if (!amount || amount < 1) {
        res.status(400).json({ error: 'Invalid amount' });
        return;
      }

      if (amount > 1000) {
        res.status(400).json({ error: 'Cannot give more than 1000 coins at once' });
        return;
      }

      const result = await CoinsService.giveCoins({
        fromUserId,
        toUserId,
        amount,
        message,
        contextType,
        contextId
      });

      res.json({
        message: 'Coins given successfully!',
        ...result
      });
    } catch (error) {
      logger.error('Error giving coins', { error, userId: req.user?.id });

      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to give coins' });
      }
    }
  }

  /**
   * Get transaction history
   * @route GET /api/coins/history
   * @access Private
   */
  static async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const history = await CoinsService.getTransactionHistory(userId, limit);

      res.json({ history });
    } catch (error) {
      logger.error('Error getting history', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get history' });
    }
  }

  /**
   * Get leaderboard of top givers
   * @route GET /api/coins/leaderboard
   * @access Public
   */
  static async getLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const leaderboard = await CoinsService.getGiveLeaderboard(limit);

      res.json({ leaderboard });
    } catch (error) {
      logger.error('Error getting leaderboard', { error });
      res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  }

  /**
   * Get giving activity feed
   * @route GET /api/coins/activity
   * @access Public
   */
  static async getGivingActivity(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const limit = 20;
      const offset = (page - 1) * limit;

      const { rows: activity, count } = await CoinGivingActivity.findAndCountAll({
        include: [
          {
            model: User,
            as: 'giver',
            attributes: ['id', 'username', 'activeAvatarId', 'positivityRank']
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'username', 'activeAvatarId', 'positivityRank']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.json({
        activity,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting activity', { error });
      res.status(500).json({ error: 'Failed to get activity' });
    }
  }

  /**
   * Record ad watch and reward coins
   * @route POST /api/coins/reward-ad
   * @access Private (internal)
   */
  static async rewardAdWatch(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { adId } = req.body;

      if (!adId) {
        res.status(400).json({ error: 'Ad ID required' });
        return;
      }

      const coinsEarned = await CoinsService.awardCoinsForAd(userId, adId);

      res.json({
        message: `Earned ${coinsEarned} coins for watching ad!`,
        coinsEarned
      });
    } catch (error) {
      logger.error('Error rewarding ad', { error, userId: req.user?.id });

      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to reward ad' });
      }
    }
  }

  /**
   * Get coins info for a specific user (public profile)
   * @route GET /api/coins/user/:userId
   * @access Public
   */
  static async getUserCoinsPublic(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const coins = await CoinsService.getUserCoins(userId);

      // Return only public info
      res.json({
        lifetimeGiven: coins.lifetimeGiven,
        rank: coins.rank
      });
    } catch (error) {
      logger.error('Error getting user coins', { error, userId: req.params.userId });
      res.status(500).json({ error: 'Failed to get user coins' });
    }
  }
}

export default CoinsController;
