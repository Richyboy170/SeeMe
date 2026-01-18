import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

/**
 * Redis client instance for caching and session management
 */
export let redisClient: RedisClientType | null = null;
export let redisAvailable = false;

// Module-level flag to prevent error spam
let redisErrorLogged = false;

/**
 * Connects to Redis and configures event handlers
 */
export const connectRedis = async (): Promise<void> => {
  // Skip if we've already failed to connect
  if (redisErrorLogged) {
    return;
  }

  let client: ReturnType<typeof createClient> | null = null;

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: false, // Disable automatic reconnection
        connectTimeout: 3000 // 3 second timeout
      }
    });

    // Log error only once to avoid spam, then suppress subsequent errors
    client.on('error', (err) => {
      if (!redisErrorLogged) {
        redisErrorLogged = true;
        logger.error('Redis client error', { error: err });
        logger.warn('Subsequent Redis errors will be suppressed');
      }
    });

    client.on('ready', () => {
      logger.info('Redis connected and ready');
      redisAvailable = true;
    });

    client.on('end', () => {
      redisAvailable = false;
    });

    // Connect to Redis
    await client.connect();
    redisClient = client as RedisClientType;
    redisAvailable = true;
    logger.info('Redis connected successfully');

  } catch (error) {
    redisErrorLogged = true;
    logger.error('Redis connection failed', { error });
    logger.warn('Continuing without Redis - caching features will be unavailable');

    // Clean up the client completely
    if (client) {
      client.removeAllListeners();
      try {
        await client.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }

    redisClient = null;
    redisAvailable = false;
    // Don't throw - allow server to run without Redis
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
    redisClient = null;
    redisAvailable = false;
  } catch (error) {
    logger.error('Redis disconnection failed', { error });
    throw error;
  }
};

/**
 * Helper to safely execute Redis operations
 * Returns null if Redis is unavailable
 */
export const withRedis = async <T>(operation: (client: RedisClientType) => Promise<T>): Promise<T | null> => {
  if (!redisAvailable || !redisClient) {
    return null;
  }
  try {
    return await operation(redisClient);
  } catch {
    return null;
  }
};
