/**
 * App color palette - Instagram-inspired theme
 */

export const Colors = {
  // Primary gradient colors (Instagram style)
  gradient: {
    start: '#405DE6',
    middle: '#833AB4',
    end: '#E1306C',
    secondary: '#F77737',
    tertiary: '#FCAF45',
  },

  // Brand colors
  brand: {
    primary: '#833AB4',
    secondary: '#405DE6',
    accent: '#E1306C',
    blue: '#0095F6',
    green: '#00A400',
  },

  // Light theme
  light: {
    background: '#FFFFFF',
    surface: '#FAFAFA',
    surfaceVariant: '#EFEFEF',
    border: '#DBDBDB',
    borderLight: '#EFEFEF',

    text: {
      primary: '#262626',
      secondary: '#8E8E8E',
      tertiary: '#C7C7C7',
      inverse: '#FFFFFF',
      link: '#0095F6',
    },

    icon: {
      primary: '#262626',
      secondary: '#8E8E8E',
      tertiary: '#C7C7C7',
    },

    // Chat specific
    chat: {
      ownBubble: ['#405DE6', '#5851DB', '#833AB4', '#C13584', '#E1306C'] as const,
      otherBubble: '#EFEFEF',
      inputBackground: '#EFEFEF',
      inputBorder: '#DBDBDB',
    },

    // Status colors
    status: {
      online: '#00A400',
      away: '#F77737',
      offline: '#8E8E8E',
    },
  },

  // Dark theme
  dark: {
    background: '#000000',
    surface: '#121212',
    surfaceVariant: '#262626',
    border: '#363636',
    borderLight: '#262626',

    text: {
      primary: '#FAFAFA',
      secondary: '#A8A8A8',
      tertiary: '#737373',
      inverse: '#262626',
      link: '#0095F6',
    },

    icon: {
      primary: '#FAFAFA',
      secondary: '#A8A8A8',
      tertiary: '#737373',
    },

    // Chat specific
    chat: {
      ownBubble: ['#405DE6', '#5851DB', '#833AB4', '#C13584', '#E1306C'] as const,
      otherBubble: '#262626',
      inputBackground: '#262626',
      inputBorder: '#363636',
    },

    // Status colors
    status: {
      online: '#00A400',
      away: '#F77737',
      offline: '#737373',
    },
  },

  // Common colors (same in both themes)
  common: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    error: '#ED4956',
    warning: '#F77737',
    success: '#00A400',
    info: '#0095F6',
  },
};

export type ThemeColors = typeof Colors.light;
export type ColorScheme = 'light' | 'dark';
