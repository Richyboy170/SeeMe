import { Request, Response } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { PushNotificationService } from '../services/PushNotificationService';

/**
 * User Controller
 * Handles user profile operations
 */
export class UserController {
  /**
   * Get current user's profile
   * @route GET /api/users/me
   */
  static async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const user = await User.findByPk(userId, {
        attributes: [
          'id',
          'username',
          'email',
          'ageVerified',
          'activeAvatarId',
          'positivityGiveCounter',
          'positivityRank',
          'createdAt'
        ]
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          ageVerified: user.ageVerified,
          activeAvatarId: user.activeAvatarId,
          positivityGiveCounter: user.positivityGiveCounter,
          positivityRank: user.positivityRank,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      logger.error('Error getting current user', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  /**
   * Get user profile by ID
   * @route GET /api/users/:userId
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: [
          'id',
          'username',
          'activeAvatarId',
          'positivityGiveCounter',
          'positivityRank',
          'createdAt'
        ]
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          activeAvatarId: user.activeAvatarId,
          positivityGiveCounter: user.positivityGiveCounter,
          positivityRank: user.positivityRank,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      logger.error('Error getting user by ID', { error, userId: req.params.userId });
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  /**
   * Update current user's profile
   * @route PATCH /api/users/me
   */
  static async updateCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { username, activeAvatarId } = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Update allowed fields
      if (username !== undefined) {
        // Check if username is already taken by another user
        const existingUser = await User.findOne({
          where: { username }
        });

        if (existingUser && existingUser.id !== userId) {
          res.status(400).json({ error: 'Username already taken' });
          return;
        }

        user.username = username;
      }

      if (activeAvatarId !== undefined) {
        user.activeAvatarId = activeAvatarId;
      }

      await user.save();

      logger.info('User profile updated', { userId });

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          activeAvatarId: user.activeAvatarId,
          positivityGiveCounter: user.positivityGiveCounter,
          positivityRank: user.positivityRank
        }
      });

    } catch (error) {
      logger.error('Error updating user profile', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  /**
   * Register FCM token for push notifications
   * @route POST /api/users/fcm-token
   */
  static async registerFCMToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { fcmToken } = req.body;

      if (!fcmToken) {
        res.status(400).json({ error: 'FCM token is required' });
        return;
      }

      await PushNotificationService.registerFCMToken(userId, fcmToken);

      logger.info('FCM token registered', { userId });

      res.json({
        success: true,
        message: 'FCM token registered successfully'
      });

    } catch (error) {
      logger.error('Error registering FCM token', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to register FCM token' });
    }
  }

  /**
   * Update notification preferences
   * @route PATCH /api/users/notification-settings
   */
  static async updateNotificationSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { chatNotificationsEnabled } = req.body;

      if (chatNotificationsEnabled === undefined) {
        res.status(400).json({ error: 'chatNotificationsEnabled is required' });
        return;
      }

      await PushNotificationService.updateNotificationPreferences(
        userId,
        chatNotificationsEnabled
      );

      logger.info('Notification settings updated', { userId, chatNotificationsEnabled });

      res.json({
        success: true,
        message: 'Notification settings updated successfully',
        settings: {
          chatNotificationsEnabled
        }
      });

    } catch (error) {
      logger.error('Error updating notification settings', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to update notification settings' });
    }
  }

  /**
   * Get notification settings
   * @route GET /api/users/notification-settings
   */
  static async getNotificationSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const user = await User.findByPk(userId, {
        attributes: ['chatNotificationsEnabled']
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        settings: {
          chatNotificationsEnabled: user.chatNotificationsEnabled
        }
      });

    } catch (error) {
      logger.error('Error getting notification settings', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get notification settings' });
    }
  }
}
