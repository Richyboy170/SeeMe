import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../services/api';
import AvatarRenderer, { AvatarCustomizations } from './AvatarRenderer';

export interface AvatarProps {
  size?: number;
  avatarUrl?: string | null;
  username?: string;
  style?: ViewStyle;
  onPress?: () => void;
  showBorder?: boolean;
  // New props for custom avatar rendering
  customizations?: AvatarCustomizations | null;
  avatarStyle?: 'cartoon' | 'anime' | 'minimalist';
}

export default function Avatar({
  size = 40,
  avatarUrl,
  username,
  style,
  onPress,
  showBorder = false,
  customizations,
  avatarStyle = 'cartoon',
}: AvatarProps) {
  const imageUri = avatarUrl ? getImageUrl(avatarUrl) : null;

  // Get initials from username (first letter, uppercase)
  const getInitials = () => {
    if (!username) return '';
    return username.charAt(0).toUpperCase();
  };

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...(showBorder && {
      borderWidth: 2,
      borderColor: '#E5E7EB',
    }),
  };

  const renderContent = () => {
    // Priority 1: Show custom avatar if customizations are provided
    if (customizations) {
      return (
        <AvatarRenderer
          size={size}
          customizations={customizations}
          style={avatarStyle}
        />
      );
    }

    // Priority 2: Show image if avatarUrl is provided
    if (imageUri) {
      return (
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      );
    }

    // Priority 3: Show initials if username is available
    if (username) {
      return (
        <View style={[styles.placeholder, containerStyle, style]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {getInitials()}
          </Text>
        </View>
      );
    }

    // Default: show person icon
    const iconSize = size * 0.6;
    return (
      <View style={[styles.placeholder, containerStyle, style]}>
        <Ionicons name="person" size={iconSize} color="#9CA3AF" />
      </View>
    );
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[containerStyle, style]}
        activeOpacity={0.7}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#F2F2F7',
  },
  placeholder: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#6B7280',
    fontWeight: '600',
  },
});
