import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { User } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Avatar Controller
 * Handles avatar configuration CRUD operations using PostgreSQL
 */
export class AvatarController {
  /**
   * Get all avatars for current user
   * @route GET /api/avatars/me
   */
  static async getMyAvatars(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const avatars = await AvatarConfigSQL.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });

      res.json({
        avatars: avatars.map(avatar => ({
          id: avatar.id,
          name: avatar.name,
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
          isActive: avatar.isActive,
          createdAt: avatar.createdAt,
          updatedAt: avatar.updatedAt,
        })),
      });
    } catch (error: any) {
      logger.error('Error getting user avatars', { message: error?.message, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get avatars' });
    }
  }

  /**
   * Get avatar by ID
   * @route GET /api/avatars/:avatarId
   */
  static async getAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { avatarId } = req.params;

      const avatar = await AvatarConfigSQL.findByPk(avatarId);

      if (!avatar) {
        res.status(404).json({ error: 'Avatar not found' });
        return;
      }

      res.json({
        avatar: {
          id: avatar.id,
          name: avatar.name,
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
          isActive: avatar.isActive,
          createdAt: avatar.createdAt,
          updatedAt: avatar.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error getting avatar', { message: error?.message, avatarId: req.params.avatarId });
      res.status(500).json({ error: 'Failed to get avatar' });
    }
  }

  /**
   * Create a new avatar
   * @route POST /api/avatars
   */
  static async createAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { name, style, customizations } = req.body;

      // Validate required fields
      if (!name || !style) {
        res.status(400).json({ error: 'Name and style are required' });
        return;
      }

      // Validate style
      if (!['cartoon', 'anime', 'minimalist'].includes(style)) {
        res.status(400).json({ error: 'Invalid style. Must be cartoon, anime, or minimalist' });
        return;
      }

      // Check avatar limit per user (max 10)
      const existingCount = await AvatarConfigSQL.count({ where: { userId } });
      if (existingCount >= 10) {
        res.status(400).json({ error: 'Maximum avatar limit (10) reached' });
        return;
      }

      const isFirstAvatar = existingCount === 0;

      const avatar = await AvatarConfigSQL.create({
        userId,
        name: name.trim(),
        style,
        skinTone: customizations?.skinTone || '#FFDBAC',
        eyeColor: customizations?.eyeColor || '#8B4513',
        eyeSize: customizations?.eyeSize || 1.0,
        hairColor: customizations?.hairColor || '#000000',
        hairStyle: customizations?.hairStyle || 'short',
        glasses: customizations?.accessories?.glasses || null,
        hat: customizations?.accessories?.hat || null,
        earrings: customizations?.accessories?.earrings || null,
        isActive: isFirstAvatar,
      });

      // If this is the first avatar, set it as active in user profile
      if (isFirstAvatar) {
        await User.update(
          { activeAvatarId: avatar.id },
          { where: { id: userId } }
        );
      }

      logger.info('Avatar created', { userId, avatarId: avatar.id });

      res.status(201).json({
        avatar: {
          id: avatar.id,
          name: avatar.name,
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
          isActive: avatar.isActive,
          createdAt: avatar.createdAt,
          updatedAt: avatar.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error creating avatar', {
        message: error?.message,
        stack: error?.stack,
        userId: req.user?.id
      });
      res.status(500).json({ error: error?.message || 'Failed to create avatar' });
    }
  }

  /**
   * Update an avatar
   * @route PUT /api/avatars/:avatarId
   */
  static async updateAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { avatarId } = req.params;
      const { name, style, customizations } = req.body;

      const avatar = await AvatarConfigSQL.findOne({
        where: { id: avatarId, userId },
      });

      if (!avatar) {
        res.status(404).json({ error: 'Avatar not found' });
        return;
      }

      // Update fields if provided
      if (name !== undefined) {
        avatar.name = name.trim();
      }

      if (style !== undefined) {
        if (!['cartoon', 'anime', 'minimalist'].includes(style)) {
          res.status(400).json({ error: 'Invalid style. Must be cartoon, anime, or minimalist' });
          return;
        }
        avatar.style = style;
      }

      if (customizations !== undefined) {
        if (customizations.skinTone !== undefined) avatar.skinTone = customizations.skinTone;
        if (customizations.eyeColor !== undefined) avatar.eyeColor = customizations.eyeColor;
        if (customizations.eyeSize !== undefined) avatar.eyeSize = customizations.eyeSize;
        if (customizations.hairColor !== undefined) avatar.hairColor = customizations.hairColor;
        if (customizations.hairStyle !== undefined) avatar.hairStyle = customizations.hairStyle;
        if (customizations.accessories) {
          if (customizations.accessories.glasses !== undefined) avatar.glasses = customizations.accessories.glasses;
          if (customizations.accessories.hat !== undefined) avatar.hat = customizations.accessories.hat;
          if (customizations.accessories.earrings !== undefined) avatar.earrings = customizations.accessories.earrings;
        }
      }

      await avatar.save();

      logger.info('Avatar updated', { userId, avatarId });

      res.json({
        avatar: {
          id: avatar.id,
          name: avatar.name,
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
          isActive: avatar.isActive,
          createdAt: avatar.createdAt,
          updatedAt: avatar.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error updating avatar', { message: error?.message, userId: req.user?.id, avatarId: req.params.avatarId });
      res.status(500).json({ error: 'Failed to update avatar' });
    }
  }

  /**
   * Delete an avatar
   * @route DELETE /api/avatars/:avatarId
   */
  static async deleteAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { avatarId } = req.params;

      const avatar = await AvatarConfigSQL.findOne({
        where: { id: avatarId, userId },
      });

      if (!avatar) {
        res.status(404).json({ error: 'Avatar not found' });
        return;
      }

      const wasActive = avatar.isActive;

      await avatar.destroy();

      // If the deleted avatar was active, set another as active or clear
      if (wasActive) {
        const nextAvatar = await AvatarConfigSQL.findOne({
          where: { userId },
          order: [['createdAt', 'DESC']],
        });

        if (nextAvatar) {
          nextAvatar.isActive = true;
          await nextAvatar.save();
          await User.update(
            { activeAvatarId: nextAvatar.id },
            { where: { id: userId } }
          );
        } else {
          await User.update(
            { activeAvatarId: null },
            { where: { id: userId } }
          );
        }
      }

      logger.info('Avatar deleted', { userId, avatarId });

      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error deleting avatar', { message: error?.message, userId: req.user?.id, avatarId: req.params.avatarId });
      res.status(500).json({ error: 'Failed to delete avatar' });
    }
  }

  /**
   * Set an avatar as active
   * @route POST /api/avatars/:avatarId/activate
   */
  static async activateAvatar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { avatarId } = req.params;

      const avatar = await AvatarConfigSQL.findOne({
        where: { id: avatarId, userId },
      });

      if (!avatar) {
        res.status(404).json({ error: 'Avatar not found' });
        return;
      }

      // Deactivate all other avatars for this user
      await AvatarConfigSQL.update(
        { isActive: false },
        { where: { userId } }
      );

      // Activate this avatar
      avatar.isActive = true;
      await avatar.save();

      // Update user's activeAvatarId
      await User.update(
        { activeAvatarId: avatarId },
        { where: { id: userId } }
      );

      logger.info('Avatar activated', { userId, avatarId });

      res.json({
        success: true,
        avatar: {
          id: avatar.id,
          name: avatar.name,
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
          isActive: avatar.isActive,
          createdAt: avatar.createdAt,
          updatedAt: avatar.updatedAt,
        },
      });
    } catch (error: any) {
      logger.error('Error activating avatar', { message: error?.message, userId: req.user?.id, avatarId: req.params.avatarId });
      res.status(500).json({ error: 'Failed to activate avatar' });
    }
  }
}
