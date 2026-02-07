import { Response } from 'express';
import { Repost, RepostType } from '../models/Repost';
import { AuthRequest } from '../middleware/auth';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { sequelize } from '../config/database';

/**
 * Controller for handling repost operations
 */
export class RepostController {
  /**
   * Create a repost or quote post
   * POST /api/reposts/:postId
   */
  static async createRepost(req: AuthRequest, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const { postId } = req.params;
      const userId = req.user?.id;
      const { type = RepostType.REPOST, comment } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Validate type
      if (type !== RepostType.REPOST && type !== RepostType.QUOTE) {
        res.status(400).json({ error: 'Invalid repost type. Must be "repost" or "quote"' });
        return;
      }

      // Quote posts require a comment
      if (type === RepostType.QUOTE && (!comment || comment.trim() === '')) {
        res.status(400).json({ error: 'Quote posts require a comment' });
        return;
      }

      // Check if post exists
      const post = await Post.findByPk(postId);
      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      // Check if user already reposted this post
      const existingRepost = await Repost.findOne({
        where: { userId, originalPostId: postId }
      });

      if (existingRepost) {
        // If it's the same type, it's a duplicate
        if (existingRepost.type === type) {
          res.status(400).json({ error: 'You have already reposted this post' });
          return;
        }

        // If changing from repost to quote or vice versa, update it
        existingRepost.type = type;
        existingRepost.comment = type === RepostType.QUOTE ? comment : null;
        await existingRepost.save({ transaction });

        await transaction.commit();

        res.status(200).json({
          message: 'Repost updated successfully',
          repost: existingRepost
        });
        return;
      }

      // Create the repost
      const repost = await Repost.create({
        userId,
        originalPostId: postId,
        type,
        comment: type === RepostType.QUOTE ? comment : null
      }, { transaction });

      // Increment repost count on the post
      await Post.increment('repostCount', {
        where: { id: postId },
        transaction
      });

      await transaction.commit();

      // Fetch updated post to get the new repost count
      const updatedPost = await Post.findByPk(postId, {
        attributes: ['repostCount']
      });

      logger.info('Repost created', { userId, postId, type });

      res.status(201).json({
        message: type === RepostType.QUOTE ? 'Quote posted successfully' : 'Reposted successfully',
        repost,
        repostCount: updatedPost?.repostCount || 1
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating repost', { error });
      res.status(500).json({ error: 'Failed to create repost' });
    }
  }

  /**
   * Remove a repost
   * DELETE /api/reposts/:postId
   */
  static async removeRepost(req: AuthRequest, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const { postId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Find the repost
      const repost = await Repost.findOne({
        where: { userId, originalPostId: postId }
      });

      if (!repost) {
        res.status(404).json({ error: 'Repost not found' });
        return;
      }

      // Delete the repost
      await repost.destroy({ transaction });

      // Decrement repost count on the post
      await Post.decrement('repostCount', {
        where: { id: postId },
        transaction
      });

      await transaction.commit();

      logger.info('Repost removed', { userId, postId });

      res.status(200).json({
        message: 'Repost removed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error removing repost', { error });
      res.status(500).json({ error: 'Failed to remove repost' });
    }
  }

  /**
   * Check if user has reposted a post
   * GET /api/reposts/:postId/status
   */
  static async getRepostStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const repost = await Repost.findOne({
        where: { userId, originalPostId: postId }
      });

      res.status(200).json({
        hasReposted: !!repost,
        repostType: repost?.type || null,
        repost: repost || null
      });
    } catch (error) {
      logger.error('Error getting repost status', { error });
      res.status(500).json({ error: 'Failed to get repost status' });
    }
  }

  /**
   * Get all reposts for a post
   * GET /api/reposts/:postId/list
   */
  static async getPostReposts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows: reposts } = await Repost.findAndCountAll({
        where: { originalPostId: postId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName', 'avatarUrl']
        }],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.status(200).json({
        reposts,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error getting post reposts', { error });
      res.status(500).json({ error: 'Failed to get reposts' });
    }
  }

  /**
   * Get user's reposts
   * GET /api/reposts/user/:userId
   */
  static async getUserReposts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows: reposts } = await Repost.findAndCountAll({
        where: { userId },
        include: [{
          model: Post,
          as: 'originalPost',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'displayName', 'avatarUrl']
          }]
        }],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset
      });

      res.status(200).json({
        reposts,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      });
    } catch (error) {
      logger.error('Error getting user reposts', { error });
      res.status(500).json({ error: 'Failed to get user reposts' });
    }
  }
}

export default RepostController;
