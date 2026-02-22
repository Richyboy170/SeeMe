import { Op } from 'sequelize';
import { FriendTrust } from '../models/FriendTrust';
import { FriendTrustDailyLog } from '../models/FriendTrustDailyLog';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * TrustScoreService - Handles trust score calculations and updates
 *
 * Trust score formula (0-100):
 * - Consistency Score (60 pts max):
 *   - Current streak: min(30, streak * 2)         // Max 30 at 15+ days
 *   - Total engagement: min(30, totalDays * 0.5)  // Max 30 at 60+ days
 *
 * - Bidirectionality Score (30 pts max):
 *   - Bidirectional ratio: (bidirectionalDays / totalDays) * 20
 *   - Balance ratio: (minTransactions / maxTransactions) * 10
 *
 * - Amount Score (10 pts max):
 *   - min(10, log10(totalCoins + 1) * 3)          // Max 10 at ~300+ coins
 */
export class TrustScoreService {
  /**
   * Record a coin exchange between two users
   * Called after a successful coin transfer
   */
  static async recordCoinExchange(params: {
    fromUserId: string;
    toUserId: string;
    amount: number;
  }): Promise<void> {
    const { fromUserId, toUserId, amount } = params;

    try {
      // Get canonical ordering
      const { userIdA, userIdB } = FriendTrust.getCanonicalOrder(fromUserId, toUserId);
      const isFromA = fromUserId === userIdA;
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Find or create trust relationship
      let trust = await FriendTrust.findOne({
        where: { userIdA, userIdB }
      });

      if (!trust) {
        trust = await FriendTrust.create({
          userIdA,
          userIdB
        });
        logger.info('New trust connection created', { userIdA, userIdB });
      }

      // Find or create daily log
      let dailyLog = await FriendTrustDailyLog.findOne({
        where: {
          friendTrustId: trust.id,
          logDate: today
        }
      });

      const isNewDay = !dailyLog;

      if (!dailyLog) {
        dailyLog = await FriendTrustDailyLog.create({
          friendTrustId: trust.id,
          logDate: today
        });
      }

      // Update daily log
      if (isFromA) {
        dailyLog.coinsAToB += amount;
      } else {
        dailyLog.coinsBToA += amount;
      }

      // Check if now bidirectional
      const wasBidirectional = dailyLog.isBidirectional;
      dailyLog.isBidirectional = dailyLog.coinsAToB > 0 && dailyLog.coinsBToA > 0;
      await dailyLog.save();

      // Update trust record
      await this.updateTrustRecord(trust, {
        amount,
        isFromA,
        today,
        isNewDay,
        becameBidirectional: !wasBidirectional && dailyLog.isBidirectional
      });

      logger.info('Coin exchange recorded for trust', {
        trustId: trust.id,
        fromUserId,
        toUserId,
        amount,
        newScore: trust.trustScore
      });
    } catch (error) {
      logger.error('Error recording coin exchange for trust', { error, fromUserId, toUserId, amount });
      // Don't throw - trust tracking should not block coin transfers
    }
  }

  /**
   * Update the trust record after an exchange
   */
  private static async updateTrustRecord(
    trust: FriendTrust,
    params: {
      amount: number;
      isFromA: boolean;
      today: string;
      isNewDay: boolean;
      becameBidirectional: boolean;
    }
  ): Promise<void> {
    const { amount, isFromA, today, isNewDay, becameBidirectional } = params;

    // Update coin totals and exchange counts
    if (isFromA) {
      trust.totalCoinsAToB += amount;
      trust.exchangeCountAToB += 1;
    } else {
      trust.totalCoinsBToA += amount;
      trust.exchangeCountBToA += 1;
    }

    // Update bidirectional days count
    if (becameBidirectional) {
      trust.bidirectionalDays += 1;
    }

    // Update streak and total days if new day
    if (isNewDay) {
      trust.totalExchangeDays += 1;

      // Calculate streak
      if (trust.lastExchangeDate) {
        const lastDate = new Date(trust.lastExchangeDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day - increment streak
          trust.currentStreak += 1;
        } else if (diffDays > 1) {
          // Streak broken - reset to 1
          trust.currentStreak = 1;
        }
        // If diffDays === 0, same day, don't change streak
      } else {
        // First exchange ever
        trust.currentStreak = 1;
      }

      // Update longest streak
      if (trust.currentStreak > trust.longestStreak) {
        trust.longestStreak = trust.currentStreak;
      }

      trust.lastExchangeDate = today;
    }

    // Recalculate trust score
    trust.trustScore = this.calculateTrustScore(trust);

    await trust.save();
  }

