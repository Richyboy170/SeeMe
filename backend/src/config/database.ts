import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';
import path from 'path';

/**
 * Database connection using Sequelize ORM
 * Uses PostgreSQL in production, SQLite in development fallback
 */

// Check if PostgreSQL is available by trying to connect
const usePostgres = process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_USER);
const useSQLiteFallback = process.env.USE_SQLITE === 'true' || !usePostgres;

export const sequelize = useSQLiteFallback
  ? new Sequelize({
      dialect: 'sqlite',
      storage: process.env.NODE_ENV === 'test' ? ':memory:' : path.join(process.cwd(), 'data', 'seeme.db'),
      logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    })
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'seeme_db',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    });

/**
 * Tests the database connection and logs the result
 */
export const connectPostgreSQL = async (): Promise<void> => {
  try {
    await sequelize.authenticate();

    // Sync database schema (creates tables if they don't exist)
    await sequelize.sync({ alter: useSQLiteFallback });

    // Import setupAssociations here to avoid circular dependency
    // This ensures all models are initialized before setting up associations
    const { setupAssociations } = await import('../models/associations');
    setupAssociations();

    if (useSQLiteFallback) {
      logger.info('SQLite database connected successfully', {
        storage: path.join(process.cwd(), 'data', 'seeme.db')
      });
    } else {
      logger.info('PostgreSQL connected successfully', {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME
      });
    }
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw error;
  }
};

/**
 * Closes the database connection gracefully
 */
export const disconnectPostgreSQL = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info('PostgreSQL disconnected successfully');
  } catch (error) {
    logger.error('PostgreSQL disconnection failed', { error });
    throw error;
  }
};
