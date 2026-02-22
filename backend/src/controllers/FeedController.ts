import { Response } from 'express';
import { Op } from 'sequelize';
import { Post, PostStatus, PostVisibility } from '../models/Post';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { Like } from '../models/Like';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { Topic } from '../models/Topic';
import { AuthRequest } from '../middleware/auth';
import { redisClient, redisAvailable } from '../config/redis';
import { logger } from '../utils/logger';
import { FeedAlgorithmService } from '../services/FeedAlgorithmService';
import { InteractionType } from '../models/UserInteraction';
import { DecorationService } from '../services/DecorationService';
import { Comment } from '../models/Comment';

/**
 * Batch fetch top N recent comments for a list of post IDs.
 * Returns a Map of postId -> Comment[] (top-level only, newest first).
 */
async function batchFetchRecentComments(
  postIds: string[],
  limit: number = 3
): Promise<Map<string, Array<{ id: string; content: string; user: { id: string; username: string }; createdAt: Date }>>> {
  const map = new Map<string, Array<{ id: string; content: string; user: { id: string; username: string }; createdAt: Date }>>();
  if (postIds.length === 0) return map;

  // Fetch top-level comments for all posts, newest first
  const comments = await Comment.findAll({
    where: {
      postId: postIds,
      parentCommentId: null,
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username'],
      },
    ],
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'postId', 'content', 'createdAt'],
  });

  // Group by postId and keep only top N per post
  for (const c of comments) {
    const postId = c.postId;
    if (!map.has(postId)) {
      map.set(postId, []);
    }
    const arr = map.get(postId)!;
    if (arr.length < limit) {
      const userData = (c as any).user;
      arr.push({
        id: c.id,
        content: c.content,
        user: userData ? { id: userData.id, username: userData.username } : { id: '', username: 'Unknown' },
        createdAt: c.createdAt,
      });
    }
  }

  return map;
}

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
 * Feed Controller
 * Handles personalized and discover feed endpoints
 */
export class FeedController {
  /**
   * Get personalized feed for authenticated user
   * Shows posts from followed users in chronological order
   */
  static async getFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      // Check cache first
      const cacheKey = `feed:${userId}:page:${page}`;

      if (redisAvailable && redisClient) {
        try {
          const cached = await redisClient.get(cacheKey);

          if (cached) {
            logger.debug('Feed cache hit', { userId, page });
            res.json(JSON.parse(cached));
            return;
          }
        } catch (error) {
          logger.warn('Redis cache read failed, continuing without cache', { error });
        }
      }

      // Get list of users being followed
      const following = await Follow.findAll({
        where: { followerId: userId },
        attributes: ['followingId']
      });

      const followingIds = following.map(f => f.followingId);

