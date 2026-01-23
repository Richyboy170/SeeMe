import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

/**
 * Migration: Add privacy settings - isPrivate field and follow_requests table
 * This migration adds support for private profiles and follow requests
 *
 * Run with: npm run migrate
 */

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  try {
    logger.info('Starting migration: add-privacy-settings');

    // Check if isPrivate column already exists in users table
    const tableDescription = await queryInterface.describeTable('users');

    // Add is_private column if it doesn't exist (snake_case for underscored: true config)
    if (!tableDescription.is_private && !tableDescription.isPrivate && !tableDescription.isprivate) {
      logger.info('Adding is_private column to users table');
      await queryInterface.addColumn('users', 'is_private', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the user account is private (requires follow approval)'
      });
      logger.info('is_private column added successfully');
    } else {
      logger.info('is_private column already exists, skipping');
    }

    // Create follow_requests table
    const tables = await queryInterface.showAllTables();
    const tableExists = tables.includes('follow_requests');

    if (!tableExists) {
      logger.info('Creating follow_requests table');
      await queryInterface.createTable('follow_requests', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          comment: 'Unique follow request identifier'
        },
        requester_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE',
          comment: 'ID of the user sending the follow request'
        },
        target_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'CASCADE',
          comment: 'ID of the user receiving the follow request'
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'pending',
          comment: 'Request status: pending, approved, rejected'
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });
      logger.info('follow_requests table created successfully');
    } else {
      logger.info('follow_requests table already exists, skipping');
    }

    logger.info('Migration completed successfully: add-privacy-settings');
  } catch (error) {
    logger.error('Migration failed: add-privacy-settings', { error });
    throw error;
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  try {
    logger.info('Starting rollback: add-privacy-settings');

    // Remove is_private column from users table
    const tableDescription = await queryInterface.describeTable('users');

    if (tableDescription.is_private) {
      logger.info('Removing is_private column from users table');
      await queryInterface.removeColumn('users', 'is_private');
      logger.info('is_private column removed successfully');
    }

    // Drop follow_requests table
    const tables = await queryInterface.showAllTables();
    if (tables.includes('follow_requests')) {
      logger.info('Dropping follow_requests table');
      await queryInterface.dropTable('follow_requests');
      logger.info('follow_requests table dropped successfully');
    }

    logger.info('Rollback completed successfully: add-privacy-settings');
  } catch (error) {
    logger.error('Rollback failed: add-privacy-settings', { error });
    throw error;
  }
};
