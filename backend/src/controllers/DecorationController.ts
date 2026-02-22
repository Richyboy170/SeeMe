import { Request, Response } from 'express';
import { DecorationService } from '../services/DecorationService';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * DecorationController - Handles all decoration store HTTP requests
 */
export class DecorationController {
  /**
   * Get available store items
   * @route GET /api/decorations/store
   * @access Public
   */
  static async getStoreItems(req: Request, res: Response): Promise<void> {
    try {
      const category = req.query.category as string | undefined;
      const items = await DecorationService.getStoreItems(category);

      res.json({ items });
    } catch (error) {
      logger.error('Error getting store items', { error });
      res.status(500).json({ error: 'Failed to get store items' });
    }
  }

  /**
   * Get current user's owned decorations
   * @route GET /api/decorations/mine
   * @access Private
   */
  static async getMyDecorations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const decorations = await DecorationService.getUserDecorations(userId);

      res.json({ decorations });
    } catch (error) {
      logger.error('Error getting user decorations', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get decorations' });
    }
  }

  /**
   * Purchase a decoration from the store
   * @route POST /api/decorations/purchase
   * @access Private
   */
  static async purchaseDecoration(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { decorationId } = req.body;

      if (!decorationId) {
        res.status(400).json({ error: 'Decoration ID required' });
        return;
      }

      const result = await DecorationService.purchaseDecoration(userId, decorationId);

      res.json({
        message: 'Decoration purchased successfully!',
        decoration: result.decoration,
        newSkyCoins: result.newSkyCoins
      });
    } catch (error) {
      logger.error('Error purchasing decoration', { error, userId: req.user?.id });

      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to purchase decoration' });
      }
    }
  }

  /**
   * Get current user's active decoration configuration
   * @route GET /api/decorations/active
   * @access Private
   */
  static async getMyActiveDecoration(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const activeDecoration = await DecorationService.getActiveDecoration(userId);

      res.json({ activeDecoration });
    } catch (error) {
      logger.error('Error getting active decoration', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get active decoration' });
    }
  }

  /**
   * Set the current user's active decoration configuration
   * @route PUT /api/decorations/active
   * @access Private
   */
  static async setActiveDecoration(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { lightBackgroundId, darkBackgroundId, frameId, iconColorId } = req.body;

      const activeDecoration = await DecorationService.setActiveDecoration(userId, {
        lightBackgroundId,
        darkBackgroundId,
        frameId,
        iconColorId
      });

      res.json({
        message: 'Active decoration updated successfully!',
        activeDecoration
      });
    } catch (error) {
      logger.error('Error setting active decoration', { error, userId: req.user?.id });

      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to set active decoration' });
      }
    }
  }

  /**
   * Get a specific user's active decoration (public profile)
   * @route GET /api/decorations/user/:userId/active
   * @access Public
   */
  static async getUserActiveDecoration(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const activeDecoration = await DecorationService.getActiveDecoration(userId);

      res.json({ activeDecoration });
    } catch (error) {
      logger.error('Error getting user active decoration', { error, userId: req.params.userId });
      res.status(500).json({ error: 'Failed to get user active decoration' });
    }
  }
}

export default DecorationController;
