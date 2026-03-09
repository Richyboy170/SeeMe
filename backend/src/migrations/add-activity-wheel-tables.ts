import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-activity-wheel-tables');

  // Create community_activities table
  await queryInterface.createTable('community_activities', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    topic_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'topics', key: 'id' },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    research_basis: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Research/science behind why this activity is beneficial',
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'ai_generated or admin_assigned',
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    completion_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Create activity_completions table
  await queryInterface.createTable('activity_completions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    activity_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'community_activities', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'posts', key: 'id' },
      onDelete: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add post_type and activity_id columns to posts table
  try {
    await queryInterface.addColumn('posts', 'post_type', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'regular',
    });
  } catch (error) {
    logger.info('post_type column may already exist');
  }

  try {
    await queryInterface.addColumn('posts', 'activity_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'community_activities', key: 'id' },
      onDelete: 'SET NULL',
    });
  } catch (error) {
    logger.info('activity_id column may already exist');
  }

  // Indexes
  try {
    await queryInterface.addIndex('community_activities', ['topic_id'], {
      name: 'idx_community_activities_topic',
    });
  } catch (error) {
    logger.info('idx_community_activities_topic may already exist');
  }

  try {
    await queryInterface.addIndex('community_activities', ['completion_count'], {
      name: 'idx_community_activities_popularity',
    });
  } catch (error) {
    logger.info('idx_community_activities_popularity may already exist');
  }

  try {
    await queryInterface.addIndex('activity_completions', ['activity_id', 'user_id'], {
      name: 'idx_activity_completions_activity_user',
    });
  } catch (error) {
    logger.info('idx_activity_completions_activity_user may already exist');
  }

  try {
    await queryInterface.addIndex('activity_completions', ['user_id'], {
      name: 'idx_activity_completions_user',
    });
  } catch (error) {
    logger.info('idx_activity_completions_user may already exist');
  }

  logger.info('Migration completed: add-activity-wheel-tables');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-activity-wheel-tables');

  try {
    await queryInterface.removeColumn('posts', 'activity_id');
  } catch (error) {
    logger.info('activity_id column may not exist');
  }

  try {
    await queryInterface.removeColumn('posts', 'post_type');
  } catch (error) {
    logger.info('post_type column may not exist');
  }

  await queryInterface.dropTable('activity_completions');
  await queryInterface.dropTable('community_activities');

  logger.info('Rollback completed: add-activity-wheel-tables');
}
