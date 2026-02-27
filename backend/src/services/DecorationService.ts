import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { PostDecoration } from '../models/PostDecoration';
import { UserDecoration } from '../models/UserDecoration';
import { UserActiveDecoration } from '../models/UserActiveDecoration';
import { PositivityCoins } from '../models/PositivityCoins';
import { logger } from '../utils/logger';
import { CornerIconService, CornerIconPlacementData } from './CornerIconService';

/**
 * Resolved decoration style data for a single user.
 * Values are parsed JSON from PostDecoration.styleData.
 */
interface ResolvedDecoration {
  lightBackground: Record<string, unknown> | null;
  darkBackground: Record<string, unknown> | null;
  frame: Record<string, unknown> | null;
  iconColors: Record<string, unknown> | null;
  cornerIcons: CornerIconPlacementData[] | null;
}

/**
 * Slot configuration for setting active decorations
 */
interface ActiveDecorationConfig {
  lightBackgroundId?: string | null;
  darkBackgroundId?: string | null;
  frameId?: string | null;
  iconColorId?: string | null;
}

/**
 * Category-to-slot mapping for validation
 */
const SLOT_CATEGORY_MAP: Record<string, string> = {
  lightBackgroundId: 'background',
  darkBackgroundId: 'background',
  frameId: 'frame',
  iconColorId: 'icon_color'
};

/**
 * Slot-to-themeMode mapping for background validation
 */
const SLOT_THEME_MAP: Record<string, string> = {
  lightBackgroundId: 'light',
  darkBackgroundId: 'dark'
};

/**
 * DecorationService - Handles all decoration store business logic
 */
export class DecorationService {
  /**
   * Get store items, optionally filtered by category
   */
  static async getStoreItems(category?: string): Promise<PostDecoration[]> {
    try {
      const whereClause: any = { isActive: true };

      if (category) {
        whereClause.category = category;
      }

      const items = await PostDecoration.findAll({
        where: whereClause,
        order: [['previewOrder', 'ASC']]
      });

      logger.info('Store items retrieved', { category: category || 'all', count: items.length });

      return items;
    } catch (error) {
      logger.error('Error getting store items', { error, category });
      throw error;
    }
  }

  /**
   * Get all decorations owned by a user
   */
  static async getUserDecorations(userId: string): Promise<UserDecoration[]> {
    try {
      const decorations = await UserDecoration.findAll({
        where: { userId },
        include: [
          {
            model: PostDecoration,
            as: 'decoration'
          }
        ],
        order: [['purchasedAt', 'DESC']]
      });

      logger.info('User decorations retrieved', { userId, count: decorations.length });

      return decorations;
    } catch (error) {
      logger.error('Error getting user decorations', { error, userId });
      throw error;
    }
  }

