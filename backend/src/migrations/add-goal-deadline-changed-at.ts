import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-goal-deadline-changed-at');

  try {
    await queryInterface.addColumn('goals', 'deadline_changed_at', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    logger.info('Added deadlineChangedAt column to goals table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists') || err.message?.includes('Cannot add')) {
      logger.info('deadline_changed_at column already exists on goals, skipping');
    } else {
      throw err;
    }
  }

  logger.info('Migration add-goal-deadline-changed-at completed');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-goal-deadline-changed-at');

  try {
    await queryInterface.removeColumn('goals', 'deadline_changed_at');
  } catch (err) {
    logger.warn('Could not remove deadlineChangedAt from goals');
  }

  logger.info('Rollback add-goal-deadline-changed-at completed');
}
