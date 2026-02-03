import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

/**
 * Migration to create reposts table for repost/quote functionality
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-reposts-table');

  // Create reposts table
  await queryInterface.createTable('reposts', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    original_post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'repost'
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
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

  // Add unique constraint to prevent duplicate reposts
  try {
    await queryInterface.addIndex('reposts', ['user_id', 'original_post_id'], {
      unique: true,
      name: 'idx_repost_user_post_unique'
    });
  } catch (error) {
    logger.info('idx_repost_user_post_unique index may already exist');
  }

  // Add index for querying reposts by post
  try {
    await queryInterface.addIndex('reposts', ['original_post_id'], {
      name: 'idx_reposts_post'
    });
  } catch (error) {
    logger.info('idx_reposts_post index may already exist');
  }

  // Add index for querying reposts by user
  try {
    await queryInterface.addIndex('reposts', ['user_id'], {
      name: 'idx_reposts_user'
    });
  } catch (error) {
    logger.info('idx_reposts_user index may already exist');
  }

  // Add repost_count column to posts table
  try {
    await queryInterface.addColumn('posts', 'repost_count', {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    });
  } catch (error) {
    // Column might already exist
    logger.info('repost_count column may already exist');
  }

  logger.info('Migration completed: add-reposts-table');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-reposts-table');

  // Remove repost_count from posts
  try {
    await queryInterface.removeColumn('posts', 'repost_count');
  } catch (error) {
    logger.info('repost_count column may not exist');
  }

  // Drop the reposts table
  await queryInterface.dropTable('reposts');

  logger.info('Rollback completed: add-reposts-table');
}
