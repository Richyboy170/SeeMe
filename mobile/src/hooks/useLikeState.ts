/**
 * Like State Hook
 * Manages like state for multiple posts with optimistic updates
 */

import { useState, useCallback } from 'react';
import { toggleLike, trackLike } from '../services/postInteractionService';

export interface Post {
  id: string;
  likedByMe?: boolean;
  likesCount: number;
}

export function useLikeState(initialPosts: Post[] = []) {
  // Initialize liked posts from initial data
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => {
    const set = new Set<string>();
    initialPosts.forEach((post) => {
      if (post.likedByMe) set.add(post.id);
    });
    return set;
  });

  // Initialize like counts
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    initialPosts.forEach((post) => {
      counts[post.id] = post.likesCount || 0;
    });
    return counts;
  });

  // Reinitialize state when posts change
  const reinitialize = useCallback((posts: Post[]) => {
    const newLiked = new Set<string>();
    const newCounts: Record<string, number> = {};

    posts.forEach((post) => {
      if (post.likedByMe) newLiked.add(post.id);
      newCounts[post.id] = post.likesCount || 0;
    });

    setLikedPosts(newLiked);
    setLikeCounts(newCounts);
  }, []);

  // Check if a post is liked
  const isLiked = useCallback(
    (postId: string) => likedPosts.has(postId),
    [likedPosts]
  );

  // Get like count for a post
  const getLikeCount = useCallback(
    (postId: string) => likeCounts[postId] || 0,
    [likeCounts]
  );

  // Toggle like with optimistic update
  const handleLike = useCallback(
    async (postId: string) => {
      const wasLiked = likedPosts.has(postId);

      // Optimistic update
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (wasLiked) newSet.delete(postId);
        else newSet.add(postId);
        return newSet;
      });

      setLikeCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (wasLiked ? -1 : 1),
      }));

      try {
        await toggleLike(postId, wasLiked);

        // Track if it was a like (not unlike)
        if (!wasLiked) {
          trackLike(postId);
        }
      } catch (error) {
        // Revert on error
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          if (wasLiked) newSet.add(postId);
          else newSet.delete(postId);
          return newSet;
        });
        setLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 0) + (wasLiked ? 1 : -1),
        }));
      }
    },
    [likedPosts]
  );

  return {
    likedPosts,
    likeCounts,
    isLiked,
    getLikeCount,
    handleLike,
    reinitialize,
  };
}

export default useLikeState;
