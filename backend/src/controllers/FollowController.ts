import { Request, Response } from 'express';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { FeedController } from './FeedController';
import { logger } from '../utils/logger';

/**
 * Follow Controller
 * Handles all follow/unfollow operations
 */
export class FollowController {
  /**
   * Follow a user
   */
  static async followUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const followerId = req.user!.id;

      // Find user to follow
      const userToFollow = await User.findOne({ where: { username } });

      if (!userToFollow) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (userToFollow.id === followerId) {
        res.status(400).json({ error: 'Cannot follow yourself' });
        return;
      }

      // Check if already following
      const existing = await Follow.findOne({
        where: {
          followerId,
          followingId: userToFollow.id
        }
      });

      if (existing) {
        res.status(400).json({ error: 'Already following this user' });
        return;
      }

      // Create follow
      await Follow.create({
        followerId,
        followingId: userToFollow.id
      });

      // Invalidate feed cache
      await FeedController.invalidateFeedCache(followerId);

      logger.info('User followed', { followerId, followingId: userToFollow.id });

      res.json({
        message: 'Now following user',
        following: true
      });

    } catch (error) {
      logger.error('Error following user', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to follow user' });
    }
  }

  /**
   * Unfollow a user
   */
  static async unfollowUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const followerId = req.user!.id;

      // Find user to unfollow
      const userToUnfollow = await User.findOne({ where: { username } });

      if (!userToUnfollow) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Delete follow
      const deleted = await Follow.destroy({
        where: {
          followerId,
          followingId: userToUnfollow.id
        }
      });

      if (deleted === 0) {
        res.status(400).json({ error: 'Not following this user' });
        return;
      }

      // Invalidate feed cache
      await FeedController.invalidateFeedCache(followerId);

      logger.info('User unfollowed', { followerId, followingId: userToUnfollow.id });

      res.json({
        message: 'Unfollowed user',
        following: false
      });

    } catch (error) {
      logger.error('Error unfollowing user', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to unfollow user' });
    }
  }

  /**
   * Get followers list for a user
   */
  static async getFollowers(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 30;
      const offset = (page - 1) * limit;

      const user = await User.findOne({ where: { username } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const { rows: follows, count } = await Follow.findAndCountAll({
        where: { followingId: user.id },
        include: [{
          model: User,
          as: 'follower',
          attributes: ['id', 'username', 'activeAvatarId']
        }],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const followers = follows.map(f => f.get('follower'));

      res.json({
        followers,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting followers', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to get followers' });
    }
  }

  /**
   * Get following list for a user
   */
  static async getFollowing(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 30;
      const offset = (page - 1) * limit;

      const user = await User.findOne({ where: { username } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const { rows: follows, count } = await Follow.findAndCountAll({
        where: { followerId: user.id },
        include: [{
          model: User,
          as: 'followingUser',
          attributes: ['id', 'username', 'activeAvatarId']
        }],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const following = follows.map(f => f.get('followingUser'));

      res.json({
        following,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting following', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to get following' });
    }
  }

  /**
   * Check if authenticated user is following another user
   */
  static async checkFollowing(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const followerId = req.user!.id;

      const userToCheck = await User.findOne({ where: { username } });

      if (!userToCheck) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const follow = await Follow.findOne({
        where: {
          followerId,
          followingId: userToCheck.id
        }
      });

      res.json({ following: !!follow });

    } catch (error) {
      logger.error('Error checking following', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to check following status' });
    }
  }

  /**
   * Get follower/following counts for a user
   */
  static async getFollowCounts(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;

      const user = await User.findOne({ where: { username } });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const [followersCount, followingCount] = await Promise.all([
        Follow.count({ where: { followingId: user.id } }),
        Follow.count({ where: { followerId: user.id } })
      ]);

      res.json({
        followersCount,
        followingCount
      });

    } catch (error) {
      logger.error('Error getting follow counts', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to get follow counts' });
    }
  }
}
