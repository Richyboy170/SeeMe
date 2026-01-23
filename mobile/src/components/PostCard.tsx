import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  StatusBar,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GiveCoinsModal from './coins/GiveCoinsModal';
import Avatar from './Avatar';
import { AvatarCustomizations } from './AvatarRenderer';
import { getImageUrl } from '../services/api';

const TABLET_BREAKPOINT = 600;

interface ActiveAvatar {
  id: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  customizations: AvatarCustomizations;
}

interface PostCardProps {
  post: {
    id: string;
    user: {
      id: string;
      username: string;
      activeAvatarId?: string;
      activeAvatar?: ActiveAvatar | null;
    };
    imageUrl?: string;
    originalImageUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    likedByMe?: boolean;
    createdAt: string;
  };
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
}

export default function PostCard({
  post,
  onLike,
  onComment,
  onUserPress,
}: PostCardProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const [liked, setLiked] = useState(post.likedByMe || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [giveModalVisible, setGiveModalVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);

  const lastTapRef = useRef<number>(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    if (onLike) {
      onLike(post.id);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(post.id);
    }
  };

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress(post.user.id);
    }
  };

  const animateHeart = () => {
    setShowHeartOverlay(true);
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
      setShowHeartOverlay(false);
    });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - like the post
      if (!liked) {
        setLiked(true);
        setLikesCount(likesCount + 1);
        if (onLike) {
          onLike(post.id);
        }
      }
      animateHeart();
      lastTapRef.current = 0; // Reset to prevent triple-tap
    } else {
      lastTapRef.current = now;
      // Single tap - open image viewer after a delay if no second tap
      setTimeout(() => {
        if (lastTapRef.current === now) {
          setImageViewerVisible(true);
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  // Calculate image dimensions
  const phoneImageSize = width - 24; // Account for horizontal padding (12 each side)
  const tabletImageSize = Math.min(width * 0.45, 550); // 45% of width, max 550px

  const imageUri = getImageUrl(post.thumbnailUrl) || getImageUrl(post.imageUrl) || getImageUrl(post.originalImageUrl);

  // Get full resolution image for viewer (prefer original)
  const fullImageUri = getImageUrl(post.originalImageUrl) || getImageUrl(post.imageUrl) || imageUri;

  const renderImage = () => {
    const imageStyle = isTablet
      ? { width: tabletImageSize, height: tabletImageSize * 1.1, borderRadius: 16 }
      : { width: phoneImageSize, height: phoneImageSize };

    if (!imageUri) {
      return (
        <View style={[styles.postImage, imageStyle, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={48} color="#9CA3AF" />
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleDoubleTap}
      >
        <View>
          <Image
            source={{ uri: imageUri }}
            style={[styles.postImage, imageStyle]}
            resizeMode={isTablet ? 'contain' : 'cover'}
          />
          {showHeartOverlay && (
            <Animated.View
              style={[
                styles.heartOverlay,
                {
                  opacity: heartOpacity,
                  transform: [{ scale: heartScale }],
                },
              ]}
            >
              <Ionicons name="heart" size={80} color="#FFF" />
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderImageViewer = () => (
    <Modal
      visible={imageViewerVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setImageViewerVisible(false)}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <View style={styles.imageViewerContainer}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.imageViewerClose}
          onPress={() => setImageViewerVisible(false)}
        >
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Image */}
        <Pressable
          style={styles.imageViewerContent}
          onPress={() => setImageViewerVisible(false)}
        >
          <Image
            source={{ uri: fullImageUri || undefined }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </Pressable>

        {/* Caption overlay at bottom */}
        {post.caption && (
          <View style={styles.imageViewerCaption}>
            <Text style={styles.imageViewerUsername}>@{post.user.username}</Text>
            <Text style={styles.imageViewerText}>{post.caption}</Text>
          </View>
        )}
      </View>
    </Modal>
  );

  const renderActions = () => (
    <View style={[styles.actions, isTablet && styles.tabletActions]}>
      <View style={styles.leftActions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={isTablet ? 24 : 28}
            color={liked ? '#FF3B30' : '#000'}
          />
          {likesCount > 0 && (
            <Text style={styles.actionCount}>{likesCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={isTablet ? 22 : 26} color="#000" />
          {post.commentsCount > 0 && (
            <Text style={styles.actionCount}>{post.commentsCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setGiveModalVisible(true)}
          style={styles.actionButton}
        >
          <Ionicons name="gift" size={isTablet ? 22 : 26} color="#FBBF24" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Tablet Layout: Side-by-side with prominent text
  if (isTablet) {
    return (
      <View style={styles.tabletContainer}>
        <View style={styles.tabletCard}>
          {/* Image Side */}
          <View style={styles.tabletImageContainer}>
            {renderImage()}
          </View>

          {/* Content Side */}
          <View style={styles.tabletContentContainer}>
            {/* Header */}
            <TouchableOpacity style={styles.tabletHeader} onPress={handleUserPress}>
              <Avatar
                size={48}
                username={post.user.username}
                style={styles.userAvatar}
                customizations={post.user.activeAvatar?.customizations}
                avatarStyle={post.user.activeAvatar?.style}
              />
              <View style={styles.userInfo}>
                <Text style={styles.tabletUsername}>@{post.user.username}</Text>
                <Text style={styles.timestamp}>{formatTimeAgo(post.createdAt)}</Text>
              </View>
            </TouchableOpacity>

            {/* Caption - Prominent on tablet */}
            {post.caption && (
              <View style={styles.tabletCaptionContainer}>
                <Text style={styles.tabletCaption}>{post.caption}</Text>
              </View>
            )}

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Actions */}
            {renderActions()}
          </View>
        </View>

        <GiveCoinsModal
          visible={giveModalVisible}
          recipientId={post.user.id}
          recipientUsername={post.user.username}
          contextType="post"
          contextId={post.id}
          onClose={() => setGiveModalVisible(false)}
          onSuccess={() => setGiveModalVisible(false)}
        />

        {renderImageViewer()}
      </View>
    );
  }

  // Phone Layout: Text above image
  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={handleUserPress}>
        <Avatar
          size={40}
          username={post.user.username}
          style={styles.userAvatar}
          customizations={post.user.activeAvatar?.customizations}
          avatarStyle={post.user.activeAvatar?.style}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{post.user.username}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(post.createdAt)}</Text>
        </View>
      </TouchableOpacity>

      {/* Caption - Above image */}
      {post.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{post.caption}</Text>
        </View>
      )}

      {/* Image with padding */}
      <View style={styles.imageWrapper}>
        {renderImage()}
      </View>

      {/* Actions */}
      {renderActions()}

      {/* Give Coins Modal */}
      <GiveCoinsModal
        visible={giveModalVisible}
        recipientId={post.user.id}
        recipientUsername={post.user.username}
        contextType="post"
        contextId={post.id}
        onClose={() => setGiveModalVisible(false)}
        onSuccess={() => setGiveModalVisible(false)}
      />

      {renderImageViewer()}
    </View>
  );
}

const styles = StyleSheet.create({
  // Phone styles
  container: {
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  userAvatar: {
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  imageWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  postImage: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    fontWeight: '400',
  },

  // Tablet styles
  tabletContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabletCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  tabletImageContainer: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  tabletContentContainer: {
    flex: 1,
    padding: 28,
    minHeight: 400,
    justifyContent: 'space-between',
  },
  tabletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabletUsername: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  tabletCaptionContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  tabletCaption: {
    fontSize: 22,
    color: '#1F2937',
    lineHeight: 34,
    fontWeight: '400',
  },
  tabletActions: {
    paddingHorizontal: 0,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  // Image viewer styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  imageViewerContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  imageViewerUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
  },
  imageViewerText: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 22,
  },
});
