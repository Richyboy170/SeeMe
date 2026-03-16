import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

export async function up(queryInterface: QueryInterface): Promise<void> {
  logger.info('Running migration: add-user-wheel-selections');

  await queryInterface.createTable('user_wheel_selections', {
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
    activity_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'community_activities', key: 'id' },
      onDelete: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Unique: a user can only select an activity once
  try {
    await queryInterface.addIndex('user_wheel_selections', ['user_id', 'activity_id'], {
      name: 'idx_user_wheel_selections_unique',
      unique: true,
    });
  } catch (error) {
    logger.info('idx_user_wheel_selections_unique may already exist');
  }

  try {
    await queryInterface.addIndex('user_wheel_selections', ['user_id'], {
      name: 'idx_user_wheel_selections_user',
    });
  } catch (error) {
    logger.info('idx_user_wheel_selections_user may already exist');
  }

  logger.info('Migration completed: add-user-wheel-selections');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  logger.info('Rolling back migration: add-user-wheel-selections');
  await queryInterface.dropTable('user_wheel_selections');
  logger.info('Rollback completed: add-user-wheel-selections');
}
