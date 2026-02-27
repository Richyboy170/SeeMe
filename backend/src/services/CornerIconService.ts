import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { CornerIconPurchase } from '../models/CornerIconPurchase';
import { CornerIconPlacement, CornerPosition } from '../models/CornerIconPlacement';
import { PositivityCoins } from '../models/PositivityCoins';
import { logger } from '../utils/logger';

const CORNER_ICON_PRICE = 5;
const VALID_POSITIONS: CornerPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export interface CornerIconPlacementData {
  position: CornerPosition;
  iconFamily: string;
  iconName: string;
  color: string;
}

export class CornerIconService {
  /**
   * Get all corner icon purchases and placements for a user
   */
  static async getMyCornerIcons(userId: string) {
    try {
      const [purchases, placements] = await Promise.all([
        CornerIconPurchase.findAll({
          where: { userId },
          order: [['purchasedAt', 'DESC']],
        }),
        CornerIconPlacement.findAll({
          where: { userId },
        }),
      ]);

      return { purchases, placements };
    } catch (error) {
      logger.error('Error getting corner icons', { error, userId });
      throw error;
    }
  }

  /**
   * Purchase a corner icon
   */
  static async purchaseCornerIcon(
    userId: string,
    iconFamily: string,
    iconName: string
  ): Promise<{ purchase: CornerIconPurchase; newSkyCoins: number }> {
    const transaction = await sequelize.transaction();

    try {
      // Check not already owned
      const existing = await CornerIconPurchase.findOne({
        where: { userId, iconFamily, iconName },
        transaction,
      });

      if (existing) {
        throw new Error('You already own this icon');
      }

      // Get user coins and verify balance
      const coins = await PositivityCoins.findByPk(userId, { transaction });

      if (!coins) {
        throw new Error('Coins not initialized');
      }

      if (coins.skyCoins < CORNER_ICON_PRICE) {
        throw new Error(
          `Insufficient Sky Coins. You have ${coins.skyCoins}, need ${CORNER_ICON_PRICE}`
        );
      }

      // Deduct coins
      await coins.update(
        { skyCoins: coins.skyCoins - CORNER_ICON_PRICE },
        { transaction }
      );

      // Create purchase record
      const purchase = await CornerIconPurchase.create(
        { userId, iconFamily, iconName, pricePaid: CORNER_ICON_PRICE },
        { transaction }
      );

      await transaction.commit();

      logger.info('Corner icon purchased', {
        userId,
        iconFamily,
        iconName,
        newSkyCoins: coins.skyCoins - CORNER_ICON_PRICE,
      });

      return {
        purchase,
        newSkyCoins: coins.skyCoins - CORNER_ICON_PRICE,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error('Error purchasing corner icon', { error, userId, iconFamily, iconName });
      throw error;
    }
  }

  /**
   * Place a corner icon at a position.
   * Auto-moves if the icon is already at another corner.
   */
  static async placeCornerIcon(
    userId: string,
    position: CornerPosition,
    iconFamily: string,
    iconName: string,
    color: string
  ): Promise<CornerIconPlacement> {
    try {
      if (!VALID_POSITIONS.includes(position)) {
        throw new Error(`Invalid position: ${position}`);
      }

      // Verify ownership
      const owned = await CornerIconPurchase.findOne({
        where: { userId, iconFamily, iconName },
      });

      if (!owned) {
        throw new Error('You do not own this icon');
      }

      // Remove icon from any other corner (auto-move)
      await CornerIconPlacement.destroy({
        where: { userId, iconFamily, iconName },
      });

      // Remove whatever is currently at the target position
      await CornerIconPlacement.destroy({
        where: { userId, position },
      });

      // Create the new placement
      const placement = await CornerIconPlacement.create({
        userId,
        position,
        iconFamily,
        iconName,
        color,
      });

      logger.info('Corner icon placed', { userId, position, iconFamily, iconName, color });

      return placement;
    } catch (error) {
      logger.error('Error placing corner icon', { error, userId, position });
      throw error;
    }
  }

  /**
   * Remove a corner icon from a position
   */
  static async removeCornerIcon(userId: string, position: CornerPosition): Promise<void> {
    try {
      if (!VALID_POSITIONS.includes(position)) {
        throw new Error(`Invalid position: ${position}`);
      }

      const deleted = await CornerIconPlacement.destroy({
        where: { userId, position },
      });

      if (deleted === 0) {
        throw new Error('No icon at that position');
      }

      logger.info('Corner icon removed', { userId, position });
    } catch (error) {
      logger.error('Error removing corner icon', { error, userId, position });
      throw error;
    }
  }

  /**
   * Update only the color of a placed corner icon
   */
  static async updateCornerIconColor(
    userId: string,
    position: CornerPosition,
    color: string
  ): Promise<CornerIconPlacement> {
    try {
      if (!VALID_POSITIONS.includes(position)) {
        throw new Error(`Invalid position: ${position}`);
      }

      const placement = await CornerIconPlacement.findOne({
        where: { userId, position },
      });

      if (!placement) {
        throw new Error('No icon at that position');
      }

      await placement.update({ color });

      logger.info('Corner icon color updated', { userId, position, color });

      return placement;
    } catch (error) {
      logger.error('Error updating corner icon color', { error, userId, position });
      throw error;
    }
  }

  /**
   * Get corner icon placements for a specific user (public)
   */
  static async getUserCornerIcons(userId: string): Promise<CornerIconPlacement[]> {
    try {
      return await CornerIconPlacement.findAll({
        where: { userId },
      });
    } catch (error) {
      logger.error('Error getting user corner icons', { error, userId });
      throw error;
    }
  }

  /**
   * Batch resolve corner icons for multiple users (for feed rendering)
   */
  static async batchResolveCornerIcons(
    userIds: string[]
  ): Promise<Map<string, CornerIconPlacementData[]>> {
    try {
      if (userIds.length === 0) {
        return new Map();
      }

      const placements = await CornerIconPlacement.findAll({
        where: {
          userId: { [Op.in]: userIds },
        },
      });

      const result = new Map<string, CornerIconPlacementData[]>();

      for (const p of placements) {
        if (!result.has(p.userId)) {
          result.set(p.userId, []);
        }
        result.get(p.userId)!.push({
          position: p.position,
          iconFamily: p.iconFamily,
          iconName: p.iconName,
          color: p.color,
        });
      }

      return result;
    } catch (error) {
      logger.error('Error batch resolving corner icons', { error, userIds });
      throw error;
    }
  }
}

export default CornerIconService;
