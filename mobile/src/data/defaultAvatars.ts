/**
 * Default Avatar Models (CC0 Licensed)
 * Phase 3.1.2: 3D Rendering
 *
 * Pre-configured VRM avatar models for users to choose from.
 * All models are CC0 (Public Domain) or MIT licensed.
 *
 * Sources:
 * - VRoid Official CC0 Models: https://github.com/madjin/vrm-samples
 * - VRM Consortium samples
 *
 * Note: Replace CDN URLs with your actual hosted model URLs.
 * Models should be hosted on a CDN for fast loading.
 */

// ============================================================
// TYPES
// ============================================================

export interface DefaultAvatar {
  id: string;
  name: string;
  description: string;
  style: 'anime' | 'cartoon' | 'realistic' | 'minimalist';
  gender: 'male' | 'female' | 'neutral';
  modelUrl: string;
  thumbnailUrl: string;
  supportsColorCustomization: boolean;
  fileSize: string; // For user info (e.g., "2.5 MB")
  license: 'CC0' | 'MIT' | 'CC-BY';
}

export interface AvatarCategory {
  id: string;
  name: string;
  description: string;
}

// ============================================================
// AVATAR CATEGORIES
// ============================================================

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  {
    id: 'all',
    name: 'All',
    description: 'All available avatars',
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese anime style avatars',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    description: 'Western cartoon style avatars',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Simple, clean designs',
  },
];

// ============================================================
// DEFAULT AVATARS
// ============================================================

/**
 * Default VRM avatars available to all users.
 *
 * IMPORTANT: Replace these placeholder URLs with your actual CDN URLs
 * after downloading and hosting the VRM files.
 *
 * Recommended hosting: AWS S3, Cloudflare R2, or similar CDN.
 */
