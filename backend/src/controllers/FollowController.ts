import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Follow } from '../models/Follow';
import { FollowRequest } from '../models/FollowRequest';
import { User } from '../models/User';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { AuthRequest } from '../middleware/auth';
import { FeedController } from './FeedController';
import { logger } from '../utils/logger';

// Helper to format avatar data for API response
function formatAvatarForResponse(avatar: AvatarConfigSQL | null) {
  if (!avatar) return null;
  return {
    id: avatar.id,
    style: avatar.style,
    customizations: {
      skinTone: avatar.skinTone,
      eyeColor: avatar.eyeColor,
      eyeSize: avatar.eyeSize,
      hairColor: avatar.hairColor,
      hairStyle: avatar.hairStyle,
      accessories: {
        glasses: avatar.glasses,
        hat: avatar.hat,
        earrings: avatar.earrings,
      },
    },
  };
}

/**
 * Follow Controller
 * Handles all follow/unfollow operations
 */
export class FollowController {
  /**
   * Follow a user (or send follow request if private)
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
      const existingFollow = await Follow.findOne({
        where: {
          followerId,
          followingId: userToFollow.id
        }
      });

      if (existingFollow) {
        res.status(400).json({ error: 'Already following this user' });
        return;
      }

      // Check if there's already a pending follow request
      const existingRequest = await FollowRequest.findOne({
        where: {
          requesterId: followerId,
          targetId: userToFollow.id,
          status: 'pending'
        }
      });

      if (existingRequest) {
        res.status(400).json({ error: 'Follow request already pending' });
        return;
      }

      // If user is private, create a follow request instead
      if (userToFollow.isPrivate) {
        await FollowRequest.create({
          requesterId: followerId,
          targetId: userToFollow.id,
          status: 'pending'
        });

        logger.info('Follow request sent', { requesterId: followerId, targetId: userToFollow.id });

        res.json({
          message: 'Follow request sent',
          status: 'requested'
        });
        return;
      }

      // Create follow for public accounts
      await Follow.create({
        followerId,
        followingId: userToFollow.id
      });

      // Invalidate feed cache
      await FeedController.invalidateFeedCache(followerId);
      await FeedController.invalidateAlgorithmicFeedCache(followerId);

      logger.info('User followed', { followerId, followingId: userToFollow.id });

      res.json({
        message: 'Now following user',
        status: 'following'
      });

    } catch (error) {
      logger.error('Error following user', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to follow user' });
    }
  }

  /**
   * Unfollow a user or cancel follow request
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

      // Try to delete follow
      const deletedFollow = await Follow.destroy({
        where: {
          followerId,
          followingId: userToUnfollow.id
        }
      });

      // Also delete any pending follow requests
      const deletedRequest = await FollowRequest.destroy({
        where: {
          requesterId: followerId,
          targetId: userToUnfollow.id
        }
      });

      if (deletedFollow === 0 && deletedRequest === 0) {
        res.status(400).json({ error: 'Not following this user' });
        return;
      }

      // Invalidate feed cache
      await FeedController.invalidateFeedCache(followerId);
      await FeedController.invalidateAlgorithmicFeedCache(followerId);

      logger.info('User unfollowed/request cancelled', { followerId, targetId: userToUnfollow.id });

      res.json({
        message: deletedFollow > 0 ? 'Unfollowed user' : 'Follow request cancelled',
        status: 'none'
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
          attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
        }],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      // Convert Sequelize models to plain objects to ensure proper spreading
      const followerUsers = follows.map(f => {
        const user = f.get('follower') as any;
        return user ? user.get({ plain: true }) : null;
      }).filter(Boolean);
      const userIds = followerUsers.map((u: any) => u.id);

      // Fetch active avatars
      const avatars = await AvatarConfigSQL.findAll({
        where: {
          userId: { [Op.in]: userIds },
          isActive: true,
        },
      });
      const avatarsByUserId = new Map(avatars.map(a => [a.userId, formatAvatarForResponse(a)]));

      const followers = followerUsers.map((u: any) => ({
        ...u,
        activeAvatar: avatarsByUserId.get(u.id) || null,
      }));

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
          attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
        }],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      // Convert Sequelize models to plain objects to ensure proper spreading
      const followingUsers = follows.map(f => {
        const user = f.get('followingUser') as any;
        return user ? user.get({ plain: true }) : null;
      }).filter(Boolean);
      const userIds = followingUsers.map((u: any) => u.id);

      // Fetch active avatars
      const avatars = await AvatarConfigSQL.findAll({
        where: {
          userId: { [Op.in]: userIds },
          isActive: true,
        },
      });
      const avatarsByUserId = new Map(avatars.map(a => [a.userId, formatAvatarForResponse(a)]));

      const following = followingUsers.map((u: any) => ({
        ...u,
        activeAvatar: avatarsByUserId.get(u.id) || null,
      }));

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

      // Also check for pending follow request
      const followRequest = await FollowRequest.findOne({
        where: {
          requesterId: followerId,
          targetId: userToCheck.id,
          status: 'pending'
        }
      });

      res.json({
        isFollowing: !!follow,
        followRequestStatus: followRequest?.status || null,
        isPrivate: userToCheck.isPrivate
      });

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

  /**
   * Get pending follow requests for the authenticated user
   */
  static async getFollowRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 30;
      const offset = (page - 1) * limit;

