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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GiveCoinsModal from './coins/GiveCoinsModal';
import SharePostModal from './SharePostModal';
import SharePostExternalModal from './SharePostExternalModal';
import PostActionsBar from './PostActionsBar';
import Avatar from './Avatar';
import { AvatarCustomizations } from './AvatarRenderer';
import { LinearGradient } from 'expo-linear-gradient';
import { getImageUrl, api } from '../services/api';
import { formatTimeAgo, getPostImageUrl } from '../utils/postHelpers';
import { useTheme } from '../theme';
import { ResolvedDecoration, DecorationStyleBackground, DecorationStyleFrame, DecorationStyleIconColors, CornerDecorationConfig, CornerIconPlacement } from '../types/decorations';
import CornerDecorations from './CornerDecorations';

const TABLET_BREAKPOINT = 600;

interface ActiveAvatar {
  id: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  customizations: AvatarCustomizations;
}

interface RepostedByUser {
  id: string;
  username: string;
  avatarUrl?: string | null;
  activeAvatar?: ActiveAvatar | null;
}

interface PostCardProps {
  post: {
    id: string;
    feedItemId?: string;
    user: {
      id: string;
      username: string;
      avatarUrl?: string | null;
      activeAvatarId?: string;
      activeAvatar?: ActiveAvatar | null;
    };
    imageUrl?: string;
    originalImageUrl?: string;
    thumbnailUrl?: string;
    processedImageUrl?: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    repostCount?: number;
    likedByMe?: boolean;
    savedByMe?: boolean;
    repostedByMe?: boolean;
    myRepostType?: 'repost' | 'quote' | null;
    createdAt: string;
    // Location & photo time
    locationName?: string | null;
    photoTakenAt?: string | null;
    // Decoration data
    decoration?: ResolvedDecoration | null;
    // Topic data
    topics?: Array<{
      id: string;
      name: string;
      slug: string;
      iconEmoji?: string;
      type?: 'community' | 'private' | 'broadcast';
    }>;
    // Repost-specific fields
    isRepost?: boolean;
    repostedBy?: RepostedByUser;
    repostType?: 'repost' | 'quote';
    repostComment?: string | null;
    repostCreatedAt?: string;
  };
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
  onSave?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onArchive?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  showShareButton?: boolean;
  showSaveButton?: boolean;
  currentUserId?: string;
}

