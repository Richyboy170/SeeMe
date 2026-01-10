import { Post, PostStatus } from '../models/Post';
import { logger } from '../utils/logger';
import { FeedController } from '../controllers/FeedController';

/**
 * ML Service
 * Handles communication with the ML processing service
 */

export interface ProcessingCallbackData {
  postId: string;
  success: boolean;
  processedImageUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  metadata?: {
    num_faces?: number;
    processing_time?: number;
    style?: string;
  };
  processingTime?: number;
}

export class MLService {
  /**
   * Handle processing callback from ML service
   * Called when ML service completes processing an image
   */
  static async handleProcessingCallback(data: ProcessingCallbackData): Promise<void> {
    try {
      const post = await Post.findByPk(data.postId);

      if (!post) {
        logger.error('Post not found in callback', { postId: data.postId });
        throw new Error(`Post ${data.postId} not found`);
      }

      if (data.success) {
        // Processing succeeded
        await post.update({
          status: PostStatus.COMPLETED,
          processedImageUrl: data.processedImageUrl,
          thumbnailUrl: data.thumbnailUrl,
          processingCompletedAt: new Date(),
          processingTimeSeconds: data.processingTime,
          facesDetected: data.metadata?.num_faces || null
        });

        logger.info('Post processing completed', {
          postId: data.postId,
          processingTime: data.processingTime
        });

        // Invalidate feed caches since new post is available
        await FeedController.invalidateFeedCache(post.userId);
        await FeedController.invalidateDiscoverCache();

      } else {
        // Processing failed
        await post.update({
          status: PostStatus.FAILED,
          processingError: data.error || 'Unknown processing error',
          processingCompletedAt: new Date()
        });

        logger.error('Post processing failed', {
          postId: data.postId,
          error: data.error
        });
      }

    } catch (error) {
      logger.error('Error handling processing callback', { error, data });
      throw error;
    }
  }

  /**
   * Get processing status for a post
   */
  static async getProcessingStatus(postId: string): Promise<{
    status: string;
    message?: string;
  }> {
    try {
      const post = await Post.findByPk(postId, {
        attributes: ['status', 'processingError']
      });

      if (!post) {
        throw new Error('Post not found');
      }

      return {
        status: post.status,
        message: post.processingError || undefined
      };

    } catch (error) {
      logger.error('Error getting processing status', { error, postId });
      throw error;
    }
  }

  /**
   * Retry failed processing
   */
  static async retryProcessing(postId: string): Promise<void> {
    try {
      const post = await Post.findByPk(postId);

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.status !== PostStatus.FAILED) {
        throw new Error('Can only retry failed posts');
      }

      // Reset post to processing state
      await post.update({
        status: PostStatus.PROCESSING,
        processingError: null,
        processingStartedAt: new Date(),
        processingCompletedAt: null
      });

      logger.info('Post processing retry initiated', { postId });

      // In production, would re-queue the job here
      // await celeryClient.queueImageProcessing(...)

    } catch (error) {
      logger.error('Error retrying processing', { error, postId });
      throw error;
    }
  }

  /**
   * Get processing statistics
   */
  static async getProcessingStats(): Promise<{
    total: number;
    processing: number;
    completed: number;
    failed: number;
    averageProcessingTime: number | null;
  }> {
    try {
      const [total, processing, completed, failed] = await Promise.all([
        Post.count(),
        Post.count({ where: { status: PostStatus.PROCESSING } }),
        Post.count({ where: { status: PostStatus.COMPLETED } }),
        Post.count({ where: { status: PostStatus.FAILED } })
      ]);

      // Calculate average processing time for completed posts
      const completedPosts = await Post.findAll({
        where: { status: PostStatus.COMPLETED },
        attributes: ['processingTimeSeconds']
      });

      let averageProcessingTime: number | null = null;
      if (completedPosts.length > 0) {
        const times = completedPosts
          .filter(p => p.processingTimeSeconds !== null)
          .map(p => p.processingTimeSeconds!);

        if (times.length > 0) {
          averageProcessingTime = times.reduce((a, b) => a + b, 0) / times.length;
        }
      }

      return {
        total,
        processing,
        completed,
        failed,
        averageProcessingTime
      };

    } catch (error) {
      logger.error('Error getting processing stats', { error });
      throw error;
    }
  }
}
