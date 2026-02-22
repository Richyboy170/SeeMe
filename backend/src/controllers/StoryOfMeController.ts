import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { StoryOfMeService } from '../services/StoryOfMeService';
import { StoryPeriodType } from '../models/StoryOfMe';
import { logger } from '../utils/logger';

export class StoryOfMeController {
    /**
     * Get own stories
     * @route GET /api/stories/me
     */
    static async getMyStories(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const periodType = req.query.periodType as StoryPeriodType | undefined;
            const stories = await StoryOfMeService.getUserStories(userId, periodType);
            res.json({ stories });
        } catch (error) {
            logger.error('Error getting own stories', { error });
            res.status(500).json({ error: 'Failed to get stories' });
        }
    }

    /**
     * Get stories for any user (public)
     * @route GET /api/stories/user/:userId
     */
    static async getUserStories(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const periodType = req.query.periodType as StoryPeriodType | undefined;
            const stories = await StoryOfMeService.getUserStories(userId, periodType);
            res.json({ stories });
        } catch (error) {
            logger.error('Error getting user stories', { error });
            res.status(500).json({ error: 'Failed to get stories' });
        }
    }

    /**
     * Get latest story for a user
     * @route GET /api/stories/user/:userId/latest
     */
    static async getLatestStory(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const periodType = req.query.periodType as StoryPeriodType | undefined;
            const story = await StoryOfMeService.getLatestStory(userId, periodType);
            res.json({ story });
        } catch (error) {
            logger.error('Error getting latest story', { error });
            res.status(500).json({ error: 'Failed to get latest story' });
        }
    }

    /**
     * Trigger story generation for current user
     * @route POST /api/stories/generate
     */
    static async generateStory(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const periodType = (req.body.periodType as StoryPeriodType) || 'weekly';

            const story = await StoryOfMeService.generateStory(userId, periodType);

            if (!story) {
                res.json({ message: 'No activity found for this period', story: null });
                return;
            }

            res.json({ story });
        } catch (error) {
            logger.error('Error generating story', { error });
            res.status(500).json({ error: 'Failed to generate story' });
        }
    }
}