      const { rows: requests, count } = await FollowRequest.findAndCountAll({
        where: {
          targetId: userId,
          status: 'pending'
        },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      // Get requester user info
      const requesterIds = requests.map(r => r.requesterId);
      const requesters = await User.findAll({
        where: { id: { [Op.in]: requesterIds } },
        attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId', 'positivityRank']
      });

      // Fetch active avatars
      const avatars = await AvatarConfigSQL.findAll({
        where: {
          userId: { [Op.in]: requesterIds },
          isActive: true,
        },
      });
      const avatarsByUserId = new Map(avatars.map(a => [a.userId, formatAvatarForResponse(a)]));

      const usersMap = new Map(requesters.map(u => [u.id, u.toJSON()]));

      const followRequests = requests.map(request => {
        const requester = usersMap.get(request.requesterId) as any;
        return {
          id: request.id,
          status: request.status,
          createdAt: request.createdAt,
          requester: requester ? {
            ...requester,
            activeAvatar: avatarsByUserId.get(requester.id) || null,
          } : null
        };
      });

      res.json({
        followRequests,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
          hasMore: page < Math.ceil(count / limit)
        }
      });

    } catch (error) {
      logger.error('Error getting follow requests', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get follow requests' });
    }
  }

  /**
   * Accept a follow request
   */
  static async acceptFollowRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;

      const request = await FollowRequest.findOne({
        where: {
          id: requestId,
          targetId: userId,
          status: 'pending'
        }
      });

      if (!request) {
        res.status(404).json({ error: 'Follow request not found' });
        return;
      }

      // Create the follow relationship
      await Follow.create({
        followerId: request.requesterId,
        followingId: userId
      });

      // Update request status to approved
      await request.update({ status: 'approved' });

      // Invalidate feed cache for the requester
      await FeedController.invalidateFeedCache(request.requesterId);
      await FeedController.invalidateAlgorithmicFeedCache(request.requesterId);

      logger.info('Follow request accepted', { requestId, userId, requesterId: request.requesterId });

      res.json({
        message: 'Follow request accepted',
        success: true
      });

    } catch (error) {
      logger.error('Error accepting follow request', { error, requestId: req.params.requestId });
      res.status(500).json({ error: 'Failed to accept follow request' });
    }
  }

  /**
   * Reject a follow request
   */
  static async rejectFollowRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;

      const request = await FollowRequest.findOne({
        where: {
          id: requestId,
          targetId: userId,
          status: 'pending'
        }
      });

      if (!request) {
        res.status(404).json({ error: 'Follow request not found' });
        return;
      }

      // Update request status to rejected
      await request.update({ status: 'rejected' });

      logger.info('Follow request rejected', { requestId, userId, requesterId: request.requesterId });

      res.json({
        message: 'Follow request rejected',
        success: true
      });

    } catch (error) {
      logger.error('Error rejecting follow request', { error, requestId: req.params.requestId });
      res.status(500).json({ error: 'Failed to reject follow request' });
    }
  }

  /**
   * Cancel a sent follow request
   */
  static async cancelFollowRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      const requesterId = req.user!.id;

      const targetUser = await User.findOne({ where: { username } });

      if (!targetUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const deleted = await FollowRequest.destroy({
        where: {
          requesterId,
          targetId: targetUser.id,
          status: 'pending'
        }
      });

      if (deleted === 0) {
        res.status(404).json({ error: 'No pending follow request found' });
        return;
      }

      logger.info('Follow request cancelled', { requesterId, targetId: targetUser.id });

      res.json({
        message: 'Follow request cancelled',
        success: true
      });

    } catch (error) {
      logger.error('Error cancelling follow request', { error, username: req.params.username });
      res.status(500).json({ error: 'Failed to cancel follow request' });
    }
  }

  /**
   * Get follow request count for the authenticated user
   */
  static async getFollowRequestCount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const count = await FollowRequest.count({
        where: {
          targetId: userId,
          status: 'pending'
        }
      });

      res.json({ count });

    } catch (error) {
      logger.error('Error getting follow request count', { error, userId: req.user?.id });
      res.status(500).json({ error: 'Failed to get follow request count' });
    }
  }
}
