import { Request, Response } from 'express';
import { CornerIconService } from '../services/CornerIconService';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class CornerIconController {
  /**
   * Get current user's corner icon purchases and placements
   * @route GET /api/corner-icons/mine
   */
  static async getMyCornerIcons(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = await CornerIconService.getMyCornerIcons(userId);
      res.json(data);
    } catch (error) {
      logger.error('Error getting corner icons', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get corner icons' });
    }
  }

  /**
   * Purchase a corner icon
   * @route POST /api/corner-icons/purchase
   */
  static async purchaseCornerIcon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { iconFamily, iconName } = req.body;

      if (!iconFamily || !iconName) {
        res.status(400).json({ error: 'iconFamily and iconName are required' });
        return;
      }

      const result = await CornerIconService.purchaseCornerIcon(userId, iconFamily, iconName);

      res.json({
        message: 'Corner icon purchased!',
        purchase: result.purchase,
        newSkyCoins: result.newSkyCoins,
      });
    } catch (error) {
      logger.error('Error purchasing corner icon', { error, userId: req.user?.id });
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to purchase corner icon' });
      }
    }
  }

  /**
   * Place a corner icon at a position
   * @route PUT /api/corner-icons/place
   */
  static async placeCornerIcon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { position, iconFamily, iconName, color } = req.body;

      if (!position || !iconFamily || !iconName || !color) {
        res.status(400).json({ error: 'position, iconFamily, iconName, and color are required' });
        return;
      }

      const placement = await CornerIconService.placeCornerIcon(
        userId, position, iconFamily, iconName, color
      );

      res.json({ message: 'Corner icon placed!', placement });
    } catch (error) {
      logger.error('Error placing corner icon', { error, userId: req.user?.id });
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to place corner icon' });
      }
    }
  }

  /**
   * Remove a corner icon from a position
   * @route DELETE /api/corner-icons/place/:position
   */
  static async removeCornerIcon(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { position } = req.params;

      await CornerIconService.removeCornerIcon(userId, position as any);

      res.json({ message: 'Corner icon removed' });
    } catch (error) {
      logger.error('Error removing corner icon', { error, userId: req.user?.id });
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to remove corner icon' });
      }
    }
  }

  /**
   * Update color of a placed corner icon
   * @route PATCH /api/corner-icons/place/:position/color
   */
  static async updateCornerIconColor(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { position } = req.params;
      const { color } = req.body;

      if (!color) {
        res.status(400).json({ error: 'color is required' });
        return;
      }

      const placement = await CornerIconService.updateCornerIconColor(
        userId, position as any, color
      );

      res.json({ message: 'Color updated', placement });
    } catch (error) {
      logger.error('Error updating corner icon color', { error, userId: req.user?.id });
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update color' });
      }
    }
  }

  /**
   * Get a specific user's corner icon placements (public)
   * @route GET /api/corner-icons/user/:userId
   */
  static async getUserCornerIcons(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const placements = await CornerIconService.getUserCornerIcons(userId);
      res.json({ placements });
    } catch (error) {
      logger.error('Error getting user corner icons', { error, userId: req.params.userId });
      res.status(500).json({ error: 'Failed to get user corner icons' });
    }
  }
}

export default CornerIconController;
