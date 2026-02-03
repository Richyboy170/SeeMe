/**
 * Heart Animation Hook
 * Handles the double-tap heart animation for posts
 */

import { useRef, useState, useCallback } from 'react';
import { Animated } from 'react-native';

export function useHeartAnimation() {
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const [animatingPostId, setAnimatingPostId] = useState<string | null>(null);

  const animateHeart = useCallback((postId: string) => {
    setAnimatingPostId(postId);
    heartScale.setValue(0);
    heartOpacity.setValue(1);

    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAnimatingPostId(null);
    });
  }, [heartScale, heartOpacity]);

  const isAnimating = useCallback((postId: string) => {
    return animatingPostId === postId;
  }, [animatingPostId]);

  return {
    animatingPostId,
    heartScale,
    heartOpacity,
    animateHeart,
    isAnimating,
  };
}

export default useHeartAnimation;
