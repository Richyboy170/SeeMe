import { Request, Response } from 'express';
import { Post, PostStatus, PostVisibility } from '../models/Post';
import { User } from '../models/User';
import { Topic } from '../models/Topic';
import { PostTopic } from '../models/PostTopic';
import { S3Service } from '../services/S3Service';
import { CoinsService } from '../services/CoinsService';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ImageProcessor } from '../utils/imageProcessing';
import { v4 as uuidv4 } from 'uuid';
import { celeryClient } from '../config/celery';
import { FeedController } from './FeedController';

/**
 * Post Controller
 * Handles all post-related operations
 */
export class PostController {
  /**
   * Create a new post with image upload
   */
  static async createPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { caption, visibility, topicIds } = req.body;
      const userId = req.user!.id;

      // Validate visibility
      const validVisibility = visibility && Object.values(PostVisibility).includes(visibility)
        ? visibility as PostVisibility
        : PostVisibility.FRIENDS_ONLY;

      // Parse topicIds if it's a string (from FormData)
      let parsedTopicIds: string[] = [];
      if (topicIds) {
        try {
          parsedTopicIds = typeof topicIds === 'string' ? JSON.parse(topicIds) : topicIds;
        } catch {
          parsedTopicIds = [];
        }
      }

      // Validate that topics are selected when visibility requires them
      if (validVisibility !== PostVisibility.FRIENDS_ONLY && parsedTopicIds.length === 0) {
        res.status(400).json({ error: 'Please select at least one topic for community posts' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Image file required' });
        return;
      }

      // Validate image
      const validation = await ImageProcessor.validateImage(req.file.buffer);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      // Get user's active avatar
      const user = await User.findByPk(userId);
      const avatarId = user?.activeAvatarId || 'default';

      // Get image dimensions
      const metadata = validation.metadata!;
      const imageWidth = metadata.width;
      const imageHeight = metadata.height;

      // Optimize image
      const optimizedBuffer = await ImageProcessor.optimizeImage(req.file.buffer);

      // Upload original image
      const originalKey = `originals/${userId}/${uuidv4()}.jpg`;
      const originalUrl = await S3Service.uploadImage(
        optimizedBuffer,
        originalKey,
        'image/jpeg'
      );

      // Create post record
      const post = await Post.create({
        userId,
        originalImageUrl: originalUrl,
        caption: caption || null,
        status: PostStatus.PROCESSING,
        visibility: validVisibility,
        avatarId,
        imageWidth,
        imageHeight,
        processingStartedAt: new Date()
      });

      logger.info('Post created', { postId: post.id, userId, visibility: validVisibility });

      // Create PostTopic associations if topics are selected
      if (parsedTopicIds.length > 0) {
        const postTopicRecords = parsedTopicIds.map(topicId => ({
          postId: post.id,
          topicId
        }));
        await PostTopic.bulkCreate(postTopicRecords);

        // Update topic post counts
        await Topic.increment('postCount', {
          by: 1,
          where: { id: parsedTopicIds }
        });

        logger.info('Post associated with topics', { postId: post.id, topicIds: parsedTopicIds });
      }

      // Check if post is "meaningful" (has caption with >20 chars) and award coins
      let coinsEarned = 0;
      if (caption && caption.trim().length >= 20) {
        try {
          coinsEarned = await CoinsService.awardCoinsForPost(userId, post.id);
          logger.info('Coins awarded for meaningful post', { userId, postId: post.id, coinsEarned });

          // TODO: Send notification to user about coins earned
          // await NotificationService.sendNotification(userId, {
          //   type: 'coins_earned',
          //   title: 'Coins Earned! 🎉',
          //   body: 'You earned 2 coins for your meaningful post!',
          //   data: { coinsEarned }
          // });
        } catch (error) {
          logger.error('Failed to award coins for post', { error, userId, postId: post.id });
          // Don't fail post creation if coin awarding fails
        }
      }

      // Queue ML processing job
      try {
        const taskId = uuidv4();
        const queueResult = await celeryClient.queueImageProcessing(
          taskId,
          originalUrl,
          userId,
          avatarId
        );

        if (queueResult) {
          logger.info('ML processing task queued', { postId: post.id, taskId });
        } else {
          logger.warn('ML service unavailable, will auto-complete post', { postId: post.id });
        }

        // Auto-complete post if ML service is unavailable (queueResult is null)
        // or in development mode with fallback enabled
        const shouldAutoComplete = !queueResult ||
          (process.env.NODE_ENV === 'development' && process.env.ML_DEVELOPMENT_FALLBACK === 'true');

        if (shouldAutoComplete) {
          // Auto-complete immediately since ML service is unavailable
          setTimeout(async () => {
            try {
              const checkPost = await Post.findByPk(post.id);
              if (checkPost && checkPost.status === PostStatus.PROCESSING) {
                await checkPost.update({
                  status: PostStatus.COMPLETED,
                  processedImageUrl: originalUrl,
                  thumbnailUrl: originalUrl,
                  processingCompletedAt: new Date(),
                  processingTimeSeconds: 0
                });
                logger.info('Post auto-completed (ML service unavailable)', { postId: post.id });
              }
            } catch (err) {
              logger.error('Failed to auto-complete post', { error: err, postId: post.id });
            }
          }, 2000); // Short delay then complete
        }

        res.status(201).json({
          postId: post.id,
          status: 'processing',
          message: 'Post created, processing avatar...',
          estimatedTime: 10, // seconds
          coinsEarned
        });

      } catch (error) {
        // If queueing fails, mark post as failed
        await post.update({
          status: PostStatus.FAILED,
          processingError: 'Failed to queue processing task'
        });

        logger.error('Failed to queue ML processing', { error, postId: post.id });
        res.status(500).json({ error: 'Failed to queue image processing' });
      }

    } catch (error) {
      logger.error('Error creating post', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to create post' });
    }
  }

  /**
   * Get post by ID
   */
  static async getPost(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      const post = await Post.findByPk(postId, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'activeAvatarId']
        }]
      });

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      res.json({
        id: post.id,
        user: post.get('user'),
        imageUrl: post.processedImageUrl || post.originalImageUrl,
        thumbnailUrl: post.thumbnailUrl,
        caption: post.caption,
        status: post.status,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt
      });

    } catch (error) {
      logger.error('Error getting post', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to get post' });
    }
  }

  /**
   * Get post processing status
   */
  static async getPostStatus(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      const post = await Post.findByPk(postId, {
        attributes: [
          'id', 'status', 'processedImageUrl', 'thumbnailUrl',
          'processingError', 'processingTimeSeconds', 'processingStartedAt',
          'processingCompletedAt'
        ]
      });

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      res.json({
        postId: post.id,
        status: post.status,
        processedImageUrl: post.processedImageUrl,
        thumbnailUrl: post.thumbnailUrl,
        error: post.processingError,
        processingTime: post.processingTimeSeconds,
        processingStartedAt: post.processingStartedAt,
        processingCompletedAt: post.processingCompletedAt
      });

    } catch (error) {
      logger.error('Error getting post status', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to get status' });
    }
  }

  /**
   * Update post (edit caption)
   */
  static async updatePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const { caption } = req.body;
      const userId = req.user!.id;

      const post = await Post.findByPk(postId);

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      if (post.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to edit this post' });
        return;
      }

      await post.update({ caption });

      logger.info('Post updated', { postId, userId });

      res.json({
        message: 'Post updated successfully',
        post: {
          id: post.id,
          caption: post.caption,
          updatedAt: post.updatedAt
        }
      });

    } catch (error) {
      logger.error('Error updating post', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to update post' });
    }
  }

  /**
   * Delete post
   */
  static async deletePost(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const userId = req.user!.id;

      const post = await Post.findByPk(postId);

      if (!post) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }

      if (post.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to delete this post' });
        return;
      }

      // Delete images from storage
      if (post.originalImageUrl) {
        await S3Service.deleteImage(post.originalImageUrl);
      }
      if (post.processedImageUrl) {
        await S3Service.deleteImage(post.processedImageUrl);
      }
      if (post.thumbnailUrl) {
        await S3Service.deleteImage(post.thumbnailUrl);
      }

      await post.destroy();

      // Invalidate feed caches
      await FeedController.invalidateFeedCache(userId);
      await FeedController.invalidateDiscoverCache();

      logger.info('Post deleted', { postId, userId });

      res.json({ message: 'Post deleted successfully' });

    } catch (error) {
      logger.error('Error deleting post', { error, postId: req.params.postId });
      res.status(500).json({ error: 'Failed to delete post' });
    }
  }

  /**
   * Get user's posts
   */
  static async getUserPosts(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      // Find user by username
      const user = await User.findOne({ where: { username } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const { rows: posts, count } = await Post.findAndCountAll({
        where: {
          userId: user.id,
          status: PostStatus.COMPLETED // Only show completed posts
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        attributes: [
          'id', 'processedImageUrl', 'thumbnailUrl', 'caption',
          'likesCount', 'commentsCount', 'createdAt'
        ]
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          activeAvatarId: user.activeAvatarId
        },
        posts,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting user posts', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to get posts' });
    }
  }

  /**
   * Get all posts (feed)
   */
  static async getAllPosts(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

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
          'id', 'processedImageUrl', 'thumbnailUrl', 'caption',
          'likesCount', 'commentsCount', 'createdAt'
        ]
      });

      res.json({
        posts: posts.map(post => ({
          id: post.id,
          user: post.get('user'),
          imageUrl: post.processedImageUrl,
          thumbnailUrl: post.thumbnailUrl,
          caption: post.caption,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          createdAt: post.createdAt
        })),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting all posts', { error });
      res.status(500).json({ error: 'Failed to get posts' });
    }
  }

  /**
   * Get user's own posts (including processing ones)
   */
  static async getMyPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const { rows: posts, count } = await Post.findAndCountAll({
        where: {
          userId
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        attributes: [
          'id', 'originalImageUrl', 'processedImageUrl', 'thumbnailUrl',
          'caption', 'status', 'processingError', 'likesCount', 'commentsCount',
          'createdAt', 'processingStartedAt', 'processingCompletedAt'
        ]
      });

      res.json({
        posts,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting my posts', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get posts' });
    }
  }
}
