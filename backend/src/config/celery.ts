import { createClient } from 'redis';
import { logger } from '../utils/logger';

/**
 * Celery client for queueing ML processing tasks
 *
 * Note: This is a simplified implementation for Phase 0
 * In production, use a proper Celery Node.js client like node-celery
 * For now, we directly publish to RabbitMQ/Redis
 */

class CeleryClient {
  private redisClient: ReturnType<typeof createClient> | null = null;
  private connected: boolean = false;

  /**
   * Initialize connection to Redis (used as Celery result backend)
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis client error', { error: err });
      });

      await this.redisClient.connect();
      this.connected = true;
      logger.info('Connected to Redis for Celery task results');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  /**
   * Queue an image processing task to the ML service
   *
   * @param taskId - Unique task ID (UUID)
   * @param imageUrl - URL to the uploaded image
   * @param userId - ID of the user who uploaded the image
   * @param avatarId - Avatar style to apply (optional)
   * @returns Task ID
   */
  async queueImageProcessing(
    taskId: string,
    imageUrl: string,
    userId: string,
    avatarId: string = 'default'
  ): Promise<string> {
    if (!this.connected) {
      await this.connect();
    }

    // Store task info in Redis for tracking
    // The actual task will be picked up by ML service's Celery worker
    const taskInfo = {
      task_id: taskId,
      image_url: imageUrl,
      user_id: userId,
      avatar_id: avatarId,
      status: 'PENDING',
      queued_at: new Date().toISOString()
    };

    try {
      // Store task in Redis with a key that Celery expects
      await this.redisClient!.set(
        `celery-task-meta-${taskId}`,
        JSON.stringify(taskInfo),
        { EX: 3600 } // Expire after 1 hour
      );

      logger.info('Queued image processing task', {
        taskId,
        imageUrl,
        userId,
        avatarId
      });

      return taskId;
    } catch (error) {
      logger.error('Failed to queue image processing task', { error, taskId });
      throw error;
    }
  }

  /**
   * Get task status from Redis
   *
   * @param taskId - Task ID to check
   * @returns Task status information
   */
  async getTaskStatus(taskId: string): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const result = await this.redisClient!.get(`celery-task-meta-${taskId}`);

      if (!result) {
        return null;
      }

      return JSON.parse(result);
    } catch (error) {
      logger.error('Failed to get task status', { error, taskId });
      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.redisClient && this.connected) {
      await this.redisClient.quit();
      this.connected = false;
      logger.info('Disconnected from Redis');
    }
  }
}

// Export singleton instance
export const celeryClient = new CeleryClient();

// Initialize connection on module load
celeryClient.connect().catch((error) => {
  logger.warn('Failed to initialize Celery client', { error });
});
