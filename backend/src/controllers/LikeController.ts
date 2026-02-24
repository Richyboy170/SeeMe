import { Request, Response } from 'express';
import { Like } from '../models/Like';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Like Controller
 * Handles all like-related operations
 */
export class LikeController {
  /**
   * Like a post
   */
  static async likePost(req: AuthRequest, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const { postId } = req.params;
      const userId = req.user!.id;

      // Check if post exists
      const post = await Post.findByPk(postId);
      if (!post) {
        await transaction.rollback();
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      // Check if already liked - make it idempotent
      const existingLike = await Like.findOne({
        where: { userId, postId }
      });

      if (existingLike) {
        await transaction.rollback();
        // Return success anyway (idempotent) - already liked is fine
        res.status(200).json({
          message: 'Post already liked',
          liked: true,
          likesCount: post.likesCount
        });
        return;
      }

      // Create like
      await Like.create({ userId, postId }, { transaction });

      // Increment like count
      await post.increment('likesCount', { transaction });

      await transaction.commit();

      logger.info('Post liked', { postId, userId });

      res.json({
        message: 'Post liked',
        liked: true,
        likesCount: post.likesCount + 1
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('Error liking post', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to like post' });
    }
  }

  /**
   * Unlike a post
   */
  static async unlikePost(req: AuthRequest, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const { postId } = req.params;
      const userId = req.user!.id;

      const post = await Post.findByPk(postId);
      if (!post) {
        await transaction.rollback();
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      // Delete like
      const deleted = await Like.destroy({
        where: { userId, postId },
        transaction
      });

      if (deleted === 0) {
        await transaction.rollback();
        // Return success anyway (idempotent) - not liked is fine for unlike
        res.status(200).json({
          message: 'Post was not liked',
          liked: false,
          likesCount: post.likesCount
        });
        return;
      }

      // Decrement like count (ensure doesn't go below 0)
      if (post.likesCount > 0) {
        await post.decrement('likesCount', { transaction });
      }

      await transaction.commit();

      logger.info('Post unliked', { postId, userId });

      res.json({
        message: 'Post unliked',
        liked: false,
        likesCount: Math.max(0, post.likesCount - 1)
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('Error unliking post', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to unlike post' });
    }
  }

  /**
   * Get list of users who liked a post
   */
  static async getPostLikes(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 30;
      const offset = (page - 1) * limit;

      const post = await Post.findByPk(postId);
      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      const { rows: likes, count } = await Like.findAndCountAll({
        where: { postId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      const users = likes.map(like => like.get('user'));

      res.json({
        users,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting likes', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to get likes' });
    }
  }

  /**
   * Get liked status for multiple posts (batch request)
   * Efficient for checking like status on feed posts
   */
  static async getLikedStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postIds } = req.body; // Array of post IDs
      const userId = req.user!.id;

      if (!Array.isArray(postIds) || postIds.length === 0) {
        res.status(400).json({ error: 'Invalid postIds array' });
        return;
      }

      if (postIds.length > 100) {
        res.status(400).json({ error: 'Maximum 100 posts can be checked at once' });
        return;
      }

      const likes = await Like.findAll({
        where: {
          userId,
          postId: postIds
        },
        attributes: ['postId']
      });

      const likedPostIds = new Set(likes.map(like => like.postId));

      const status = postIds.reduce((acc, postId) => {
        acc[postId] = likedPostIds.has(postId);
        return acc;
      }, {} as Record<string, boolean>);

      res.json({ status });

    } catch (error) {
      logger.error('Error getting liked status', { error });
      res.status(500).json({ error: 'Failed to get liked status' });
    }
  }

  /**
   * Check if user liked a specific post
   */
  static async checkLikedStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const userId = req.user!.id;

      const like = await Like.findOne({
        where: { userId, postId }
      });

      res.json({ liked: !!like });

    } catch (error) {
      logger.error('Error checking liked status', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to check liked status' });
    }
  }
}
