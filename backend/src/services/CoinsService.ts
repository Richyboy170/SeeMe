import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { PositivityCoins } from '../models/PositivityCoins';
import { CoinTransaction } from '../models/CoinTransaction';
import { CoinGivingActivity } from '../models/CoinGivingActivity';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { TrustScoreService } from './TrustScoreService';

const COOLDOWN_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
const MAX_COOLDOWN_COINS = 3;
const COINS_PER_POST_COST = 3;

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
    skyCoins: number;
    lifetimeEarned: number;
    lifetimeGiven: number;
    cooldownCoinsAvailable: number;
    nextCooldownAt: Date | null;
    minutesUntilNextCooldown: number | null;
    secondsUntilNextCooldown: number | null;
    rank: string;
    nextRank: string | null;
    coinsToNextRank: number | null;
    rankProgress: number;
    rankPercentile: number;
    uncollectedCount: number;
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

    // Count uncollected received coins
    const uncollectedCount = await CoinTransaction.count({
      where: {
        toUserId: userId,
        transactionType: 'received_from_user',
        collected: false
      }
    });

    const minutesUntilNext = coins.nextCooldownAvailableAt
      ? Math.max(0, Math.ceil((coins.nextCooldownAvailableAt.getTime() - Date.now()) / (60 * 1000)))
      : null;

    const secondsUntilNext = coins.nextCooldownAvailableAt
      ? Math.max(0, Math.ceil((coins.nextCooldownAvailableAt.getTime() - Date.now()) / 1000))
      : null;

    // Calculate next rank info
    const { nextRank, coinsToNextRank, rankProgress } = this.getNextRankInfo(coins.lifetimeGiven);

    // Calculate rank percentile
    const rankPercentile = await this.getRankPercentile(rank);

    return {
      totalCoins: coins.totalCoins,
      skyCoins: coins.skyCoins,
      lifetimeEarned: coins.lifetimeEarned,
      lifetimeGiven: coins.lifetimeGiven,
      cooldownCoinsAvailable: coins.cooldownCoinsAvailable,
      nextCooldownAt: coins.nextCooldownAvailableAt,
      minutesUntilNextCooldown: minutesUntilNext,
      secondsUntilNextCooldown: secondsUntilNext,
      rank,
      nextRank,
      coinsToNextRank,
      rankProgress,
      rankPercentile,
      uncollectedCount
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
    const COINS_PER_POST = 4;

    // Auto-initialize coins if needed (outside transaction)
    let coins = await PositivityCoins.findByPk(userId);
    if (!coins) {
      coins = await this.initializeUserCoins(userId);
    }

    const transaction = await sequelize.transaction();

    try {
      // Re-fetch within transaction
      const coinsInTx = await PositivityCoins.findByPk(userId, { transaction });
      if (!coinsInTx) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      await coinsInTx.update(
        {
          totalCoins: coinsInTx.totalCoins + COINS_PER_POST,
          lifetimeEarned: coinsInTx.lifetimeEarned + COINS_PER_POST,
          coinsFromPosts: coinsInTx.coinsFromPosts + COINS_PER_POST
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
   * Deduct Sky Coins for creating a post (investment cost)
   */
  static async deductCoinsForPost(userId: string, postId: string): Promise<number> {
    // Auto-initialize coins if needed (outside transaction)
    let coins = await PositivityCoins.findByPk(userId);
    if (!coins) {
      coins = await this.initializeUserCoins(userId);
    }

    // Check Sky Coins balance before starting transaction
    if (coins.skyCoins < COINS_PER_POST_COST) {
      throw new Error(`Insufficient Sky Coins. You have ${coins.skyCoins}, need ${COINS_PER_POST_COST}`);
    }

    const transaction = await sequelize.transaction();

    try {
      // Re-fetch within transaction for consistency
      const coinsInTx = await PositivityCoins.findByPk(userId, { transaction });
      if (!coinsInTx) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      // Re-check Sky Coins balance within transaction
      if (coinsInTx.skyCoins < COINS_PER_POST_COST) {
        await transaction.rollback();
        throw new Error(`Insufficient Sky Coins. You have ${coinsInTx.skyCoins}, need ${COINS_PER_POST_COST}`);
      }

      await coinsInTx.update(
        {
          skyCoins: coinsInTx.skyCoins - COINS_PER_POST_COST
        },
        { transaction }
      );

      await CoinTransaction.create(
        {
          fromUserId: userId,
          toUserId: null, // System
          amount: COINS_PER_POST_COST,
          transactionType: 'spent_on_post',
          relatedPostId: postId
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Sky Coins deducted for post', { userId, postId, skyCoins: COINS_PER_POST_COST });

      return COINS_PER_POST_COST;
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deducting Sky Coins for post', { error, userId, postId });
      throw error;
    }
  }

  /**
   * Award coins for positive comment
   */
  static async awardCoinsForComment(userId: string, commentId: string): Promise<number> {
    const COINS_PER_COMMENT = 2;

    // Auto-initialize coins if needed (outside transaction)
    let coins = await PositivityCoins.findByPk(userId);
    if (!coins) {
      coins = await this.initializeUserCoins(userId);
    }

    const transaction = await sequelize.transaction();

    try {
      // Re-fetch within transaction
      const coinsInTx = await PositivityCoins.findByPk(userId, { transaction });
      if (!coinsInTx) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      await coinsInTx.update(
        {
          totalCoins: coinsInTx.totalCoins + COINS_PER_COMMENT,
          lifetimeEarned: coinsInTx.lifetimeEarned + COINS_PER_COMMENT,
          coinsFromComments: coinsInTx.coinsFromComments + COINS_PER_COMMENT
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

    // Auto-initialize coins if needed (outside transaction)
    let coins = await PositivityCoins.findByPk(userId);
    if (!coins) {
      coins = await this.initializeUserCoins(userId);
    }

    const transaction = await sequelize.transaction();

    try {
      // Re-fetch within transaction
      const coinsInTx = await PositivityCoins.findByPk(userId, { transaction });
      if (!coinsInTx) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      await coinsInTx.update(
        {
          totalCoins: coinsInTx.totalCoins + COINS_PER_AD,
          lifetimeEarned: coinsInTx.lifetimeEarned + COINS_PER_AD,
          coinsFromAds: coinsInTx.coinsFromAds + COINS_PER_AD
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

    // Initialize receiver coins outside of main transaction if needed
    let receiverCoins = await PositivityCoins.findByPk(toUserId);
    if (!receiverCoins) {
      receiverCoins = await this.initializeUserCoins(toUserId);
    }

    // Initialize sender coins if needed
    let senderCoins = await PositivityCoins.findByPk(fromUserId);
    if (!senderCoins) {
      senderCoins = await this.initializeUserCoins(fromUserId);
    }

    // Check balance before starting transaction
    if (senderCoins.totalCoins < amount) {
      throw new Error(`Insufficient coins. You have ${senderCoins.totalCoins}, need ${amount}`);
    }

    const transaction = await sequelize.transaction();

    try {
      // Re-fetch within transaction for consistency
      const senderCoinsInTx = await PositivityCoins.findByPk(fromUserId, { transaction });
      const receiverCoinsInTx = await PositivityCoins.findByPk(toUserId, { transaction });

      if (!senderCoinsInTx || !receiverCoinsInTx) {
        throw new Error('Failed to fetch coin records');
      }

      // Re-check balance within transaction
      if (senderCoinsInTx.totalCoins < amount) {
        throw new Error(`Insufficient coins. You have ${senderCoinsInTx.totalCoins}, need ${amount}`);
      }

      // Update sender (deduct coins, increment lifetime given)
      await senderCoinsInTx.update(
        {
          totalCoins: senderCoinsInTx.totalCoins - amount,
          lifetimeGiven: senderCoinsInTx.lifetimeGiven + amount
        },
        { transaction }
      );

      // NOTE: Receiver's skyCoins are NOT credited here.
      // Coins stay as uncollected (collected=false) until the receiver
      // taps the heart in the Encouragement modal, which calls collectReceivedCoins().

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
        const newRank = this.calculateRank(senderCoinsInTx.lifetimeGiven + amount);

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

      // Record coin exchange for trust score (after transaction commit)
      await TrustScoreService.recordCoinExchange({
        fromUserId,
        toUserId,
        amount
      });

      return {
        success: true,
        newBalance: senderCoinsInTx.totalCoins,
        receiverNewBalance: receiverCoinsInTx.skyCoins
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error giving coins', { error, fromUserId, toUserId, amount });
      throw error;
    }
  }

  /**
   * Get transaction history for a user (transformed for frontend)
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50
  ): Promise<Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    createdAt: Date;
    metadata?: {
      fromUsername?: string;
      toUsername?: string;
      message?: string;
    };
  }>> {
    try {
      // Query transactions that belong to this user:
      // - given_to_user: only show to the sender (fromUserId)
      // - received_from_user: only show to the receiver (toUserId)
      // - system rewards (welcome_bonus, earned_*): show to the receiver (toUserId)
      const transactions = await CoinTransaction.findAll({
        where: {
          [Op.or]: [
            // User sent coins - show given_to_user transactions
            { fromUserId: userId, transactionType: 'given_to_user' },
            // User spent coins on posts
            { fromUserId: userId, transactionType: 'spent_on_post' },
            // User received coins or system rewards - show where they are the recipient
            { toUserId: userId, transactionType: { [Op.ne]: 'given_to_user' } }
          ]
        },
        include: [
          {
            model: User,
            as: 'fromUser',
            attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
          },
          {
            model: User,
            as: 'toUser',
            attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      // Get current balance to calculate historical balances
      const userCoins = await PositivityCoins.findByPk(userId);
      let runningBalance = userCoins?.totalCoins || 0;

      // Map transaction types from backend to frontend format
      const typeMap: Record<string, string> = {
        'earned_cooldown': 'cooldown_claim',
        'given_to_user': 'give',
        'received_from_user': 'receive',
        'earned_post': 'post_reward',
        'earned_comment': 'comment_reward',
        'earned_ad': 'ad_reward',
        'welcome_bonus': 'welcome_bonus',
        'spent_on_post': 'post_cost'
      };

      // Transform transactions (newest first, calculate balance backwards)
      const transformed = transactions.map((tx) => {
        const fromUser = tx.get('fromUser') as User | null;
        const toUser = tx.get('toUser') as User | null;

        // Determine if this is an incoming or outgoing transaction for the user
        const isOutgoing = (tx.transactionType === 'given_to_user' || tx.transactionType === 'spent_on_post') && tx.fromUserId === userId;

        // Calculate balance after this transaction
        const balanceAfter = runningBalance;

        // Adjust running balance for next (older) transaction
        if (isOutgoing) {
          runningBalance += tx.amount; // Add back what was spent
        } else {
          runningBalance -= tx.amount; // Subtract what was earned
        }

        return {
          id: tx.id,
          type: typeMap[tx.transactionType] || tx.transactionType,
          amount: tx.amount,
          balanceAfter,
          createdAt: tx.createdAt,
          metadata: {
            fromUsername: fromUser?.username || undefined,
            toUsername: toUser?.username || undefined,
            message: tx.message || undefined
          }
        };
      });

      return transformed;
    } catch (error) {
      logger.error('Error getting transaction history', { error, userId });
      throw error;
    }
  }

  /**
   * Get recent coins received from other users (for notifications)
   */
  static async getReceivedCoins(
    userId: string,
    limit: number = 20,
    since?: string,
    collectedFilter?: boolean
  ): Promise<Array<{
    id: string;
    fromUserId: string;
    fromUsername: string;
    amount: number;
    message: string | null;
    collected: boolean;
    createdAt: Date;
  }>> {
    try {
      const whereClause: any = {
        toUserId: userId,
        transactionType: 'received_from_user'
      };

      // Optional: filter by date if 'since' is provided
      if (since) {
        whereClause.createdAt = {
          [Op.gt]: new Date(since)
        };
      }

      // Optional: filter by collected status
      if (collectedFilter !== undefined) {
        whereClause.collected = collectedFilter;
      }

      const transactions = await CoinTransaction.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'fromUser',
            attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit
      });

      return transactions.map((tx) => {
        const fromUser = tx.get('fromUser') as User | null;
        return {
          id: tx.id,
          fromUserId: tx.fromUserId || '',
          fromUsername: fromUser?.username || 'Unknown',
          amount: tx.amount,
          message: tx.message,
          collected: tx.collected,
          createdAt: tx.createdAt
        };
      });
    } catch (error) {
      logger.error('Error getting received coins', { error, userId });
      throw error;
    }
  }

  /**
   * Collect received coins — marks them as collected and credits skyCoins
   */
  static async collectReceivedCoins(
    userId: string,
    transactionIds: string[]
  ): Promise<{
    collectedCount: number;
    totalAmount: number;
    newSkyCoinsBalance: number;
  }> {
    if (!transactionIds.length) {
      throw new Error('No transaction IDs provided');
    }

    const transaction = await sequelize.transaction();

    try {
      // Find uncollected transactions that belong to this user
      const transactions = await CoinTransaction.findAll({
        where: {
          id: { [Op.in]: transactionIds },
          toUserId: userId,
          transactionType: 'received_from_user',
          collected: false
        },
        transaction
      });

      if (transactions.length === 0) {
        await transaction.rollback();
        return { collectedCount: 0, totalAmount: 0, newSkyCoinsBalance: 0 };
      }

      const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);

      // Mark as collected
      await CoinTransaction.update(
        { collected: true },
        {
          where: {
            id: { [Op.in]: transactions.map(tx => tx.id) }
          },
          transaction
        }
      );

      // Credit skyCoins to receiver
      const coins = await PositivityCoins.findByPk(userId, { transaction });
      if (!coins) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      await coins.update(
        {
          skyCoins: coins.skyCoins + totalAmount,
          lifetimeSkyCoinsEarned: coins.lifetimeSkyCoinsEarned + totalAmount,
          lifetimeEarned: coins.lifetimeEarned + totalAmount,
          coinsFromOther: coins.coinsFromOther + totalAmount
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Coins collected', { userId, count: transactions.length, totalAmount });

      return {
        collectedCount: transactions.length,
        totalAmount,
        newSkyCoinsBalance: coins.skyCoins + totalAmount
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error collecting received coins', { error, userId });
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
            attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId', 'positivityRank']
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
   * Get next rank info: name, coins needed, and progress percentage
   */
  private static getNextRankInfo(lifetimeGiven: number): {
    nextRank: string | null;
    coinsToNextRank: number | null;
    rankProgress: number;
  } {
    const ranks = Object.entries(RANK_THRESHOLDS) as [string, number][];
    // ranks is already ordered: beginner(0), kind(10), generous(50), inspirational(200), legend(500)

    // Find current rank index
    let currentRankIndex = 0;
    for (let i = ranks.length - 1; i >= 0; i--) {
      if (lifetimeGiven >= ranks[i][1]) {
        currentRankIndex = i;
        break;
      }
    }

    // If already at max rank (legend)
    if (currentRankIndex >= ranks.length - 1) {
      return { nextRank: null, coinsToNextRank: null, rankProgress: 100 };
    }

    const currentThreshold = ranks[currentRankIndex][1];
    const nextRankEntry = ranks[currentRankIndex + 1];
    const nextThreshold = nextRankEntry[1];
    const coinsToNextRank = nextThreshold - lifetimeGiven;
    const rangeSize = nextThreshold - currentThreshold;
    const progressInRange = lifetimeGiven - currentThreshold;
    const rankProgress = Math.round((progressInRange / rangeSize) * 100);

    return {
      nextRank: nextRankEntry[0],
      coinsToNextRank,
      rankProgress
    };
  }

  /**
   * Calculate what percentage of users share this rank
   */
  private static async getRankPercentile(rank: string): Promise<number> {
    try {
      const totalUsers = await User.count();
      if (totalUsers === 0) return 100;

      const usersWithRank = await User.count({
        where: { positivityRank: rank }
      });

      return Math.round((usersWithRank / totalUsers) * 100);
    } catch (error) {
      logger.error('Error calculating rank percentile', { error });
      return 0;
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
