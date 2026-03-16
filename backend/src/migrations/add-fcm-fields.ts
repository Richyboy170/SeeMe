import { QueryInterface, DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

/**
 * Migration: Add FCM token and chat notification fields to users table
 * This migration adds support for push notifications
 *
 * Run with: npm run migrate
 */

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  try {
    logger.info('Starting migration: add-fcm-fields');

    const tableDescription = await queryInterface.describeTable('users');

    // Add fcm_token column if it doesn't exist (snake_case for underscored: true)
    if (!tableDescription['fcm_token'] && !tableDescription['fcmToken']) {
      logger.info('Adding fcm_token column to users table');
      await queryInterface.addColumn('users', 'fcm_token', {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Firebase Cloud Messaging token for push notifications'
      });
      logger.info('fcm_token column added successfully');
    } else {
      logger.info('fcm_token column already exists, skipping');
    }

    // Add chat_notifications_enabled column if it doesn't exist
    if (!tableDescription['chat_notifications_enabled'] && !tableDescription['chatNotificationsEnabled']) {
      logger.info('Adding chat_notifications_enabled column to users table');
      await queryInterface.addColumn('users', 'chat_notifications_enabled', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether user wants to receive chat push notifications'
      });
      logger.info('chat_notifications_enabled column added successfully');
    } else {
      logger.info('chat_notifications_enabled column already exists, skipping');
    }

    logger.info('Migration completed successfully: add-fcm-fields');
  } catch (error) {
    logger.error('Migration failed: add-fcm-fields', { error });
    throw error;
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  try {
    logger.info('Starting rollback: add-fcm-fields');

    const tableDescription = await queryInterface.describeTable('users');

    if (tableDescription['fcm_token']) {
      logger.info('Removing fcm_token column from users table');
      await queryInterface.removeColumn('users', 'fcm_token');
      logger.info('fcm_token column removed successfully');
    }

    if (tableDescription['chat_notifications_enabled']) {
      logger.info('Removing chat_notifications_enabled column from users table');
      await queryInterface.removeColumn('users', 'chat_notifications_enabled');
      logger.info('chat_notifications_enabled column removed successfully');
    }

    logger.info('Rollback completed successfully: add-fcm-fields');
  } catch (error) {
    logger.error('Rollback failed: add-fcm-fields', { error });
    throw error;
  }
};