export const DEFAULT_AVATARS: DefaultAvatar[] = [
  {
    id: 'avatar_sakura',
    name: 'Sakura',
    description: 'Classic anime girl with customizable colors',
    style: 'anime',
    gender: 'female',
    modelUrl: 'https://cdn.seeme.app/avatars/vrm/sakura.vrm',
    thumbnailUrl: 'https://cdn.seeme.app/avatars/thumbs/sakura.png',
    supportsColorCustomization: true,
    fileSize: '2.8 MB',
    license: 'CC0',
  },
  {
    id: 'avatar_hikaru',
    name: 'Hikaru',
    description: 'Stylish anime boy with modern look',
    style: 'anime',
    gender: 'male',
    modelUrl: 'https://cdn.seeme.app/avatars/vrm/hikaru.vrm',
    thumbnailUrl: 'https://cdn.seeme.app/avatars/thumbs/hikaru.png',
    supportsColorCustomization: true,
    fileSize: '2.5 MB',
    license: 'CC0',
  },
  {
    id: 'avatar_shadow',
    name: 'Shadow',
    description: 'Dark gothic style with mysterious vibe',
    style: 'anime',
    gender: 'neutral',
    modelUrl: 'https://cdn.seeme.app/avatars/vrm/shadow.vrm',
    thumbnailUrl: 'https://cdn.seeme.app/avatars/thumbs/shadow.png',
    supportsColorCustomization: true,
    fileSize: '3.1 MB',
    license: 'CC0',
  },
  {
    id: 'avatar_luna',
    name: 'Luna',
    description: 'Cute casual style with bright colors',
    style: 'anime',
    gender: 'female',
    modelUrl: 'https://cdn.seeme.app/avatars/vrm/luna.vrm',
    thumbnailUrl: 'https://cdn.seeme.app/avatars/thumbs/luna.png',
    supportsColorCustomization: true,
    fileSize: '2.6 MB',
    license: 'CC0',
  },
  {
    id: 'avatar_kai',
    name: 'Kai',
    description: 'Sporty and energetic style',
    style: 'cartoon',
    gender: 'male',
    modelUrl: 'https://cdn.seeme.app/avatars/vrm/kai.vrm',
    thumbnailUrl: 'https://cdn.seeme.app/avatars/thumbs/kai.png',
    supportsColorCustomization: true,
    fileSize: '2.2 MB',
    license: 'CC0',
  },
  {
    id: 'avatar_pixel',
    name: 'Pixel',
    description: 'Minimalist design with clean lines',
    style: 'minimalist',
    gender: 'neutral',
    modelUrl: 'https://cdn.seeme.app/avatars/vrm/pixel.vrm',
    thumbnailUrl: 'https://cdn.seeme.app/avatars/thumbs/pixel.png',
    supportsColorCustomization: true,
    fileSize: '1.8 MB',
    license: 'CC0',
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get avatar by ID
 */
export const getAvatarById = (id: string): DefaultAvatar | undefined => {
  return DEFAULT_AVATARS.find((avatar) => avatar.id === id);
};

/**
 * Get avatars by style
 */
export const getAvatarsByStyle = (style: DefaultAvatar['style']): DefaultAvatar[] => {
  return DEFAULT_AVATARS.filter((avatar) => avatar.style === style);
};

/**
 * Get avatars by gender
 */
export const getAvatarsByGender = (gender: DefaultAvatar['gender']): DefaultAvatar[] => {
  return DEFAULT_AVATARS.filter((avatar) => avatar.gender === gender);
};

/**
 * Get all avatars that support color customization
 */
export const getCustomizableAvatars = (): DefaultAvatar[] => {
  return DEFAULT_AVATARS.filter((avatar) => avatar.supportsColorCustomization);
};

/**
 * Get the first/default avatar
 */
export const getDefaultAvatar = (): DefaultAvatar => {
  return DEFAULT_AVATARS[0];
};

// ============================================================
// COLOR PRESETS
// ============================================================

export interface ColorPreset {
  id: string;
  name: string;
  color: string;
}

export const SKIN_COLOR_PRESETS: ColorPreset[] = [
  { id: 'skin_1', name: 'Light', color: '#FFE0BD' },
  { id: 'skin_2', name: 'Fair', color: '#FFCD94' },
  { id: 'skin_3', name: 'Medium', color: '#EAC086' },
  { id: 'skin_4', name: 'Tan', color: '#C68642' },
  { id: 'skin_5', name: 'Brown', color: '#8D5524' },
  { id: 'skin_6', name: 'Dark', color: '#5C3317' },
];

export const HAIR_COLOR_PRESETS: ColorPreset[] = [
  { id: 'hair_1', name: 'Black', color: '#2C1810' },
  { id: 'hair_2', name: 'Dark Brown', color: '#4A3728' },
  { id: 'hair_3', name: 'Brown', color: '#8B4513' },
  { id: 'hair_4', name: 'Golden', color: '#D4A76A' },
  { id: 'hair_5', name: 'Blonde', color: '#E8D4B8' },
  { id: 'hair_6', name: 'Ginger', color: '#B8860B' },
  { id: 'hair_7', name: 'Red', color: '#FF6B6B' },
  { id: 'hair_8', name: 'Purple', color: '#9370DB' },
  { id: 'hair_9', name: 'Blue', color: '#4A90D9' },
  { id: 'hair_10', name: 'Pink', color: '#FF69B4' },
];

export const EYE_COLOR_PRESETS: ColorPreset[] = [
  { id: 'eye_1', name: 'Brown', color: '#4A3728' },
  { id: 'eye_2', name: 'Hazel', color: '#634E34' },
  { id: 'eye_3', name: 'Blue', color: '#2E536F' },
  { id: 'eye_4', name: 'Green', color: '#3D9970' },
  { id: 'eye_5', name: 'Gray', color: '#7B8D8E' },
  { id: 'eye_6', name: 'Light Blue', color: '#7FDBFF' },
  { id: 'eye_7', name: 'Purple', color: '#B10DC9' },
  { id: 'eye_8', name: 'Red', color: '#DC143C' },
];

/**
 * Get color preset by ID
 */
export const getColorPreset = (
  presets: ColorPreset[],
  id: string
): ColorPreset | undefined => {
  return presets.find((preset) => preset.id === id);
};

// ============================================================
// DOWNLOAD SOURCES (for development reference)
// ============================================================

/**
 * Where to get free CC0 VRM models:
 *
 * 1. VRoid Hub (some CC0 models):
 *    https://hub.vroid.com/
 *
 * 2. VRM Samples (GitHub):
 *    https://github.com/madjin/vrm-samples
 *
 * 3. VRM Consortium official samples:
 *    https://github.com/vrm-c/UniVRM/tree/master/Tests/Models
 *
 * 4. ReadyPlayerMe (requires API key, not CC0 but good quality):
 *    https://readyplayer.me/
 *
 * Steps to add new avatars:
 * 1. Download VRM file from source
 * 2. Verify license is CC0 or compatible
 * 3. Upload to your CDN
 * 4. Create thumbnail image
 * 5. Add entry to DEFAULT_AVATARS array
 */
