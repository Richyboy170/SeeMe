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
  private connectionFailed: boolean = false;

  /**
   * Initialize connection to Redis (used as Celery result backend)
   */
  async connect(): Promise<void> {
    if (this.connected || this.connectionFailed) {
      return;
    }

    // Create a timeout promise to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Redis connection timeout')), 3000);
    });

    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: false,
          connectTimeout: 3000
        }
      });

      // Log error only once, then suppress
      this.redisClient.on('error', (err) => {
        if (!this.connectionFailed) {
          this.connectionFailed = true;
          logger.warn('Celery Redis client error (suppressing further errors)', { error: err });
        }
      });

      // Race between connection and timeout
      await Promise.race([
        this.redisClient.connect(),
        timeoutPromise
      ]);

      this.connected = true;
      logger.info('Connected to Redis for Celery task results');
    } catch (error) {
      this.connectionFailed = true;
      if (this.redisClient) {
        this.redisClient.removeAllListeners();
        try {
          await this.redisClient.disconnect();
        } catch {
          // Ignore
        }
        this.redisClient = null;
      }
      logger.warn('Celery client: Redis unavailable, ML task queueing disabled');
    }
  }

  /**
   * Queue an image processing task to the ML service
   *
   * @param taskId - Unique task ID (UUID)
   * @param imageUrl - URL to the uploaded image
   * @param userId - ID of the user who uploaded the image
   * @param avatarId - Avatar style to apply (optional)
   * @returns Task ID or null if Redis unavailable
   */
  async queueImageProcessing(
    taskId: string,
    imageUrl: string,
    userId: string,
    avatarId: string = 'default'
  ): Promise<string | null> {
    if (!this.connected && !this.connectionFailed) {
      await this.connect();
    }

    if (!this.connected || !this.redisClient) {
      logger.warn('Cannot queue task - Redis unavailable', { taskId });
      return null;
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
      await this.redisClient.set(
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
      return null;
    }
  }

  /**
   * Get task status from Redis
   *
   * @param taskId - Task ID to check
   * @returns Task status information or null
   */
  async getTaskStatus(taskId: string): Promise<any> {
    if (!this.connected && !this.connectionFailed) {
      await this.connect();
    }

    if (!this.connected || !this.redisClient) {
      return null;
    }

    try {
      const result = await this.redisClient.get(`celery-task-meta-${taskId}`);

      if (!result) {
        return null;
      }

      return JSON.parse(result);
    } catch (error) {
      logger.error('Failed to get task status', { error, taskId });
      return null;
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
