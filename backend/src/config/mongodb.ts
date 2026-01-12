import mongoose from 'mongoose';
import { logger } from '../utils/logger';

/**
 * Connects to MongoDB using Mongoose
 * Configured with connection pooling and error handling
 */
export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/seeme_db';

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    logger.warn('Continuing without MongoDB - some features may be unavailable');
    // Don't exit - allow server to run without MongoDB
  }
};

/**
 * Closes the MongoDB connection gracefully
 */
export const disconnectMongoDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('MongoDB disconnection failed', { error });
    throw error;
  }
};

export default connectMongoDB;