      // Get posts from followed users AND the user's own posts
      // Only show posts with visibility that includes friends (friends_only or topics_and_friends)
      // Exclude topics_only posts as they should only appear in topic feeds
      // Also include posts with null visibility for backwards compatibility (treated as friends_only)
      const feedUserIds = [...followingIds, userId]; // Include own posts
      const { rows: posts, count } = await Post.findAndCountAll({
        where: {
          userId: feedUserIds,
          status: PostStatus.COMPLETED,
          isArchived: { [Op.ne]: true },
          [Op.or]: [
            { visibility: { [Op.in]: [PostVisibility.FRIENDS_ONLY, PostVisibility.TOPICS_AND_FRIENDS] } },
            { visibility: null as any }  // Backwards compatibility for older posts
          ]
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: Topic,
            as: 'topics',
            attributes: ['id', 'name', 'slug', 'iconEmoji'],
            through: { attributes: [] }
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        attributes: [
          'id',
          'userId',
          'processedImageUrl',
          'thumbnailUrl',
          'originalImageUrl',
          'caption',
          'likesCount',
          'commentsCount',
          'createdAt'
        ]
      });

      // Check which posts are liked by the current user
      const postIds = posts.map(p => p.id);
      const likes = await Like.findAll({
        where: {
          userId,
          postId: postIds
        },
        attributes: ['postId']
      });

      const likedPostIds = new Set(likes.map(like => like.postId));

      // Fetch active avatars for all post authors
      const authorIds = [...new Set(posts.map(p => p.userId))];
      const avatars = await AvatarConfigSQL.findAll({
        where: {
          userId: authorIds,
          isActive: true,
        },
      });
      const avatarsByUserId = new Map(avatars.map(a => [a.userId, a]));

      // Fetch active decorations for all post authors
      const decorationsByUserId = await DecorationService.batchResolveActiveDecorations(authorIds);

      // Fetch top 3 recent comments for each post
      const recentCommentsByPostId = await batchFetchRecentComments(postIds, 3);

      const response = {
        posts: posts.map(post => {
          const userModel = post.get('user') as any;
          const userData = userModel ? (userModel.get ? userModel.get({ plain: true }) : userModel) : null;
          const avatar = avatarsByUserId.get(post.userId);
          return {
            id: post.id,
            user: userData ? {
              ...userData,
              activeAvatar: formatAvatarForResponse(avatar || null),
            } : null,
            imageUrl: post.processedImageUrl,
            thumbnailUrl: post.thumbnailUrl,
            originalImageUrl: post.originalImageUrl,
            caption: post.caption,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            createdAt: post.createdAt,
            likedByMe: likedPostIds.has(post.id),
            topics: ((post as any).topics || []).map((t: any) => ({
              id: t.id, name: t.name, slug: t.slug, iconEmoji: t.iconEmoji,
            })),
            decoration: decorationsByUserId.get(post.userId) || null,
            recentComments: recentCommentsByPostId.get(post.id) || [],
          };
        }),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      };

      // Cache for 1 minute
      if (redisAvailable && redisClient) {
        try {
          await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
          logger.debug('Feed cached', { userId, page });
        } catch (error) {
          logger.warn('Redis cache write failed', { error });
        }
      }

      res.json(response);

    } catch (error) {
      logger.error('Error getting feed', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to load feed' });
    }
  }

  /**
   * Get discover feed (all recent posts, not just followed users)
   * Available to all users, including unauthenticated
   * For authenticated users, includes likedByMe status
   */
  static async getDiscoverFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // Optional authentication
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      // Use user-specific cache for authenticated users, shared cache for unauthenticated
      const cacheKey = userId ? `discover:${userId}:page:${page}` : `discover:page:${page}`;

      if (redisAvailable && redisClient) {
        try {
          const cached = await redisClient.get(cacheKey);

          if (cached) {
            logger.debug('Discover feed cache hit', { page, userId });
            res.json(JSON.parse(cached));
            return;
          }
        } catch (error) {
          logger.warn('Redis cache read failed, continuing without cache', { error });
        }
      }

