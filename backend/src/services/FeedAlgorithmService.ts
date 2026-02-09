import { Op } from 'sequelize';
import { Post, PostStatus, PostVisibility } from '../models/Post';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { Like } from '../models/Like';
import { Repost } from '../models/Repost';
import { SavedPost } from '../models/SavedPost';
import { UserInteraction, InteractionType } from '../models/UserInteraction';
import { AvatarConfigSQL } from '../models/AvatarConfigSQL';
import { logger } from '../utils/logger';

/**
 * Feed Algorithm Service
 * Implements a personalized feed ranking algorithm based on:
 * 1. User engagement history (who they interact with most)
 * 2. Post engagement (likes, comments)
 * 3. Recency (newer posts get a boost)
 * 4. Diversity (mix content to avoid filter bubbles)
 * 5. Reposts from followed users (Twitter-like repost display)
 */

interface ScoredPost {
  post: Post;
  score: number;
  reasons: string[];
}

interface FeedItem {
  id: string;
  type: 'post' | 'repost';
  post: any;
  repostedBy?: {
    id: string;
    username: string;
    activeAvatar?: any;
  };
  repostComment?: string | null;
  repostType?: 'repost' | 'quote';
  repostCreatedAt?: Date;
  score: number;
  reasons: string[];
}

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

