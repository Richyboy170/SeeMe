import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-goals-tables');

  // Create goals table
  await queryInterface.createTable('goals', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    is_visible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    posts_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
  }).catch((err: any) => {
    if (err.message?.includes('already exists')) {
      logger.info('goals table already exists, skipping');
    } else {
      throw err;
    }
  });

  // Add goal_id column to posts table
  try {
    await queryInterface.addColumn('posts', 'goal_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'goals', key: 'id' },
      onDelete: 'SET NULL',
    });
    logger.info('Added goal_id column to posts table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
      logger.info('goal_id column already exists on posts, skipping');
    } else {
      throw err;
    }
  }

  // Add goal_visible column to posts table (per-post visibility override)
  try {
    await queryInterface.addColumn('posts', 'goal_visible', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
    });
    logger.info('Added goal_visible column to posts table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists')) {
      logger.info('goal_visible column already exists on posts, skipping');
    } else {
      throw err;
    }
  }

  // Add is_completed column to goals table (allowNull true for SQLite compat with existing rows)
  try {
    await queryInterface.addColumn('goals', 'is_completed', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
    logger.info('Added is_completed column to goals table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists') || err.message?.includes('Cannot add')) {
      logger.info('is_completed column already exists on goals, skipping');
    } else {
      throw err;
    }
  }

  // Add show_on_profile column to goals table
  try {
    await queryInterface.addColumn('goals', 'show_on_profile', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
    logger.info('Added show_on_profile column to goals table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists') || err.message?.includes('Cannot add')) {
      logger.info('show_on_profile column already exists on goals, skipping');
    } else {
      throw err;
    }
  }

  // Add completed_at column to goals table
  try {
    await queryInterface.addColumn('goals', 'completed_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    logger.info('Added completed_at column to goals table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists') || err.message?.includes('Cannot add')) {
      logger.info('completed_at column already exists on goals, skipping');
    } else {
      throw err;
    }
  }

  logger.info('Migration add-goals-tables completed');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-goals-tables');

  try {
    await queryInterface.removeColumn('goals', 'completed_at');
  } catch (err) {
    logger.warn('Could not remove completed_at from goals');
  }

  try {
    await queryInterface.removeColumn('goals', 'show_on_profile');
  } catch (err) {
    logger.warn('Could not remove show_on_profile from goals');
  }

  try {
    await queryInterface.removeColumn('goals', 'is_completed');
  } catch (err) {
    logger.warn('Could not remove is_completed from goals');
  }

  try {
    await queryInterface.removeColumn('posts', 'goal_visible');
  } catch (err) {
    logger.warn('Could not remove goal_visible from posts');
  }

  try {
    await queryInterface.removeColumn('posts', 'goal_id');
  } catch (err) {
    logger.warn('Could not remove goal_id from posts');
  }

  await queryInterface.dropTable('goals').catch(() => {
    logger.warn('Could not drop goals table');
  });

  logger.info('Rollback add-goals-tables completed');
}
