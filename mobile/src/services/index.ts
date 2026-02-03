// Main API service
export { api, getImageUrl } from './api';

// Post interaction functions
export {
  // Like functions
  likePost,
  unlikePost,
  toggleLike,

  // Save functions
  savePost,
  unsavePost,
  toggleSave,
  getSavedPosts,

  // Share functions
  sharePostToChat,

  // Tracking functions
  trackInteraction,
  trackLike,
  trackSave,
  trackShare,
  trackCommentView,
  trackProfileView,
  trackPostView,
} from './postInteractionService';

// Share service - external sharing via native share sheet
export {
  sharePost,
  sharePostToApp,
  copyPostLink,
  getPostShareUrl,
  generateShareMessage,
  type ShareablePost,
  type ShareResult,
} from './shareService';

// Repost service - retweet/repost functionality
export {
  repostPost,
  quotePost,
  unrepostPost,
  toggleRepost,
  checkRepostStatus,
  getPostReposts,
  getUserReposts,
  type RepostType,
  type RepostResult,
  type RepostData,
  type RepostStatus,
} from './repostService';
