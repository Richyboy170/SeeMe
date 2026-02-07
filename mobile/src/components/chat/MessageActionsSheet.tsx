import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MessageActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  message: {
    id: string;
    content: string | null;
    messageType: string;
    senderId: string;
  } | null;
  isOwnMessage: boolean;
  onCopy: () => void;
  onReply: () => void;
  onUnsend: () => void;
  onForward?: () => void;
}

interface ActionItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

export default function MessageActionsSheet({
  visible,
  onClose,
  message,
  isOwnMessage,
  onCopy,
  onReply,
  onUnsend,
  onForward,
}: MessageActionsSheetProps) {
  const { colors, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const actions = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    // Copy - only for text messages with non-null content
    if (message?.messageType === 'text' && message.content !== null) {
      items.push({
        key: 'copy',
        label: 'Copy',
        icon: 'copy-outline',
        onPress: onCopy,
      });
    }

    // Reply - always available
    items.push({
      key: 'reply',
      label: 'Reply',
      icon: 'arrow-undo-outline',
      onPress: onReply,
    });

    // Forward - always available (optional prop)
    if (onForward) {
      items.push({
        key: 'forward',
        label: 'Forward',
        icon: 'arrow-redo-outline',
        onPress: onForward,
      });
    }

    // Unsend - own messages only
    if (isOwnMessage) {
      items.push({
        key: 'unsend',
        label: 'Unsend',
        icon: 'trash-outline',
        onPress: onUnsend,
        destructive: true,
      });
    }

    return items;
  }, [message, isOwnMessage, onCopy, onReply, onUnsend, onForward]);

  useEffect(() => {
    if (visible) {
      // Slide up with spring animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const handleActionPress = (action: ActionItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    // Small delay so the sheet closes before the action fires
    setTimeout(() => {
      action.onPress();
    }, 150);
  };

  const sheetBackground = isDark ? colors.surface : colors.background;
  const handleBarColor = isDark ? colors.border : colors.borderLight;
  const separatorColor = isDark ? colors.borderLight : colors.borderLight;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: sheetBackground,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: handleBarColor }]} />
        </View>

        {/* Action items */}
        {actions.map((action, index) => (
          <React.Fragment key={action.key}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={action.icon}
                size={22}
                color={
                  action.destructive
                    ? '#ED4956'
                    : colors.text.primary
                }
              />
              <Text
                style={[
                  styles.actionLabel,
                  {
                    color: action.destructive
                      ? '#ED4956'
                      : colors.text.primary,
                  },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>

            {/* Separator between items, but not after the last one */}
            {index < actions.length - 1 && (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: separatorColor },
                ]}
              />
            )}
          </React.Fragment>
        ))}

        {/* Bottom safe area padding */}
        <View style={styles.bottomPadding} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionLabel: {
    fontSize: 16,
    marginLeft: 14,
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
    marginRight: 20,
  },
  bottomPadding: {
    height: 20,
  },
});