export class FeedAlgorithmService {
  /**
   * Get algorithmically ranked feed for a user
   * Includes both regular posts and reposts from followed users (Twitter-like)
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

      // Get user affinity scores (who they engage with most)
      const userAffinities = await this.calculateUserAffinities(userId, followingIds);

      // Include user's own posts in the feed
      const feedUserIds = [...followingIds, userId];

      // Get recent posts from followed users AND own posts (fetch more to score and rank)
      // Only include posts visible to friends (exclude topics_only)
      const postsToFetch = Math.min(limit * 3, 100);
      const { rows: posts } = await Post.findAndCountAll({
        where: {
          userId: feedUserIds,
          status: PostStatus.COMPLETED,
          isArchived: { [Op.ne]: true },
          [Op.or]: [
            { visibility: { [Op.in]: [PostVisibility.FRIENDS_ONLY, PostVisibility.TOPICS_AND_FRIENDS] } },
            { visibility: null as any }  // Backwards compatibility
          ]
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
          'originalImageUrl',
          'processedImageUrl',
          'thumbnailUrl',
          'caption',
          'likesCount',
          'commentsCount',
          'repostCount',
          'createdAt'
        ]
      });

      // Get reposts from followed users (including the user's own reposts)
      const reposts = await Repost.findAll({
        where: {
          userId: feedUserIds
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'activeAvatarId']
          },
          {
            model: Post,
            as: 'originalPost',
            where: {
              status: PostStatus.COMPLETED
            },
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'activeAvatarId']
            }],
            attributes: [
              'id',
              'userId',
              'originalImageUrl',
              'processedImageUrl',
              'thumbnailUrl',
              'caption',
              'likesCount',
              'commentsCount',
              'repostCount',
              'createdAt'
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: postsToFetch
      });

      // Convert posts to feed items
      const feedItems: FeedItem[] = posts.map(post => ({
        id: post.id,
        type: 'post' as const,
        post,
        score: 0,
        reasons: []
      }));

      // Convert reposts to feed items, deduplicating posts already in feed
      const postIdsInFeed = new Set(feedItems.map(item => item.post.id));

      for (const repost of reposts) {
        const originalPost = repost.get('originalPost') as Post;
        if (!originalPost) continue;

        // Get the reposter's user data as plain object
        const repostUser = repost.get('user') as User | null;
        if (!repostUser) continue;

        // Skip if this exact post is already in the feed as a regular post
        // (unless the reposter is a different user — that's a distinct feed event)
        if (postIdsInFeed.has(originalPost.id) && repostUser.id === originalPost.userId) {
          continue;
        }

        // For same-content dedup: if this original post was already added as a repost, skip
        const repostKey = `repost-original-${originalPost.id}`;
        if (postIdsInFeed.has(repostKey)) continue;
        postIdsInFeed.add(repostKey);

        const repostedByData = {
          id: repostUser.id,
          username: repostUser.username,
          activeAvatarId: repostUser.activeAvatarId,
        };

        // Add as a repost feed item (shows "User reposted" header)
        feedItems.push({
          id: `repost-${repost.id}`,
          type: 'repost',
          post: originalPost,
          repostedBy: repostedByData,
          repostComment: repost.comment,
          repostType: repost.type as 'repost' | 'quote',
          repostCreatedAt: repost.createdAt,
          score: 0,
          reasons: []
        });
      }

      // Score and rank all feed items
      const scoredItems = await this.scoreAndRankFeedItems(feedItems, userId, userAffinities);

      // Apply pagination
      const paginatedItems = scoredItems.slice(offset, offset + limit);

      // Get all unique post IDs for like/save status
      const postIds = paginatedItems.map(item =>
        item.type === 'post' ? item.post.id : item.post.id
      );

      const [likes, savedPosts, userReposts] = await Promise.all([
        Like.findAll({
          where: { userId, postId: postIds },
          attributes: ['postId']
        }),
        SavedPost.findAll({
          where: { userId, postId: postIds },
          attributes: ['postId']
        }),
        Repost.findAll({
          where: { userId, originalPostId: postIds },
          attributes: ['originalPostId', 'type']
        })
      ]);

      const likedPostIds = new Set(likes.map(like => like.postId));
      const savedPostIds = new Set(savedPosts.map(sp => sp.postId));
      const repostedPostMap = new Map(userReposts.map(r => [r.originalPostId, r.type]));

      // Fetch active avatars for all users in the feed
      const allUserIds = new Set<string>();
      paginatedItems.forEach(item => {
        const postUser = item.post.get ? item.post.get('user') : item.post.user;
        if (postUser?.id) allUserIds.add(postUser.id);
        if (item.repostedBy?.id) allUserIds.add(item.repostedBy.id);
      });

      const avatars = await AvatarConfigSQL.findAll({
        where: {
          userId: Array.from(allUserIds),
          isActive: true,
        },
      });
      const avatarsByUserId = new Map(avatars.map(a => [a.userId, a]));

      // Format response
      const formattedPosts = paginatedItems.map(item => {
        // Extract post user data as plain object
        const postUserRaw = item.post.get ? item.post.get('user') : item.post.user;
        const postUser = postUserRaw ? {
          id: postUserRaw.id,
          username: postUserRaw.username,
          activeAvatarId: postUserRaw.activeAvatarId,
        } : null;
        const postAvatar = avatarsByUserId.get(postUser?.id);

        const basePost = {
          id: item.post.id,
          user: postUser ? {
            ...postUser,
            activeAvatar: formatAvatarForResponse(postAvatar || null),
          } : null,
          imageUrl: item.post.processedImageUrl,
          originalImageUrl: item.post.originalImageUrl,
          thumbnailUrl: item.post.thumbnailUrl,
          caption: item.post.caption,
          likesCount: item.post.likesCount,
          commentsCount: item.post.commentsCount,
          repostCount: item.post.repostCount || 0,
          createdAt: item.post.createdAt,
          likedByMe: likedPostIds.has(item.post.id),
          savedByMe: savedPostIds.has(item.post.id),
          repostedByMe: repostedPostMap.has(item.post.id),
          myRepostType: repostedPostMap.get(item.post.id) || null,
          // Algorithm metadata
          _algorithmScore: item.score,
          _algorithmReasons: item.reasons
        };

        // Add repost information if this is a repost
        if (item.type === 'repost' && item.repostedBy) {
          const repostedByAvatar = avatarsByUserId.get(item.repostedBy.id);
          return {
            ...basePost,
            feedItemId: item.id, // Unique feed item ID
            isRepost: true,
            repostedBy: {
              id: item.repostedBy.id,
              username: item.repostedBy.username,
              activeAvatar: formatAvatarForResponse(repostedByAvatar || null),
            },
            repostType: item.repostType,
            repostComment: item.repostComment,
            repostCreatedAt: item.repostCreatedAt,
          };
        }

        return {
          ...basePost,
          feedItemId: item.id,
          isRepost: false
        };
      });

      return {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total: scoredItems.length,
          totalPages: Math.ceil(scoredItems.length / limit),
          hasMore: offset + limit < scoredItems.length
        }
      };
    } catch (error) {
      logger.error('Error getting algorithmic feed', { error, userId });
      throw error;
    }
  }

  /**
   * Score and rank feed items (posts + reposts)
   * Primary sort: chronological (newest first) based on when the action happened
   *   - For posts: post createdAt
   *   - For reposts: repost createdAt (when the user reposted it)
   * Secondary: light engagement/affinity scoring as tiebreaker for same-minute posts
   */
  private static async scoreAndRankFeedItems(
    items: FeedItem[],
    _userId: string,
    userAffinities: Map<string, number>
  ): Promise<FeedItem[]> {
    for (const item of items) {
      let score = 0;
      const reasons: string[] = [];

      // Get the relevant user ID (reposter for reposts, poster for posts)
      const relevantUserId = item.type === 'repost' && item.repostedBy
        ? item.repostedBy.id
        : item.post.userId;

      // Light scoring as tiebreaker only (0-10 points max)

      // 1. User Affinity (0-4 points)
      const affinityScore = (userAffinities.get(relevantUserId) || 0) * 4;
      score += affinityScore;
      if (affinityScore > 2) {
        reasons.push('favorite_friend');
      }

      // 2. Engagement (0-3 points)
      const likesScore = Math.log10(item.post.likesCount + 1) * 0.5;
      const commentsScore = Math.log10(item.post.commentsCount + 1) * 0.8;
      const repostScore = Math.log10((item.post.repostCount || 0) + 1) * 0.3;
      const engagementScore = Math.min(likesScore + commentsScore + repostScore, 3);
      score += engagementScore;
      if (engagementScore > 1.5) {
        reasons.push('high_engagement');
      }

      // 3. Content Quality (0-2 points)
      if (item.post.caption && item.post.caption.length > 20) {
        score += 1;
        reasons.push('quality_content');
      }
      if (item.post.caption && item.post.caption.length > 100) {
        score += 1;
      }

      // 4. Quote posts get a small boost (0-1 point)
      if (item.type === 'repost' && item.repostType === 'quote' && item.repostComment) {
        score += 1;
        reasons.push('quote_post');
      }

      item.score = score;
      item.reasons = reasons;
    }

    // Primary sort: chronological (newest first)
    // Secondary sort: score as tiebreaker for items at the same time
    items.sort((a, b) => {
      const timeA = a.type === 'repost' && a.repostCreatedAt
        ? new Date(a.repostCreatedAt).getTime()
        : new Date(a.post.createdAt).getTime();
      const timeB = b.type === 'repost' && b.repostCreatedAt
        ? new Date(b.repostCreatedAt).getTime()
        : new Date(b.post.createdAt).getTime();

      // Primary: newest first
      if (timeA !== timeB) return timeB - timeA;
      // Secondary: higher score first
      return b.score - a.score;
    });

    // Apply diversity: ensure we don't show too many items from the same user in a row
    return this.applyDiversityToFeedItems(items);
  }

