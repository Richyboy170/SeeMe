import { Op, fn, col } from 'sequelize';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { PositivityCoins } from '../models/PositivityCoins';
import { AuditLog } from '../models/AuditLog';
import { Follow } from '../models/Follow';
import { CoinTransaction } from '../models/CoinTransaction';
import { logger } from '../utils/logger';

export class AdminService {

  // ========== DASHBOARD ==========

  static async getDashboardStats(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalUsers = 0, totalPosts = 0, totalComments = 0;
    let newUsersToday = 0, newPostsToday = 0;
    let activeUsers = 0, suspendedUsers = 0, bannedUsers = 0;
    let coinsData: any = { totalCoinsInCirculation: 0, totalLifetimeEarned: 0, totalLifetimeGiven: 0 };

    // Basic counts
    try {
      [totalUsers, totalPosts, totalComments] = await Promise.all([
        User.count({ where: { isBot: false } }),
        Post.count(),
        Comment.count(),
      ]);
    } catch (err) {
      logger.error('Dashboard: basic counts failed', { error: err });
    }

    // Today's counts
    try {
      [newUsersToday, newPostsToday] = await Promise.all([
        User.count({ where: { isBot: false, createdAt: { [Op.gte]: today } } }),
        Post.count({ where: { createdAt: { [Op.gte]: today } } }),
      ]);
    } catch (err) {
      logger.error('Dashboard: today counts failed', { error: err });
    }

    // Status counts
    try {
      [activeUsers, suspendedUsers, bannedUsers] = await Promise.all([
        User.count({ where: { isBot: false, status: 'active' } }),
        User.count({ where: { status: 'suspended' } }),
        User.count({ where: { status: 'banned' } }),
      ]);
    } catch (err) {
      // If status column doesn't exist yet, fall back
      logger.error('Dashboard: status counts failed (column may not exist yet)', { error: err });
      activeUsers = totalUsers;
    }

    // Coins aggregation — exclude bot users
    try {
      const result = await PositivityCoins.findOne({
        attributes: [
          [fn('SUM', col('PositivityCoins.total_coins')), 'totalCoinsInCirculation'],
          [fn('SUM', col('PositivityCoins.lifetime_earned')), 'totalLifetimeEarned'],
          [fn('SUM', col('PositivityCoins.lifetime_given')), 'totalLifetimeGiven'],
          [fn('SUM', col('PositivityCoins.sky_coins')), 'totalSkyCoins'],
        ],
        include: [{
          model: User,
          as: 'user',
          attributes: [],
          where: { isBot: false },
        }],
        raw: true,
      });
      if (result) {
        coinsData = result;
      }
    } catch (err) {
      logger.error('Dashboard: coins aggregation failed', { error: err });
    }

    // Bot coins (shown separately for transparency)
    let botCoins = 0;
    try {
      const botResult = await PositivityCoins.findOne({
        attributes: [
          [fn('SUM', col('PositivityCoins.total_coins')), 'totalBotCoins'],
        ],
        include: [{
          model: User,
          as: 'user',
          attributes: [],
          where: { isBot: true },
        }],
        raw: true,
      }) as any;
      if (botResult) {
        botCoins = Number(botResult.totalBotCoins) || 0;
      }
    } catch (err) {
      logger.error('Dashboard: bot coins aggregation failed', { error: err });
    }

    // Recent signups (last 5)
    let recentSignups: any[] = [];
    try {
      recentSignups = await User.findAll({
        where: { isBot: false },
        attributes: ['id', 'username', 'email', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5,
        raw: true,
      });
    } catch (err) {
      logger.error('Dashboard: recent signups failed', { error: err });
    }

    // Recent posts (last 5)
    let recentPosts: any[] = [];
    try {
      recentPosts = await Post.findAll({
        attributes: ['id', 'caption', 'likesCount', 'commentsCount', 'createdAt'],
        include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
        order: [['createdAt', 'DESC']],
        limit: 5,
      });
    } catch (err) {
      logger.error('Dashboard: recent posts failed', { error: err });
    }

    // Recent coin transactions (last 5, exclude bot transactions)
    let recentTransactions: any[] = [];
    try {
      recentTransactions = await CoinTransaction.findAll({
        include: [
          { model: User, as: 'fromUser', attributes: ['id', 'username', 'isBot'] },
          { model: User, as: 'toUser', attributes: ['id', 'username'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 10,
      });
    } catch (err) {
      logger.error('Dashboard: recent transactions failed', { error: err });
    }

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      totalPosts,
      totalComments,
      newUsersToday,
      newPostsToday,
      coins: coinsData,
      botCoinsRemaining: botCoins,
      recentSignups,
      recentPosts,
      recentTransactions,
      generatedAt: new Date().toISOString(),
    };
  }

  static async getGrowthData(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Import models dynamically to avoid circular deps
    const { Like } = require('../models/Like');

    // Build list of all date labels in the range
    const allDates: string[] = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      allDates.push(d.toISOString().split('T')[0]);
    }

    // Helper: run a grouped COUNT query and return a date->count map
    const dateExpr = fn('DATE', col('created_at'));
    const groupedCount = async (model: any, extraWhere?: any): Promise<Map<string, number>> => {
      try {
        const rows = await model.findAll({
          attributes: [
            [dateExpr, 'day'],
            [fn('COUNT', col('id')), 'cnt'],
          ],
          where: { createdAt: { [Op.gte]: startDate }, ...extraWhere },
          group: [fn('DATE', col('created_at'))],
          raw: true,
        }) as any[];
        const map = new Map<string, number>();
        for (const r of rows) {
          const key = String(r.day).substring(0, 10); // ensure YYYY-MM-DD
          map.set(key, Number(r.cnt) || 0);
        }
        return map;
      } catch (err) {
        logger.error('Grouped count failed', { model: model.name, error: err });
        return new Map();
      }
    };

    // Helper: grouped SUM for coins
    const groupedSum = async (): Promise<Map<string, number>> => {
      try {
        const rows = await CoinTransaction.findAll({
          attributes: [
            [dateExpr, 'day'],
            [fn('SUM', col('amount')), 'total'],
          ],
          where: { createdAt: { [Op.gte]: startDate } },
          group: [fn('DATE', col('created_at'))],
          raw: true,
        }) as any[];
        const map = new Map<string, number>();
        for (const r of rows) {
          const key = String(r.day).substring(0, 10);
          map.set(key, Number(r.total) || 0);
        }
        return map;
      } catch (err) {
        logger.error('Grouped sum failed', { error: err });
        return new Map();
      }
    };

    // Run all 6 queries in parallel (6 queries total regardless of date range)
    const [usersMap, postsMap, commentsMap, coinsMap, likesMap, followsMap] = await Promise.all([
      groupedCount(User, { isBot: false }),
      groupedCount(Post),
      groupedCount(Comment),
      groupedSum(),
      groupedCount(Like),
      groupedCount(Follow),
    ]);

    // Fill all dates, defaulting to 0 for missing days
    const fill = (map: Map<string, number>) => allDates.map(date => ({ date, count: map.get(date) || 0 }));
    const users = fill(usersMap);
    const posts = fill(postsMap);
    const comments = fill(commentsMap);
    const coins = fill(coinsMap);
    const likes = fill(likesMap);
    const follows = fill(followsMap);

    // Compute summaries for each dataset
    const buildSummary = (data: any[]) => {
      const counts = data.map(d => d.count);
      const total = counts.reduce((a, b) => a + b, 0);
      const average = data.length > 0 ? +(total / data.length).toFixed(1) : 0;
      const maxCount = Math.max(...counts, 0);
      const minCount = Math.min(...counts);
      const peakEntry = data.find(d => d.count === maxCount) || data[0];

      // Trend: compare last 7 days vs prior 7 days
      const last7 = counts.slice(-7).reduce((a: number, b: number) => a + b, 0);
      const prior7 = counts.slice(-14, -7).reduce((a: number, b: number) => a + b, 0);
      // null when prior period is 0 (no baseline to compare against)
      const trendPercent = prior7 > 0 ? +(((last7 - prior7) / prior7) * 100).toFixed(1) : null;

      return { total, average, peak: { date: peakEntry?.date, count: maxCount }, min: minCount, trend: trendPercent, last7, prior7 };
    };

    // Coin economy breakdown by transaction type
    let coinBreakdown: any[] = [];
    try {
      const breakdown = await CoinTransaction.findAll({
        attributes: [
          'transactionType',
          [fn('COUNT', col('id')), 'txCount'],
          [fn('SUM', col('amount')), 'totalAmount'],
        ],
        where: { createdAt: { [Op.gte]: startDate } },
        group: ['transaction_type'],
        raw: true,
      }) as any[];
      coinBreakdown = breakdown.map(r => ({
        type: r.transactionType || (r as any).transaction_type,
        count: Number(r.txCount) || 0,
        amount: Number(r.totalAmount) || 0,
      }));
    } catch (err) {
      logger.error('Coin breakdown query failed', { error: err });
    }

    // Top 5 most-liked posts in period
    let topPosts: any[] = [];
    try {
      topPosts = await Post.findAll({
        where: { createdAt: { [Op.gte]: startDate } },
        order: [['likesCount', 'DESC']],
        limit: 5,
        attributes: ['id', 'caption', 'likesCount', 'commentsCount', 'repostCount', 'createdAt'],
        include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
      });
    } catch (err) {
      logger.error('Top posts query failed', { error: err });
    }

    // Most active users (by post count) in period
    let topUsers: any[] = [];
    try {
      const activeUserRows = await Post.findAll({
        attributes: [
          'userId',
          [fn('COUNT', col('Post.id')), 'postCount'],
        ],
        where: { createdAt: { [Op.gte]: startDate } },
        include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
        group: ['Post.user_id', 'user.id', 'user.username'],
        order: [[fn('COUNT', col('Post.id')), 'DESC']],
        limit: 5,
        raw: true,
        nest: true,
      }) as any[];
      topUsers = activeUserRows.map(r => ({
        userId: r.userId || (r as any).user_id,
        username: r.user?.username || 'Unknown',
        postCount: Number(r.postCount) || 0,
      }));
    } catch (err) {
      logger.error('Top users query failed', { error: err });
    }

    return {
      users,  posts, comments, coins, likes, follows,
      summaries: {
        users: buildSummary(users),
        posts: buildSummary(posts),
        comments: buildSummary(comments),
        coins: buildSummary(coins),
        likes: buildSummary(likes),
        follows: buildSummary(follows),
      },
      coinBreakdown,
      topPosts,
      topUsers,
    };
  }

  // ========== USER MANAGEMENT ==========

  static async listUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'DESC';

    const where: any = { isBot: false };

    if (options.search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${options.search}%` } },
        { email: { [Op.like]: `%${options.search}%` } },
      ];
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.role) {
      where.role = options.role;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      attributes: { exclude: ['passwordHash'] },
    });

    return {
      users: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  static async getUserDetails(userId: string): Promise<any> {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const [postsCount, commentsCount, followersCount, followingCount, coins, recentPosts] = await Promise.all([
      Post.count({ where: { userId } }),
      Comment.count({ where: { userId } }),
      Follow.count({ where: { followingId: userId } }),
      Follow.count({ where: { followerId: userId } }),
      PositivityCoins.findOne({ where: { userId }, raw: true }),
      Post.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
    ]);

    const auditHistory = await AuditLog.findAll({
      where: { targetId: userId, targetType: 'user' },
      order: [['createdAt', 'DESC']],
      limit: 20,
      include: [{ model: User, as: 'adminUser', attributes: ['id', 'username'] }],
    });

    // Build user object explicitly so toJSON() doesn't strip admin fields
    const userData = user.get({ plain: true });
    // Ensure admin-sensitive fields are included (toJSON strips them for normal users)
    userData.suspendedUntil = user.suspendedUntil;
    userData.banReason = user.banReason;
    userData.suspendReason = user.suspendReason;

    return {
      user: userData,
      stats: {
        postsCount,
        commentsCount,
        followersCount,
        followingCount,
        coins: coins || { totalCoins: 0, lifetimeEarned: 0, lifetimeGiven: 0 },
      },
      recentPosts,
      auditHistory,
    };
  }

  // ========== ACCOUNT ACTIONS ==========

  static async suspendUser(
    adminUserId: string,
    userId: string,
    reason: string,
    durationHours: number,
    ipAddress?: string
  ): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    if (user.role === 'admin' || user.role === 'super_admin') {
      throw new Error('Cannot suspend admin users');
    }

    const suspendedUntil = new Date();
    suspendedUntil.setHours(suspendedUntil.getHours() + durationHours);

    user.status = 'suspended';
    user.suspendReason = reason;
    user.suspendedUntil = suspendedUntil;
    await user.save();

    await this.logAction(adminUserId, 'suspend_user', 'user', userId, {
      reason,
      durationHours,
      suspendedUntil: suspendedUntil.toISOString(),
    }, ipAddress);

    logger.info('User suspended', { userId, adminUserId, durationHours });
    return user;
  }

  static async unsuspendUser(adminUserId: string, userId: string, ipAddress?: string): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    user.status = 'active';
    user.suspendReason = null;
    user.suspendedUntil = null;
    await user.save();

    await this.logAction(adminUserId, 'unsuspend_user', 'user', userId, {}, ipAddress);

    logger.info('User unsuspended', { userId, adminUserId });
    return user;
  }

  static async banUser(adminUserId: string, userId: string, reason: string, ipAddress?: string): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    if (user.role === 'admin' || user.role === 'super_admin') {
      throw new Error('Cannot ban admin users');
    }

    user.status = 'banned';
    user.banReason = reason;
    user.suspendedUntil = null;
    user.suspendReason = null;
    await user.save();

    await this.logAction(adminUserId, 'ban_user', 'user', userId, { reason }, ipAddress);

    logger.info('User banned', { userId, adminUserId, reason });
    return user;
  }

  static async unbanUser(adminUserId: string, userId: string, ipAddress?: string): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    user.status = 'active';
    user.banReason = null;
    await user.save();

    await this.logAction(adminUserId, 'unban_user', 'user', userId, {}, ipAddress);

    logger.info('User unbanned', { userId, adminUserId });
    return user;
  }

  // ========== RECOVERY ==========

  static async resetPassword(
    adminUserId: string,
    userId: string,
    newPassword: string,
    ipAddress?: string
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    await this.logAction(adminUserId, 'reset_password', 'user', userId, {}, ipAddress);

    logger.info('User password reset by admin', { userId, adminUserId });
  }

  // ========== CONTENT MODERATION ==========

  static async listPosts(options: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
  }): Promise<{ posts: Post[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (options.search) {
      where.caption = { [Op.like]: `%${options.search}%` };
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    const { count, rows } = await Post.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'avatarUrl'] }],
    });

    return {
      posts: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  static async deletePost(adminUserId: string, postId: string, ipAddress?: string): Promise<void> {
    const post = await Post.findByPk(postId);
    if (!post) throw new Error('Post not found');

    await this.logAction(adminUserId, 'delete_post', 'post', postId, {
      userId: post.userId,
      caption: post.caption,
    }, ipAddress);

    await post.destroy();

    logger.info('Post deleted by admin', { postId, adminUserId });
  }

  static async deleteComment(adminUserId: string, commentId: string, ipAddress?: string): Promise<void> {
    const comment = await Comment.findByPk(commentId);
    if (!comment) throw new Error('Comment not found');

    await this.logAction(adminUserId, 'delete_comment', 'comment', commentId, {
      userId: comment.userId,
      postId: comment.postId,
      content: comment.content,
    }, ipAddress);

    await comment.destroy();

    // Decrement comments count on parent post
    await Post.decrement('commentsCount', { where: { id: comment.postId } });

    logger.info('Comment deleted by admin', { commentId, adminUserId });
  }

  // ========== ROLE MANAGEMENT ==========

  static async setUserRole(
    adminUserId: string,
    userId: string,
    newRole: 'user' | 'admin' | 'super_admin',
    ipAddress?: string
  ): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    await this.logAction(adminUserId, 'change_role', 'user', userId, {
      oldRole,
      newRole,
    }, ipAddress);

    logger.info('User role changed', { userId, adminUserId, oldRole, newRole });
    return user;
  }

  // ========== AUDIT LOG ==========

  static async getAuditLog(options: {
    page?: number;
    limit?: number;
    action?: string;
    adminUserId?: string;
  }): Promise<{ logs: AuditLog[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (options.action) {
      where.action = options.action;
    }

    if (options.adminUserId) {
      where.adminUserId = options.adminUserId;
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [{ model: User, as: 'adminUser', attributes: ['id', 'username', 'email'] }],
    });

    return {
      logs: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  static async logAction(
    adminUserId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    details?: any,
    ipAddress?: string
  ): Promise<AuditLog> {
    return AuditLog.create({
      adminUserId,
      action,
      targetType: targetType || null,
      targetId: targetId || null,
      details: details ? JSON.stringify(details) : null,
      ipAddress: ipAddress || null,
    });
  }
}
