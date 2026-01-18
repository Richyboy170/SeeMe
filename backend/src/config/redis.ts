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

    // Log error only once, then replace with silent handler
    const errorHandler = (err: Error) => {
      if (!redisErrorLogged) {
        redisErrorLogged = true;
        logger.warn('Redis unavailable - caching disabled', { code: (err as any).code || 'UNKNOWN' });
        // Replace with silent handler to prevent future logs
        client?.removeListener('error', errorHandler);
        client?.on('error', () => {});
      }
    };
    client.on('error', errorHandler);

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

  } catch {
    // Error already logged by error handler, just set flag and clean up
    redisErrorLogged = true;

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
