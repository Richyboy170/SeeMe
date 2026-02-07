import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

const REACTIONS = [
  { key: 'heart', emoji: '\u2764\uFE0F' },
  { key: 'laugh', emoji: '\uD83D\uDE02' },
  { key: 'wow', emoji: '\uD83D\uDE2E' },
  { key: 'sad', emoji: '\uD83D\uDE22' },
  { key: 'angry', emoji: '\uD83D\uDE21' },
  { key: 'thumbsup', emoji: '\uD83D\uDC4D' },
] as const;

interface ReactionBarProps {
  visible: boolean;
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

export default function ReactionBar({
  visible,
  onSelectEmoji,
  onClose,
  position,
}: ReactionBarProps) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (emojiKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectEmoji(emojiKey);
  };

  const containerBackground = isDark ? '#1E1E1E' : '#FFFFFF';
  const shadowColor = isDark ? '#000000' : '#000000';

  const positionStyle = position
    ? { position: 'absolute' as const, left: position.x, top: position.y }
    : {};

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          backgroundColor: containerBackground,
          shadowColor,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
        positionStyle,
      ]}
    >
      {REACTIONS.map((reaction) => (
        <TouchableOpacity
          key={reaction.key}
          style={styles.emojiButton}
          onPress={() => handleSelect(reaction.key)}
          activeOpacity={0.6}
        >
          <Animated.Text style={styles.emoji}>{reaction.emoji}</Animated.Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emojiButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  emoji: {
    fontSize: 28,
  },
});
