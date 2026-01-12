import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { PositivityCoins } from '../models/PositivityCoins';
import { CoinTransaction } from '../models/CoinTransaction';
import { CoinGivingActivity } from '../models/CoinGivingActivity';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const COOLDOWN_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const MAX_COOLDOWN_COINS = 3;

// Positivity rank thresholds based on lifetime coins given
const RANK_THRESHOLDS = {
  beginner: 0,
  kind: 10,
  generous: 50,
  inspirational: 200,
  legend: 500
};

/**
 * CoinsService - Handles all coins-related business logic
 */
export class CoinsService {
  /**
   * Initialize coins for new user
   */
  static async initializeUserCoins(userId: string): Promise<PositivityCoins> {
    const transaction = await sequelize.transaction();

    try {
      const coins = await PositivityCoins.create(
        {
          userId,
          totalCoins: 3, // Start with 3 free coins!
          lifetimeEarned: 3,
          cooldownCoinsAvailable: 0,
          nextCooldownAvailableAt: new Date(Date.now() + COOLDOWN_DURATION_MS)
        },
        { transaction }
      );

      // Record welcome transaction
      await CoinTransaction.create(
        {
          fromUserId: null, // System
          toUserId: userId,
          amount: 3,
          transactionType: 'welcome_bonus'
        },
        { transaction }
      );

      await transaction.commit();
      logger.info('User coins initialized', { userId, initialCoins: 3 });

      return coins;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error initializing user coins', { error, userId });
      throw error;
    }
  }

  /**
   * Get user's coin balance and cooldown status
   */
  static async getUserCoins(userId: string): Promise<{
    totalCoins: number;
    lifetimeEarned: number;
    lifetimeGiven: number;
    cooldownCoinsAvailable: number;
    nextCooldownAt: Date | null;
    minutesUntilNextCooldown: number | null;
    secondsUntilNextCooldown: number | null;
    rank: string;
  }> {
    let coins = await PositivityCoins.findByPk(userId);

    if (!coins) {
      coins = await this.initializeUserCoins(userId);
    }

    // Update cooldown coins if ready
    await this.updateCooldownCoins(userId);

    // Refresh after update
    coins = await PositivityCoins.findByPk(userId);
    if (!coins) {
      throw new Error('Failed to retrieve coins after initialization');
    }

    // Get user's rank
    const user = await User.findByPk(userId, { attributes: ['positivityRank'] });
    const rank = user?.positivityRank || 'beginner';

    const minutesUntilNext = coins.nextCooldownAvailableAt
      ? Math.max(0, Math.ceil((coins.nextCooldownAvailableAt.getTime() - Date.now()) / (60 * 1000)))
      : null;

    const secondsUntilNext = coins.nextCooldownAvailableAt
      ? Math.max(0, Math.ceil((coins.nextCooldownAvailableAt.getTime() - Date.now()) / 1000))
      : null;

    return {
      totalCoins: coins.totalCoins,
      lifetimeEarned: coins.lifetimeEarned,
      lifetimeGiven: coins.lifetimeGiven,
      cooldownCoinsAvailable: coins.cooldownCoinsAvailable,
      nextCooldownAt: coins.nextCooldownAvailableAt,
      minutesUntilNextCooldown: minutesUntilNext,
      secondsUntilNextCooldown: secondsUntilNext,
      rank
    };
  }

  /**
   * Update cooldown coins based on time elapsed
   */
  static async updateCooldownCoins(userId: string): Promise<void> {
    const coins = await PositivityCoins.findByPk(userId);
    if (!coins) return;

    const now = new Date();

    // If we have less than max cooldown coins and timer is up
    if (
      coins.cooldownCoinsAvailable < MAX_COOLDOWN_COINS &&
      coins.nextCooldownAvailableAt &&
      now >= coins.nextCooldownAvailableAt
    ) {
      // Calculate how many cooldown periods have passed
      const msSinceLastCheck = now.getTime() - coins.nextCooldownAvailableAt.getTime();
      const periodsElapsed = Math.floor(msSinceLastCheck / COOLDOWN_DURATION_MS) + 1;

      // Add coins (up to max)
      const coinsToAdd = Math.min(periodsElapsed, MAX_COOLDOWN_COINS - coins.cooldownCoinsAvailable);

      if (coinsToAdd > 0) {
        const newCooldownCoins = coins.cooldownCoinsAvailable + coinsToAdd;

        // Set next cooldown time
        const nextCooldownAt =
          newCooldownCoins >= MAX_COOLDOWN_COINS
            ? null // Stop timer when at max
            : new Date(now.getTime() + COOLDOWN_DURATION_MS);

        await coins.update({
          cooldownCoinsAvailable: newCooldownCoins,
          nextCooldownAvailableAt: nextCooldownAt
        });

        logger.info('Cooldown coins updated', { userId, coinsAdded: coinsToAdd, newTotal: newCooldownCoins });
      }
    }
  }

