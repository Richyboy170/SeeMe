/**
 * Feed Navigation Utilities
 * Helper functions for navigating from the feed
 */

import { StackNavigationProp } from '@react-navigation/stack';
import { FeedStackParamList } from '../navigation/types';
import { api } from '../services/api';

type FeedNavigation = StackNavigationProp<FeedStackParamList>;

/**
 * Navigate to a user's profile from the feed
 */
export function navigateToUserProfile(
  navigation: FeedNavigation,
  userId: string,
  username: string
) {
  // Track the profile view interaction
  api.trackInteraction(userId, 'profile_view').catch(console.error);

  navigation.navigate('UserProfile', {
    userId,
    username,
  });
}

/**
 * Navigate to comments screen for a post
 */
export function navigateToComments(
  navigation: FeedNavigation,
  postId: string
) {
  // Track the comment view interaction
  api.trackInteraction(postId, 'comment_view').catch(console.error);

  navigation.navigate('Comments', {
    postId,
  });
}

/**
 * Get comment preview data for a post
 * Returns the most recent comments
 */
export async function getCommentPreview(postId: string, limit: number = 2) {
  try {
    const response = await api.getPostComments(postId, 1);
    const comments = response.comments || [];

    // Return only the most recent comments
    return {
      comments: comments.slice(0, limit),
      totalComments: response.total || comments.length,
    };
  } catch (error) {
    console.error('Error fetching comment preview:', error);
    return { comments: [], totalComments: 0 };
  }
}