  /**
   * Purchase a decoration for a user using Sky Coins
   */
  static async purchaseDecoration(
    userId: string,
    decorationId: string
  ): Promise<{ decoration: PostDecoration; newSkyCoins: number }> {
    const transaction = await sequelize.transaction();

    try {
      // 1. Find the decoration (must be active)
      const decoration = await PostDecoration.findOne({
        where: { id: decorationId, isActive: true },
        transaction
      });

      if (!decoration) {
        throw new Error('Decoration not found or is no longer available');
      }

      // 2. Check not already owned
      const existing = await UserDecoration.findOne({
        where: { userId, decorationId },
        transaction
      });

      if (existing) {
        throw new Error('You already own this decoration');
      }

      // 3. Get user coins and verify balance
      const coins = await PositivityCoins.findByPk(userId, { transaction });

      if (!coins) {
        throw new Error('Coins not initialized');
      }

      if (coins.skyCoins < decoration.priceSkyCoins) {
        throw new Error(
          `Insufficient Sky Coins. You have ${coins.skyCoins}, need ${decoration.priceSkyCoins}`
        );
      }

      // 4. Decrement skyCoins
      await coins.update(
        {
          skyCoins: coins.skyCoins - decoration.priceSkyCoins
        },
        { transaction }
      );

      // 5. Create UserDecoration record
      await UserDecoration.create(
        {
          userId,
          decorationId,
          pricePaid: decoration.priceSkyCoins
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Decoration purchased', {
        userId,
        decorationId,
        pricePaid: decoration.priceSkyCoins,
        newSkyCoins: coins.skyCoins - decoration.priceSkyCoins
      });

      return {
        decoration,
        newSkyCoins: coins.skyCoins - decoration.priceSkyCoins
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error purchasing decoration', { error, userId, decorationId });
      throw error;
    }
  }

  /**
   * Get a user's active decoration configuration
   */
  static async getActiveDecoration(userId: string): Promise<UserActiveDecoration | null> {
    try {
      const activeDecoration = await UserActiveDecoration.findByPk(userId, {
        include: [
          {
            model: PostDecoration,
            as: 'lightBackground'
          },
          {
            model: PostDecoration,
            as: 'darkBackground'
          },
          {
            model: PostDecoration,
            as: 'frame'
          },
          {
            model: PostDecoration,
            as: 'iconColor'
          }
        ]
      });

      return activeDecoration;
    } catch (error) {
      logger.error('Error getting active decoration', { error, userId });
      throw error;
    }
  }

  /**
   * Set active decoration slots for a user
   */
  static async setActiveDecoration(
    userId: string,
    config: ActiveDecorationConfig
  ): Promise<UserActiveDecoration> {
    try {
      // Validate each non-undefined slot in config
      for (const [slot, decorationId] of Object.entries(config)) {
        if (decorationId === undefined) continue;

        if (decorationId !== null) {
          // Verify user owns this decoration
          const owned = await UserDecoration.findOne({
            where: { userId, decorationId }
          });

          if (!owned) {
            throw new Error(`You do not own decoration ${decorationId}`);
          }

          // Verify decoration category matches the slot
          const decoration = await PostDecoration.findByPk(decorationId);

          if (!decoration) {
            throw new Error(`Decoration ${decorationId} not found`);
          }

          const expectedCategory = SLOT_CATEGORY_MAP[slot];
          if (decoration.category !== expectedCategory) {
            throw new Error(
              `Decoration ${decorationId} is category "${decoration.category}", but slot "${slot}" requires "${expectedCategory}"`
            );
          }

          // For background slots, verify themeMode matches
          const expectedTheme = SLOT_THEME_MAP[slot];
          if (expectedTheme) {
            if (decoration.themeMode !== expectedTheme && decoration.themeMode !== 'any') {
              throw new Error(
                `Decoration ${decorationId} is for "${decoration.themeMode}" theme, but slot "${slot}" requires "${expectedTheme}"`
              );
            }
          }
        }
      }

      // Build update payload from non-undefined config values
      const updatePayload: any = {};
      if (config.lightBackgroundId !== undefined) updatePayload.lightBackgroundId = config.lightBackgroundId;
      if (config.darkBackgroundId !== undefined) updatePayload.darkBackgroundId = config.darkBackgroundId;
      if (config.frameId !== undefined) updatePayload.frameId = config.frameId;
      if (config.iconColorId !== undefined) updatePayload.iconColorId = config.iconColorId;

      // Upsert: find existing record, then update or create
      let activeDecoration = await UserActiveDecoration.findByPk(userId);

      if (activeDecoration) {
        await activeDecoration.update(updatePayload);
      } else {
        activeDecoration = await UserActiveDecoration.create({
          userId,
          ...updatePayload
        });
      }

      logger.info('Active decoration updated', { userId, config });

      return activeDecoration;
    } catch (error) {
      logger.error('Error setting active decoration', { error, userId, config });
      throw error;
    }
  }

  /**
   * Batch resolve active decorations for multiple users (for feed rendering)
   */
  static async batchResolveActiveDecorations(
    userIds: string[]
  ): Promise<Map<string, ResolvedDecoration>> {
    try {
      if (userIds.length === 0) {
        return new Map();
      }

      const [activeDecorations, cornerIconsMap] = await Promise.all([
        UserActiveDecoration.findAll({
          where: {
            userId: { [Op.in]: userIds }
          },
          include: [
            {
              model: PostDecoration,
              as: 'lightBackground'
            },
            {
              model: PostDecoration,
              as: 'darkBackground'
            },
            {
              model: PostDecoration,
              as: 'frame'
            },
            {
              model: PostDecoration,
              as: 'iconColor'
            }
          ]
        }),
        CornerIconService.batchResolveCornerIcons(userIds)
      ]);

      const result = new Map<string, ResolvedDecoration>();

      for (const active of activeDecorations) {
        const lightBg = active.get('lightBackground') as PostDecoration | null;
        const darkBg = active.get('darkBackground') as PostDecoration | null;
        const frame = active.get('frame') as PostDecoration | null;
        const iconColor = active.get('iconColor') as PostDecoration | null;
        const corners = cornerIconsMap.get(active.userId) || null;

        result.set(active.userId, {
          lightBackground: lightBg ? JSON.parse(lightBg.styleData) : null,
          darkBackground: darkBg ? JSON.parse(darkBg.styleData) : null,
          frame: frame ? JSON.parse(frame.styleData) : null,
          iconColors: iconColor ? JSON.parse(iconColor.styleData) : null,
          cornerIcons: corners && corners.length > 0 ? corners : null
        });
      }

      // Also add entries for users who have corner icons but no active decoration
      for (const [userId, corners] of cornerIconsMap) {
        if (!result.has(userId) && corners.length > 0) {
          result.set(userId, {
            lightBackground: null,
            darkBackground: null,
            frame: null,
            iconColors: null,
            cornerIcons: corners
          });
        }
      }

      logger.info('Batch decorations resolved', {
        requestedUsers: userIds.length,
        resolvedUsers: result.size
      });

      return result;
    } catch (error) {
      logger.error('Error batch resolving decorations', { error, userIds });
      throw error;
    }
  }
}

export default DecorationService;
