export interface IconCategory {
  id: string;
  name: string;
  icons: string[];
}

export const COMMUNITY_ICON_CATEGORIES: IconCategory[] = [
  {
    id: 'general',
    name: 'General',
    icons: [
      'home', 'star', 'heart', 'flag', 'bookmark', 'bulb',
      'diamond', 'trophy', 'ribbon', 'sparkles', 'flame', 'flash',
      'shield', 'infinite', 'prism', 'cube',
    ],
  },
  {
    id: 'social',
    name: 'Social',
    icons: [
      'people', 'person', 'chatbubbles', 'megaphone', 'happy',
      'thumbs-up', 'globe', 'hand-left', 'chatbox', 'mail',
      'notifications', 'thumbs-down',
    ],
  },
  {
    id: 'creative',
    name: 'Creative',
    icons: [
      'color-palette', 'brush', 'musical-notes', 'camera', 'film',
      'mic', 'headset', 'pencil', 'easel', 'musical-note',
      'videocam', 'images',
    ],
  },
  {
    id: 'nature',
    name: 'Nature',
    icons: [
      'leaf', 'flower', 'paw', 'fish', 'earth', 'water',
      'sunny', 'moon', 'cloud', 'rose', 'bug', 'rainy',
    ],
  },
  {
    id: 'tech',
    name: 'Tech',
    icons: [
      'laptop', 'desktop', 'code-slash', 'game-controller', 'rocket',
      'terminal', 'wifi', 'hardware-chip', 'phone-portrait',
      'settings', 'construct', 'git-branch',
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    icons: [
      'football', 'basketball', 'bicycle', 'fitness', 'walk',
      'barbell', 'medal', 'tennisball', 'golf', 'american-football',
    ],
  },
  {
    id: 'food',
    name: 'Food',
    icons: [
      'restaurant', 'cafe', 'wine', 'beer', 'pizza',
      'nutrition', 'ice-cream', 'fast-food',
    ],
  },
  {
    id: 'travel',
    name: 'Travel',
    icons: [
      'airplane', 'car', 'boat', 'train', 'map',
      'compass', 'navigate', 'trail-sign', 'bed', 'bus',
    ],
  },
];

// Flat list of all icon names
export const ALL_COMMUNITY_ICONS = COMMUNITY_ICON_CATEGORIES.flatMap(c => c.icons);
