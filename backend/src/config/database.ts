import { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';
import { setupAssociations } from '../models/associations';

/**
 * PostgreSQL database connection using Sequelize ORM
 * Configured with connection pooling for optimal performance
 */
export const sequelize = new Sequelize({
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

    // Set up model associations
    setupAssociations();

    logger.info('PostgreSQL connected successfully', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME
    });
  } catch (error) {
    logger.error('PostgreSQL connection failed', { error });
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
