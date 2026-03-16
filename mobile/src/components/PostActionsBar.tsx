import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCount } from '../utils/postHelpers';
import { useTheme } from '../theme';

export interface PostActionsBarProps {
  // State
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  commentsCount: number;

  // Callbacks
  onLike: () => void;
  onComment: () => void;
  onGiveCoins: () => void;
  onShare?: () => void;
  onSave?: () => void;

  // Display options
  showCounts?: boolean;
  showShare?: boolean;
  showSave?: boolean;
  showGiveCoins?: boolean;
  iconSize?: number;
  compact?: boolean;
  style?: ViewStyle;
}

function PostActionsBar({
  isLiked,
  isSaved,
  likesCount,
  commentsCount,
  onLike,
  onComment,
  onGiveCoins,
  onShare,
  onSave,
  showCounts = true,
  showShare = true,
  showSave = true,
  showGiveCoins = true,
  iconSize = 26,
  compact = false,
  style,
}: PostActionsBarProps) {
  const { colors } = useTheme();
  const actionButtonStyle = compact ? styles.actionButtonCompact : styles.actionButton;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftActions}>
        {/* Like Button */}
        <TouchableOpacity onPress={onLike} style={actionButtonStyle}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={iconSize}
            color={isLiked ? colors.like : colors.icon.primary}
          />
          {showCounts && likesCount > 0 && (
            <Text style={[styles.actionCount, { color: colors.text.secondary }]}>{formatCount(likesCount)}</Text>
          )}
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity onPress={onComment} style={actionButtonStyle}>
          <Ionicons name="chatbubble-outline" size={iconSize - 2} color={colors.icon.primary} />
          {showCounts && commentsCount > 0 && (
            <Text style={[styles.actionCount, { color: colors.text.secondary }]}>{formatCount(commentsCount)}</Text>
          )}
        </TouchableOpacity>

        {/* Share Button */}
        {showShare && onShare && (
          <TouchableOpacity onPress={onShare} style={actionButtonStyle}>
            <Ionicons name="paper-plane-outline" size={iconSize - 2} color={colors.icon.primary} />
          </TouchableOpacity>
        )}

        {/* Give Coins Button */}
        {showGiveCoins && (
          <TouchableOpacity onPress={onGiveCoins} style={actionButtonStyle}>
            <Ionicons name="gift" size={iconSize - 2} color="#FBBF24" />
          </TouchableOpacity>
        )}
      </View>

      {/* Save Button (right aligned) */}
      {showSave && onSave && (
        <TouchableOpacity onPress={onSave} style={styles.saveButton}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={iconSize}
            color={isSaved ? colors.gift : colors.icon.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default React.memo(PostActionsBar);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 4,
  },
  actionButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 3,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: undefined,
  },
  saveButton: {
    padding: 4,
  },
});
