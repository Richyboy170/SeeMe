import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-goal-rank-sort-order');

  // Add rank column to goals table
  try {
    await queryInterface.addColumn('goals', 'rank', {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'gold',
    });
    logger.info('Added rank column to goals table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists') || err.message?.includes('Cannot add')) {
      logger.info('rank column already exists on goals, skipping');
    } else {
      throw err;
    }
  }

  // Add sort_order column to goals table
  try {
    await queryInterface.addColumn('goals', 'sort_order', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    logger.info('Added sort_order column to goals table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists') || err.message?.includes('Cannot add')) {
      logger.info('sort_order column already exists on goals, skipping');
    } else {
      throw err;
    }
  }

  logger.info('Migration add-goal-rank-sort-order completed');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-goal-rank-sort-order');

  try {
    await queryInterface.removeColumn('goals', 'sort_order');
  } catch (err) {
    logger.warn('Could not remove sort_order from goals');
  }

  try {
    await queryInterface.removeColumn('goals', 'rank');
  } catch (err) {
    logger.warn('Could not remove rank from goals');
  }

  logger.info('Rollback add-goal-rank-sort-order completed');
}