  /**
   * Claim cooldown coins
   */
  static async claimCooldownCoins(userId: string): Promise<{
    coinsClaimed: number;
    newBalance: number;
  }> {
    const transaction = await sequelize.transaction();

    try {
      await this.updateCooldownCoins(userId);

      const coins = await PositivityCoins.findByPk(userId, { transaction });
      if (!coins) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      if (coins.cooldownCoinsAvailable === 0) {
        await transaction.rollback();
        throw new Error('No cooldown coins available to claim');
      }

      const coinsToClaim = coins.cooldownCoinsAvailable;

      // Move cooldown coins to main balance
      await coins.update(
        {
          totalCoins: coins.totalCoins + coinsToClaim,
          lifetimeEarned: coins.lifetimeEarned + coinsToClaim,
          coinsFromCooldown: coins.coinsFromCooldown + coinsToClaim,
          cooldownCoinsAvailable: 0,
          lastCooldownClaim: new Date(),
          nextCooldownAvailableAt: new Date(Date.now() + COOLDOWN_DURATION_MS)
        },
        { transaction }
      );

      // Record transaction
      await CoinTransaction.create(
        {
          fromUserId: null,
          toUserId: userId,
          amount: coinsToClaim,
          transactionType: 'earned_cooldown'
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Cooldown coins claimed', { userId, coinsClaimed: coinsToClaim });

      return {
        coinsClaimed: coinsToClaim,
        newBalance: coins.totalCoins + coinsToClaim
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error claiming cooldown coins', { error, userId });
      throw error;
    }
  }

  /**
   * Award coins for meaningful post
   */
  static async awardCoinsForPost(userId: string, postId: string): Promise<number> {
    const COINS_PER_POST = 2;

    const transaction = await sequelize.transaction();

    try {
      const coins = await PositivityCoins.findByPk(userId, { transaction });
      if (!coins) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      await coins.update(
        {
          totalCoins: coins.totalCoins + COINS_PER_POST,
          lifetimeEarned: coins.lifetimeEarned + COINS_PER_POST,
          coinsFromPosts: coins.coinsFromPosts + COINS_PER_POST
        },
        { transaction }
      );

      await CoinTransaction.create(
        {
          fromUserId: null,
          toUserId: userId,
          amount: COINS_PER_POST,
          transactionType: 'earned_post',
          relatedPostId: postId
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Coins awarded for post', { userId, postId, coins: COINS_PER_POST });

      return COINS_PER_POST;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error awarding coins for post', { error, userId, postId });
      throw error;
    }
  }

  /**
   * Award coins for positive comment
   */
  static async awardCoinsForComment(userId: string, commentId: string): Promise<number> {
    const COINS_PER_COMMENT = 1;

    const transaction = await sequelize.transaction();

    try {
      const coins = await PositivityCoins.findByPk(userId, { transaction });
      if (!coins) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      await coins.update(
        {
          totalCoins: coins.totalCoins + COINS_PER_COMMENT,
          lifetimeEarned: coins.lifetimeEarned + COINS_PER_COMMENT,
          coinsFromComments: coins.coinsFromComments + COINS_PER_COMMENT
        },
        { transaction }
      );

      await CoinTransaction.create(
        {
          fromUserId: null,
          toUserId: userId,
          amount: COINS_PER_COMMENT,
          transactionType: 'earned_comment',
          relatedCommentId: commentId
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Coins awarded for comment', { userId, commentId, coins: COINS_PER_COMMENT });

      return COINS_PER_COMMENT;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error awarding coins for comment', { error, userId, commentId });
      throw error;
    }
  }

  /**
   * Award coins for watching ad
   */
  static async awardCoinsForAd(userId: string, adId: string): Promise<number> {
    const COINS_PER_AD = 5;

    const transaction = await sequelize.transaction();

    try {
      const coins = await PositivityCoins.findByPk(userId, { transaction });
      if (!coins) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      await coins.update(
        {
          totalCoins: coins.totalCoins + COINS_PER_AD,
          lifetimeEarned: coins.lifetimeEarned + COINS_PER_AD,
          coinsFromAds: coins.coinsFromAds + COINS_PER_AD
        },
        { transaction }
      );

      await CoinTransaction.create(
        {
          fromUserId: null,
          toUserId: userId,
          amount: COINS_PER_AD,
          transactionType: 'earned_ad',
          message: `Ad watched: ${adId}`
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Coins awarded for ad', { userId, adId, coins: COINS_PER_AD });

      return COINS_PER_AD;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error awarding coins for ad', { error, userId, adId });
      throw error;
    }
  }

  /**
   * Give coins to another user
   */
  static async giveCoins(params: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    message?: string;
    contextType?: string;
    contextId?: string;
  }): Promise<{
    success: boolean;
    newBalance: number;
    receiverNewBalance: number;
  }> {
    const { fromUserId, toUserId, amount, message, contextType, contextId } = params;

    // Validate
    if (fromUserId === toUserId) {
      throw new Error('Cannot give coins to yourself');
    }

    if (amount < 1) {
      throw new Error('Amount must be at least 1 coin');
    }

    const transaction = await sequelize.transaction();

    try {
      // Get sender coins
      const senderCoins = await PositivityCoins.findByPk(fromUserId, { transaction });
      if (!senderCoins) {
        await transaction.rollback();
        throw new Error('Sender coins not initialized');
      }

      // Check balance
      if (senderCoins.totalCoins < amount) {
        await transaction.rollback();
        throw new Error(`Insufficient coins. You have ${senderCoins.totalCoins}, need ${amount}`);
      }

      // Get or create receiver coins
      let receiverCoins = await PositivityCoins.findByPk(toUserId, { transaction });
      if (!receiverCoins) {
        // Initialize coins for receiver if needed (outside transaction, then refetch)
        await transaction.rollback();
        receiverCoins = await this.initializeUserCoins(toUserId);
        // Restart transaction
        const newTransaction = await sequelize.transaction();
        const senderCoinsRefresh = await PositivityCoins.findByPk(fromUserId, { transaction: newTransaction });
        receiverCoins = await PositivityCoins.findByPk(toUserId, { transaction: newTransaction });

        if (!senderCoinsRefresh || !receiverCoins) {
          await newTransaction.rollback();
          throw new Error('Failed to initialize receiver coins');
        }

        // Re-check balance after re-fetch
        if (senderCoinsRefresh.totalCoins < amount) {
          await newTransaction.rollback();
          throw new Error(`Insufficient coins. You have ${senderCoinsRefresh.totalCoins}, need ${amount}`);
        }

        // Update sender (deduct coins, increment lifetime given)
        await senderCoinsRefresh.update(
          {
            totalCoins: senderCoinsRefresh.totalCoins - amount,
            lifetimeGiven: senderCoinsRefresh.lifetimeGiven + amount
          },
          { transaction: newTransaction }
        );

        // Update receiver (add coins, increment lifetime earned)
        await receiverCoins.update(
          {
            totalCoins: receiverCoins.totalCoins + amount,
            lifetimeEarned: receiverCoins.lifetimeEarned + amount,
            coinsFromOther: receiverCoins.coinsFromOther + amount
          },
          { transaction: newTransaction }
        );

        // Record transaction for sender
        await CoinTransaction.create(
          {
            fromUserId,
            toUserId,
            amount,
            transactionType: 'given_to_user',
            message
          },
          { transaction: newTransaction }
        );

        // Record transaction for receiver
        await CoinTransaction.create(
          {
            fromUserId,
            toUserId,
            amount,
            transactionType: 'received_from_user',
            message
          },
          { transaction: newTransaction }
        );

        // Record giving activity
        await CoinGivingActivity.create(
          {
            giverId: fromUserId,
            receiverId: toUserId,
            coinsAmount: amount,
            message: message || null,
            contextType: contextType || null,
            contextId: contextId || null
          },
          { transaction: newTransaction }
        );

        // Update sender's give counter and rank
        const sender = await User.findByPk(fromUserId, { transaction: newTransaction });
        if (sender) {
          const newGiveCounter = sender.positivityGiveCounter + amount;
          const newRank = this.calculateRank(senderCoinsRefresh.lifetimeGiven + amount);

          await sender.update(
            {
              positivityGiveCounter: newGiveCounter,
              positivityRank: newRank
            },
            { transaction: newTransaction }
          );
        }

        await newTransaction.commit();

        logger.info('Coins given', { fromUserId, toUserId, amount });

        return {
          success: true,
          newBalance: senderCoinsRefresh.totalCoins - amount,
          receiverNewBalance: receiverCoins.totalCoins + amount
        };
      }

      // Normal flow (both users have coins initialized)
      // Update sender (deduct coins, increment lifetime given)
      await senderCoins.update(
        {
          totalCoins: senderCoins.totalCoins - amount,
          lifetimeGiven: senderCoins.lifetimeGiven + amount
        },
        { transaction }
      );

      // Update receiver (add coins, increment lifetime earned)
      await receiverCoins.update(
        {
          totalCoins: receiverCoins.totalCoins + amount,
          lifetimeEarned: receiverCoins.lifetimeEarned + amount,
          coinsFromOther: receiverCoins.coinsFromOther + amount
        },
        { transaction }
      );

      // Record transaction for sender
      await CoinTransaction.create(
        {
          fromUserId,
          toUserId,
          amount,
          transactionType: 'given_to_user',
          message
        },
        { transaction }
      );

      // Record transaction for receiver
      await CoinTransaction.create(
        {
          fromUserId,
          toUserId,
          amount,
          transactionType: 'received_from_user',
          message
        },
        { transaction }
      );

      // Record giving activity
      await CoinGivingActivity.create(
        {
          giverId: fromUserId,
          receiverId: toUserId,
          coinsAmount: amount,
          message: message || null,
          contextType: contextType || null,
          contextId: contextId || null
        },
        { transaction }
      );

      // Update sender's give counter and rank
      const sender = await User.findByPk(fromUserId, { transaction });
      if (sender) {
        const newGiveCounter = sender.positivityGiveCounter + amount;
        const newRank = this.calculateRank(senderCoins.lifetimeGiven + amount);

        await sender.update(
          {
            positivityGiveCounter: newGiveCounter,
            positivityRank: newRank
          },
          { transaction }
        );
      }

      await transaction.commit();

      logger.info('Coins given', { fromUserId, toUserId, amount });

      return {
        success: true,
        newBalance: senderCoins.totalCoins - amount,
        receiverNewBalance: receiverCoins.totalCoins + amount
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error giving coins', { error, fromUserId, toUserId, amount });
      throw error;
    }
  }

  /**
   * Get transaction history for a user
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<CoinTransaction[]> {
    try {
      const transactions = await CoinTransaction.findAll({
        where: {
          [Op.or]: [{ fromUserId: userId }, { toUserId: userId }]
        },
        include: [
          {
            model: User,
            as: 'fromUser',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: User,
            as: 'toUser',
            attributes: ['id', 'username', 'activeAvatarId']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      return transactions;
    } catch (error) {
      logger.error('Error getting transaction history', { error, userId });
      throw error;
    }
  }

  /**
   * Get leaderboard of top givers
   */
  static async getGiveLeaderboard(limit: number = 50): Promise<
    Array<{
      user: User;
      lifetimeGiven: number;
      rank: string;
    }>
  > {
    try {
      const topGivers = await PositivityCoins.findAll({
        where: {
          lifetimeGiven: {
            [Op.gt]: 0
          }
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'activeAvatarId', 'positivityRank']
          }
        ],
        order: [['lifetimeGiven', 'DESC']],
        limit
      });

      return topGivers.map((coins) => ({
        user: coins.get('user') as User,
        lifetimeGiven: coins.lifetimeGiven,
        rank: (coins.get('user') as User).positivityRank
      }));
    } catch (error) {
      logger.error('Error getting leaderboard', { error });
      throw error;
    }
  }

  /**
   * Calculate positivity rank based on lifetime coins given
   */
  private static calculateRank(lifetimeGiven: number): string {
    if (lifetimeGiven >= RANK_THRESHOLDS.legend) return 'legend';
    if (lifetimeGiven >= RANK_THRESHOLDS.inspirational) return 'inspirational';
    if (lifetimeGiven >= RANK_THRESHOLDS.generous) return 'generous';
    if (lifetimeGiven >= RANK_THRESHOLDS.kind) return 'kind';
    return 'beginner';
  }
}

export default CoinsService;
