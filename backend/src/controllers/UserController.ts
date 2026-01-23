import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { PushNotificationService } from '../services/PushNotificationService';

// Helper to format avatar data for API response
function formatAvatarForResponse(avatar: AvatarConfigSQL | null) {
  if (!avatar) return null;
  return {
    id: avatar.id,
    style: avatar.style,
    customizations: {
      skinTone: avatar.skinTone,
      eyeColor: avatar.eyeColor,
      eyeSize: avatar.eyeSize,
      hairColor: avatar.hairColor,
      hairStyle: avatar.hairStyle,
      accessories: {
        glasses: avatar.glasses,
        hat: avatar.hat,
        earrings: avatar.earrings,
      },
    },
  };
}

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

      // Fetch active avatar if exists
      let activeAvatar = null;
      if (user.activeAvatarId) {
        const avatar = await AvatarConfigSQL.findByPk(user.activeAvatarId);
        activeAvatar = formatAvatarForResponse(avatar);
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          ageVerified: user.ageVerified,
          activeAvatarId: user.activeAvatarId,
          activeAvatar,
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

      // Fetch active avatar if exists
      let activeAvatar = null;
      if (user.activeAvatarId) {
        const avatar = await AvatarConfigSQL.findByPk(user.activeAvatarId);
        activeAvatar = formatAvatarForResponse(avatar);
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          activeAvatarId: user.activeAvatarId,
          activeAvatar,
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
      const { username, activeAvatarId, isPrivate } = req.body;

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

      if (isPrivate !== undefined) {
        user.isPrivate = isPrivate;
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
          positivityRank: user.positivityRank,
          isPrivate: user.isPrivate
        }
      });

    } catch (error) {
      logger.error('Error updating user profile', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  /**
   * Update privacy settings
   * @route PATCH /api/users/privacy-settings
   */
  static async updatePrivacySettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { isPrivate } = req.body;

      if (isPrivate === undefined) {
        res.status(400).json({ error: 'isPrivate is required' });
        return;
      }

      const user = await User.findByPk(userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      user.isPrivate = isPrivate;
      await user.save();

      logger.info('Privacy settings updated', { userId, isPrivate });

      res.json({
        success: true,
        message: 'Privacy settings updated successfully',
        settings: {
          isPrivate: user.isPrivate
        }
      });

    } catch (error) {
      logger.error('Error updating privacy settings', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to update privacy settings' });
    }
  }

  /**
   * Get privacy settings
   * @route GET /api/users/privacy-settings
   */
  static async getPrivacySettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const user = await User.findByPk(userId, {
        attributes: ['isPrivate']
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        settings: {
          isPrivate: user.isPrivate
        }
      });

    } catch (error) {
      logger.error('Error getting privacy settings', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get privacy settings' });
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

  /**
   * Search users by username
   * @route GET /api/users/search?q=query
   */
  static async searchUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { q, limit = 20, offset = 0 } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length < 1) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const searchQuery = q.trim().toLowerCase();
      const limitNum = Math.min(parseInt(limit as string) || 20, 50);
      const offsetNum = parseInt(offset as string) || 0;

      // Search users by username (excluding current user)
      const users = await User.findAll({
        where: {
          id: { [Op.ne]: userId },
          username: {
            [Op.iLike]: `%${searchQuery}%`
          }
        },
        attributes: [
          'id',
          'username',
          'activeAvatarId',
          'positivityGiveCounter',
          'positivityRank',
          'createdAt'
        ],
        limit: limitNum,
        offset: offsetNum,
        order: [['username', 'ASC']]
      });

      // Get follow status for each user
      const userIds = users.map(u => u.id);
      const followings = await Follow.findAll({
        where: {
          followerId: userId,
          followingId: { [Op.in]: userIds }
        }
      });

      const followingIds = new Set(followings.map(f => f.followingId));

      // Fetch active avatars for all users in search results
      const avatars = await AvatarConfigSQL.findAll({
        where: {
          userId: { [Op.in]: userIds },
          isActive: true,
        },
      });
      const avatarsByUserId = new Map(avatars.map(a => [a.userId, formatAvatarForResponse(a)]));

      const usersWithFollowStatus = users.map(user => ({
        id: user.id,
        username: user.username,
        activeAvatarId: user.activeAvatarId,
        activeAvatar: avatarsByUserId.get(user.id) || null,
        positivityGiveCounter: user.positivityGiveCounter,
        positivityRank: user.positivityRank,
        isFollowing: followingIds.has(user.id)
      }));

      res.json({
        users: usersWithFollowStatus,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: users.length === limitNum
        }
      });

    } catch (error) {
      logger.error('Error searching users', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to search users' });
    }
  }
}
