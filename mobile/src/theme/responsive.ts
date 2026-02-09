import { useWindowDimensions } from 'react-native';

const SMALL_BREAKPOINT = 375;
const TABLET_BREAKPOINT = 600;
const MAX_CONTENT_WIDTH = 600;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isSmall = width < SMALL_BREAKPOINT;
  const isMedium = width >= SMALL_BREAKPOINT && width < TABLET_BREAKPOINT;
  const isLarge = width >= TABLET_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT;
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);

  return {
    isSmall,
    isMedium,
    isLarge,
    isTablet,
    screenWidth: width,
    screenHeight: height,
    contentWidth,
  };
}

/**
 * Responsive font/size scaling.
 * Scales down slightly on small screens (<375) and up on tablets (>600).
 */
export function rs(size: number, screenWidth: number): number {
  if (screenWidth < SMALL_BREAKPOINT) {
    return Math.round(size * 0.9);
  }
  if (screenWidth >= TABLET_BREAKPOINT) {
    return Math.round(size * 1.1);
  }
  return size;
}

export { SMALL_BREAKPOINT, TABLET_BREAKPOINT, MAX_CONTENT_WIDTH };
