import { Request, Response } from 'express';
import { ActivityService } from '../services/ActivityService';
import { CommunityActivity } from '../models/CommunityActivity';
import { TopicAdmin } from '../models/TopicAdmin';
import { Topic } from '../models/Topic';
import { logger } from '../utils/logger';

export class ActivityController {
  /**
   * GET /api/activities/wheel
   * Get spinning wheel activities for the current user
   */
  static async getWheelActivities(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const activities = await ActivityService.getWheelActivities(userId);
      return res.json({ activities });
    } catch (error) {
      logger.error('Error getting wheel activities', { error });
      return res.status(500).json({ error: 'Failed to get activities' });
    }
  }

  /**
   * GET /api/activities/community/:topicId
   * Get all activities for a specific community
   */
  static async getCommunityActivities(req: Request, res: Response) {
    try {
      const { topicId } = req.params;
      const activities = await ActivityService.getCommunityActivities(topicId);
      return res.json({ activities });
    } catch (error) {
      logger.error('Error getting community activities', { error });
      return res.status(500).json({ error: 'Failed to get community activities' });
    }
  }

  /**
   * POST /api/activities/community/:topicId
   * Admin creates an activity for their community
   */
  static async createActivity(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { topicId } = req.params;
      const { title, description, researchBasis } = req.body;

      if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Check if user is admin/creator of the topic
      const topic = await Topic.findByPk(topicId);
      if (!topic) return res.status(404).json({ error: 'Community not found' });

      const isCreator = topic.creatorId === userId;
      const adminRole = await TopicAdmin.findOne({
        where: { topicId, userId },
      });

      if (!isCreator && !adminRole) {
        return res.status(403).json({ error: 'Only admins can create activities' });
      }

      const activity = await ActivityService.createAdminActivity(
        topicId,
        title.trim(),
        description?.trim() || null,
        researchBasis?.trim() || null,
        userId
      );

      return res.status(201).json({ activity });
    } catch (error) {
      logger.error('Error creating activity', { error });
      return res.status(500).json({ error: 'Failed to create activity' });
    }
  }

  /**
   * POST /api/activities/community/:topicId/generate
   * Trigger AI activity generation for a community
   */
  static async generateActivities(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { topicId } = req.params;

      // Check if user is admin/creator
      const topic = await Topic.findByPk(topicId);
      if (!topic) return res.status(404).json({ error: 'Community not found' });

      const isCreator = topic.creatorId === userId;
      const adminRole = await TopicAdmin.findOne({
        where: { topicId, userId },
      });

      if (!isCreator && !adminRole) {
        return res.status(403).json({ error: 'Only admins can generate activities' });
      }

      const activities = await ActivityService.generateActivitiesForTopic(topicId);
      return res.json({ activities, count: activities.length });
    } catch (error) {
      logger.error('Error generating activities', { error });
      return res.status(500).json({ error: 'Failed to generate activities' });
    }
  }

  /**
   * PUT /api/activities/:activityId
   * Admin updates an activity
   */
  static async updateActivity(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { activityId } = req.params;
      const { title, description, researchBasis } = req.body;

      const activity = await CommunityActivity.findByPk(activityId);
      if (!activity) return res.status(404).json({ error: 'Activity not found' });

      // Check admin
      const topic = await Topic.findByPk(activity.topicId);
      if (!topic) return res.status(404).json({ error: 'Community not found' });

      const isCreator = topic.creatorId === userId;
      const adminRole = await TopicAdmin.findOne({ where: { topicId: activity.topicId, userId } });
      if (!isCreator && !adminRole) {
        return res.status(403).json({ error: 'Only admins can edit activities' });
      }

      if (title !== undefined) activity.title = title.trim();
      if (description !== undefined) activity.description = description?.trim() || null;
      if (researchBasis !== undefined) activity.researchBasis = researchBasis?.trim() || null;
      await activity.save();

      return res.json({ activity });
    } catch (error) {
      logger.error('Error updating activity', { error });
      return res.status(500).json({ error: 'Failed to update activity' });
    }
  }

  /**
   * DELETE /api/activities/:activityId
   * Admin deactivates an activity
   */
  static async deleteActivity(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { activityId } = req.params;

      const activity = await CommunityActivity.findByPk(activityId);
      if (!activity) return res.status(404).json({ error: 'Activity not found' });

      // Check admin
      const topic = await Topic.findByPk(activity.topicId);
      if (!topic) return res.status(404).json({ error: 'Community not found' });

      const isCreator = topic.creatorId === userId;
      const adminRole = await TopicAdmin.findOne({ where: { topicId: activity.topicId, userId } });
      if (!isCreator && !adminRole) {
        return res.status(403).json({ error: 'Only admins can delete activities' });
      }

      activity.isActive = false;
      await activity.save();

      return res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting activity', { error });
      return res.status(500).json({ error: 'Failed to delete activity' });
    }
  }

  /**
   * POST /api/activities/:activityId/complete
   * Mark an activity as completed (link to post)
   */
  static async completeActivity(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { activityId } = req.params;
      const { postId } = req.body;

      if (!postId) {
        return res.status(400).json({ error: 'postId is required' });
      }

      const completion = await ActivityService.completeActivity(activityId, userId, postId);
      return res.status(201).json({ completion });
    } catch (error: any) {
      logger.error('Error completing activity', { error });
      return res.status(500).json({ error: error.message || 'Failed to complete activity' });
    }
  }
}