      // For discover feed, only show public posts (topics_and_friends)
      // or older posts without visibility set (backwards compatibility)
      const { rows: posts, count } = await Post.findAndCountAll({
        where: {
          status: PostStatus.COMPLETED,
          isArchived: { [Op.ne]: true },
          [Op.or]: [
            { visibility: PostVisibility.TOPICS_AND_FRIENDS },
            { visibility: null as any }  // Backwards compatibility
          ]
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: Topic,
            as: 'topics',
            attributes: ['id', 'name', 'slug', 'iconEmoji'],
            through: { attributes: [] }
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        attributes: [
          'id',
          'userId',
          'processedImageUrl',
          'thumbnailUrl',
          'originalImageUrl',
          'caption',
          'likesCount',
          'commentsCount',
          'createdAt'
        ]
      });

      // Check which posts are liked by the current user (if authenticated)
      let likedPostIds = new Set<string>();
      if (userId && posts.length > 0) {
        const postIds = posts.map(p => p.id);
        const likes = await Like.findAll({
          where: {
            userId,
            postId: postIds
          },
          attributes: ['postId']
        });
        likedPostIds = new Set(likes.map(like => like.postId));
      }

      // Fetch active avatars for all post authors
      const authorIds = [...new Set(posts.map(p => p.userId))];
      const avatars = await AvatarConfigSQL.findAll({
        where: {
          userId: authorIds,
          isActive: true,
        },
      });
      const avatarsByUserId = new Map(avatars.map(a => [a.userId, a]));

      // Fetch active decorations for all post authors
      const decorationsByUserId = await DecorationService.batchResolveActiveDecorations(authorIds);

      // Fetch top 3 recent comments for each post
      const postIds = posts.map(p => p.id);
      const recentCommentsByPostId = await batchFetchRecentComments(postIds, 3);

      const response = {
        posts: posts.map(post => {
          const userModel = post.get('user') as any;
          const userData = userModel ? (userModel.get ? userModel.get({ plain: true }) : userModel) : null;
          const avatar = avatarsByUserId.get(post.userId);
          return {
            id: post.id,
            user: userData ? {
              ...userData,
              activeAvatar: formatAvatarForResponse(avatar || null),
            } : null,
            imageUrl: post.processedImageUrl,
            thumbnailUrl: post.thumbnailUrl,
            originalImageUrl: post.originalImageUrl,
            caption: post.caption,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            createdAt: post.createdAt,
            likedByMe: likedPostIds.has(post.id),
            topics: ((post as any).topics || []).map((t: any) => ({
              id: t.id, name: t.name, slug: t.slug, iconEmoji: t.iconEmoji,
            })),
            decoration: decorationsByUserId.get(post.userId) || null,
            recentComments: recentCommentsByPostId.get(post.id) || [],
          };
        }),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      };

      // Cache for 2 minutes (longer than personalized feed)
      if (redisAvailable && redisClient) {
        try {
          await redisClient.setEx(cacheKey, 120, JSON.stringify(response));
          logger.debug('Discover feed cached', { page, userId });
        } catch (error) {
          logger.warn('Redis cache write failed', { error });
        }
      }

      res.json(response);

    } catch (error) {
      logger.error('Error getting discover feed', { error });
      res.status(500).json({ error: 'Failed to load discover feed' });
    }
  }

  /**
   * Invalidate feed cache for user
   * Called when user follows/unfollows someone or when new posts are created
   */
  static async invalidateFeedCache(userId: string): Promise<void> {
    if (!redisAvailable || !redisClient) return;

    try {
      // Delete all cached pages for this user
      const keys = await redisClient.keys(`feed:${userId}:page:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug('Feed cache invalidated', { userId, keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Error invalidating feed cache', { error, userId });
    }
  }

  /**
   * Invalidate discover feed cache
   * Called when new posts are created
   */
  static async invalidateDiscoverCache(): Promise<void> {
    if (!redisAvailable || !redisClient) return;

    try {
      const keys = await redisClient.keys('discover:page:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.debug('Discover feed cache invalidated', { keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Error invalidating discover cache', { error });
    }
  }

  /**
   * Get algorithmically ranked feed for authenticated user
   * Uses engagement data to personalize the feed order
   */
  static async getAlgorithmicFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Check cache first (shorter TTL for algorithmic feed)
      const cacheKey = `algo_feed:${userId}:page:${page}`;

      if (redisAvailable && redisClient) {
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            logger.debug('Algorithmic feed cache hit', { userId, page });
            res.json(JSON.parse(cached));
            return;
          }
        } catch (error) {
          logger.warn('Redis cache read failed, continuing without cache', { error });
        }
      }

      // Get algorithmically ranked feed
      const response = await FeedAlgorithmService.getAlgorithmicFeed(userId, page, limit);

      // Cache for 30 seconds (shorter than regular feed due to dynamic nature)
      if (redisAvailable && redisClient) {
        try {
          await redisClient.setEx(cacheKey, 30, JSON.stringify(response));
          logger.debug('Algorithmic feed cached', { userId, page });
        } catch (error) {
          logger.warn('Redis cache write failed', { error });
        }
      }

      res.json(response);

    } catch (error) {
      logger.error('Error getting algorithmic feed', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to load feed' });
    }
  }

  /**
   * Track user interaction for the feed algorithm
   * Called by the mobile app when users view, like, comment, etc.
   */
  static async trackInteraction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { targetId, interactionType, metadata } = req.body;

      if (!targetId || !interactionType) {
        res.status(400).json({ error: 'targetId and interactionType are required' });
        return;
      }

      // Validate interaction type
      const validTypes = Object.values(InteractionType);
      if (!validTypes.includes(interactionType)) {
        res.status(400).json({ error: 'Invalid interaction type' });
        return;
      }

      // Track the interaction (fire and forget - don't wait)
      FeedAlgorithmService.trackInteraction(
        userId,
        targetId,
        interactionType as InteractionType,
        metadata
      ).catch(err => logger.warn('Failed to track interaction', { err }));

      res.json({ success: true });

    } catch (error) {
      logger.error('Error tracking interaction', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to track interaction' });
    }
  }
}
