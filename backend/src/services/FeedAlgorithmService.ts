import { Op } from 'sequelize';
import { Post, PostStatus } from '../models/Post';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { Like } from '../models/Like';
import { UserInteraction, InteractionType } from '../models/UserInteraction';
import { logger } from '../utils/logger';

/**
 * Feed Algorithm Service
 * Implements a personalized feed ranking algorithm based on:
 * 1. User engagement history (who they interact with most)
 * 2. Post engagement (likes, comments)
 * 3. Recency (newer posts get a boost)
 * 4. Diversity (mix content to avoid filter bubbles)
 */

interface ScoredPost {
  post: Post;
  score: number;
  reasons: string[];
}

export class FeedAlgorithmService {
  /**
   * Get algorithmically ranked feed for a user
   */
  static async getAlgorithmicFeed(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ posts: any[]; pagination: any }> {
    try {
      const offset = (page - 1) * limit;

      // Get list of users being followed
      const following = await Follow.findAll({
        where: { followerId: userId },
        attributes: ['followingId']
      });

      const followingIds = following.map(f => f.followingId);

      if (followingIds.length === 0) {
        // No follows yet - return discover feed with algorithmic ranking
        return await this.getDiscoverFeedAlgorithmic(userId, page, limit);
      }

      // Get user affinity scores (who they engage with most)
      const userAffinities = await this.calculateUserAffinities(userId, followingIds);

      // Get recent posts from followed users (fetch more to score and rank)
      const postsToFetch = Math.min(limit * 3, 100);
      const { rows: posts } = await Post.findAndCountAll({
        where: {
          userId: followingIds,
          status: PostStatus.COMPLETED
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'activeAvatarId']
        }],
        order: [['createdAt', 'DESC']],
        limit: postsToFetch,
        offset: 0,
        attributes: [
          'id',
          'userId',
          'processedImageUrl',
          'thumbnailUrl',
          'caption',
          'likesCount',
          'commentsCount',
          'createdAt'
        ]
      });

      // Score and rank posts
      const scoredPosts = await this.scoreAndRankPosts(posts, userId, userAffinities);

      // Apply pagination to scored posts
      const paginatedPosts = scoredPosts.slice(offset, offset + limit);

      // Get liked status for paginated posts
      const postIds = paginatedPosts.map(sp => sp.post.id);
      const likes = await Like.findAll({
        where: {
          userId,
          postId: postIds
        },
        attributes: ['postId']
      });
      const likedPostIds = new Set(likes.map(like => like.postId));

      // Format response
      const formattedPosts = paginatedPosts.map(sp => ({
        id: sp.post.id,
        user: sp.post.get('user'),
        imageUrl: sp.post.processedImageUrl,
        thumbnailUrl: sp.post.thumbnailUrl,
        caption: sp.post.caption,
        likesCount: sp.post.likesCount,
        commentsCount: sp.post.commentsCount,
        createdAt: sp.post.createdAt,
        likedByMe: likedPostIds.has(sp.post.id),
        // Include algorithm metadata for debugging (can be removed in production)
        _algorithmScore: sp.score,
        _algorithmReasons: sp.reasons
      }));