  /**
   * Apply diversity to feed items
   */
  private static applyDiversityToFeedItems(items: FeedItem[]): FeedItem[] {
    const result: FeedItem[] = [];
    const recentUsers: string[] = [];
    const pending: FeedItem[] = [...items];

    while (pending.length > 0 && result.length < items.length) {
      let selectedIndex = -1;

      for (let i = 0; i < pending.length; i++) {
        // Get the relevant user (reposter for reposts, poster for posts)
        const relevantUserId = pending[i].type === 'repost' && pending[i].repostedBy
          ? pending[i].repostedBy!.id
          : pending[i].post.userId;

        if (!recentUsers.slice(-3).includes(relevantUserId)) {
          selectedIndex = i;
          break;
        }
      }

      if (selectedIndex === -1) {
        selectedIndex = 0;
      }

      const selected = pending.splice(selectedIndex, 1)[0];
      result.push(selected);

      const relevantUserId = selected.type === 'repost' && selected.repostedBy
        ? selected.repostedBy.id
        : selected.post.userId;
      recentUsers.push(relevantUserId);
    }

    return result;
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
  // @ts-ignore TS6133 - Reserved for future algorithmic feed use
  private static async _scoreAndRankPosts(
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
  // @ts-ignore TS6133 - Reserved for future algorithmic feed use
  private static async _getDiscoverFeedAlgorithmic(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ posts: any[]; pagination: any }> {
    const offset = (page - 1) * limit;

    // Get popular and recent posts
    // For discover feed, only show posts that are meant to be public (topics_and_friends)
    // or older posts without visibility set (backwards compatibility)
    const { rows: posts, count } = await Post.findAndCountAll({
      where: {
        status: PostStatus.COMPLETED,
        // Exclude user's own posts
        userId: {
          [Op.ne]: userId
        },
        [Op.or]: [
          { visibility: PostVisibility.TOPICS_AND_FRIENDS },
          { visibility: null as any }  // Backwards compatibility
        ]
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
