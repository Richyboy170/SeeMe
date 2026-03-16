import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    const tableDesc = await queryInterface.describeTable('users');

    if (!tableDesc['active_avatar_id'] && !tableDesc['activeAvatarId']) {
      await queryInterface.addColumn('users', 'active_avatar_id', {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null,
      });
      logger.info('Added active_avatar_id column to users table');
    } else {
      logger.info('active_avatar_id column already exists in users table');
    }
  } catch (error) {
    logger.error('Migration failed: add-active-avatar-id', { error });
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'active_avatar_id');
}
