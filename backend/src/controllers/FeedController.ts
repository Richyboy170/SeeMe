import { Response } from 'express';
import { Post, PostStatus } from '../models/Post';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { Like } from '../models/Like';
import { AuthRequest } from '../middleware/auth';
import { redisClient, redisAvailable } from '../config/redis';
import { logger } from '../utils/logger';

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

      if (followingIds.length === 0) {
        // No follows yet, return empty feed
        const response = {
          posts: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false
          }
        };

        res.json(response);
        return;
      }

      // Get posts from followed users
      const { rows: posts, count } = await Post.findAndCountAll({
        where: {
          userId: followingIds,
          status: PostStatus.COMPLETED
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'activeAvatarId']
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        attributes: [
          'id',
          'processedImageUrl',
          'thumbnailUrl',
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

      const response = {
        posts: posts.map(post => ({
          id: post.id,
          user: post.get('user'),
          imageUrl: post.processedImageUrl,
          thumbnailUrl: post.thumbnailUrl,
          caption: post.caption,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          createdAt: post.createdAt,
          likedByMe: likedPostIds.has(post.id)
        })),
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

      const { rows: posts, count } = await Post.findAndCountAll({
        where: {
          status: PostStatus.COMPLETED
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'activeAvatarId']
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        attributes: [
          'id',
          'processedImageUrl',
          'thumbnailUrl',
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

      const response = {
        posts: posts.map(post => ({
          id: post.id,
          user: post.get('user'),
          imageUrl: post.processedImageUrl,
          thumbnailUrl: post.thumbnailUrl,
          caption: post.caption,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          createdAt: post.createdAt,
          likedByMe: likedPostIds.has(post.id)
        })),
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
}
