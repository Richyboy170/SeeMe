/**
 * Post Interaction Service
 * API calls for post interactions - like, save, share, comment
 * Easy to fix and call from anywhere
 */

import { api } from './api';

// ============================================
// LIKE FUNCTIONS
// ============================================

export async function likePost(postId: string): Promise<{ liked: boolean; likesCount?: number }> {
  try {
    const response = await api.post(`/posts/${postId}/like`);
    return { liked: true, likesCount: response.data.likesCount };
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
}

export async function unlikePost(postId: string): Promise<{ liked: boolean; likesCount?: number }> {
  try {
    const response = await api.delete(`/posts/${postId}/like`);
    return { liked: false, likesCount: response.data.likesCount };
  } catch (error) {
    console.error('Error unliking post:', error);
    throw error;
  }
}

export async function toggleLike(postId: string, isCurrentlyLiked: boolean): Promise<{ liked: boolean; likesCount?: number }> {
  if (isCurrentlyLiked) {
    return unlikePost(postId);
  } else {
    return likePost(postId);
  }
}

// ============================================
// SAVE FUNCTIONS
// ============================================

export async function savePost(postId: string): Promise<{ saved: boolean }> {
  try {
    await api.post(`/posts/${postId}/save`);
    return { saved: true };
  } catch (error) {
    console.error('Error saving post:', error);
    throw error;
  }
}

export async function unsavePost(postId: string): Promise<{ saved: boolean }> {
  try {
    await api.delete(`/posts/${postId}/save`);
    return { saved: false };
  } catch (error) {
    console.error('Error unsaving post:', error);
    throw error;
  }
}

export async function toggleSave(postId: string, isCurrentlySaved: boolean): Promise<{ saved: boolean }> {
  if (isCurrentlySaved) {
    return unsavePost(postId);
  } else {
    return savePost(postId);
  }
}

export async function getSavedPosts(page: number = 1, limit: number = 20) {
  try {
    const response = await api.getSavedPosts(page, limit);
    return response;
  } catch (error) {
    console.error('Error getting saved posts:', error);
    throw error;
  }
}

// ============================================
// SHARE FUNCTIONS
// ============================================

export async function sharePostToChat(postId: string, conversationId: string): Promise<boolean> {
  try {
    await api.sendMessage(conversationId, {
      messageType: 'shared_post',
      sharedPostId: postId,
    });
    return true;
  } catch (error) {
    console.error('Error sharing post to chat:', error);
    return false;
  }
}

// ============================================
// TRACKING FUNCTIONS
// ============================================

type InteractionType = 'view' | 'like' | 'comment' | 'comment_view' | 'share' | 'profile_view' | 'follow' | 'coin_gift' | 'save';

export function trackInteraction(targetId: string, type: InteractionType): void {
  api.trackInteraction(targetId, type).catch((error) => {
    console.error('Error tracking interaction:', error);
  });
}

export function trackLike(postId: string): void {
  trackInteraction(postId, 'like');
}

export function trackSave(postId: string): void {
  trackInteraction(postId, 'save');
}

export function trackShare(postId: string): void {
  trackInteraction(postId, 'share');
}

export function trackCommentView(postId: string): void {
  trackInteraction(postId, 'comment_view');
}

export function trackProfileView(userId: string): void {
  trackInteraction(userId, 'profile_view');
}

export function trackPostView(postId: string): void {
  trackInteraction(postId, 'view');
}