      return {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total: scoredPosts.length,
          totalPages: Math.ceil(scoredPosts.length / limit),
          hasMore: offset + limit < scoredPosts.length
        }
      };
    } catch (error) {
      logger.error('Error getting algorithmic feed', { error, userId });
      throw error;
    }
  }

  /**
   * Calculate user affinity scores based on interaction history
   */
  private static async calculateUserAffinities(
    userId: string,
    followingIds: string[]
  ): Promise<Map<string, number>> {
    const affinityMap = new Map<string, number>();

    try {
      // Get interaction counts per target user from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const interactions = await UserInteraction.findAll({
        where: {
          userId,
          targetUserId: {
            [Op.in]: followingIds
          },
          createdAt: {
            [Op.gte]: thirtyDaysAgo
          }
        },
        attributes: ['targetUserId', 'weight']
      });

      // Sum up weights for each target user
      for (const interaction of interactions) {
        if (interaction.targetUserId) {
          const currentScore = affinityMap.get(interaction.targetUserId) || 0;
          affinityMap.set(interaction.targetUserId, currentScore + interaction.weight);
        }
      }

      // Also consider likes on their posts
      const postLikes = await Like.findAll({
        where: {
          userId,
          createdAt: {
            [Op.gte]: thirtyDaysAgo
          }
        },
        include: [{
          model: Post,
          as: 'post',
          where: {
            userId: {
              [Op.in]: followingIds
            }
          },
          attributes: ['userId']
        }],
        attributes: ['id']
      });

      for (const like of postLikes) {
        const post = (like as any).post;
        if (post?.userId) {
          const currentScore = affinityMap.get(post.userId) || 0;
          affinityMap.set(post.userId, currentScore + 5); // Like weight
        }
      }

      // Normalize scores to 0-1 range
      const maxScore = Math.max(...affinityMap.values(), 1);
      for (const [targetUserId, score] of affinityMap) {
        affinityMap.set(targetUserId, score / maxScore);
      }
    } catch (error) {
      logger.warn('Error calculating user affinities, using defaults', { error });
    }

    return affinityMap;
  }

  /**
   * Score and rank posts based on multiple factors
   */
  private static async scoreAndRankPosts(
    posts: Post[],
    _userId: string,
    userAffinities: Map<string, number>
  ): Promise<ScoredPost[]> {
    const scoredPosts: ScoredPost[] = [];
    const now = new Date();

    for (const post of posts) {
      let score = 0;
      const reasons: string[] = [];

      // 1. User Affinity Score (0-40 points)
      const affinityScore = (userAffinities.get(post.userId) || 0) * 40;
      score += affinityScore;
      if (affinityScore > 20) {
        reasons.push('favorite_friend');
      }

      // 2. Engagement Score (0-30 points)
      // Logarithmic scaling to prevent viral posts from dominating
      const likesScore = Math.log10(post.likesCount + 1) * 5;
      const commentsScore = Math.log10(post.commentsCount + 1) * 8;
      const engagementScore = Math.min(likesScore + commentsScore, 30);
      score += engagementScore;
      if (engagementScore > 15) {
        reasons.push('high_engagement');
      }

      // 3. Recency Score (0-25 points)
      // Posts from the last hour get full points, decaying over 24 hours
      const hoursSincePost = (now.getTime() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyScore = Math.max(0, 25 * (1 - hoursSincePost / 24));
      score += recencyScore;
      if (recencyScore > 20) {
        reasons.push('recent');
      }

      // 4. Content Quality Indicators (0-5 points)
      // Posts with captions tend to be more thoughtful
      if (post.caption && post.caption.length > 20) {
        score += 3;
        reasons.push('quality_content');
      }
      if (post.caption && post.caption.length > 100) {
        score += 2;
      }

      scoredPosts.push({ post, score, reasons });
    }

    // Sort by score descending
    scoredPosts.sort((a, b) => b.score - a.score);

    // Apply diversity: ensure we don't show too many posts from the same user in a row
    return this.applyDiversity(scoredPosts);
  }

  /**
   * Apply diversity to prevent too many posts from the same user appearing together
   */
  private static applyDiversity(scoredPosts: ScoredPost[]): ScoredPost[] {
    const result: ScoredPost[] = [];
    const recentUsers: string[] = [];
    const pending: ScoredPost[] = [...scoredPosts];

    while (pending.length > 0 && result.length < scoredPosts.length) {
      // Find the highest scored post that isn't from a recent user
      let selectedIndex = -1;

      for (let i = 0; i < pending.length; i++) {
        const userId = pending[i].post.userId;
        // Check if this user appeared in the last 3 posts
        if (!recentUsers.slice(-3).includes(userId)) {
          selectedIndex = i;
          break;
        }
      }

      // If all remaining posts are from recent users, just take the top one
      if (selectedIndex === -1) {
        selectedIndex = 0;
      }

      const selected = pending.splice(selectedIndex, 1)[0];
      result.push(selected);
      recentUsers.push(selected.post.userId);
    }

    return result;
  }

  /**
   * Get discover feed with algorithmic ranking for users with no follows
   */
  private static async getDiscoverFeedAlgorithmic(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ posts: any[]; pagination: any }> {
    const offset = (page - 1) * limit;

    // Get popular and recent posts
    const { rows: posts, count } = await Post.findAndCountAll({
      where: {
        status: PostStatus.COMPLETED,
        // Exclude user's own posts
        userId: {
          [Op.ne]: userId
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'activeAvatarId']
      }],
      // Sort by a combination of engagement and recency
      order: [
        ['likesCount', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit,
      offset,
      attributes: [
        'id',
        'processedImageUrl',
        'thumbnailUrl',
        'caption',
        'likesCount',
        'commentsCount',
        'createdAt'
      ]
    });

    // Get liked status
    const postIds = posts.map(p => p.id);
    const likes = await Like.findAll({
      where: {
        userId,
        postId: postIds
      },
      attributes: ['postId']
    });
    const likedPostIds = new Set(likes.map(like => like.postId));

    return {
      posts: posts.map(post => ({
        id: post.id,
        user: post.get('user'),
        imageUrl: post.processedImageUrl,
        thumbnailUrl: post.thumbnailUrl,
        caption: post.caption,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt,
        likedByMe: likedPostIds.has(post.id)
      })),
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasMore: page < Math.ceil(count / limit)
      }
    };
  }

  /**
   * Track a user interaction for the algorithm
   */
  static async trackInteraction(
    userId: string,
    targetId: string,
    interactionType: InteractionType,
    metadata?: object
  ): Promise<void> {
    try {
      // Determine if target is a user or post
      let targetUserId: string | null = null;
      let targetPostId: string | null = null;

      if (interactionType === InteractionType.PROFILE_VIEW ||
          interactionType === InteractionType.FOLLOW) {
        targetUserId = targetId;
      } else {
        // For post-related interactions, get the post owner
        targetPostId = targetId;
        const post = await Post.findByPk(targetId, { attributes: ['userId'] });
        if (post) {
          targetUserId = post.userId;
        }
      }

      // Get interaction weight
      const weight = UserInteraction.getInteractionWeight(interactionType);

      // Create the interaction record
      await UserInteraction.create({
        userId,
        targetUserId,
        targetPostId,
        interactionType,
        weight,
        metadata: metadata || null
      });

      logger.debug('Interaction tracked', { userId, targetId, interactionType });
    } catch (error) {
      // Don't fail silently but also don't crash the request
      logger.warn('Failed to track interaction', { error, userId, targetId, interactionType });
    }
  }
}

export default FeedAlgorithmService;