export default function PostCard({
  post,
  onLike,
  onComment,
  onUserPress,
  onSave,
  onShare,
  onArchive,
  onDelete,
  showShareButton = true,
  showSaveButton = true,
  currentUserId,
}: PostCardProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const { colors, isDark } = useTheme();

  const [liked, setLiked] = useState(post.likedByMe || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [saved, setSaved] = useState(post.savedByMe || false);
  const [giveModalVisible, setGiveModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [externalShareVisible, setExternalShareVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [repostExpanded, setRepostExpanded] = useState(false);
  const [metaExpanded, setMetaExpanded] = useState(false);

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

  const handleSave = async () => {
    const wasSaved = saved;
    setSaved(!saved);

    try {
      if (wasSaved) {
        await api.delete(`/posts/${post.id}/save`);
      } else {
        await api.post(`/posts/${post.id}/save`);
        api.trackInteraction(post.id, 'save').catch(console.error);
      }
      if (onSave) {
        onSave(post.id);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      setSaved(wasSaved); // Revert on error
    }
  };

  const handleShare = () => {
    setShareModalVisible(true);
    if (onShare) {
      onShare(post.id);
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

  const isOwnPost = currentUserId && post.user.id === currentUserId;

  const handlePostOptions = () => {
    const options: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];

    options.push({
      text: 'Archive Post',
      onPress: () => {
        Alert.alert('Archive Post', 'This post will be hidden from your profile but not deleted.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Archive', onPress: () => onArchive?.(post.id) },
        ]);
      },
    });

    options.push({
      text: 'Delete Post',
      style: 'destructive',
      onPress: () => {
        Alert.alert('Delete Post', 'This post will be permanently deleted. This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(post.id) },
        ]);
      },
    });

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Post Options', undefined, options);
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

  // Resolve decoration styles
  const decoration = post.decoration;
  const bgDecoration: DecorationStyleBackground | null =
    isDark ? (decoration?.darkBackground as DecorationStyleBackground | null) || null
           : (decoration?.lightBackground as DecorationStyleBackground | null) || null;
  const frameDecoration: DecorationStyleFrame | null = (decoration?.frame as DecorationStyleFrame | null) || null;
  const frameCornerConfig: CornerDecorationConfig | null = frameDecoration?.cornerDecorations || null;
  const bgCornerConfig: CornerDecorationConfig | null = bgDecoration?.cornerDecorations || null;
  const iconDecoration: DecorationStyleIconColors | null = (decoration?.iconColors as DecorationStyleIconColors | null) || null;
  const perCornerIcons: CornerIconPlacement[] | null = (decoration?.cornerIcons as CornerIconPlacement[] | null) || null;

  // Text colors: use decoration override or default theme colors
  const decorTextColor = bgDecoration?.textColor || colors.text.primary;
  const decorCaptionColor = bgDecoration?.captionColor || colors.text.primary;

  // Icon colors: use decoration override or defaults
  const likeIconColor = (liked: boolean) => liked ? (iconDecoration?.likeColor || '#FF3B30') : (iconDecoration?.likeColor || colors.text.primary);
  const commentIconColor = iconDecoration?.commentColor || colors.text.primary;
  const shareIconColor = iconDecoration?.shareColor || colors.text.primary;
  const giftIconColor = iconDecoration?.giftColor || '#FBBF24';
  const saveIconColor = iconDecoration?.saveColor || colors.text.primary;

  // Frame style for image wrapper
  const frameStyle = frameDecoration ? {
    borderWidth: frameDecoration.borderWidth,
    borderColor: frameDecoration.borderColor,
    borderRadius: frameDecoration.borderRadius,
    ...(frameDecoration.shadowColor ? {
      shadowColor: frameDecoration.shadowColor,
      shadowOpacity: frameDecoration.shadowOpacity || 0.3,
      shadowRadius: frameDecoration.shadowRadius || 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    } : {}),
  } : {};

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

  // Render compact repost preview (small image on right, truncated text)
  const renderCompactRepostPreview = () => {
    const maxCaptionLength = 80;
    const truncatedCaption = post.caption && post.caption.length > maxCaptionLength
      ? post.caption.substring(0, maxCaptionLength) + '...'
      : post.caption;

    return (
      <TouchableOpacity
        style={styles.compactRepostCard}
        onPress={() => setRepostExpanded(!repostExpanded)}
        activeOpacity={0.7}
      >
        {/* Left side: Text content */}
        <View style={styles.compactRepostContent}>
          <View style={styles.compactRepostHeader}>
            <Avatar
              size={20}
              avatarUrl={!post.user.activeAvatar ? post.user.avatarUrl : undefined}
              username={post.user.username}
              customizations={post.user.activeAvatar?.customizations}
              avatarStyle={post.user.activeAvatar?.style}
            />
            <Text style={styles.compactRepostUsername}>@{post.user.username}</Text>
          </View>
          {post.caption && (
            <Text style={styles.compactRepostCaption} numberOfLines={repostExpanded ? undefined : 2}>
              {repostExpanded ? post.caption : truncatedCaption}
            </Text>
          )}
          {!repostExpanded && (post.caption?.length || 0) > maxCaptionLength && (
            <Text style={styles.compactRepostExpand}>tap to expand</Text>
          )}
        </View>

        {/* Right side: Small thumbnail */}
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.compactRepostImage}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderActions = () => (
    <View style={[styles.actions, isTablet && styles.tabletActions]}>
      {/* Group 1: Comment, Heart, Gift */}
      <View style={styles.actionGroup}>
        <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={isTablet ? 22 : 24} color={commentIconColor} />
          {post.commentsCount > 0 && (
            <Text style={[styles.actionCount, { color: decorTextColor }]}>{post.commentsCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={isTablet ? 22 : 24}
            color={likeIconColor(liked)}
          />
          {likesCount > 0 && (
            <Text style={[styles.actionCount, { color: decorTextColor }]}>{likesCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setGiveModalVisible(true)}
          style={styles.actionButton}
        >
          <Ionicons name="gift" size={isTablet ? 22 : 24} color={giftIconColor} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={[styles.actionDivider, { backgroundColor: colors.separator || '#E5E7EB' }]} />

      {/* Group 2: Repost, Share */}
      <View style={styles.actionGroup}>
        {showShareButton && (
          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Ionicons
              name={post.repostedByMe ? 'repeat' : 'repeat-outline'}
              size={isTablet ? 22 : 24}
              color={post.repostedByMe ? '#10B981' : shareIconColor}
            />
            {(post.repostCount || 0) > 0 && (
              <Text style={[styles.actionCount, post.repostedByMe && styles.repostedCount]}>
                {post.repostCount}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => setExternalShareVisible(true)}
          style={styles.actionButton}
        >
          <Ionicons
            name="share-outline"
            size={isTablet ? 22 : 24}
            color={shareIconColor}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Helper to wrap content in background decoration (used for both reposts and regular posts)
  const wrapWithBackground = (content: React.ReactNode) => {
    if (bgDecoration?.type === 'gradient' && bgDecoration.colors) {
      return (
        <LinearGradient
          colors={bgDecoration.colors as [string, string, ...string[]]}
          locations={bgDecoration.locations as [number, number, ...number[]] | undefined}
          start={bgDecoration.start || { x: 0, y: 0 }}
          end={bgDecoration.end || { x: 1, y: 1 }}
          style={styles.container}
        >
          {bgCornerConfig && <CornerDecorations config={bgCornerConfig} />}
          {content}
        </LinearGradient>
      );
    }
    if (bgDecoration?.type === 'solid' && bgDecoration.color) {
      return (
        <View style={[styles.container, { backgroundColor: bgDecoration.color }]}>
          {bgCornerConfig && <CornerDecorations config={bgCornerConfig} />}
          {content}
        </View>
      );
    }
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  };

  // Tablet Layout: Side-by-side with prominent text
  // For reposts on tablet: show reposter as main focus with compact original post
  if (isTablet && post.isRepost && post.repostedBy) {
    return (
      <View style={styles.tabletContainer}>
        {/* Reposter Header - Main focus */}
        <TouchableOpacity
          style={styles.tabletHeader}
          onPress={() => onUserPress?.(post.repostedBy!.id)}
        >
          <Avatar
            size={48}
            avatarUrl={!post.repostedBy.activeAvatar ? post.repostedBy.avatarUrl : undefined}
            username={post.repostedBy.username}
            style={styles.userAvatar}
            customizations={post.repostedBy.activeAvatar?.customizations}
            avatarStyle={post.repostedBy.activeAvatar?.style}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.tabletUsername, { color: colors.text.primary }]}>@{post.repostedBy.username}</Text>
            <View style={styles.repostIndicator}>
              <Ionicons name="repeat" size={14} color="#10B981" />
              <Text style={styles.tabletRepostIndicatorText}>reposted</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quote Comment - For quote reposts */}
        {post.repostType === 'quote' && post.repostComment && (
          <View style={styles.tabletQuoteContainer}>
            <Text style={styles.tabletQuoteComment}>"{post.repostComment}"</Text>
          </View>
        )}

        {/* Compact Original Post Preview */}
        <TouchableOpacity
          style={styles.tabletCompactRepostCard}
          onPress={() => setRepostExpanded(!repostExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.tabletCompactRepostContent}>
            <View style={styles.compactRepostHeader}>
              <Avatar
                size={24}
                avatarUrl={!post.user.activeAvatar ? post.user.avatarUrl : undefined}
                username={post.user.username}
                customizations={post.user.activeAvatar?.customizations}
                avatarStyle={post.user.activeAvatar?.style}
              />
              <Text style={[styles.tabletCompactRepostUsername, { color: colors.text.secondary }]}>@{post.user.username}</Text>
            </View>
            {post.caption && (
              <Text style={[styles.tabletCompactRepostCaption, { color: colors.text.primary }]} numberOfLines={repostExpanded ? undefined : 2}>
                {post.caption}
              </Text>
            )}
            {!repostExpanded && (post.caption?.length || 0) > 100 && (
              <Text style={styles.compactRepostExpand}>tap to expand</Text>
            )}
          </View>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.tabletCompactRepostImage}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>

        {/* Actions - encourage the reposter */}
        {renderActions()}

        <GiveCoinsModal
          visible={giveModalVisible}
          recipientId={post.repostedBy.id}
          recipientUsername={post.repostedBy.username}
          contextType="post"
          contextId={post.id}
          onClose={() => setGiveModalVisible(false)}
          onSuccess={() => setGiveModalVisible(false)}
        />

        <SharePostModal
          visible={shareModalVisible}
          postId={post.id}
          postImageUrl={imageUri}
          onClose={() => setShareModalVisible(false)}
          onSuccess={() => setShareModalVisible(false)}
        />

        <SharePostExternalModal
          visible={externalShareVisible}
          onClose={() => setExternalShareVisible(false)}
          post={post}
        />

        {renderImageViewer()}
      </View>
    );
  }

  // Regular tablet layout (non-repost)
  if (isTablet) {
    return (
      <View style={styles.tabletContainer}>
        <View style={[styles.tabletCard, { backgroundColor: colors.card }]}>
          {/* Image Side */}
          <View style={[styles.tabletImageContainer, { backgroundColor: colors.surface }]}>
            {renderImage()}
          </View>

          {/* Content Side */}
          <View style={styles.tabletContentContainer}>
            {/* Header */}
            <TouchableOpacity style={styles.tabletHeader} onPress={handleUserPress}>
              <Avatar
                size={48}
                avatarUrl={!post.user.activeAvatar ? post.user.avatarUrl : undefined}
                username={post.user.username}
                style={styles.userAvatar}
                customizations={post.user.activeAvatar?.customizations}
                avatarStyle={post.user.activeAvatar?.style}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.tabletUsername, { color: colors.text.primary }]}>@{post.user.username}</Text>
                <Text style={[styles.timestamp, { color: colors.text.secondary }]}>{formatTimeAgo(post.createdAt)}</Text>
              </View>
            </TouchableOpacity>

            {/* Caption - Prominent on tablet */}
            {post.caption && (
              <View style={styles.tabletCaptionContainer}>
                <Text style={[styles.tabletCaption, { color: colors.text.primary }]}>{post.caption}</Text>
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

        <SharePostModal
          visible={shareModalVisible}
          postId={post.id}
          postImageUrl={imageUri}
          onClose={() => setShareModalVisible(false)}
          onSuccess={() => setShareModalVisible(false)}
        />

        <SharePostExternalModal
          visible={externalShareVisible}
          onClose={() => setExternalShareVisible(false)}
          post={post}
        />

        {renderImageViewer()}
      </View>
    );
  }

  // Phone Layout: Text above image
  // For reposts: show reposter as main focus with compact original post preview
  if (post.isRepost && post.repostedBy) {
    const repostContent = (
      <>
        {/* Reposter Header - Main focus */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => onUserPress?.(post.repostedBy!.id)}
        >
          <Avatar
            size={40}
            avatarUrl={!post.repostedBy.activeAvatar ? post.repostedBy.avatarUrl : undefined}
            username={post.repostedBy.username}
            style={styles.userAvatar}
            customizations={post.repostedBy.activeAvatar?.customizations}
            avatarStyle={post.repostedBy.activeAvatar?.style}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: decorTextColor }]}>@{post.repostedBy.username}</Text>
            <View style={styles.repostIndicator}>
              <Ionicons name="repeat" size={12} color="#10B981" />
              <Text style={styles.repostIndicatorText}>reposted</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quote Comment - For quote reposts */}
        {post.repostType === 'quote' && post.repostComment && (
          <View style={styles.quoteCommentContainer}>
            <Text style={[styles.quoteComment, { color: decorTextColor }]}>"{post.repostComment}"</Text>
          </View>
        )}

        {/* Compact Original Post Preview */}
        <View style={styles.compactRepostWrapper}>
          {renderCompactRepostPreview()}
        </View>

        {/* Actions - encourage the reposter */}
        {renderActions()}

        {/* Give Coins Modal */}
        <GiveCoinsModal
          visible={giveModalVisible}
          recipientId={post.repostedBy.id}
          recipientUsername={post.repostedBy.username}
          contextType="post"
          contextId={post.id}
          onClose={() => setGiveModalVisible(false)}
          onSuccess={() => setGiveModalVisible(false)}
        />

        {/* Share Post Modal (in-app) */}
        <SharePostModal
          visible={shareModalVisible}
          postId={post.id}
          postImageUrl={imageUri}
          onClose={() => setShareModalVisible(false)}
          onSuccess={() => setShareModalVisible(false)}
        />

        {/* External Share Modal (Instagram, etc.) */}
        <SharePostExternalModal
          visible={externalShareVisible}
          onClose={() => setExternalShareVisible(false)}
          post={post}
        />

        {renderImageViewer()}
      </>
    );
    return wrapWithBackground(repostContent);
  }

  // Regular post layout (non-repost)
  const postContent = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={handleUserPress}>
          <Avatar
            size={40}
            avatarUrl={!post.user.activeAvatar ? post.user.avatarUrl : undefined}
            username={post.user.username}
            style={styles.userAvatar}
            customizations={post.user.activeAvatar?.customizations}
            avatarStyle={post.user.activeAvatar?.style}
          />
          <View style={styles.userInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.username, { color: decorTextColor }]}>@{post.user.username}</Text>
              {post.topics && post.topics.length > 0 && post.topics[0].type && post.topics[0].type !== 'community' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(124,58,237,0.1)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                  <Ionicons
                    name={post.topics[0].type === 'private' ? 'lock-closed' : 'megaphone'}
                    size={10}
                    color={post.topics[0].type === 'private' ? '#EF4444' : '#F59E0B'}
                  />
                  <Text style={{ fontSize: 10, color: post.topics[0].type === 'private' ? '#EF4444' : '#F59E0B', fontWeight: '600' }}>
                    {post.topics[0].name}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.timestamp, { color: decorCaptionColor }]}>{formatTimeAgo(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {isOwnPost && (onArchive || onDelete) && (
          <TouchableOpacity onPress={handlePostOptions} style={{ padding: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color={decorTextColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Caption - Above image */}
      {post.caption && (
        <View style={styles.captionContainer}>
          <Text style={[styles.caption, { color: decorTextColor }]}>{post.caption}</Text>
        </View>
      )}

      {/* Image with padding and optional frame */}
      <View style={[styles.imageWrapper, frameStyle]}>
        {renderImage()}
        {(frameCornerConfig || perCornerIcons) && <CornerDecorations config={frameCornerConfig || undefined} cornerIcons={perCornerIcons} />}
      </View>

      {/* Location & photo time — half-half below image, tap to expand */}
      {(post.locationName || post.photoTakenAt) && (
        <TouchableOpacity
          style={styles.postMetaRow}
          activeOpacity={0.7}
          onPress={() => setMetaExpanded(!metaExpanded)}
        >
          {post.locationName && (
            <View style={[styles.postMetaHalf, !post.photoTakenAt && styles.postMetaFull]}>
              <Ionicons name="location-outline" size={13} color={decorCaptionColor} />
              <Text
                style={[styles.postMetaText, { color: decorCaptionColor }]}
                numberOfLines={metaExpanded ? undefined : 1}
              >
                {post.locationName}
              </Text>
            </View>
          )}
          {post.photoTakenAt && (
            <View style={[styles.postMetaHalf, !post.locationName && styles.postMetaFull, { justifyContent: post.locationName ? 'flex-end' : 'flex-start' }]}>
              <Ionicons name="camera-outline" size={13} color={decorCaptionColor} />
              <Text
                style={[styles.postMetaText, { color: decorCaptionColor }]}
                numberOfLines={metaExpanded ? undefined : 1}
              >
                {new Date(post.photoTakenAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

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

      {/* Share Post Modal (in-app) */}
      <SharePostModal
        visible={shareModalVisible}
        postId={post.id}
        postImageUrl={imageUri}
        onClose={() => setShareModalVisible(false)}
        onSuccess={() => setShareModalVisible(false)}
      />

      {/* External Share Modal (Instagram, etc.) */}
      <SharePostExternalModal
        visible={externalShareVisible}
        onClose={() => setExternalShareVisible(false)}
        post={post}
      />

      {renderImageViewer()}
    </>
  );

  return wrapWithBackground(postContent);
}

const styles = StyleSheet.create({
  // Phone styles
  container: {
    backgroundColor: '#FFF',
  },
  // Repost indicator (shown under reposter's name)
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  repostIndicatorText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  // Quote comment for quote reposts
  quoteCommentContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingLeft: 12,
    paddingVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  quoteComment: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Compact repost preview styles
  compactRepostWrapper: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  compactRepostCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    alignItems: 'flex-start',
  },
  compactRepostContent: {
    flex: 1,
    marginRight: 10,
  },
  compactRepostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  compactRepostUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  compactRepostCaption: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  compactRepostExpand: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  compactRepostImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  repostedCount: {
    color: '#10B981',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  actionGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  actionDivider: {
    width: 1,
    height: 22,
    borderRadius: 1,
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
  saveButton: {
    padding: 4,
  },
  postMetaRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 8,
  },
  postMetaHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postMetaFull: {
    flex: 0,
  },
  postMetaText: {
    fontSize: 12,
    flexShrink: 1,
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
  tabletRepostIndicatorText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  tabletQuoteContainer: {
    paddingBottom: 12,
    paddingLeft: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    marginBottom: 8,
  },
  tabletQuoteComment: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  // Tablet compact repost styles
  tabletCompactRepostCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tabletCompactRepostContent: {
    flex: 1,
    marginRight: 16,
  },
  tabletCompactRepostUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabletCompactRepostCaption: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  tabletCompactRepostImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
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
