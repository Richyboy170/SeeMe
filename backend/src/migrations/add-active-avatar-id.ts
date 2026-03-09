import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  try {
    const tableDesc = await queryInterface.describeTable('users');

    if (!tableDesc['activeAvatarId']) {
      await queryInterface.addColumn('users', 'activeAvatarId', {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: null,
      });
      logger.info('Added activeAvatarId column to users table');
    } else {
      logger.info('activeAvatarId column already exists in users table');
    }
  } catch (error) {
    logger.error('Migration failed: add-active-avatar-id', { error });
    throw error;
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'activeAvatarId');
}
