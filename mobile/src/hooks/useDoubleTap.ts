/**
 * Double Tap Hook
 * Detects double tap gestures on any element
 */

import { useRef, useCallback } from 'react';

const DOUBLE_TAP_DELAY = 300;

export function useDoubleTap(
  onDoubleTap: () => void,
  onSingleTap?: () => void
) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      onDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap - trigger callback after delay if no second tap
      if (onSingleTap) {
        setTimeout(() => {
          if (lastTapRef.current === now) {
            onSingleTap();
          }
        }, DOUBLE_TAP_DELAY);
      }
    }
  }, [onDoubleTap, onSingleTap]);

  return handleTap;
}

export default useDoubleTap;
