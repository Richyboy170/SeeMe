import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TrustScoreService } from '../services/TrustScoreService';
import { logger } from '../utils/logger';

/**
 * Controller for handling trust score operations
 */
export class TrustController {
  /**
   * Get trust score with a specific user
   * GET /api/trust/score/:userId
   */
  static async getTrustScore(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currentUserId = req.user?.id;
      const { userId: otherUserId } = req.params;

      if (!currentUserId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!otherUserId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      if (currentUserId === otherUserId) {
        res.status(400).json({ error: 'Cannot get trust score with yourself' });
        return;
      }

      const trustData = await TrustScoreService.getTrustScore(currentUserId, otherUserId);

      res.status(200).json(trustData);
    } catch (error) {
      logger.error('Error getting trust score', { error });
      res.status(500).json({ error: 'Failed to get trust score' });
    }
  }

  /**
   * List all trust connections for the current user
   * GET /api/trust/connections
   */
  static async getTrustConnections(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const {
        page = '1',
        limit = '20',
        sortBy = 'score'
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
      const offset = (pageNum - 1) * limitNum;

      // Validate sortBy
      const validSortOptions = ['score', 'streak', 'recent'];
      const sortOption = validSortOptions.includes(sortBy as string)
        ? (sortBy as 'score' | 'streak' | 'recent')
        : 'score';

      const result = await TrustScoreService.getUserTrustConnections(userId, {
        limit: limitNum,
        offset,
        sortBy: sortOption
      });

      res.status(200).json({
        connections: result.connections,
        pagination: {
          total: result.total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(result.total / limitNum)
        }
      });
    } catch (error) {
      logger.error('Error getting trust connections', { error });
      res.status(500).json({ error: 'Failed to get trust connections' });
    }
  }

  /**
   * Get trust statistics summary for the current user
   * GET /api/trust/stats
   */
  static async getTrustStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const stats = await TrustScoreService.getTrustStats(userId);

      res.status(200).json(stats);
    } catch (error) {
      logger.error('Error getting trust stats', { error });
      res.status(500).json({ error: 'Failed to get trust statistics' });
    }
  }
}

export default TrustController;
