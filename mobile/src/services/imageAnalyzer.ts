/**
 * On-device image analysis for topic suggestions.
 *
 * Primary signal: ML Kit Image Labeling (semantic labels like "food", "dog", "plant")
 * Secondary signal: Color analysis from pixel data (tiebreaker/supplement)
 *
 * Both run concurrently via Promise.allSettled for graceful degradation.
 * No API calls — everything runs on-device.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import ImageLabeling from '@react-native-ml-kit/image-labeling';
import { unzlibSync } from 'fflate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  suggestedSlugs: string[];
  dominantColor: string; // hex
  isGreen: boolean;
  isBlue: boolean;
  isBrown: boolean;
  isColorful: boolean;
  isDark: boolean;
}

interface LabelMapping {
  slug: string;
  weight: number;
}

// ---------------------------------------------------------------------------
// ML Kit label → topic slug mapping
// Keys are lowercased ML Kit label strings. Each maps to one or more slugs
// with a weight indicating how strongly that label implies the topic.
// ---------------------------------------------------------------------------

const LABEL_TO_SLUG_MAP: Record<string, LabelMapping[]> = {
  // --- Nature / Outdoors ---
  'plant': [{ slug: 'plant-parents', weight: 5 }, { slug: 'outdoor-adventures', weight: 2 }],
  'flower': [{ slug: 'plant-parents', weight: 5 }, { slug: 'photography', weight: 1 }],
  'houseplant': [{ slug: 'plant-parents', weight: 5 }, { slug: 'cozy-home', weight: 2 }],
  'tree': [{ slug: 'plant-parents', weight: 3 }, { slug: 'outdoor-adventures', weight: 4 }],
  'garden': [{ slug: 'plant-parents', weight: 4 }, { slug: 'outdoor-adventures', weight: 3 }],
  'grass': [{ slug: 'outdoor-adventures', weight: 3 }, { slug: 'sports-fans', weight: 1 }],
  'forest': [{ slug: 'outdoor-adventures', weight: 5 }, { slug: 'photography', weight: 2 }],
  'mountain': [{ slug: 'outdoor-adventures', weight: 5 }, { slug: 'travel-diaries', weight: 3 }, { slug: 'photography', weight: 2 }],
  'sky': [{ slug: 'outdoor-adventures', weight: 3 }, { slug: 'photography', weight: 2 }],
  'lake': [{ slug: 'outdoor-adventures', weight: 4 }, { slug: 'travel-diaries', weight: 3 }],
  'river': [{ slug: 'outdoor-adventures', weight: 4 }, { slug: 'travel-diaries', weight: 2 }],
  'ocean': [{ slug: 'outdoor-adventures', weight: 4 }, { slug: 'travel-diaries', weight: 3 }],
  'beach': [{ slug: 'outdoor-adventures', weight: 4 }, { slug: 'travel-diaries', weight: 4 }],
  'waterfall': [{ slug: 'outdoor-adventures', weight: 5 }, { slug: 'travel-diaries', weight: 3 }],
  'rock': [{ slug: 'outdoor-adventures', weight: 3 }],
  'snow': [{ slug: 'outdoor-adventures', weight: 4 }, { slug: 'travel-diaries', weight: 2 }],
  'landscape': [{ slug: 'outdoor-adventures', weight: 4 }, { slug: 'photography', weight: 3 }],
  'nature': [{ slug: 'outdoor-adventures', weight: 4 }, { slug: 'plant-parents', weight: 2 }],
  'wilderness': [{ slug: 'outdoor-adventures', weight: 5 }],
  'hiking': [{ slug: 'outdoor-adventures', weight: 5 }, { slug: 'gym-life', weight: 1 }],
  'camping': [{ slug: 'outdoor-adventures', weight: 5 }],
  'trail': [{ slug: 'outdoor-adventures', weight: 5 }, { slug: 'runners-world', weight: 2 }],

  // --- Food & Drink ---
  'food': [{ slug: 'foodies', weight: 5 }],
  'meal': [{ slug: 'foodies', weight: 5 }],
  'dish': [{ slug: 'foodies', weight: 5 }],
  'cuisine': [{ slug: 'foodies', weight: 5 }],
  'recipe': [{ slug: 'foodies', weight: 5 }],
  'baked goods': [{ slug: 'foodies', weight: 5 }, { slug: 'diy-crafts', weight: 1 }],
  'bread': [{ slug: 'foodies', weight: 5 }],
  'cake': [{ slug: 'foodies', weight: 5 }],
  'dessert': [{ slug: 'foodies', weight: 5 }],
  'fruit': [{ slug: 'foodies', weight: 4 }],
  'vegetable': [{ slug: 'foodies', weight: 4 }],
  'meat': [{ slug: 'foodies', weight: 4 }],
  'seafood': [{ slug: 'foodies', weight: 4 }],
  'sushi': [{ slug: 'foodies', weight: 5 }],
  'pizza': [{ slug: 'foodies', weight: 5 }],
  'pasta': [{ slug: 'foodies', weight: 5 }],
  'salad': [{ slug: 'foodies', weight: 4 }],
  'sandwich': [{ slug: 'foodies', weight: 4 }],
  'snack': [{ slug: 'foodies', weight: 4 }],
  'breakfast': [{ slug: 'foodies', weight: 4 }],
  'fast food': [{ slug: 'foodies', weight: 4 }],
  'restaurant': [{ slug: 'foodies', weight: 4 }, { slug: 'travel-diaries', weight: 1 }],
  'coffee': [{ slug: 'coffee-tea', weight: 5 }, { slug: 'foodies', weight: 2 }],
  'tea': [{ slug: 'coffee-tea', weight: 5 }, { slug: 'foodies', weight: 1 }],
  'drink': [{ slug: 'coffee-tea', weight: 3 }, { slug: 'foodies', weight: 2 }],
  'beverage': [{ slug: 'coffee-tea', weight: 3 }, { slug: 'foodies', weight: 2 }],
  'cup': [{ slug: 'coffee-tea', weight: 3 }],
  'mug': [{ slug: 'coffee-tea', weight: 4 }],
  'espresso': [{ slug: 'coffee-tea', weight: 5 }],
  'latte': [{ slug: 'coffee-tea', weight: 5 }],

  // --- Pets / Animals ---
  'dog': [{ slug: 'pet-lovers', weight: 5 }],
  'cat': [{ slug: 'pet-lovers', weight: 5 }],
  'pet': [{ slug: 'pet-lovers', weight: 5 }],
  'puppy': [{ slug: 'pet-lovers', weight: 5 }],
  'kitten': [{ slug: 'pet-lovers', weight: 5 }],
  'animal': [{ slug: 'pet-lovers', weight: 4 }],
  'bird': [{ slug: 'pet-lovers', weight: 3 }, { slug: 'outdoor-adventures', weight: 2 }],
  'fish': [{ slug: 'pet-lovers', weight: 3 }],
  'rabbit': [{ slug: 'pet-lovers', weight: 4 }],
  'hamster': [{ slug: 'pet-lovers', weight: 4 }],
  'horse': [{ slug: 'pet-lovers', weight: 3 }, { slug: 'outdoor-adventures', weight: 2 }],
  'reptile': [{ slug: 'pet-lovers', weight: 4 }],
  'insect': [{ slug: 'science-nerds', weight: 2 }, { slug: 'outdoor-adventures', weight: 2 }],
  'wildlife': [{ slug: 'outdoor-adventures', weight: 4 }, { slug: 'photography', weight: 2 }],

  // --- Gaming / Tech ---
  'computer': [{ slug: 'pc-builders', weight: 5 }, { slug: 'gaming-hub', weight: 3 }],
  'laptop': [{ slug: 'pc-builders', weight: 4 }, { slug: 'coders-united', weight: 2 }],
  'keyboard': [{ slug: 'pc-builders', weight: 4 }, { slug: 'gaming-hub', weight: 2 }],
  'monitor': [{ slug: 'pc-builders', weight: 4 }, { slug: 'gaming-hub', weight: 2 }],
  'mouse': [{ slug: 'pc-builders', weight: 3 }, { slug: 'gaming-hub', weight: 2 }],
  'headphones': [{ slug: 'gaming-hub', weight: 3 }, { slug: 'music-makers', weight: 3 }],
  'gaming': [{ slug: 'gaming-hub', weight: 5 }],
  'game controller': [{ slug: 'gaming-hub', weight: 5 }],
  'joystick': [{ slug: 'gaming-hub', weight: 5 }],
  'video game': [{ slug: 'gaming-hub', weight: 5 }],
  'console': [{ slug: 'gaming-hub', weight: 5 }],
  'arcade': [{ slug: 'gaming-hub', weight: 4 }],
  'board game': [{ slug: 'board-game-geeks', weight: 5 }, { slug: 'gaming-hub', weight: 1 }],
  'dice': [{ slug: 'board-game-geeks', weight: 4 }],
  'card game': [{ slug: 'board-game-geeks', weight: 4 }],
  'electronics': [{ slug: 'pc-builders', weight: 3 }, { slug: 'tech-news', weight: 3 }],
  'gadget': [{ slug: 'tech-news', weight: 4 }],
  'phone': [{ slug: 'tech-news', weight: 3 }],
  'tablet': [{ slug: 'tech-news', weight: 3 }],
  'robot': [{ slug: 'ai-explorers', weight: 4 }, { slug: 'tech-news', weight: 2 }],
  'software': [{ slug: 'coders-united', weight: 4 }],
  'code': [{ slug: 'coders-united', weight: 5 }],
  'programming': [{ slug: 'coders-united', weight: 5 }],

  // --- Art & Creative ---
  'painting': [{ slug: 'digital-art', weight: 5 }],
  'drawing': [{ slug: 'digital-art', weight: 5 }],
  'art': [{ slug: 'digital-art', weight: 5 }],
  'illustration': [{ slug: 'digital-art', weight: 5 }],
  'sketch': [{ slug: 'digital-art', weight: 4 }],
  'sculpture': [{ slug: 'digital-art', weight: 4 }],
  'graffiti': [{ slug: 'digital-art', weight: 4 }],
  'mural': [{ slug: 'digital-art', weight: 4 }],
  'craft': [{ slug: 'diy-crafts', weight: 5 }],
  'handmade': [{ slug: 'diy-crafts', weight: 5 }],
  'knitting': [{ slug: 'diy-crafts', weight: 5 }],
  'sewing': [{ slug: 'diy-crafts', weight: 5 }],
  'pottery': [{ slug: 'diy-crafts', weight: 5 }, { slug: 'digital-art', weight: 1 }],
  'woodworking': [{ slug: 'diy-crafts', weight: 5 }],
  'animation': [{ slug: 'animation-station', weight: 5 }],
  'cartoon': [{ slug: 'animation-station', weight: 4 }, { slug: 'anime-manga', weight: 2 }],
  'anime': [{ slug: 'anime-manga', weight: 5 }],
  'manga': [{ slug: 'anime-manga', weight: 5 }],
  'comic': [{ slug: 'anime-manga', weight: 3 }, { slug: 'digital-art', weight: 2 }],
  'cosplay': [{ slug: 'cosplay-costumes', weight: 5 }, { slug: 'anime-manga', weight: 2 }],
  'costume': [{ slug: 'cosplay-costumes', weight: 5 }],

  // --- Photography / Travel ---
  'sunset': [{ slug: 'photography', weight: 5 }, { slug: 'travel-diaries', weight: 3 }],
  'sunrise': [{ slug: 'photography', weight: 5 }, { slug: 'travel-diaries', weight: 3 }],
  'camera': [{ slug: 'photography', weight: 5 }],
  'photograph': [{ slug: 'photography', weight: 4 }],
  'portrait': [{ slug: 'photography', weight: 4 }],
  'selfie': [{ slug: 'photography', weight: 3 }],
  'city': [{ slug: 'travel-diaries', weight: 4 }, { slug: 'photography', weight: 2 }],
  'cityscape': [{ slug: 'travel-diaries', weight: 4 }, { slug: 'photography', weight: 3 }],
  'skyline': [{ slug: 'travel-diaries', weight: 4 }, { slug: 'photography', weight: 3 }],
  'building': [{ slug: 'travel-diaries', weight: 3 }, { slug: 'photography', weight: 2 }],
  'architecture': [{ slug: 'travel-diaries', weight: 3 }, { slug: 'photography', weight: 3 }],
  'landmark': [{ slug: 'travel-diaries', weight: 5 }],
  'monument': [{ slug: 'travel-diaries', weight: 5 }, { slug: 'history-buffs', weight: 2 }],
  'bridge': [{ slug: 'travel-diaries', weight: 3 }, { slug: 'photography', weight: 2 }],
  'road': [{ slug: 'travel-diaries', weight: 3 }, { slug: 'outdoor-adventures', weight: 2 }],
  'airport': [{ slug: 'travel-diaries', weight: 4 }],
  'hotel': [{ slug: 'travel-diaries', weight: 4 }],
  'temple': [{ slug: 'travel-diaries', weight: 4 }, { slug: 'history-buffs', weight: 3 }],
  'castle': [{ slug: 'travel-diaries', weight: 4 }, { slug: 'history-buffs', weight: 3 }],
  'museum': [{ slug: 'travel-diaries', weight: 3 }, { slug: 'history-buffs', weight: 3 }],

  // --- Fashion ---
  'clothing': [{ slug: 'fashion-forward', weight: 5 }],
  'fashion': [{ slug: 'fashion-forward', weight: 5 }],
  'dress': [{ slug: 'fashion-forward', weight: 5 }],
  'shoe': [{ slug: 'fashion-forward', weight: 4 }],
  'sneaker': [{ slug: 'fashion-forward', weight: 4 }, { slug: 'runners-world', weight: 1 }],
  'hat': [{ slug: 'fashion-forward', weight: 4 }],
  'jacket': [{ slug: 'fashion-forward', weight: 4 }],
  'jewelry': [{ slug: 'fashion-forward', weight: 4 }, { slug: 'collectors-club', weight: 1 }],
  'watch': [{ slug: 'fashion-forward', weight: 3 }, { slug: 'collectors-club', weight: 2 }],
  'bag': [{ slug: 'fashion-forward', weight: 3 }],
  'handbag': [{ slug: 'fashion-forward', weight: 4 }],
  'sunglasses': [{ slug: 'fashion-forward', weight: 4 }],
  'outfit': [{ slug: 'fashion-forward', weight: 5 }],

  // --- Home ---
  'furniture': [{ slug: 'cozy-home', weight: 5 }],
  'couch': [{ slug: 'cozy-home', weight: 5 }],
  'sofa': [{ slug: 'cozy-home', weight: 5 }],
  'chair': [{ slug: 'cozy-home', weight: 3 }],
  'table': [{ slug: 'cozy-home', weight: 3 }],
  'bed': [{ slug: 'cozy-home', weight: 4 }],
  'pillow': [{ slug: 'cozy-home', weight: 4 }],
  'blanket': [{ slug: 'cozy-home', weight: 4 }],
  'lamp': [{ slug: 'cozy-home', weight: 3 }],
  'candle': [{ slug: 'cozy-home', weight: 4 }, { slug: 'mindfulness', weight: 1 }],
  'kitchen': [{ slug: 'cozy-home', weight: 3 }, { slug: 'foodies', weight: 2 }],
  'bathroom': [{ slug: 'cozy-home', weight: 3 }],
  'living room': [{ slug: 'cozy-home', weight: 4 }],
  'bedroom': [{ slug: 'cozy-home', weight: 4 }],
  'interior design': [{ slug: 'cozy-home', weight: 5 }],
  'decoration': [{ slug: 'cozy-home', weight: 4 }, { slug: 'diy-crafts', weight: 2 }],
  'shelf': [{ slug: 'cozy-home', weight: 3 }],
  'bookshelf': [{ slug: 'cozy-home', weight: 3 }, { slug: 'book-club', weight: 3 }],
  'rug': [{ slug: 'cozy-home', weight: 4 }],

  // --- Fitness / Sports ---
  'gym': [{ slug: 'gym-life', weight: 5 }],
  'exercise': [{ slug: 'gym-life', weight: 5 }],
  'workout': [{ slug: 'gym-life', weight: 5 }],
  'weightlifting': [{ slug: 'gym-life', weight: 5 }],
  'dumbbell': [{ slug: 'gym-life', weight: 5 }],
  'fitness': [{ slug: 'gym-life', weight: 5 }],
  'treadmill': [{ slug: 'gym-life', weight: 4 }, { slug: 'runners-world', weight: 2 }],
  'running': [{ slug: 'runners-world', weight: 5 }, { slug: 'gym-life', weight: 1 }],
  'marathon': [{ slug: 'runners-world', weight: 5 }],
  'jogging': [{ slug: 'runners-world', weight: 5 }],
  'yoga': [{ slug: 'yoga-flow', weight: 5 }, { slug: 'mindfulness', weight: 2 }],
  'meditation': [{ slug: 'mindfulness', weight: 5 }, { slug: 'yoga-flow', weight: 2 }],
  'stretching': [{ slug: 'yoga-flow', weight: 4 }, { slug: 'gym-life', weight: 1 }],
  'sport': [{ slug: 'sports-fans', weight: 5 }],
  'soccer': [{ slug: 'sports-fans', weight: 5 }],
  'football': [{ slug: 'sports-fans', weight: 5 }],
  'basketball': [{ slug: 'sports-fans', weight: 5 }],
  'baseball': [{ slug: 'sports-fans', weight: 5 }],
  'tennis': [{ slug: 'sports-fans', weight: 5 }],
  'swimming': [{ slug: 'sports-fans', weight: 4 }, { slug: 'gym-life', weight: 1 }],
  'cycling': [{ slug: 'sports-fans', weight: 4 }, { slug: 'outdoor-adventures', weight: 2 }],
  'bicycle': [{ slug: 'sports-fans', weight: 3 }, { slug: 'outdoor-adventures', weight: 3 }],
  'ball': [{ slug: 'sports-fans', weight: 3 }],
  'stadium': [{ slug: 'sports-fans', weight: 4 }],
  'martial arts': [{ slug: 'martial-arts', weight: 5 }],
  'karate': [{ slug: 'martial-arts', weight: 5 }],
  'boxing': [{ slug: 'martial-arts', weight: 5 }, { slug: 'gym-life', weight: 1 }],
  'judo': [{ slug: 'martial-arts', weight: 5 }],

  // --- Music ---
  'guitar': [{ slug: 'music-makers', weight: 5 }],
  'piano': [{ slug: 'music-makers', weight: 5 }],
  'drum': [{ slug: 'music-makers', weight: 5 }],
  'violin': [{ slug: 'music-makers', weight: 5 }],
  'musical instrument': [{ slug: 'music-makers', weight: 5 }],
  'music': [{ slug: 'music-makers', weight: 5 }],
  'concert': [{ slug: 'music-makers', weight: 4 }],
  'microphone': [{ slug: 'music-makers', weight: 4 }],
  'speaker': [{ slug: 'music-makers', weight: 3 }],
  'record': [{ slug: 'music-makers', weight: 3 }, { slug: 'collectors-club', weight: 2 }],

  // --- Books / Learning ---
  'book': [{ slug: 'book-club', weight: 5 }],
  'library': [{ slug: 'book-club', weight: 4 }, { slug: 'study-buddies', weight: 2 }],
  'reading': [{ slug: 'book-club', weight: 5 }],
  'notebook': [{ slug: 'study-buddies', weight: 3 }, { slug: 'writers-corner', weight: 2 }],
  'pen': [{ slug: 'writers-corner', weight: 3 }, { slug: 'study-buddies', weight: 2 }],
  'writing': [{ slug: 'writers-corner', weight: 5 }],
  'classroom': [{ slug: 'study-buddies', weight: 4 }],
  'school': [{ slug: 'study-buddies', weight: 4 }],
  'university': [{ slug: 'study-buddies', weight: 4 }],
  'laboratory': [{ slug: 'science-nerds', weight: 5 }],
  'science': [{ slug: 'science-nerds', weight: 5 }],
  'microscope': [{ slug: 'science-nerds', weight: 5 }],
  'telescope': [{ slug: 'science-nerds', weight: 4 }, { slug: 'outdoor-adventures', weight: 1 }],
  'experiment': [{ slug: 'science-nerds', weight: 5 }],
  'globe': [{ slug: 'travel-diaries', weight: 2 }, { slug: 'study-buddies', weight: 2 }],

  // --- Collectibles ---
  'toy': [{ slug: 'collectors-club', weight: 3 }],
  'figurine': [{ slug: 'collectors-club', weight: 5 }, { slug: 'anime-manga', weight: 1 }],
  'coin': [{ slug: 'collectors-club', weight: 4 }],
  'stamp': [{ slug: 'collectors-club', weight: 4 }],
  'antique': [{ slug: 'collectors-club', weight: 4 }, { slug: 'history-buffs', weight: 2 }],
  'vintage': [{ slug: 'collectors-club', weight: 4 }],

  // --- Vehicles / Transport ---
  'car': [{ slug: 'travel-diaries', weight: 2 }],
  'motorcycle': [{ slug: 'outdoor-adventures', weight: 2 }],
  'boat': [{ slug: 'travel-diaries', weight: 3 }, { slug: 'outdoor-adventures', weight: 2 }],
  'airplane': [{ slug: 'travel-diaries', weight: 4 }],
  'train': [{ slug: 'travel-diaries', weight: 3 }],

  // --- Mindfulness / Wellness ---
  'spa': [{ slug: 'mindfulness', weight: 4 }],
  'zen': [{ slug: 'mindfulness', weight: 5 }],
  'incense': [{ slug: 'mindfulness', weight: 4 }],
  'crystal': [{ slug: 'mindfulness', weight: 3 }, { slug: 'collectors-club', weight: 1 }],
  'journal': [{ slug: 'mindfulness', weight: 3 }, { slug: 'writers-corner', weight: 3 }],
};

// ---------------------------------------------------------------------------
// Color-based scoring — weak tiebreaker when ML labels exist,
// full-strength fallback when ML Kit is unavailable
// ---------------------------------------------------------------------------

interface ColorSlugBoost {
  slug: string;
  boost: number;       // weak weight when ML labels exist (tiebreaker)
  fallback: number;    // full weight when ML Kit unavailable (primary)
  condition: (flags: Record<string, boolean>) => boolean;
}

const COLOR_SLUG_BOOSTS: ColorSlugBoost[] = [
  // Nature/outdoors — green + bright
  { slug: 'outdoor-adventures', boost: 1.0, fallback: 4, condition: f => f.isGreen && f.isBright },
  { slug: 'plant-parents',      boost: 1.0, fallback: 5, condition: f => f.isGreen },

  // Food — brown/warm
  { slug: 'foodies',            boost: 0.5, fallback: 4, condition: f => f.isBrown && f.isWarmHue },
  { slug: 'coffee-tea',         boost: 0.5, fallback: 5, condition: f => f.isBrown && f.isDark },

  // Sky/ocean — blue + bright
  { slug: 'travel-diaries',     boost: 0.5, fallback: 5, condition: f => f.isBlue && f.isBright },
  { slug: 'photography',        boost: 0.5, fallback: 4, condition: f => f.isColorful },

  // Art — very colorful/saturated
  { slug: 'digital-art',        boost: 1.0, fallback: 5, condition: f => f.isColorful && f.satAbove05 },
  { slug: 'fashion-forward',    boost: 0.5, fallback: 4, condition: f => f.isColorful && f.isBright },

  // Gaming/tech — dark with color
  { slug: 'gaming-hub',         boost: 0.5, fallback: 4, condition: f => f.isDark && f.isColorful },
  { slug: 'pc-builders',        boost: 0.5, fallback: 4, condition: f => f.isDark && f.isBlue },

  // Home — warm neutrals
  { slug: 'cozy-home',          boost: 0.5, fallback: 4, condition: f => f.isBrown && f.isNeutral },

  // Pets — warm browns
  { slug: 'pet-lovers',         boost: 0.5, fallback: 4, condition: f => f.isBrown && f.isWarmHue && !f.isDark },

  // Fitness — neutral/dark
  { slug: 'gym-life',           boost: 0.5, fallback: 4, condition: f => f.isNeutral && f.isDark },

  // Mindfulness — bright, calm
  { slug: 'mindfulness',        boost: 0.5, fallback: 3, condition: f => f.isBright && !f.isColorful },
];

// ---------------------------------------------------------------------------
// PNG decoding utilities (kept from original)
// ---------------------------------------------------------------------------

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return [h * 360, s, l];
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngPixels(base64: string): [number, number, number][] {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const ihdrOffset = 8 + 4 + 4;
    const width = (bytes[ihdrOffset] << 24) | (bytes[ihdrOffset + 1] << 16) |
                  (bytes[ihdrOffset + 2] << 8) | bytes[ihdrOffset + 3];
    const height = (bytes[ihdrOffset + 4] << 24) | (bytes[ihdrOffset + 5] << 16) |
                   (bytes[ihdrOffset + 6] << 8) | bytes[ihdrOffset + 7];
    const colorType = bytes[ihdrOffset + 9];

    const bytesPerPixel = colorType === 6 ? 4 : 3;
    const stride = width * bytesPerPixel + 1;

    let offset = 8;
    const idatChunks: Uint8Array[] = [];

    while (offset < bytes.length - 8) {
      const chunkLen = (bytes[offset] << 24) | (bytes[offset + 1] << 16) |
                       (bytes[offset + 2] << 8) | bytes[offset + 3];
      const chunkType = String.fromCharCode(
        bytes[offset + 4], bytes[offset + 5],
        bytes[offset + 6], bytes[offset + 7]
      );

      if (chunkType === 'IDAT') {
        idatChunks.push(bytes.slice(offset + 8, offset + 8 + chunkLen));
      } else if (chunkType === 'IEND') {
        break;
      }

      offset += 12 + chunkLen;
    }

    if (idatChunks.length === 0) return [];

    const totalLen = idatChunks.reduce((sum, c) => sum + c.length, 0);
    const compressedData = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of idatChunks) {
      compressedData.set(chunk, pos);
      pos += chunk.length;
    }

    const raw = unzlibSync(compressedData);

    const pixelData = new Uint8Array(width * height * bytesPerPixel);

    for (let y = 0; y < height; y++) {
      const filterType = raw[y * stride];
      const rowStart = y * stride + 1;
      const outRowStart = y * width * bytesPerPixel;

      for (let x = 0; x < width * bytesPerPixel; x++) {
        const rawByte = raw[rowStart + x];

        const a = x >= bytesPerPixel ? pixelData[outRowStart + x - bytesPerPixel] : 0;
        const b = y > 0 ? pixelData[outRowStart - width * bytesPerPixel + x] : 0;
        const c = (y > 0 && x >= bytesPerPixel)
          ? pixelData[outRowStart - width * bytesPerPixel + x - bytesPerPixel]
          : 0;

        let decoded: number;
        switch (filterType) {
          case 0: decoded = rawByte; break;
          case 1: decoded = (rawByte + a) & 0xFF; break;
          case 2: decoded = (rawByte + b) & 0xFF; break;
          case 3: decoded = (rawByte + Math.floor((a + b) / 2)) & 0xFF; break;
          case 4: decoded = (rawByte + paethPredictor(a, b, c)) & 0xFF; break;
          default: decoded = rawByte; break;
        }

        pixelData[outRowStart + x] = decoded;
      }
    }

    const pixels: [number, number, number][] = [];
    for (let i = 0; i < width * height; i++) {
      const off = i * bytesPerPixel;
      pixels.push([pixelData[off], pixelData[off + 1], pixelData[off + 2]]);
    }

    return pixels;
  } catch (error) {
    console.error('PNG decode error:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// ML Kit labeling
// ---------------------------------------------------------------------------

interface MLLabel {
  text: string;
  confidence: number;
}

async function getMLLabels(imageUri: string): Promise<MLLabel[]> {
  const results = await ImageLabeling.label(imageUri);
  return results
    .filter((r: MLLabel) => r.confidence >= 0.5)
    .map((r: MLLabel) => ({ text: r.text.toLowerCase(), confidence: r.confidence }));
}

function scoreFromLabels(labels: MLLabel[]): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const label of labels) {
    const mappings = LABEL_TO_SLUG_MAP[label.text];
    if (!mappings) continue;

    for (const { slug, weight } of mappings) {
      scores[slug] = (scores[slug] || 0) + weight * label.confidence;
    }
  }

  return scores;
}

// ---------------------------------------------------------------------------
// Color analysis (extracted from original)
// ---------------------------------------------------------------------------

interface ColorFlags extends Record<string, boolean> {
  isGreen: boolean;
  isBlue: boolean;
  isBrown: boolean;
  isRed: boolean;
  isDark: boolean;
  isBright: boolean;
  isColorful: boolean;
  isNeutral: boolean;
  isWarmHue: boolean;
  satAbove05: boolean;
}

interface ColorData {
  flags: ColorFlags;
  dominantColor: string;
  isGreen: boolean;
  isBlue: boolean;
  isBrown: boolean;
  isColorful: boolean;
  isDark: boolean;
}

async function getColorData(imageUri: string): Promise<ColorData> {
  const tiny = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 8, height: 8 } }],
    { format: ImageManipulator.SaveFormat.PNG, base64: true }
  );

  if (!tiny.base64) {
    throw new Error('No base64 from ImageManipulator');
  }

  const pixels = decodePngPixels(tiny.base64);
  if (pixels.length === 0) {
    throw new Error('No pixels decoded');
  }

  let totalR = 0, totalG = 0, totalB = 0;
  let greenPixels = 0, bluePixels = 0, brownPixels = 0, redPixels = 0;
  let darkPixels = 0, brightPixels = 0;
  let warmHuePixels = 0;
  let totalSaturation = 0;

  for (const [r, g, b] of pixels) {
    totalR += r;
    totalG += g;
    totalB += b;

    const [h, s, l] = rgbToHsl(r, g, b);
    totalSaturation += s;

    if (l < 0.3) darkPixels++;
    if (l > 0.7) brightPixels++;
    if (h >= 80 && h <= 160 && s > 0.15 && l > 0.1 && l < 0.85) greenPixels++;
    if (h >= 190 && h <= 260 && s > 0.15) bluePixels++;
    if (h >= 10 && h <= 50 && s > 0.1 && l > 0.15 && l < 0.75) brownPixels++;
    if ((h <= 15 || h >= 340) && s > 0.2) redPixels++;
    if ((h <= 60 || h >= 330) && s > 0.1) warmHuePixels++;
  }

  const n = pixels.length;
  const avgR = Math.round(totalR / n);
  const avgG = Math.round(totalG / n);
  const avgB = Math.round(totalB / n);
  const avgSaturation = totalSaturation / n;

  const isGreen = greenPixels / n > 0.25;
  const isBlue = bluePixels / n > 0.25;
  const isBrown = brownPixels / n > 0.2;
  const isRed = redPixels / n > 0.15;
  const isDark = darkPixels / n > 0.4;
  const isBright = brightPixels / n > 0.4;
  const isColorful = avgSaturation > 0.4;
  const isNeutral = avgSaturation < 0.15;
  const isWarmHue = warmHuePixels / n > 0.3;

  const flags: ColorFlags = {
    isGreen, isBlue, isBrown, isRed, isDark, isBright,
    isColorful, isNeutral, isWarmHue,
    satAbove05: avgSaturation > 0.5,
  };

  const dominantColor = `#${avgR.toString(16).padStart(2, '0')}${avgG.toString(16).padStart(2, '0')}${avgB.toString(16).padStart(2, '0')}`;

  return { flags, dominantColor, isGreen, isBlue, isBrown, isColorful, isDark };
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

function defaultResult(): AnalysisResult {
  return {
    suggestedSlugs: [],
    dominantColor: '#808080',
    isGreen: false,
    isBlue: false,
    isBrown: false,
    isColorful: false,
    isDark: false,
  };
}

/**
 * Analyze an image and return suggested topic slugs.
 *
 * 1. Runs ML Kit image labeling and color analysis concurrently
 * 2. ML Kit labels are the primary signal (mapped to topic slugs with weights)
 * 3. Color flags provide weak tiebreaker boosts when ML labels exist,
 *    or full-strength scoring when ML Kit is unavailable (fallback)
 * 4. Returns top 3 slugs above threshold
 * 5. Falls back gracefully if either analysis fails
 */
