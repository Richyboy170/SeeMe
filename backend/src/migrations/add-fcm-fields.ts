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

    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('users');

    // Add fcmToken column if it doesn't exist
    if (!tableDescription.fcmToken) {
      logger.info('Adding fcmToken column to users table');
      await queryInterface.addColumn('users', 'fcmToken', {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Firebase Cloud Messaging token for push notifications'
      });
      logger.info('fcmToken column added successfully');
    } else {
      logger.info('fcmToken column already exists, skipping');
    }

    // Add chatNotificationsEnabled column if it doesn't exist
    if (!tableDescription.chatNotificationsEnabled) {
      logger.info('Adding chatNotificationsEnabled column to users table');
      await queryInterface.addColumn('users', 'chatNotificationsEnabled', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether user wants to receive chat push notifications'
      });
      logger.info('chatNotificationsEnabled column added successfully');
    } else {
      logger.info('chatNotificationsEnabled column already exists, skipping');
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

    // Remove fcmToken column
    const tableDescription = await queryInterface.describeTable('users');

    if (tableDescription.fcmToken) {
      logger.info('Removing fcmToken column from users table');
      await queryInterface.removeColumn('users', 'fcmToken');
      logger.info('fcmToken column removed successfully');
    }

    if (tableDescription.chatNotificationsEnabled) {
      logger.info('Removing chatNotificationsEnabled column from users table');
      await queryInterface.removeColumn('users', 'chatNotificationsEnabled');
      logger.info('chatNotificationsEnabled column removed successfully');
    }

    logger.info('Rollback completed successfully: add-fcm-fields');
  } catch (error) {
    logger.error('Rollback failed: add-fcm-fields', { error });
    throw error;
  }
};
