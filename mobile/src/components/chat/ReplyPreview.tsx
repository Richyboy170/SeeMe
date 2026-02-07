import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface ReplyTo {
  id: string;
  content: string | null;
  senderId: string;
  messageType: string;
  sender?: { username: string };
}

interface ReplyPreviewProps {
  replyTo: ReplyTo;
  onCancel: () => void;
}

function getContentPreview(replyTo: ReplyTo): string {
  switch (replyTo.messageType) {
    case 'image':
      return '\u{1F4F7} Photo';
    case 'gif':
      return '\u{1F3AC} GIF';
    case 'voice':
      return '\u{1F3A4} Voice message';
    default: {
      const text = replyTo.content || '';
      if (text.length > 80) {
        return text.slice(0, 80) + '\u2026';
      }
      return text;
    }
  }
}

export default function ReplyPreview({ replyTo, onCancel }: ReplyPreviewProps) {
  const { colors, gradientColors } = useTheme();

  const username = replyTo.sender?.username || 'Unknown';
  const preview = getContentPreview(replyTo);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <LinearGradient
        colors={gradientColors as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.accentBorder}
      />
      <View style={styles.content}>
        <Text style={[styles.replyLabel, { color: colors.text.link }]} numberOfLines={1}>
          Replying to {username}
        </Text>
        <Text style={[styles.previewText, { color: colors.text.secondary }]} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={20} color={colors.icon.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accentBorder: {
    width: 3,
    alignSelf: 'stretch',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    marginLeft: 12,
    marginRight: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  replyLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cancelButton: {
    marginLeft: 8,
    padding: 4,
  },
});