  /**
   * Calculate trust score based on the formula
   */
  static calculateTrustScore(trust: FriendTrust): number {
    // Consistency Score (60 pts max)
    const streakScore = Math.min(30, trust.currentStreak * 2);
    const engagementScore = Math.min(30, trust.totalExchangeDays * 0.5);
    const consistencyScore = streakScore + engagementScore;

    // Bidirectionality Score (30 pts max)
    let bidirectionalRatioScore = 0;
    let balanceRatioScore = 0;

    if (trust.totalExchangeDays > 0) {
      bidirectionalRatioScore = (trust.bidirectionalDays / trust.totalExchangeDays) * 20;
    }

    const totalTransactionsA = trust.exchangeCountAToB;
    const totalTransactionsB = trust.exchangeCountBToA;
    const maxTransactions = Math.max(totalTransactionsA, totalTransactionsB);
    const minTransactions = Math.min(totalTransactionsA, totalTransactionsB);

    if (maxTransactions > 0) {
      balanceRatioScore = (minTransactions / maxTransactions) * 10;
    }

    const bidirectionalityScore = bidirectionalRatioScore + balanceRatioScore;

    // Amount Score (10 pts max)
    const totalCoins = trust.totalCoinsAToB + trust.totalCoinsBToA;
    const amountScore = Math.min(10, Math.log10(totalCoins + 1) * 3);

    // Final score
    const finalScore = Math.min(100, Math.round(consistencyScore + bidirectionalityScore + amountScore));

    return finalScore;
  }

  /**
   * Get trust score between two users
   */
  static async getTrustScore(currentUserId: string, otherUserId: string): Promise<{
    hasConnection: boolean;
    trustScore: number;
    currentStreak: number;
    longestStreak: number;
    isMutualFollow: boolean;
    isActive: boolean;
    totalExchangeDays: number;
    bidirectionalDays: number;
  }> {
    const { userIdA, userIdB } = FriendTrust.getCanonicalOrder(currentUserId, otherUserId);

    const trust = await FriendTrust.findOne({
      where: { userIdA, userIdB }
    });

    const isMutualFollow = await this.areMutualFollows(currentUserId, otherUserId);

    if (!trust) {
      return {
        hasConnection: false,
        trustScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        isMutualFollow,
        isActive: false,
        totalExchangeDays: 0,
        bidirectionalDays: 0
      };
    }

    // Check if connection is active (exchange within last 7 days)
    let isActive = false;
    if (trust.lastExchangeDate) {
      const lastDate = new Date(trust.lastExchangeDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      isActive = diffDays <= 7;
    }

    return {
      hasConnection: true,
      trustScore: trust.trustScore,
      currentStreak: trust.currentStreak,
      longestStreak: trust.longestStreak,
      isMutualFollow,
      isActive,
      totalExchangeDays: trust.totalExchangeDays,
      bidirectionalDays: trust.bidirectionalDays
    };
  }

  /**
   * Get all trust connections for a user
   */
  static async getUserTrustConnections(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'score' | 'streak' | 'recent';
    } = {}
  ): Promise<{
    connections: Array<{
      id: string;
      otherUserId: string;
      otherUser: {
        id: string;
        username: string;
      } | null;
      trustScore: number;
      currentStreak: number;
      longestStreak: number;
      isMutualFollow: boolean;
      isActive: boolean;
      totalExchangeDays: number;
      lastExchangeDate: string | null;
    }>;
    total: number;
    pagination: {
      limit: number;
      offset: number;
    };
  }> {
    const { limit = 20, offset = 0, sortBy = 'score' } = options;

    // Get ordering
    let order: [string, string][] = [['trust_score', 'DESC']];
    if (sortBy === 'streak') {
      order = [['current_streak', 'DESC']];
    } else if (sortBy === 'recent') {
      order = [['last_exchange_date', 'DESC']];
    }

    // Find all trust connections for this user
    const { count, rows: trusts } = await FriendTrust.findAndCountAll({
      where: {
        [Op.or]: [
          { userIdA: userId },
          { userIdB: userId }
        ]
      },
      order,
      limit,
      offset
    });

    // Get other user IDs and fetch user data
    const otherUserIds = trusts.map(trust =>
      trust.userIdA === userId ? trust.userIdB : trust.userIdA
    );

    const users = await User.findAll({
      where: { id: { [Op.in]: otherUserIds } },
      attributes: ['id', 'username']
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // Check mutual follows for all connections
    const mutualFollowChecks = await Promise.all(
      otherUserIds.map(otherId => this.areMutualFollows(userId, otherId))
    );

    // Build response
    const connections = trusts.map((trust, index) => {
      const otherUserId = trust.userIdA === userId ? trust.userIdB : trust.userIdA;
      const otherUser = userMap.get(otherUserId);

      // Check if active
      let isActive = false;
      if (trust.lastExchangeDate) {
        const lastDate = new Date(trust.lastExchangeDate);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        isActive = diffDays <= 7;
      }

      return {
        id: trust.id,
        otherUserId,
        otherUser: otherUser ? {
          id: otherUser.id,
          username: otherUser.username
        } : null,
        trustScore: trust.trustScore,
        currentStreak: trust.currentStreak,
        longestStreak: trust.longestStreak,
        isMutualFollow: mutualFollowChecks[index],
        isActive,
        totalExchangeDays: trust.totalExchangeDays,
        lastExchangeDate: trust.lastExchangeDate
      };
    });

    return {
      connections,
      total: count,
      pagination: { limit, offset }
    };
  }

  /**
   * Get trust statistics summary for a user
   */
  static async getTrustStats(userId: string): Promise<{
    totalConnections: number;
    activeConnections: number;
    mutualFollowConnections: number;
    averageTrustScore: number;
    highestTrustScore: number;
    totalStreakDays: number;
    longestStreak: number;
  }> {
    const trusts = await FriendTrust.findAll({
      where: {
        [Op.or]: [
          { userIdA: userId },
          { userIdB: userId }
        ]
      }
    });

    if (trusts.length === 0) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        mutualFollowConnections: 0,
        averageTrustScore: 0,
        highestTrustScore: 0,
        totalStreakDays: 0,
        longestStreak: 0
      };
    }

    const now = new Date();
    let activeConnections = 0;
    let totalScore = 0;
    let highestScore = 0;
    let totalStreakDays = 0;
    let longestStreak = 0;

    for (const trust of trusts) {
      // Check if active
      if (trust.lastExchangeDate) {
        const lastDate = new Date(trust.lastExchangeDate);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          activeConnections++;
        }
      }

      totalScore += trust.trustScore;
      if (trust.trustScore > highestScore) {
        highestScore = trust.trustScore;
      }

      totalStreakDays += trust.currentStreak;
      if (trust.longestStreak > longestStreak) {
        longestStreak = trust.longestStreak;
      }
    }

