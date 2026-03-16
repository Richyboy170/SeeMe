import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme';

interface ReplyTo {
  id: string;
  content: string | null;
  senderId: string;
  messageType: string;
  sender?: {
    id: string;
    username: string;
  };
}

interface QuotedMessageProps {
  replyTo: ReplyTo;
  isOwnMessage: boolean;
  onPress?: () => void;
}

function getContentPreview(messageType: string, content: string | null): string {
  switch (messageType) {
    case 'image':
      return '\u{1F4F7} Photo';
    case 'gif':
      return '\u{1F3AC} GIF';
    case 'voice':
      return '\u{1F3A4} Voice message';
    default:
      return content || '';
  }
}

function QuotedMessage({ replyTo, isOwnMessage, onPress }: QuotedMessageProps) {
  const { colors, isDark } = useTheme();

  const senderName = replyTo.sender?.username || 'Unknown';
  const preview = getContentPreview(replyTo.messageType, replyTo.content);

  // Color scheme based on whose bubble this quote sits inside
  const accentColor = isOwnMessage
    ? 'rgba(255, 255, 255, 0.6)'
    : colors.text.link;

  const backgroundColor = isOwnMessage
    ? 'rgba(255, 255, 255, 0.15)'
    : isDark
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.06)';

  const nameColor = isOwnMessage
    ? 'rgba(255, 255, 255, 0.9)'
    : colors.text.primary;

  const contentColor = isOwnMessage
    ? 'rgba(255, 255, 255, 0.7)'
    : colors.text.secondary;

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={[
        styles.container,
        {
          backgroundColor,
          borderLeftColor: accentColor,
        },
      ]}
    >
      <Text style={[styles.senderName, { color: nameColor }]} numberOfLines={1}>
        {senderName}
      </Text>
      <Text style={[styles.content, { color: contentColor }]} numberOfLines={2}>
        {preview}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 1,
  },
  content: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default React.memo(QuotedMessage);
