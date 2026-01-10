import dotenv from 'dotenv';
import { sequelize } from '../config/database';
import { logger } from './logger';
// Import models to register them with Sequelize
import User from '../models/User';
import Post from '../models/Post';
import Follow from '../models/Follow';
import Like from '../models/Like';
import Comment from '../models/Comment';
import PositivityCoins from '../models/PositivityCoins';
import CoinTransaction from '../models/CoinTransaction';
import CoinGivingActivity from '../models/CoinGivingActivity';
import { setupAssociations } from '../models/associations';

// Load environment variables
dotenv.config();

/**
 * Runs database migrations by syncing Sequelize models with the database
 * This will create tables if they don't exist and update schema if needed
 */
async function migrate(): Promise<void> {
  try {
    // Reference models to ensure they're registered with Sequelize
    const models = [User, Post, Follow, Like, Comment, PositivityCoins, CoinTransaction, CoinGivingActivity];
    logger.info(`Starting database migration for ${models.length} models...`);

    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Set up model associations before syncing
    setupAssociations();
    logger.info('Model associations configured');

    // Sync all models with database
    // In production, use proper migrations with sequelize-cli
    // For development, we use sync with alter to update schema
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });

    logger.info('Database migration completed successfully');
    logger.info('Tables created/updated: users, posts, follows, likes, comments, positivity_coins, coin_transactions, coin_giving_activity');

    // Close connection
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed', { error });
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

export default migrate;
