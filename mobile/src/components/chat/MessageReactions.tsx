import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme';

const EMOJI_DISPLAY: Record<string, string> = {
  heart: '\u2764\uFE0F',
  laugh: '\uD83D\uDE02',
  wow: '\uD83D\uDE2E',
  sad: '\uD83D\uDE22',
  angry: '\uD83D\uDE21',
  thumbsup: '\uD83D\uDC4D',
};

interface ReactionUser {
  id: string;
  username: string;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: ReactionUser;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  isOwnMessage: boolean;
  currentUserId: string;
  onToggleReaction: (emoji: string) => void;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  hasCurrentUser: boolean;
}

export default function MessageReactions({
  reactions,
  isOwnMessage,
  currentUserId,
  onToggleReaction,
}: MessageReactionsProps) {
  const { colors, isDark } = useTheme();

  const grouped = useMemo<GroupedReaction[]>(() => {
    const map = new Map<string, { count: number; hasCurrentUser: boolean }>();

    for (const reaction of reactions) {
      const existing = map.get(reaction.emoji);
      if (existing) {
        existing.count += 1;
        if (reaction.userId === currentUserId) {
          existing.hasCurrentUser = true;
        }
      } else {
        map.set(reaction.emoji, {
          count: 1,
          hasCurrentUser: reaction.userId === currentUserId,
        });
      }
    }

    return Array.from(map.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      hasCurrentUser: data.hasCurrentUser,
    }));
  }, [reactions, currentUserId]);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.alignRight : styles.alignLeft,
      ]}
    >
      {grouped.map((item) => {
        const displayEmoji = EMOJI_DISPLAY[item.emoji] ?? item.emoji;
        const highlighted = item.hasCurrentUser;

        return (
          <TouchableOpacity
            key={item.emoji}
            activeOpacity={0.7}
            onPress={() => onToggleReaction(item.emoji)}
            style={[
              styles.pill,
              {
                backgroundColor: isDark
                  ? colors.surfaceVariant
                  : colors.surface,
                borderColor: highlighted
                  ? '#0095F6'
                  : colors.border,
                borderWidth: highlighted ? 1.5 : 1,
              },
            ]}
          >
            <Text style={styles.emoji}>{displayEmoji}</Text>
            <Text
              style={[
                styles.count,
                { color: colors.text.primary },
              ]}
            >
              {item.count}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  alignLeft: {
    justifyContent: 'flex-start',
  },
  alignRight: {
    justifyContent: 'flex-end',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
    marginLeft: 3,
    fontWeight: '600',
  },
});