    // Check mutual follows
    const otherUserIds = trusts.map(trust =>
      trust.userIdA === userId ? trust.userIdB : trust.userIdA
    );

    const mutualFollowChecks = await Promise.all(
      otherUserIds.map(otherId => this.areMutualFollows(userId, otherId))
    );
    const mutualFollowConnections = mutualFollowChecks.filter(Boolean).length;

    return {
      totalConnections: trusts.length,
      activeConnections,
      mutualFollowConnections,
      averageTrustScore: Math.round(totalScore / trusts.length),
      highestTrustScore: highestScore,
      totalStreakDays,
      longestStreak
    };
  }

  /**
   * Get detailed friendship data for the detail screen
   * Includes daily logs, score breakdown, and relationship insights
   */
  static async getFriendshipDetail(
    currentUserId: string,
    otherUserId: string,
    month?: string // YYYY-MM
  ): Promise<{
    trust: {
      trustScore: number;
      currentStreak: number;
      longestStreak: number;
      totalExchangeDays: number;
      bidirectionalDays: number;
      totalCoinsYouGave: number;
      totalCoinsTheyGave: number;
      exchangeCountYouGave: number;
      exchangeCountTheyGave: number;
      isMutualFollow: boolean;
      isActive: boolean;
      friendsSince: string | null;
      lastExchangeDate: string | null;
    };
    dailyLogs: Array<{
      date: string;
      youGave: number;
      theyGave: number;
      isBidirectional: boolean;
    }>;
    insights: {
      consistency: { score: number; max: number; streakPart: number; engagementPart: number };
      bidirectionality: { score: number; max: number; ratioPart: number; balancePart: number };
      generosity: { score: number; max: number };
    };
  }> {
    const { userIdA, userIdB } = FriendTrust.getCanonicalOrder(currentUserId, otherUserId);
    const isCurrentUserA = currentUserId === userIdA;

    const trust = await FriendTrust.findOne({
      where: { userIdA, userIdB }
    });

    const isMutualFollow = await this.areMutualFollows(currentUserId, otherUserId);

    if (!trust) {
      return {
        trust: {
          trustScore: 0, currentStreak: 0, longestStreak: 0,
          totalExchangeDays: 0, bidirectionalDays: 0,
          totalCoinsYouGave: 0, totalCoinsTheyGave: 0,
          exchangeCountYouGave: 0, exchangeCountTheyGave: 0,
          isMutualFollow, isActive: false,
          friendsSince: null, lastExchangeDate: null,
        },
        dailyLogs: [],
        insights: {
          consistency: { score: 0, max: 60, streakPart: 0, engagementPart: 0 },
          bidirectionality: { score: 0, max: 30, ratioPart: 0, balancePart: 0 },
          generosity: { score: 0, max: 10 },
        },
      };
    }

    // Build date filter for daily logs
    let dateFilter: any = {};
    if (month) {
      // Specific month: YYYY-MM
      const [year, mon] = month.split('-').map(Number);
      const startDate = `${year}-${String(mon).padStart(2, '0')}-01`;
      const lastDay = new Date(year, mon, 0).getDate();
      const endDate = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      dateFilter = { [Op.between]: [startDate, endDate] };
    } else {
      // Default: last 3 months
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const startDate = threeMonthsAgo.toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      dateFilter = { [Op.between]: [startDate, endDate] };
    }

    const logs = await FriendTrustDailyLog.findAll({
      where: {
        friendTrustId: trust.id,
        logDate: dateFilter,
      },
      order: [['logDate', 'ASC']],
    });

    // Translate A/B → you/they
    const dailyLogs = logs.map(log => ({
      date: log.logDate,
      youGave: isCurrentUserA ? log.coinsAToB : log.coinsBToA,
      theyGave: isCurrentUserA ? log.coinsBToA : log.coinsAToB,
      isBidirectional: log.isBidirectional,
    }));

    // Check if active
    let isActive = false;
    if (trust.lastExchangeDate) {
      const lastDate = new Date(trust.lastExchangeDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      isActive = diffDays <= 7;
    }

    // Compute score breakdown
    const streakPart = Math.min(30, trust.currentStreak * 2);
    const engagementPart = Math.min(30, trust.totalExchangeDays * 0.5);
    const consistencyScore = streakPart + engagementPart;

    let ratioPart = 0;
    if (trust.totalExchangeDays > 0) {
      ratioPart = (trust.bidirectionalDays / trust.totalExchangeDays) * 20;
    }
    const maxTx = Math.max(trust.exchangeCountAToB, trust.exchangeCountBToA);
    const minTx = Math.min(trust.exchangeCountAToB, trust.exchangeCountBToA);
    let balancePart = 0;
    if (maxTx > 0) {
      balancePart = (minTx / maxTx) * 10;
    }
    const bidirectionalityScore = ratioPart + balancePart;

    const totalCoins = trust.totalCoinsAToB + trust.totalCoinsBToA;
    const generosityScore = Math.min(10, Math.log10(totalCoins + 1) * 3);

    return {
      trust: {
        trustScore: trust.trustScore,
        currentStreak: trust.currentStreak,
        longestStreak: trust.longestStreak,
        totalExchangeDays: trust.totalExchangeDays,
        bidirectionalDays: trust.bidirectionalDays,
        totalCoinsYouGave: isCurrentUserA ? trust.totalCoinsAToB : trust.totalCoinsBToA,
        totalCoinsTheyGave: isCurrentUserA ? trust.totalCoinsBToA : trust.totalCoinsAToB,
        exchangeCountYouGave: isCurrentUserA ? trust.exchangeCountAToB : trust.exchangeCountBToA,
        exchangeCountTheyGave: isCurrentUserA ? trust.exchangeCountBToA : trust.exchangeCountAToB,
        isMutualFollow,
        isActive,
        friendsSince: trust.createdAt ? trust.createdAt.toISOString() : null,
        lastExchangeDate: trust.lastExchangeDate,
      },
      dailyLogs,
      insights: {
        consistency: { score: Math.round(consistencyScore), max: 60, streakPart: Math.round(streakPart), engagementPart: Math.round(engagementPart) },
        bidirectionality: { score: Math.round(bidirectionalityScore), max: 30, ratioPart: Math.round(ratioPart), balancePart: Math.round(balancePart) },
        generosity: { score: Math.round(generosityScore), max: 10 },
      },
    };
  }

  /**
   * Check if two users mutually follow each other
   */
  static async areMutualFollows(userId1: string, userId2: string): Promise<boolean> {
    const [follow1to2, follow2to1] = await Promise.all([
      Follow.findOne({
        where: {
          followerId: userId1,
          followingId: userId2
        }
      }),
      Follow.findOne({
        where: {
          followerId: userId2,
          followingId: userId1
        }
      })
    ]);

    return !!(follow1to2 && follow2to1);
  }
}

export default TrustScoreService;
