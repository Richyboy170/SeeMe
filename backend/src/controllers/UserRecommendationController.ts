import { Response } from 'express';
import { Op, literal } from 'sequelize';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { BlockedUser } from '../models/BlockedUser';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

// Helper to format avatar data for API response
function formatAvatarForResponse(avatar: AvatarConfigSQL | null) {
  if (!avatar) return null;
  return {
    id: avatar.id,
    style: avatar.style,
    customizations: {
      skinTone: avatar.skinTone,
      eyeColor: avatar.eyeColor,
      eyeSize: avatar.eyeSize,
      hairColor: avatar.hairColor,
      hairStyle: avatar.hairStyle,
      accessories: {
        glasses: avatar.glasses,
        hat: avatar.hat,
        earrings: avatar.earrings,
      },
    },
  };
}

/**
 * User Recommendation Controller
 * Provides endpoints for user discovery and friend recommendations
 */
export class UserRecommendationController {
  /**
   * Get recommended users for the authenticated user
   * Algorithm considers:
   * 1. Users with most followers (popular users)
   * 2. Users with most posts (active users)
   * 3. Recently joined users
   * 4. Random sampling for diversity
   * Excludes: users already followed, blocked users, self
   */
  static async getRecommendedUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currentUserId = req.user!.id;
      const currentUsername = req.user!.username;
      const limit = parseInt(req.query.limit as string) || 20;

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

      // Get popular users (by follower count)
      const popularUsers = await User.findAll({
        where: {
          id: { [Op.notIn]: excludedIds },
        },
        attributes: [
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
          ]
        ],
        order: [[literal('"followersCount"'), 'DESC']],
        limit: Math.ceil(limit / 3),
      });

      // Get active users (by post count) - exclude already fetched
      const popularIds = popularUsers.map(u => u.id);
      const activeUsers = await User.findAll({
        where: {
          id: { [Op.notIn]: [...excludedIds, ...popularIds] },
        },
        attributes: [
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
          ]
        ],
        order: [[literal('"postsCount"'), 'DESC']],
        limit: Math.ceil(limit / 3),
      });

      // Get recently joined users - exclude already fetched
      const activeIds = activeUsers.map(u => u.id);
      const recentUsers = await User.findAll({
        where: {
          id: { [Op.notIn]: [...excludedIds, ...popularIds, ...activeIds] },
        },
        attributes: [
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
          ]
        ],
        order: [['createdAt', 'DESC']],
        limit: Math.ceil(limit / 3),
      });

      // Combine all recommendations
      const allRecommendations = [...popularUsers, ...activeUsers, ...recentUsers];

      // Shuffle for diversity
      const shuffled = allRecommendations.sort(() => Math.random() - 0.5);
      const sliced = shuffled.slice(0, limit);

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
  const followersCount = parseInt(user.followersCount) || 0;
  const postsCount = parseInt(user.postsCount) || 0;
  const daysSinceJoined = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (followersCount >= 10) {
    return 'Popular';
  } else if (postsCount >= 5) {
    return 'Active';
  } else if (daysSinceJoined <= 7) {
    return 'New';
  }
  return 'Suggested';
}
