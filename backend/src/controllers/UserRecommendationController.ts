import { Response } from 'express';
import { Op, literal } from 'sequelize';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { BlockedUser } from '../models/BlockedUser';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { formatAvatarForResponse } from '../utils/formatAvatar';

/**
 * User Recommendation Controller
 * Provides endpoints for user discovery and friend recommendations
 */
export class UserRecommendationController {
  /**
   * Get recommended users for the authenticated user
   * Algorithm prioritizes mutual connections first, then fills with any active users:
   * 1. Mutual connections — friends of friends (users followed by people you follow)
   * 2. Active users — any user with posts or coins (no mutual requirement)
   * Filters out inactive/test accounts (no posts AND no coins)
   * Excludes: users already followed, blocked users, self
   */
  static async getRecommendedUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currentUserId = req.user!.id;
      const currentUsername = req.user!.username;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 10);

      logger.info('Getting recommendations for user', { currentUserId, currentUsername });

      // Get IDs of users already followed
      const followedUsers = await Follow.findAll({
        where: { followerId: currentUserId },
        attributes: ['followingId'],
      });
      const followedIds = followedUsers.map(f => f.followingId);

      // Get IDs of blocked users (both directions)
      const blockedUsers = await BlockedUser.findAll({
        where: {
          [Op.or]: [
            { blockerId: currentUserId },
            { blockedId: currentUserId }
          ]
        },
        attributes: ['blockerId', 'blockedId'],
      });
      const blockedIds = blockedUsers.flatMap(b => [b.blockerId, b.blockedId]);

      // Combine excluded IDs (self, followed, blocked)
      const excludedIds = [...new Set([currentUserId, ...followedIds, ...blockedIds])];

      logger.info('Excluded IDs for recommendations', {
        currentUserId,
        excludedCount: excludedIds.length,
        excludedIds: excludedIds.slice(0, 5) // Log first 5 for debugging
      });

      // Shared attributes for all queries
      const userAttributes = [
        'id',
        'username',
        'avatarUrl',
        'activeAvatarId',
        'positivityGiveCounter',
        'positivityRank',
        'createdAt',
        [
          literal(`(SELECT COUNT(*) FROM follows WHERE follows."following_id" = "User".id)`),
          'followersCount'
        ],
        [
          literal(`(SELECT COUNT(*) FROM posts WHERE posts."user_id" = "User".id)`),
          'postsCount'
        ],
        [
          literal(`(SELECT COUNT(*) FROM follows f1 INNER JOIN follows f2 ON f1."following_id" = f2."following_id" WHERE f1."follower_id" = '${currentUserId}' AND f2."follower_id" = "User".id AND f2."following_id" != '${currentUserId}')`),
          'mutualCount'
        ],
      ] as any[];

      // Only show users who are active (have at least 1 post OR coins > 0)
      const activityFilter = literal(
        `(SELECT COUNT(*) FROM posts WHERE posts."user_id" = "User".id) > 0 OR "User"."positivity_give_counter" > 0`
      );

      // 1. Friends of friends — users followed by people you follow (mutual connections, prioritized)
      const mutualConnectionUsers = followedIds.length > 0 ? await User.findAll({
        where: {
          id: {
            [Op.notIn]: excludedIds,
            [Op.in]: literal(
              `(SELECT DISTINCT f2."following_id" FROM follows f1 INNER JOIN follows f2 ON f1."following_id" = f2."follower_id" WHERE f1."follower_id" = '${currentUserId}' AND f2."following_id" NOT IN (${excludedIds.map(id => `'${id}'`).join(',')}))`
            ),
          },
          [Op.and]: [activityFilter],
        },
        attributes: userAttributes,
        order: [[literal('"mutualCount"'), 'DESC']],
        limit,
      }) : [];

      // 2. Active users with posts and coins — fill remaining spots
      const mutualIds = mutualConnectionUsers.map(u => u.id);
      const remaining = limit - mutualConnectionUsers.length;
      const activeUsers = remaining > 0 ? await User.findAll({
        where: {
          id: { [Op.notIn]: [...excludedIds, ...mutualIds] },
          [Op.and]: [activityFilter],
        },
        attributes: userAttributes,
        order: [[literal('"postsCount"'), 'DESC'], [literal('"followersCount"'), 'DESC']],
        limit: remaining,
      }) : [];

      // Combine: mutual connections first, then active users
      const allRecommendations = [...mutualConnectionUsers, ...activeUsers];
      const sliced = allRecommendations.slice(0, limit);

      // Fetch active avatars for all recommended users
      const userIds = sliced.map(u => u.id);
      const avatars = await AvatarConfigSQL.findAll({
        where: {
          userId: { [Op.in]: userIds },
          isActive: true,
        },
      });
      const avatarsByUserId = new Map(avatars.map(a => [a.userId, formatAvatarForResponse(a)]));

      // Format response - with final safety filter to ensure current user is never included
      const recommendations = sliced
        .filter(user => user.id !== currentUserId) // Extra safety check
        .map(user => {
          const userData = user.toJSON() as any;
          const mutualCount = parseInt(userData.mutualCount) || 0;
          return {
            id: userData.id,
            username: userData.username,
            avatarUrl: userData.avatarUrl,
            activeAvatarId: userData.activeAvatarId,
            activeAvatar: avatarsByUserId.get(userData.id) || null,
            positivityGiveCounter: userData.positivityGiveCounter,
            positivityRank: userData.positivityRank,
            followersCount: parseInt(userData.followersCount) || 0,
            postsCount: parseInt(userData.postsCount) || 0,
            mutualCount,
            isFollowing: false,
            recommendationReason: getRecommendationReason(userData),
          };
        });

      // Log if self was somehow in the list (should never happen)
      if (sliced.some(u => u.id === currentUserId)) {
        logger.warn('Current user was in recommendations before final filter!', { currentUserId });
      }

      logger.info('User recommendations fetched', {
        userId: currentUserId,
        count: recommendations.length,
      });

      res.json({
        success: true,
        recommendations,
        total: recommendations.length,
      });

    } catch (error) {
      logger.error('Error fetching user recommendations', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  }
}

/**
 * Helper function to determine recommendation reason
 */
function getRecommendationReason(user: any): string {
  const mutualCount = parseInt(user.mutualCount) || 0;
  const followersCount = parseInt(user.followersCount) || 0;
  const postsCount = parseInt(user.postsCount) || 0;

  if (mutualCount > 0) {
    return `${mutualCount} mutual`;
  } else if (followersCount >= 10) {
    return 'Popular';
  } else if (postsCount >= 5) {
    return 'Active';
  }
  return 'Active';
}
