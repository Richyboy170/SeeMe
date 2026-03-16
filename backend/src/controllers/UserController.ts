import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { PositivityCoins } from '../models/PositivityCoins';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { PushNotificationService } from '../services/PushNotificationService';
import { sequelize } from '../config/database';
import { S3Service } from '../services/S3Service';
import { ImageProcessor } from '../utils/imageProcessing';
import { v4 as uuidv4 } from 'uuid';
import { formatAvatarForResponse } from '../utils/formatAvatar';

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
          'avatarUrl',
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

      // Fetch active avatar: try activeAvatarId first, fallback to isActive
      let activeAvatar = null;
      if (user.activeAvatarId) {
        const avatar = await AvatarConfigSQL.findByPk(user.activeAvatarId);
        activeAvatar = formatAvatarForResponse(avatar);
      }
      if (!activeAvatar) {
        const fallback = await AvatarConfigSQL.findOne({
          where: { userId: user.id, isActive: true }
        });
        if (fallback) activeAvatar = formatAvatarForResponse(fallback);
      }

      // Fetch coins received from other users, followers count, and following count
      const [positivityCoins, followersCount, followingCount] = await Promise.all([
        PositivityCoins.findByPk(userId),
        Follow.count({ where: { followingId: userId } }),
        Follow.count({ where: { followerId: userId } })
      ]);
      const positivityReceiveCounter = positivityCoins?.coinsFromOther || 0;

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          ageVerified: user.ageVerified,
          avatarUrl: user.avatarUrl,
          activeAvatarId: user.activeAvatarId,
          activeAvatar,
          positivityGiveCounter: user.positivityGiveCounter,
          positivityReceiveCounter,
          positivityRank: user.positivityRank,
          followersCount,
          followingCount,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      logger.error('Error getting current user', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  /**
   * Get user profile by ID or username
   * @route GET /api/users/:userId
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Check if it's a UUID or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      let user;
      if (isUUID) {
        user = await User.findByPk(userId, {
          attributes: [
            'id',
            'username',
            'avatarUrl',
            'activeAvatarId',
            'positivityGiveCounter',
            'positivityRank',
            'createdAt'
          ]
        });
      } else {
        // Search by username
        user = await User.findOne({
          where: { username: userId },
          attributes: [
            'id',
            'username',
            'avatarUrl',
            'activeAvatarId',
            'positivityGiveCounter',
            'positivityRank',
            'createdAt'
          ]
        });
      }

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Fetch active avatar: try activeAvatarId first, fallback to isActive
      let activeAvatar = null;
      if (user.activeAvatarId) {
        const avatar = await AvatarConfigSQL.findByPk(user.activeAvatarId);
        activeAvatar = formatAvatarForResponse(avatar);
      }
      if (!activeAvatar) {
        const fallback = await AvatarConfigSQL.findOne({
          where: { userId: user.id, isActive: true }
        });
        if (fallback) activeAvatar = formatAvatarForResponse(fallback);
      }

      // Fetch coins received from other users, followers count, and following count
      const [positivityCoins, followersCount, followingCount] = await Promise.all([
        PositivityCoins.findByPk(user.id),
        Follow.count({ where: { followingId: user.id } }),
        Follow.count({ where: { followerId: user.id } })
      ]);
      const positivityReceiveCounter = positivityCoins?.coinsFromOther || 0;

      res.json({
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          activeAvatarId: user.activeAvatarId,
          activeAvatar,
          positivityGiveCounter: user.positivityGiveCounter,
          positivityReceiveCounter,
          positivityRank: user.positivityRank,
          followersCount,
          followingCount,
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
      const { username, activeAvatarId, isPrivate, clearActiveAvatar } = req.body;

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

      if (clearActiveAvatar) {
        // Deactivate custom avatar to show profile photo instead
        const { AvatarConfigSQL } = await import('../models/AvatarConfigSQL');
        await AvatarConfigSQL.update(
          { isActive: false },
          { where: { userId, isActive: true } }
        );
        user.activeAvatarId = null;
      } else if (activeAvatarId !== undefined) {
        // Keep isActive flag in sync with activeAvatarId
        const { AvatarConfigSQL } = await import('../models/AvatarConfigSQL');
        if (activeAvatarId) {
          await AvatarConfigSQL.update({ isActive: false }, { where: { userId } });
          await AvatarConfigSQL.update({ isActive: true }, { where: { id: activeAvatarId, userId } });
        } else {
          await AvatarConfigSQL.update({ isActive: false }, { where: { userId } });
        }
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
          avatarUrl: user.avatarUrl,
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

      // Use iLike for PostgreSQL (case-insensitive), like for SQLite (case-insensitive by default)
      const dialect = sequelize.getDialect();
      const likeOp = dialect === 'postgres' ? Op.iLike : Op.like;

      // Search users by username (excluding current user)
      const users = await User.findAll({
        where: {
          id: { [Op.ne]: userId },
          username: {
            [likeOp]: `%${searchQuery}%`
          }
        },
        attributes: [
          'id',
          'username',
          'avatarUrl',
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
        avatarUrl: user.avatarUrl,
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

  /**
   * Upload profile image
   * @route POST /api/users/me/avatar
   */
  static async uploadProfileImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Validate image
      const validation = await ImageProcessor.validateImage(file.buffer);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      // Optimize image
      const optimizedBuffer = await ImageProcessor.optimizeImage(file.buffer);

      // Upload to storage
      const key = `avatars/${userId}/${uuidv4()}.jpg`;
      const avatarUrl = await S3Service.uploadImage(optimizedBuffer, key, 'image/jpeg');

      // Delete old avatar image if it exists
      if (user.avatarUrl) {
        try {
          await S3Service.deleteImage(user.avatarUrl);
        } catch (err) {
          logger.warn('Failed to delete old avatar image', { err });
        }
      }

      // Deactivate custom avatar so the uploaded photo is shown
      if (user.activeAvatarId) {
        const { AvatarConfigSQL } = await import('../models/AvatarConfigSQL');
        await AvatarConfigSQL.update(
          { isActive: false },
          { where: { userId, isActive: true } }
        );
        user.activeAvatarId = null;
      }

      // Update user record
      user.avatarUrl = avatarUrl;
      await user.save();

      logger.info('Profile image uploaded', { userId });

      res.json({
        success: true,
        avatarUrl: user.avatarUrl,
        activeAvatarCleared: true
      });

    } catch (error) {
      logger.error('Error uploading profile image', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to upload profile image' });
    }
  }

  /**
   * Get current user's interests
   * @route GET /api/users/me/interests
   */
  static async getInterests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await User.findByPk(userId, { attributes: ['interests'] });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      let interests: string[] = [];
      if (user.interests) {
        try {
          interests = JSON.parse(user.interests);
        } catch {
          interests = [];
        }
      }

      res.json({ success: true, interests });
    } catch (error) {
      logger.error('Error fetching interests', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to fetch interests' });
    }
  }

  /**
   * Update current user's interests
   * @route PUT /api/users/me/interests
   */
  static async updateInterests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { interests } = req.body;

      if (!Array.isArray(interests)) {
        res.status(400).json({ error: 'Interests must be an array of category IDs' });
        return;
      }

      const validCategories = ['creative', 'hobbies', 'lifestyle', 'fitness', 'learning', 'tech'];
      const filtered = interests.filter((i: string) => validCategories.includes(i));

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      user.interests = filtered.length > 0 ? JSON.stringify(filtered) : null;
      await user.save();

      res.json({ success: true, interests: filtered });
    } catch (error) {
      logger.error('Error updating interests', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to update interests' });
    }
  }
}