export async function analyzeImage(imageUri: string): Promise<AnalysisResult> {
  try {
    const [mlResult, colorResult] = await Promise.allSettled([
      getMLLabels(imageUri),
      getColorData(imageUri),
    ]);

    const labels = mlResult.status === 'fulfilled' ? mlResult.value : [];
    const color = colorResult.status === 'fulfilled' ? colorResult.value : null;

    if (labels.length === 0 && !color) {
      return defaultResult();
    }

    // Primary: ML label scores
    const scores = scoreFromLabels(labels);
    const mlAvailable = labels.length > 0;

    // Color scoring: weak tiebreaker when ML labels exist,
    // full-strength fallback when ML Kit is unavailable
    if (color) {
      for (const { slug, boost, fallback, condition } of COLOR_SLUG_BOOSTS) {
        if (condition(color.flags)) {
          const weight = mlAvailable ? boost : fallback;
          scores[slug] = (scores[slug] || 0) + weight;
        }
      }
    }

    // Threshold: lower for color-only fallback since color is less precise
    const THRESHOLD = mlAvailable ? 2.0 : 3.0;
    const sorted = Object.entries(scores)
      .filter(([, score]) => score >= THRESHOLD)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const suggestedSlugs = sorted.map(([slug]) => slug);

    return {
      suggestedSlugs,
      dominantColor: color?.dominantColor ?? '#808080',
      isGreen: color?.isGreen ?? false,
      isBlue: color?.isBlue ?? false,
      isBrown: color?.isBrown ?? false,
      isColorful: color?.isColorful ?? false,
      isDark: color?.isDark ?? false,
    };
  } catch (error) {
    console.error('Image analysis error:', error);
    return defaultResult();
  }
}
