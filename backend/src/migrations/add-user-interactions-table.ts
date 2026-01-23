import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

/**
 * Migration: Create user_interactions table for feed algorithm
 * This migration adds support for tracking user engagement
 *
 * Run with: npm run migrate
 */

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  try {
    logger.info('Starting migration: add-user-interactions-table');

    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('user_interactions');

    if (!tableExists) {
      logger.info('Creating user_interactions table');

      await queryInterface.createTable('user_interactions', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'userId',
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE',
        },
        targetUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'targetUserId',
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE',
        },
        targetPostId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'targetPostId',
          references: {
            model: 'posts',
            key: 'id'
          },
          onDelete: 'CASCADE',
        },
        interactionType: {
          type: DataTypes.STRING(20),
          allowNull: false,
          field: 'interactionType',
        },
        weight: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 1,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      logger.info('user_interactions table created successfully');
    } else {
      logger.info('user_interactions table already exists, skipping');
    }

    logger.info('Migration completed successfully: add-user-interactions-table');
  } catch (error) {
    logger.error('Migration failed: add-user-interactions-table', { error });
    throw error;
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  try {
    logger.info('Starting rollback: add-user-interactions-table');

    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('user_interactions');

    if (tableExists) {
      logger.info('Dropping user_interactions table');
      await queryInterface.dropTable('user_interactions');
      logger.info('user_interactions table dropped successfully');
    }

    logger.info('Rollback completed successfully: add-user-interactions-table');
  } catch (error) {
    logger.error('Rollback failed: add-user-interactions-table', { error });
    throw error;
  }
};
