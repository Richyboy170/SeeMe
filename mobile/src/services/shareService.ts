/**
 * Share Service
 * Handles sharing posts externally via the native share sheet
 */

import { Share, Platform } from 'react-native';
import { getImageUrl } from './api';

// App store URLs — update these once the app is published
export const APP_STORE_URL = 'https://apps.apple.com/app/seeme/id000000000'; // Replace with real App Store ID
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.richy.seeme';
export const APP_DOWNLOAD_URL = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

export interface ShareablePost {
  id: string;
  caption?: string;
  user: {
    username: string;
  };
  imageUrl?: string;
  originalImageUrl?: string;
  thumbnailUrl?: string;
}

export interface ShareResult {
  success: boolean;
  action?: 'sharedAction' | 'dismissedAction';
  error?: string;
}

/**
 * Generate a shareable URL for a post
 */
export function getPostShareUrl(postId: string): string {
  // In production, this would be a real deep link URL
  // For now, use a placeholder that could be configured
  const baseUrl = 'https://seeme.app';
  return `${baseUrl}/post/${postId}`;
}

/**
 * Generate share message for a post
 */
export function generateShareMessage(post: ShareablePost): string {
  const postUrl = getPostShareUrl(post.id);

  let message: string;
  if (post.caption) {
    const truncatedCaption = post.caption.length > 100
      ? post.caption.substring(0, 100) + '...'
      : post.caption;
    message = `"${truncatedCaption}" - @${post.user.username} on SeeMe`;
  } else {
    message = `Check out this post by @${post.user.username} on SeeMe!`;
  }

  return `${message}\n\n${postUrl}\n\nDownload SeeMe: ${APP_DOWNLOAD_URL}`;
}

/**
 * Share a post using the native share sheet
 */
export async function sharePost(post: ShareablePost): Promise<ShareResult> {
  try {
    const message = generateShareMessage(post);
    const url = getPostShareUrl(post.id);

    const shareOptions: { message: string; url?: string; title?: string } = {
      message,
      title: `Post by @${post.user.username}`,
    };

    // On iOS, we can include a URL separately
    if (Platform.OS === 'ios') {
      shareOptions.url = url;
    }

    const result = await Share.share(shareOptions);

    if (result.action === Share.sharedAction) {
      return {
        success: true,
        action: 'sharedAction',
      };
    } else if (result.action === Share.dismissedAction) {
      return {
        success: false,
        action: 'dismissedAction',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sharing post:', error);
    return {
      success: false,
      error: error.message || 'Failed to share post',
    };
  }
}

/**
 * Share a post to a specific app (if supported)
 */
export async function sharePostToApp(
  post: ShareablePost,
  app: 'twitter' | 'facebook' | 'whatsapp' | 'telegram'
): Promise<ShareResult> {
  const message = generateShareMessage(post);
  const url = getPostShareUrl(post.id);
  const encodedMessage = encodeURIComponent(message);
  const encodedUrl = encodeURIComponent(url);

  let appUrl: string | null = null;

  switch (app) {
    case 'twitter':
      appUrl = `twitter://post?message=${encodedMessage}`;
      break;
    case 'whatsapp':
      appUrl = `whatsapp://send?text=${encodedMessage}`;
      break;
    case 'telegram':
      appUrl = `tg://msg?text=${encodedMessage}`;
      break;
    case 'facebook':
      appUrl = `fb://share?quote=${encodedMessage}&href=${encodedUrl}`;
      break;
  }

  // For now, fall back to the standard share sheet
  // In a full implementation, you would use Linking.canOpenURL and Linking.openURL
  return sharePost(post);
}

/**
 * Copy post link to clipboard
 * Falls back to share sheet if clipboard is not available
 */
export async function copyPostLink(postId: string): Promise<boolean> {
  const url = getPostShareUrl(postId);

  // Use share sheet with just the URL as a fallback
  // This allows users to copy via the share menu
  try {
    const result = await Share.share({
      message: url,
      title: 'Copy Link',
    });
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Error copying link:', error);
    return false;
  }
}
