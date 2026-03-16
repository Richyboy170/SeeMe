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
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
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
      const { title, rank, deadline } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'Goal title is required' });
        return;
      }

      if (title.trim().length > 200) {
        res.status(400).json({ error: 'Goal title must be 200 characters or less' });
        return;
      }

      const validRanks = ['gold', 'silver', 'bronze'];
      const goalRank = rank && validRanks.includes(rank) ? rank : 'gold';

      // Validate deadline if provided
      let goalDeadline: Date | null = null;
      if (deadline) {
        const parsed = new Date(deadline);
        if (isNaN(parsed.getTime())) {
          res.status(400).json({ error: 'Invalid deadline date' });
          return;
        }
        goalDeadline = parsed;
      }

      // Check active goal count (only non-completed)
      const activeGoals = await Goal.findAll({ where: { userId, isActive: true, isCompleted: false } });
      if (activeGoals.length >= MAX_GOALS) {
        res.status(400).json({ error: `You can have at most ${MAX_GOALS} active goals` });
        return;
      }

      // Set sortOrder to be after all existing active goals
      const maxOrder = activeGoals.reduce((max, g) => Math.max(max, g.sortOrder), -1);

      const goal = await Goal.create({
        userId,
        title: title.trim(),
        rank: goalRank,
        sortOrder: maxOrder + 1,
        deadline: goalDeadline,
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
      const { title, rank, deadline } = req.body;

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

      if (rank !== undefined) {
        const validRanks = ['gold', 'silver', 'bronze'];
        if (!validRanks.includes(rank)) {
          res.status(400).json({ error: 'Rank must be gold, silver, or bronze' });
          return;
        }
        goal.rank = rank;
      }

      if (deadline !== undefined) {
        if (goal.deadlineChangedAt) {
          res.status(400).json({ error: 'Deadline can only be adjusted once per goal' });
          return;
        }
        if (deadline === null) {
          goal.deadline = null;
        } else {
          const parsed = new Date(deadline);
          if (isNaN(parsed.getTime())) {
            res.status(400).json({ error: 'Invalid deadline date' });
            return;
          }
          goal.deadline = parsed;
        }
        goal.deadlineChangedAt = new Date();
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
   * Reorder goals (set sortOrder for each goal)
   */
  static async reorderGoals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { order } = req.body;

      if (!Array.isArray(order)) {
        res.status(400).json({ error: 'Order must be an array of goal IDs' });
        return;
      }

      // Verify all goals belong to user
      const goals = await Goal.findAll({ where: { userId, isActive: true, isCompleted: false } });
      const goalIds = new Set(goals.map(g => g.id));

      for (let i = 0; i < order.length; i++) {
        if (!goalIds.has(order[i])) {
          res.status(400).json({ error: 'Invalid goal ID in order' });
          return;
        }
      }

      // Update sort orders
      await Promise.all(
        order.map((goalId: string, index: number) =>
          Goal.update({ sortOrder: index }, { where: { id: goalId, userId } })
        )
      );

      // Return updated goals
      const updatedGoals = await Goal.findAll({
        where: { userId, isActive: true, isCompleted: false },
        order: [['sortOrder', 'ASC']],
      });

      res.json({ success: true, goals: updatedGoals });
    } catch (error) {
      logger.error('Error reordering goals:', { error });
      res.status(500).json({ error: 'Failed to reorder goals' });
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
