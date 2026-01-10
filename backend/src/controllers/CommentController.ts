import { Request, Response } from 'express';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { CoinsService } from '../services/CoinsService';
import { PositivityDetectionService } from '../services/PositivityDetectionService';

/**
 * Comment Controller
 * Handles all comment-related operations including nested replies
 */
export class CommentController {
  /**
   * Create a comment on a post or reply to another comment
   */
  static async createComment(req: AuthRequest, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const { postId } = req.params;
      const { content, parentCommentId } = req.body;
      const userId = req.user!.id;

      // Validate content
      if (!content || content.trim().length === 0) {
        await transaction.rollback();
        res.status(400).json({ error: 'Comment content required' });
        return;
      }

      if (content.trim().length > 500) {
        await transaction.rollback();
        res.status(400).json({ error: 'Comment too long (max 500 characters)' });
        return;
      }

      // Check if post exists
      const post = await Post.findByPk(postId);
      if (!post) {
        await transaction.rollback();
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      // If replying, check parent comment exists and belongs to same post
      if (parentCommentId) {
        const parentComment = await Comment.findByPk(parentCommentId);
        if (!parentComment || parentComment.postId !== postId) {
          await transaction.rollback();
          res.status(404).json({ error: 'Parent comment not found or does not belong to this post' });
          return;
        }
      }

      // Create comment
      const comment = await Comment.create({
        postId,
        userId,
        content: content.trim(),
        parentCommentId: parentCommentId || null
      }, { transaction });

      // Increment comment count (only for top-level comments)
      if (!parentCommentId) {
        await post.increment('commentsCount', { transaction });
      }

      await transaction.commit();

      // Fetch comment with user data
      const commentWithUser = await Comment.findByPk(comment.id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'activeAvatarId']
        }]
      });

      logger.info('Comment created', { commentId: comment.id, postId, userId });

      // Check if comment is positive and award coins
      let coinsEarned = 0;
      const isPositive = PositivityDetectionService.isPositiveComment(content);

      if (isPositive) {
        try {
          coinsEarned = await CoinsService.awardCoinsForComment(userId, comment.id);
          logger.info('Coins awarded for positive comment', {
            userId,
            commentId: comment.id,
            coinsEarned
          });

          // TODO: Send notification to user about coins earned
          // await NotificationService.sendNotification(userId, {
          //   type: 'coins_earned',
          //   title: 'Kindness Rewarded! 💙',
          //   body: 'You earned 1 coin for spreading positivity!',
          //   data: { coinsEarned }
          // });
        } catch (error) {
          logger.error('Failed to award coins for comment', {
            error,
            userId,
            commentId: comment.id
          });
          // Don't fail comment creation if coin awarding fails
        }
      }

      res.status(201).json({
        message: 'Comment created',
        comment: commentWithUser,
        coinsEarned
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating comment', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }

  /**
   * Get comments for a post (top-level only)
   */
  static async getPostComments(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const post = await Post.findByPk(postId);
      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      // Get top-level comments only (no parent)
      const { rows: comments, count } = await Comment.findAndCountAll({
        where: {
          postId,
          parentCommentId: null
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: Comment,
            as: 'replies',
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'activeAvatarId']
            }],
            limit: 3, // Show first 3 replies
            order: [['createdAt', 'ASC']],
            separate: true // Prevent cartesian product
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.json({
        comments,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting comments', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to get comments' });
    }
  }

  /**
   * Get replies for a specific comment
   */
  static async getCommentReplies(req: Request, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const comment = await Comment.findByPk(commentId);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      const { rows: replies, count } = await Comment.findAndCountAll({
        where: {
          parentCommentId: commentId
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'activeAvatarId']
        }],
        order: [['createdAt', 'ASC']], // Replies in chronological order
        limit,
        offset
      });

      res.json({
        replies,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting replies', { error, commentId: req.params.commentId });
      res.status(500).json({ error: 'Failed to get replies' });
    }
  }

  /**
   * Update a comment (edit content)
   */
  static async updateComment(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;

      // Validate content
      if (!content || content.trim().length === 0) {
        res.status(400).json({ error: 'Comment content required' });
        return;
      }

      if (content.trim().length > 500) {
        res.status(400).json({ error: 'Comment too long (max 500 characters)' });
        return;
      }

      const comment = await Comment.findByPk(commentId);

      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      // Check ownership
      if (comment.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to edit this comment' });
        return;
      }

      await comment.update({ content: content.trim() });

      logger.info('Comment updated', { commentId, userId });

      res.json({
        message: 'Comment updated',
        comment: {
          id: comment.id,
          content: comment.content,
          updatedAt: comment.updatedAt
        }
      });

    } catch (error) {
      logger.error('Error updating comment', { error, commentId: req.params.commentId });
      res.status(500).json({ error: 'Failed to update comment' });
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(req: AuthRequest, res: Response): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const { commentId } = req.params;
      const userId = req.user!.id;

      const comment = await Comment.findByPk(commentId);

      if (!comment) {
        await transaction.rollback();
        res.status(404).json({ error: 'Comment not found' });
        return;
      }

      // Check ownership
      if (comment.userId !== userId) {
        await transaction.rollback();
        res.status(403).json({ error: 'Not authorized to delete this comment' });
        return;
      }

      const postId = comment.postId;
      const isTopLevel = comment.parentCommentId === null;

      // Delete comment (cascade deletes replies)
      await comment.destroy({ transaction });

      // Decrement comment count (only for top-level comments)
      if (isTopLevel) {
        const post = await Post.findByPk(postId);
        if (post && post.commentsCount > 0) {
          await post.decrement('commentsCount', { transaction });
        }
      }

      await transaction.commit();

      logger.info('Comment deleted', { commentId, userId });

      res.json({ message: 'Comment deleted' });

    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting comment', { error, commentId: req.params.commentId });
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }

  /**
   * Get comment count for a post
   */
  static async getCommentCount(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      const post = await Post.findByPk(postId, {
        attributes: ['id', 'commentsCount']
      });

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      res.json({
        postId: post.id,
        commentsCount: post.commentsCount
      });

    } catch (error) {
      logger.error('Error getting comment count', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to get comment count' });
    }
  }
}
