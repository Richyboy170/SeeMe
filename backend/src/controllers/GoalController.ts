import { Response } from 'express';
import { Goal } from '../models/Goal';
import { Post, PostStatus } from '../models/Post';
import { User } from '../models/User';
import { Topic } from '../models/Topic';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const MAX_GOALS = 3;

export class GoalController {
  /**
   * Get current user's active goals
   */
  static async getMyGoals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const allGoals = await Goal.findAll({
        where: { userId, isActive: true },
        order: [['createdAt', 'ASC']],
      });

      const goals = allGoals.filter(g => !g.isCompleted);
      const completedGoals = allGoals.filter(g => g.isCompleted);

      res.json({ success: true, goals, completedGoals });
    } catch (error: any) {
      logger.error('Error getting goals:', { message: error?.message, stack: error?.stack });
      res.status(500).json({ error: 'Failed to get goals', details: error?.message });
    }
  }

  /**
   * Create a new goal (max 3)
   */
  static async createGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { title } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'Goal title is required' });
        return;
      }

      if (title.trim().length > 200) {
        res.status(400).json({ error: 'Goal title must be 200 characters or less' });
        return;
      }

      // Check active goal count
      const activeCount = await Goal.count({ where: { userId, isActive: true } });
      if (activeCount >= MAX_GOALS) {
        res.status(400).json({ error: `You can have at most ${MAX_GOALS} active goals` });
        return;
      }

      const goal = await Goal.create({
        userId,
        title: title.trim(),
      });

      res.status(201).json({ success: true, goal });
    } catch (error: any) {
      logger.error('Error creating goal:', { message: error?.message, stack: error?.stack, name: error?.name });
      res.status(500).json({ error: 'Failed to create goal', details: error?.message });
    }
  }

  /**
   * Get a single goal (for popup when clicking goal icon on a post)
   */
  static async getGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { goalId } = req.params;

      const goal = await Goal.findByPk(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      const isOwner = goal.userId === userId;

      // Goal info is always returned - visibility is controlled per-post, not per-goal
      res.json({
        success: true,
        goal: {
          id: goal.id,
          title: goal.title,
          isOwner,
          postsCount: goal.postsCount,
        },
      });
    } catch (error) {
      logger.error('Error getting goal:', { error });
      res.status(500).json({ error: 'Failed to get goal' });
    }
  }

  /**
   * Update a goal (title, visibility)
   */
  static async updateGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { goalId } = req.params;
      const { title } = req.body;

      const goal = await Goal.findByPk(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      if (goal.userId !== userId) {
        res.status(403).json({ error: 'You can only update your own goals' });
        return;
      }

      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          res.status(400).json({ error: 'Goal title cannot be empty' });
          return;
        }
        if (title.trim().length > 200) {
          res.status(400).json({ error: 'Goal title must be 200 characters or less' });
          return;
        }
        goal.title = title.trim();
      }

      await goal.save();

      res.json({ success: true, goal });
    } catch (error) {
      logger.error('Error updating goal:', { error });
      res.status(500).json({ error: 'Failed to update goal' });
    }
  }

  /**
   * Delete (deactivate) a goal
   */
  static async deleteGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { goalId } = req.params;

      const goal = await Goal.findByPk(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      if (goal.userId !== userId) {
        res.status(403).json({ error: 'You can only delete your own goals' });
        return;
      }

      goal.isActive = false;
      await goal.save();

      res.json({ success: true, message: 'Goal removed' });
    } catch (error) {
      logger.error('Error deleting goal:', { error });
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  }

  /**
   * Finish a goal (permanent - cannot be undone)
   */
  static async finishGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { goalId } = req.params;
      const { showOnProfile } = req.body;

      const goal = await Goal.findByPk(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      if (goal.userId !== userId) {
        res.status(403).json({ error: 'You can only finish your own goals' });
        return;
      }

      if (goal.isCompleted) {
        res.status(400).json({ error: 'Goal is already completed' });
        return;
      }

      goal.isCompleted = true;
      goal.completedAt = new Date();
      goal.showOnProfile = showOnProfile === true;
      await goal.save();

      res.json({ success: true, goal });
    } catch (error) {
      logger.error('Error finishing goal:', { error });
      res.status(500).json({ error: 'Failed to finish goal' });
    }
  }

  /**
   * Delete a completed goal collection (soft delete)
   */
  static async deleteCollection(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { goalId } = req.params;

      const goal = await Goal.findByPk(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      if (goal.userId !== userId) {
        res.status(403).json({ error: 'You can only delete your own collections' });
        return;
      }

      if (!goal.isCompleted) {
        res.status(400).json({ error: 'Only completed goals can be deleted as collections' });
        return;
      }

      goal.isActive = false;
      await goal.save();

      res.json({ success: true, message: 'Collection removed' });
    } catch (error) {
      logger.error('Error deleting collection:', { error });
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  }

  /**
   * Get posts tagged with a specific goal (for Goals tab)
   */
  static async getGoalPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { goalId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;

      const goal = await Goal.findByPk(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }

      // Only the goal owner can see posts in their goals tab
      if (goal.userId !== userId) {
        res.status(403).json({ error: 'You can only view your own goal posts' });
        return;
      }

      const posts = await Post.findAll({
        where: {
          goalId,
          status: PostStatus.COMPLETED,
          isArchived: false,
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'avatarUrl'],
          },
          {
            model: Topic,
            as: 'topics',
            attributes: ['id', 'name', 'slug', 'iconEmoji', 'iconImageUrl'],
            through: { attributes: [] },
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit,
      });

      res.json({ success: true, posts });
    } catch (error) {
      logger.error('Error getting goal posts:', { error });
      res.status(500).json({ error: 'Failed to get goal posts' });
    }
  }
}
