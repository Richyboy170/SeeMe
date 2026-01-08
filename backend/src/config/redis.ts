import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

/**
 * Redis client instance for caching and session management
 */
export let redisClient: RedisClientType;

/**
 * Connects to Redis and configures event handlers
 */
export const connectRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 retries');
            return new Error('Redis reconnection limit exceeded');
          }
          return retries * 500; // Exponential backoff
        }
      }
    });

    // Event handlers
    redisClient.on('error', (error) => {
      logger.error('Redis error', { error });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connecting...');
    });

    redisClient.on('ready', () => {
      logger.info('Redis connected and ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection closed');
    });

    // Connect to Redis
    await redisClient.connect();

  } catch (error) {
    logger.error('Redis connection failed', { error });
    throw error;
  }
};

/**
 * Closes the Redis connection gracefully
 */
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      logger.info('Redis disconnected successfully');
    }
  } catch (error) {
    logger.error('Redis disconnection failed', { error });
    throw error;
  }
};
