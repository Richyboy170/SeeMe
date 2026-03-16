import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-user-interests');

  try {
    await queryInterface.addColumn('users', 'interests', {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of category IDs the user is interested in',
    });
    logger.info('Added interests column to users table');
  } catch (err: any) {
    if (err.message?.includes('duplicate column') || err.message?.includes('already exists') || err.message?.includes('Cannot add')) {
      logger.info('interests column already exists on users, skipping');
    } else {
      throw err;
    }
  }

  logger.info('Migration add-user-interests completed');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-user-interests');

  try {
    await queryInterface.removeColumn('users', 'interests');
  } catch (err) {
    logger.warn('Could not remove interests from users');
  }

  logger.info('Rollback add-user-interests completed');
}
