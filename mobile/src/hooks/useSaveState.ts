/**
 * Save State Hook
 * Manages save/bookmark state for multiple posts with optimistic updates
 */

import { useState, useCallback } from 'react';
import { toggleSave, trackSave } from '../services/postInteractionService';

export interface Post {
  id: string;
  savedByMe?: boolean;
}

export function useSaveState(initialPosts: Post[] = []) {
  // Initialize saved posts from initial data
  const [savedPosts, setSavedPosts] = useState<Set<string>>(() => {
    const set = new Set<string>();
    initialPosts.forEach((post) => {
      if (post.savedByMe) set.add(post.id);
    });
    return set;
  });

  // Reinitialize state when posts change
  const reinitialize = useCallback((posts: Post[]) => {
    const newSaved = new Set<string>();
    posts.forEach((post) => {
      if (post.savedByMe) newSaved.add(post.id);
    });
    setSavedPosts(newSaved);
  }, []);

  // Check if a post is saved
  const isSaved = useCallback(
    (postId: string) => savedPosts.has(postId),
    [savedPosts]
  );

  // Toggle save with optimistic update
  const handleSave = useCallback(
    async (postId: string) => {
      const wasSaved = savedPosts.has(postId);

      // Optimistic update
      setSavedPosts((prev) => {
        const newSet = new Set(prev);
        if (wasSaved) newSet.delete(postId);
        else newSet.add(postId);
        return newSet;
      });

      try {
        await toggleSave(postId, wasSaved);

        // Track if it was a save (not unsave)
        if (!wasSaved) {
          trackSave(postId);
        }
      } catch (error) {
        // Revert on error
        setSavedPosts((prev) => {
          const newSet = new Set(prev);
          if (wasSaved) newSet.add(postId);
          else newSet.delete(postId);
          return newSet;
        });
      }
    },
    [savedPosts]
  );

  return {
    savedPosts,
    isSaved,
    handleSave,
    reinitialize,
  };
}

export default useSaveState;
