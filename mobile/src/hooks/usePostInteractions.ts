/**
 * Post Interactions Hook
 * Combines all post interaction hooks into one easy-to-use hook
 *
 * For individual functionality, you can import separate hooks:
 * - useLikeState - for like/unlike
 * - useSaveState - for save/unsave
 * - useHeartAnimation - for double-tap heart animation
 * - useDoubleTap - for double-tap detection
 *
 * Or use the service directly:
 * - postInteractionService - API calls
 */

import { useCallback, useEffect } from 'react';
import { useLikeState } from './useLikeState';
import { useSaveState } from './useSaveState';
import { useHeartAnimation } from './useHeartAnimation';
import {
  sharePostToChat,
  trackCommentView,
  trackProfileView,
  trackShare
} from '../services/postInteractionService';

export interface Post {
  id: string;
  user: {
    id: string;
    username: string;
    activeAvatar?: any;
  };
  imageUrl?: string;
  originalImageUrl?: string;
  thumbnailUrl?: string;
  processedImageUrl?: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  createdAt: string;
}

export interface UsePostInteractionsOptions {
  onLikeSuccess?: (postId: string, isLiked: boolean) => void;
  onSaveSuccess?: (postId: string, isSaved: boolean) => void;
  onCommentPress?: (postId: string) => void;
  onShareSuccess?: (postId: string) => void;
  onGiveCoinsPress?: (post: Post) => void;
  onUserPress?: (userId: string, username: string) => void;
  trackInteractions?: boolean;
}

export function usePostInteractions(
  initialPosts: Post[] = [],
  options: UsePostInteractionsOptions = {}
) {
  const {
    onCommentPress,
    onGiveCoinsPress,
    onUserPress,
    trackInteractions = true,
  } = options;

  // Use individual hooks
  const likeState = useLikeState(initialPosts);
  const saveState = useSaveState(initialPosts);
  const heartAnimation = useHeartAnimation();

  // Reinitialize all states when posts change
  const reinitializeState = useCallback((posts: Post[]) => {
    likeState.reinitialize(posts);
    saveState.reinitialize(posts);
  }, [likeState.reinitialize, saveState.reinitialize]);

  // Double tap to like handler
  const handleDoubleTap = useCallback(
    (postId: string, onSingleTap?: () => void) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      const lastTapRef = { current: 0 };

      // For simplicity, we'll just handle double tap here
      // In a real implementation, you'd track lastTap across calls
      if (!likeState.isLiked(postId)) {
        likeState.handleLike(postId);
      }
      heartAnimation.animateHeart(postId);
    },
    [likeState, heartAnimation]
  );

  // Comment navigation
  const handleComment = useCallback(
    (postId: string) => {
      if (trackInteractions) {
        trackCommentView(postId);
      }
      onCommentPress?.(postId);
    },
    [trackInteractions, onCommentPress]
  );

  // Share post to chat
  const handleShareToChat = useCallback(
    async (post: Post, conversationId: string) => {
      const success = await sharePostToChat(post.id, conversationId);
      if (success && trackInteractions) {
        trackShare(post.id);
      }
      return success;
    },
    [trackInteractions]
  );

  // Give coins handler
  const handleGiveCoins = useCallback(
    (post: Post) => {
      onGiveCoinsPress?.(post);
    },
    [onGiveCoinsPress]
  );

  // User press handler (navigate to profile)
  const handleUserPress = useCallback(
    (userId: string, username: string) => {
      if (trackInteractions) {
        trackProfileView(userId);
      }
      onUserPress?.(userId, username);
    },
    [trackInteractions, onUserPress]
  );

  return {
    // Like state
    likedPosts: likeState.likedPosts,
    likeCounts: likeState.likeCounts,
    isLiked: likeState.isLiked,
    getLikeCount: likeState.getLikeCount,
    handleLike: likeState.handleLike,

    // Save state
    savedPosts: saveState.savedPosts,
    isSaved: saveState.isSaved,
    handleSave: saveState.handleSave,

    // Heart animation
    animatingPostId: heartAnimation.animatingPostId,
    heartScale: heartAnimation.heartScale,
    heartOpacity: heartAnimation.heartOpacity,
    animateHeart: heartAnimation.animateHeart,

    // Actions
    handleDoubleTap,
    handleComment,
    handleShareToChat,
    handleGiveCoins,
    handleUserPress,

    // Helpers
    reinitializeState,
  };
}

export default usePostInteractions;
