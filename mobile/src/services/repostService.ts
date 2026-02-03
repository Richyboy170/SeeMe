/**
 * Repost Service
 * Handles reposting/retweeting functionality including quote posts
 */

import { api } from './api';
import { trackInteraction } from './postInteractionService';

export type RepostType = 'repost' | 'quote';

export interface RepostResult {
  success: boolean;
  reposted: boolean;
  repostType?: RepostType;
  repostCount?: number;
  repostId?: string;
  error?: string;
}

export interface RepostData {
  id: string;
  originalPostId: string;
  userId: string;
  type: RepostType;
  comment: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface RepostStatus {
  hasReposted: boolean;
  repostType: RepostType | null;
  repost: RepostData | null;
}

/**
 * Create a simple repost of a post
 */
export async function repostPost(postId: string): Promise<RepostResult> {
  try {
    const response = await api.post(`/reposts/${postId}`, {
      type: 'repost'
    });

    // Track the interaction for the algorithm
    trackInteraction(postId, 'share');

    return {
      success: true,
      reposted: true,
      repostType: 'repost',
      repostCount: response.data?.repostCount,
      repostId: response.data?.repost?.id,
    };
  } catch (error: any) {
    console.error('Error reposting post:', error);

    // Check if already reposted
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already')) {
      return {
        success: false,
        reposted: true,
        error: 'You have already reposted this',
      };
    }

    return {
      success: false,
      reposted: false,
      error: error.response?.data?.error || 'Failed to repost',
    };
  }
}

/**
 * Create a quote post (repost with comment)
 */
export async function quotePost(postId: string, comment: string): Promise<RepostResult> {
  try {
    if (!comment || comment.trim() === '') {
      return {
        success: false,
        reposted: false,
        error: 'Quote posts require a comment',
      };
    }

    const response = await api.post(`/reposts/${postId}`, {
      type: 'quote',
      comment: comment.trim()
    });

    // Track the interaction for the algorithm
    trackInteraction(postId, 'share');

    return {
      success: true,
      reposted: true,
      repostType: 'quote',
      repostCount: response.data?.repostCount,
      repostId: response.data?.repost?.id,
    };
  } catch (error: any) {
    console.error('Error creating quote post:', error);

    // Check if already reposted
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already')) {
      return {
        success: false,
        reposted: true,
        error: 'You have already reposted this. Edit your existing repost instead.',
      };
    }

    return {
      success: false,
      reposted: false,
      error: error.response?.data?.error || 'Failed to create quote post',
    };
  }
}

/**
 * Remove a repost
 */
export async function unrepostPost(postId: string): Promise<RepostResult> {
  try {
    await api.delete(`/reposts/${postId}`);

    return {
      success: true,
      reposted: false,
    };
  } catch (error: any) {
    console.error('Error removing repost:', error);
    return {
      success: false,
      reposted: true,
      error: error.response?.data?.error || 'Failed to remove repost',
    };
  }
}

/**
 * Toggle repost status (simple repost)
 */
export async function toggleRepost(
  postId: string,
  isCurrentlyReposted: boolean
): Promise<RepostResult> {
  if (isCurrentlyReposted) {
    return unrepostPost(postId);
  } else {
    return repostPost(postId);
  }
}

/**
 * Check if the current user has reposted a post
 */
export async function checkRepostStatus(postId: string): Promise<RepostStatus> {
  try {
    const response = await api.get(`/reposts/${postId}/status`);
    return {
      hasReposted: response.data?.hasReposted || false,
      repostType: response.data?.repostType || null,
      repost: response.data?.repost || null,
    };
  } catch (error) {
    console.error('Error checking repost status:', error);
    return { hasReposted: false, repostType: null, repost: null };
  }
}

/**
 * Get all reposts for a post
 */
export async function getPostReposts(postId: string, page: number = 1): Promise<{
  reposts: RepostData[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const response = await api.get(`/reposts/${postId}/list?page=${page}`);
    const { reposts, pagination } = response.data;
    return {
      reposts: reposts || [],
      total: pagination?.total || 0,
      hasMore: pagination?.page < pagination?.totalPages,
    };
  } catch (error) {
    console.error('Error getting post reposts:', error);
    return { reposts: [], total: 0, hasMore: false };
  }
}

/**
 * Get all posts reposted by a user
 */
export async function getUserReposts(userId: string, page: number = 1): Promise<{
  reposts: RepostData[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const response = await api.get(`/reposts/user/${userId}?page=${page}`);
    const { reposts, pagination } = response.data;
    return {
      reposts: reposts || [],
      total: pagination?.total || 0,
      hasMore: pagination?.page < pagination?.totalPages,
    };
  } catch (error) {
    console.error('Error getting user reposts:', error);
    return { reposts: [], total: 0, hasMore: false };
  }
}
