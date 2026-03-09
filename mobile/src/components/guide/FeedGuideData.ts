import { Dimensions } from 'react-native';

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  /** Return spotlight rect; null means skip this step */
  getSpotlight: (layout: LayoutInfo) => SpotlightRect | null;
}

export interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

export interface LayoutInfo {
  screenWidth: number;
  screenHeight: number;
  insetTop: number;
  insetBottom: number;
  hasPost: boolean;
  firstPostHasImage: boolean;
}

// Header measurements (from styles)
const HEADER_H_PAD = 16;
const HEADER_BOTTOM_PAD = 12;
const HEADER_BORDER = 1;

// Post card measurements (from styles: tweetContainer paddingHorizontal: 16, paddingVertical: 12)
const POST_H_PAD = 16;
const POST_V_PAD = 12;
const AVATAR_SIZE = 40;
const AVATAR_MARGIN_RIGHT = 10;
const CONTENT_LEFT = POST_H_PAD + AVATAR_SIZE + AVATAR_MARGIN_RIGHT; // ~66

// Action row
const ACTION_ROW_MT = 12;
const ACTION_BTN_HEIGHT = 22;

function headerTop(insetTop: number) {
  return insetTop;
}

function headerBottom(insetTop: number) {
  return insetTop + 44 + HEADER_BOTTOM_PAD + HEADER_BORDER;
}

/** Approximate Y where first post starts (below header + filter/caught-up banner ~0) */
function postTop(insetTop: number) {
  return headerBottom(insetTop) + 4;
}

export const FEED_GUIDE_STEPS: GuideStep[] = [
  // 1 - Home Title
  {
    id: 'home-title',
    title: 'Home Feed',
    description: 'Your main feed where you see posts from friends and communities you follow.',
    icon: 'home-outline',
    getSpotlight: ({ screenWidth, insetTop }) => {
      const y = headerTop(insetTop) + 4;
      return {
        x: HEADER_H_PAD + 36,
        y,
        width: 80,
        height: 36,
        borderRadius: 8,
      };
    },
  },
  // 2 - Messages Button
  {
    id: 'messages-button',
    title: 'Messages',
    description: 'Tap to open conversations, or swipe left from the right edge. A badge shows unread messages.',
    icon: 'chatbubbles-outline',
    getSpotlight: ({ screenWidth, insetTop }) => ({
      x: screenWidth - HEADER_H_PAD - 36,
      y: headerTop(insetTop) + 4,
      width: 36,
      height: 36,
      borderRadius: 18,
    }),
  },
  // 3 - Post Actions (comment + like area)
  {
    id: 'post-actions',
    title: 'Interact with Posts',
    description: 'Like, comment, repost, and share. Double-tap any post to like it! Positive comments earn Kindness Coins.',
    icon: 'heart-outline',
    getSpotlight: ({ screenWidth, insetTop, hasPost, firstPostHasImage }) => {
      if (!hasPost) return null;
      const imgExtra = firstPostHasImage ? 190 : 0;
      const y = postTop(insetTop) + POST_V_PAD + 76 + imgExtra + ACTION_ROW_MT;
      return {
        x: CONTENT_LEFT,
        y,
        width: screenWidth - CONTENT_LEFT - POST_H_PAD,
        height: ACTION_BTN_HEIGHT,
        borderRadius: 6,
      };
    },
  },
  // 4 - Gift Button
  {
    id: 'gift-button',
    title: 'Give Coins',
    description: 'Press and hold the gift icon to send Kindness Coins to someone. Slide your finger to pick the amount!',
    icon: 'gift-outline',
    getSpotlight: ({ insetTop, hasPost, firstPostHasImage }) => {
      if (!hasPost) return null;
      const imgExtra = firstPostHasImage ? 190 : 0;
      const y = postTop(insetTop) + POST_V_PAD + 76 + imgExtra + ACTION_ROW_MT;
      return {
        x: CONTENT_LEFT + 96,
        y,
        width: 40,
        height: ACTION_BTN_HEIGHT,
        borderRadius: 6,
      };
    },
  },
];
