/**
 * Post utility functions shared across Feed, Profile, and Communities screens
 */

/**
 * Format a date string into a human-readable "time ago" format
 */
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

/**
 * Format a date string into a short "time ago" format (without "ago")
 */
export function formatTimeAgoShort(dateString: string): string {
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return `${Math.floor(diffInSeconds / 604800)}w`;
}

/**
 * Format a number for display (e.g., 1500 -> "1.5K")
 */
export function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Get the best available image URL for a post
 */
export function getPostImageUrl(post: {
  processedImageUrl?: string | null;
  thumbnailUrl?: string | null;
  originalImageUrl?: string | null;
  imageUrl?: string | null;
}): string | null {
  return (
    post.processedImageUrl ||
    post.thumbnailUrl ||
    post.originalImageUrl ||
    post.imageUrl ||
    null
  );
}

/**
 * Get the full resolution image URL for a post (for image viewer)
 */
export function getPostFullImageUrl(post: {
  originalImageUrl?: string | null;
  processedImageUrl?: string | null;
  imageUrl?: string | null;
}): string | null {
  return post.originalImageUrl || post.processedImageUrl || post.imageUrl || null;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Check if a post is still processing
 */
export function isPostProcessing(post: { status?: string }): boolean {
  return post.status === 'processing';
}
