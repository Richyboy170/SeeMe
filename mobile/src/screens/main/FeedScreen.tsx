import React, { useCallback, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Modal,
  StatusBar,
  Pressable,
  ScrollView,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ResolvedDecoration, DecorationStyleBackground, DecorationStyleFrame, DecorationStyleIconColors, CornerDecorationConfig } from '../../types/decorations';
import CornerDecorations from '../../components/CornerDecorations';
import Avatar from '../../components/Avatar';
import GiveCoinsModal from '../../components/coins/GiveCoinsModal';
import CoinCelebration from '../../components/coins/CoinCelebration';
import { CommentPreview } from '../../components/feed/CommentPreview';
import { RepostOptionsModal } from '../../components/feed/RepostOptionsModal';
import ChatDrawer, { ChatDrawerRef } from '../../components/chat/ChatDrawer';
import ImageEditor from '../../components/ImageEditor';
import { api, getImageUrl } from '../../services/api';
import { sharePost, ShareablePost } from '../../services/shareService';
import { RepostType } from '../../services/repostService';
import { trackShare } from '../../services/postInteractionService';
import { useDoubleTap } from '../../hooks/useDoubleTap';
import { FeedStackParamList, useUnreadCount } from '../../navigation/types';
import { AvatarCustomizations } from '../../components/AvatarRenderer';
import { navigateToUserProfile } from '../../utils/feedNavigation';
import { useTheme } from '../../theme';

type FeedScreenNavigationProp = StackNavigationProp<FeedStackParamList, 'FeedHome'>;

const TABLET_BREAKPOINT = 600;
const MAX_CONTENT_WIDTH = 600;

/**
 * Blend a hex color toward a base color.
 * @param hex - Source color (e.g. decoration accent)
 * @param base - Target base color (near-white or near-dark)
 * @param baseRatio - 0 = all source, 1 = all base (0.88 = 88% base, 12% source)
 */
function blendHex(hex: string, base: string, baseRatio: number): string {
  try {
    const parse = (h: string) => {
      const c = h.replace('#', '');
      if (c.length === 3) {
        return {
          r: parseInt(c[0] + c[0], 16),
          g: parseInt(c[1] + c[1], 16),
          b: parseInt(c[2] + c[2], 16),
        };
      }
      return {
        r: parseInt(c.substring(0, 2), 16),
        g: parseInt(c.substring(2, 4), 16),
        b: parseInt(c.substring(4, 6), 16),
      };
    };
    const s = parse(hex);
    const b = parse(base);
    const mix = (a: number, d: number) => Math.round(a * (1 - baseRatio) + d * baseRatio);
    const r = mix(s.r, b.r);
    const g = mix(s.g, b.g);
    const bl = mix(s.b, b.b);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
  } catch {
    return base;
  }
}

// Flat color type used by TweetCard (mapped from global theme)
interface FeedColors {
  background: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  separator: string;
  border: string;
  accent: string;
  like: string;
  gift: string;
  iconDefault: string;
  mediaBackground: string;
  emptyIconBg: string;
}

type ThemeColors = FeedColors;

interface ActiveAvatar {
  id: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  customizations: AvatarCustomizations;
}

interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
  };
  createdAt: string;
}

interface RepostedByUser {
  id: string;
  username: string;
  activeAvatar?: ActiveAvatar | null;
}

interface Post {
  id: string;
  feedItemId?: string;
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
  repostCount?: number;
  likedByMe?: boolean;
  repostedByMe?: boolean;
  createdAt: string;
  recentComments?: Comment[];
  // Decoration data from backend
  decoration?: ResolvedDecoration | null;
  // Repost-specific fields (for showing "X reposted" header)
  isRepost?: boolean;
  repostedBy?: RepostedByUser;
  repostType?: 'repost' | 'quote';
  repostComment?: string | null;
  repostCreatedAt?: string;
  // Topic data from backend
  topics?: Array<{ id: string; name: string; slug: string; iconEmoji: string | null }>;
}

// Twitter-style Tweet Card Component
function TweetCard({
  post,
  onLike,
  onComment,
  onUserPress,
  onGiveCoins,
  onQuickGiveCoins,
  onImagePress,
  onRepost,
  onShare,
  onNavigateToProfile,
  onTopicPress,
  onMorePress,
  onCoinPickerChange,
  currentUserId,
  colors,
}: {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onGiveCoins: (post: Post) => void;
  onQuickGiveCoins: (post: Post, amount: number) => Promise<string | null>;
  onImagePress: (post: Post) => void;
  onRepost: (post: Post) => void;
  onShare: (post: Post) => void;
  onNavigateToProfile: (userId: string, username: string) => void;
  onTopicPress: (topicSlug: string) => void;
  onMorePress: (post: Post) => void;
  onCoinPickerChange?: (active: boolean) => void;
  currentUserId: string;
  colors: ThemeColors;
}) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const [liked, setLiked] = React.useState(post.likedByMe || false);
  const [likesCount, setLikesCount] = React.useState(post.likesCount);
  const [reposted, setReposted] = React.useState(post.repostedByMe || false);
  const [repostCount, setRepostCount] = React.useState(post.repostCount || 0);
  const [showHeartOverlay, setShowHeartOverlay] = React.useState(false);
  const [repostExpanded, setRepostExpanded] = React.useState(false);

  // ── Decoration resolution ──────────────────────────────────────────
  const decoration = post.decoration;
  const bgDecoration: DecorationStyleBackground | null =
    decoration
      ? isDark
        ? (decoration.darkBackground as DecorationStyleBackground | null) ?? null
        : (decoration.lightBackground as DecorationStyleBackground | null) ?? null
      : null;
  const frameDecoration: DecorationStyleFrame | null =
    (decoration?.frame as DecorationStyleFrame | null) ?? null;
  const frameCornerConfig: CornerDecorationConfig | null = frameDecoration?.cornerDecorations ?? null;
  const bgCornerConfig: CornerDecorationConfig | null = bgDecoration?.cornerDecorations ?? null;
  const iconDecoration: DecorationStyleIconColors | null =
    (decoration?.iconColors as DecorationStyleIconColors | null) ?? null;

  // Feed uses muted backgrounds, so text stays with theme defaults for readability
  const dTextColor = colors.text;
  const dSecondaryColor = colors.textSecondary;
  const dIconDefault = colors.iconDefault;

  // Icon color overrides
  const dLikeColor = (isLiked: boolean) =>
    isLiked ? (iconDecoration?.likeColor || colors.like) : (iconDecoration?.likeColor || dIconDefault);
  const dCommentColor = iconDecoration?.commentColor || dIconDefault;
  const dRepostColor = (isRepostedFlag: boolean) =>
    isRepostedFlag ? (iconDecoration?.shareColor || '#00BA7C') : (iconDecoration?.shareColor || dIconDefault);
  const dGiftColor = iconDecoration?.giftColor || colors.gift;
  const dShareColor = iconDecoration?.shareColor || dIconDefault;

  // Frame style for media container
  const frameStyle = frameDecoration
    ? {
        borderWidth: frameDecoration.borderWidth,
        borderColor: frameDecoration.borderColor,
        borderRadius: frameDecoration.borderRadius,
        ...(frameDecoration.shadowColor
          ? {
              shadowColor: frameDecoration.shadowColor,
              shadowOpacity: frameDecoration.shadowOpacity ?? 0.3,
              shadowRadius: frameDecoration.shadowRadius ?? 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: ((frameDecoration.shadowRadius ?? 4) * 2),
            }
          : {}),
      }
    : null;

  // Quick coin drag-to-send state (Instagram-style)
  const [showCoinPicker, setShowCoinPicker] = React.useState(false);
  const [hoveredCoinIndex, setHoveredCoinIndex] = React.useState(-1);
  const [sentCoinAmount, setSentCoinAmount] = React.useState(0);
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [isLongPress, setIsLongPress] = React.useState(false);
  const longPressTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const startTouchY = React.useRef(0);
  const startTouchX = React.useRef(0);
  const touchMoved = React.useRef(false);

  // Check if this is user's own post
  const isOwnPost = post.user.id === currentUserId || (post.isRepost && post.repostedBy?.id === currentUserId);

  // Heart animation refs
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const handleLike = () => {
    if (!liked) {
      // Only animate when liking, not unliking
      animateHeart();
    }
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    onLike(post.id);
  };

  const handleDoubleTapLike = () => {
    if (!liked) {
      setLiked(true);
      setLikesCount(likesCount + 1);
      onLike(post.id);
    }
    animateHeart();
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

  const handleRepost = () => {
    // Don't toggle state here - let the modal handle it
    onRepost(post);
  };

  // Double tap handler for the content area
  const handleContentTap = useDoubleTap(handleDoubleTapLike);

  // Double tap handler for image (single tap opens viewer, double tap likes)
  const lastImageTapRef = useRef<number>(0);
  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastImageTapRef.current < 300) {
      // Double tap - like
      handleDoubleTapLike();
      lastImageTapRef.current = 0;
    } else {
      // Single tap - open image viewer after delay
      lastImageTapRef.current = now;
      setTimeout(() => {
        if (lastImageTapRef.current === now) {
          onImagePress(post);
        }
      }, 300);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

    const month = postDate.toLocaleString('en-US', { month: 'short' });
    const day = postDate.getDate();
    return `${month} ${day}`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count > 0 ? count.toString() : '';
  };

  // Coin amounts for quick selection
  const coinAmounts = [1, 5, 10, 25, 50, 100];
  const LONG_PRESS_DELAY = 250; // ms to trigger long press

  // Handle touch start on gift icon - start long press timer
  const handleGiftTouchStart = (event: any) => {
    const { pageY, pageX } = event.nativeEvent;
    startTouchY.current = pageY;
    startTouchX.current = pageX;
    touchMoved.current = false;
    setIsLongPress(false);

    // Start long press timer
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    longPressTimeout.current = setTimeout(() => {
      setIsLongPress(true);
      setShowCoinPicker(true);
      onCoinPickerChange?.(true);
      // Start with middle option pre-selected for easier access
      setHoveredCoinIndex(2); // 10 coins
    }, LONG_PRESS_DELAY);
  };

  // Handle touch move - track which coin option is being hovered
  const handleGiftTouchMove = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;

    // Check if finger moved significantly (cancel tap intent)
    const deltaX = Math.abs(pageX - startTouchX.current);
    const deltaY = Math.abs(pageY - startTouchY.current);
    if (deltaX > 5 || deltaY > 5) {
      touchMoved.current = true;
    }

    if (!showCoinPicker) return;

    // Calculate which coin option based on horizontal drag from start position
    // Super smooth: very low threshold for option changes
    const deltaFromStart = pageX - startTouchX.current;

    // High sensitivity: only ~20px per option change for smooth feel
    const sensitivity = 20;
    // Start from middle (index 2), move left/right based on drag
    const baseIndex = 2;
    const indexOffset = Math.round(deltaFromStart / sensitivity);
    const index = Math.max(0, Math.min(coinAmounts.length - 1, baseIndex + indexOffset));

    setHoveredCoinIndex(index);
  };

  // Handle touch end - either open modal (tap) or send coins (long press + select)
  const handleGiftTouchEnd = async () => {
    // Clear long press timer
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }

    // If it was a quick tap (not long press and didn't move much), open the modal
    if (!isLongPress && !touchMoved.current) {
      onGiveCoins(post);
      setIsLongPress(false);
      return;
    }

    // If long press was active, handle coin picker
    if (showCoinPicker) {
      setShowCoinPicker(false);
      onCoinPickerChange?.(false);

      if (hoveredCoinIndex >= 0 && hoveredCoinIndex < coinAmounts.length) {
        const amount = coinAmounts[hoveredCoinIndex];
        setSentCoinAmount(amount);

        // Send coins immediately
        const success = await onQuickGiveCoins(post, amount);
        if (success) {
          // Show celebration animation (handled by CoinCelebration component)
          setShowCelebration(true);
        }
      }

      setHoveredCoinIndex(-1);
    }

    setIsLongPress(false);
  };

  // Handle touch cancel (e.g., scroll interrupt)
  const handleGiftTouchCancel = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    if (showCoinPicker) {
      onCoinPickerChange?.(false);
    }
    setShowCoinPicker(false);
    setHoveredCoinIndex(-1);
    setIsLongPress(false);
  };

  // Cleanup timeouts
  React.useEffect(() => {
    return () => {
      if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    };
  }, []);

  const imageUri = getImageUrl(post.thumbnailUrl) || getImageUrl(post.imageUrl) || getImageUrl(post.originalImageUrl);
  // On large screens, account for sidebar; cap image at reasonable max
  const feedWidth = width >= TABLET_BREAKPOINT ? width - SIDEBAR_WIDTH : width;
  const imageWidth = Math.min(feedWidth - 82, 700);

  // Compact repost layout - reposter is the focus, original post is small preview
  if (post.isRepost && post.repostedBy) {
    const maxCaptionLength = 60;
    const truncatedCaption = post.caption && post.caption.length > maxCaptionLength
      ? post.caption.substring(0, maxCaptionLength) + '...'
      : post.caption;

    return (
      <View style={[styles.tweetContainer, { backgroundColor: colors.cardBackground }]}>
        {/* Reposter Header - Main focus */}
        <View style={styles.tweetMainContent}>
          <TouchableOpacity
            style={styles.avatarColumn}
            onPress={() => onNavigateToProfile(post.repostedBy!.id, post.repostedBy!.username)}
          >
            <Avatar
              size={40}
              username={post.repostedBy.username}
              customizations={post.repostedBy.activeAvatar?.customizations}
              avatarStyle={post.repostedBy.activeAvatar?.style}
            />
          </TouchableOpacity>

          <View style={styles.contentColumn}>
            {/* Reposter info */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.userInfoRow}
                onPress={() => onNavigateToProfile(post.repostedBy!.id, post.repostedBy!.username)}
              >
                <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                  {post.repostedBy.username}
                </Text>
                <View style={styles.repostBadge}>
                  <Ionicons name="repeat" size={12} color="#10B981" />
                  <Text style={styles.repostBadgeText}>reposted</Text>
                </View>
              </TouchableOpacity>
              {post.topics && post.topics.length > 0 && (
                <View style={styles.topicTagRowInline}>
                  {post.topics.map(topic => (
                    <TouchableOpacity
                      key={topic.id}
                      style={[styles.topicTag, { backgroundColor: colors.textSecondary + '18' }]}
                      onPress={() => onTopicPress(topic.slug)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.topicTagIcon}>{topic.iconEmoji || '#'}</Text>
                      {width >= TABLET_BREAKPOINT && (
                        <Text style={[styles.topicTagText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {topic.name}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {isOwnPost && (
                <TouchableOpacity style={styles.moreButton} onPress={() => onMorePress(post)}>
                  <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Quote Comment - For quote reposts */}
            {post.repostType === 'quote' && post.repostComment && (
              <Text style={[styles.quoteText, { color: colors.text }]}>
                "{post.repostComment}"
              </Text>
            )}

            {/* Original Post - Compact or Expanded */}
            {!repostExpanded ? (
              /* Compact Original Post Preview */
              <TouchableOpacity
                style={[styles.compactOriginalPost, { borderColor: colors.border, backgroundColor: colors.mediaBackground }]}
                onPress={() => setRepostExpanded(true)}
                activeOpacity={0.7}
              >
                {/* Left: Original post info */}
                <View style={styles.compactPostContent}>
                  <View style={styles.compactPostHeader}>
                    <Avatar
                      size={16}
                      username={post.user.username}
                      customizations={post.user.activeAvatar?.customizations}
                      avatarStyle={post.user.activeAvatar?.style}
                    />
                    <Text style={[styles.compactPostUsername, { color: colors.textSecondary }]}>
                      @{post.user.username}
                    </Text>
                  </View>
                  {post.caption && (
                    <Text
                      style={[styles.compactPostCaption, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {truncatedCaption}
                    </Text>
                  )}
                  <Text style={[styles.compactExpandHint, { color: colors.textSecondary }]}>
                    tap to view
                  </Text>
                </View>

                {/* Right: Small thumbnail */}
                {imageUri && (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.compactPostImage}
                    resizeMode="cover"
                  />
                )}
              </TouchableOpacity>
            ) : (
              /* Expanded Original Post */
              <TouchableOpacity
                style={[styles.expandedOriginalPost, { borderColor: colors.border, backgroundColor: colors.mediaBackground }]}
                onPress={() => setRepostExpanded(false)}
                activeOpacity={0.9}
              >
                <View style={styles.expandedPostHeader}>
                  <Avatar
                    size={24}
                    username={post.user.username}
                    customizations={post.user.activeAvatar?.customizations}
                    avatarStyle={post.user.activeAvatar?.style}
                  />
                  <Text style={[styles.expandedPostUsername, { color: colors.textSecondary }]}>
                    @{post.user.username}
                  </Text>
                  <Text style={[styles.compactExpandHint, { color: colors.textSecondary, marginLeft: 'auto' }]}>
                    tap to collapse
                  </Text>
                </View>
                {post.caption && (
                  <Text style={[styles.expandedPostCaption, { color: colors.text }]}>
                    {post.caption}
                  </Text>
                )}
                {imageUri && (
                  <Image
                    source={{ uri: imageUri }}
                    style={[styles.expandedPostImage, { backgroundColor: colors.mediaBackground }]}
                    resizeMode="cover"
                  />
                )}
              </TouchableOpacity>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => onComment(post.id)}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.iconDefault} />
                <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
                  {formatCount(post.commentsCount)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleRepost}>
                <Ionicons name="repeat-outline" size={20} color={reposted ? '#00BA7C' : colors.iconDefault} />
                <Text style={[styles.actionCount, { color: reposted ? '#00BA7C' : colors.textSecondary }]}>
                  {formatCount(repostCount)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.like : colors.iconDefault} />
                <Text style={[styles.actionCount, { color: liked ? colors.like : colors.textSecondary }]}>
                  {formatCount(likesCount)}
                </Text>
              </TouchableOpacity>

              {!isOwnPost && (
                <View
                  style={styles.giftButtonContainer}
                  onTouchStart={handleGiftTouchStart}
                  onTouchMove={handleGiftTouchMove}
                  onTouchEnd={handleGiftTouchEnd}
                  onTouchCancel={handleGiftTouchCancel}
                >
                  <TouchableOpacity
                    style={[styles.actionButton, width >= TABLET_BREAKPOINT && styles.giftButtonLarge]}
                    onPress={() => onGiveCoins(post)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="gift" size={width >= TABLET_BREAKPOINT ? 20 : 18} color={colors.gift} />
                    {width >= TABLET_BREAKPOINT && (
                      <Text style={[styles.giftButtonText, { color: colors.gift }]}>Send</Text>
                    )}
                  </TouchableOpacity>

                  {/* Instagram-style Coin Picker - appears above when holding */}
                  {showCoinPicker && (
                    <View style={[styles.coinPickerOverlay, { backgroundColor: colors.cardBackground }]}>
                      <View style={styles.coinPickerRow}>
                        {coinAmounts.map((amount, index) => {
                          const isHovered = hoveredCoinIndex === index;
                          return (
                            <View
                              key={amount}
                              style={[
                                styles.coinPickerOption,
                                isHovered && styles.coinPickerOptionHovered,
                              ]}
                            >
                              <View style={[
                                styles.artCoin,
                                isHovered && styles.artCoinHovered,
                              ]}>
                                <View style={[
                                  styles.artCoinInner,
                                  isHovered && styles.artCoinInnerHovered,
                                ]}>
                                  <View style={styles.kindnessSymbol}>
                                    <Ionicons name="leaf" size={isHovered ? 6 : 4} color="rgba(255,255,255,0.8)" style={styles.pickerLeafLeft} />
                                    <Ionicons name="heart" size={isHovered ? 10 : 7} color="#FFF" />
                                    <Ionicons name="leaf" size={isHovered ? 6 : 4} color="rgba(255,255,255,0.8)" style={styles.pickerLeafRight} />
                                  </View>
                                </View>
                              </View>
                              <Text style={[
                                styles.coinPickerAmount,
                                { color: isHovered ? '#FBBF24' : colors.textSecondary },
                              ]}>
                                {amount}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      <Text style={styles.coinPickerHint}>← drag to select →</Text>
                      <View style={styles.coinPickerArrow} />
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.actionButton} onPress={() => onShare(post)}>
                <Ionicons name="share-outline" size={18} color={colors.iconDefault} />
              </TouchableOpacity>
            </View>

            {/* Celebration Animation - Shared Component (Modal style) */}
            <CoinCelebration
              visible={showCelebration}
              amount={sentCoinAmount}
              source="gift"
              recipientUsername={post.isRepost && post.repostedBy ? post.repostedBy.username : post.user.username}
              onClose={() => setShowCelebration(false)}
              asModal={true}
            />
          </View>
        </View>
      </View>
    );
  }

  // Regular post layout (non-repost)
  // Muted decoration: subtle tint instead of full color, plus accent strip
  const mutedBg = (() => {
    if (!bgDecoration) return colors.cardBackground;
    const primary = bgDecoration.type === 'gradient' && bgDecoration.colors
      ? bgDecoration.colors[0]
      : bgDecoration.color || colors.cardBackground;
    return blendHex(primary, isDark ? '#161B22' : '#F8F9FA', 0.88);
  })();

  const cardContent = (
    <View style={[styles.tweetContainer, { backgroundColor: mutedBg }]}>
      {bgCornerConfig && <CornerDecorations config={bgCornerConfig} muted />}
      {/* Decoration accent strip / icon binder – left-edge indicator */}
      {bgDecoration && (() => {
        const binder = bgDecoration.binderIcon;
        if (binder) {
          const BinderIcon = binder.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
          const gradientColors = bgDecoration.type === 'gradient' && bgDecoration.colors
            ? bgDecoration.colors as [string, string, ...string[]]
            : [bgDecoration.color || '#888', bgDecoration.color || '#888'] as [string, string];
          return (
            <LinearGradient
              colors={gradientColors}
              locations={bgDecoration.locations as [number, number, ...number[]] | undefined}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.decorIconBinder}
            >
              <BinderIcon name={binder.iconName as any} size={10} color={binder.color} style={{ opacity: 0.7 }} />
              <BinderIcon name={binder.iconName as any} size={10} color={binder.color} style={{ opacity: 0.5 }} />
              <BinderIcon name={binder.iconName as any} size={10} color={binder.color} style={{ opacity: 0.7 }} />
            </LinearGradient>
          );
        }
        if (bgDecoration.type === 'gradient' && bgDecoration.colors) {
          return (
            <LinearGradient
              colors={bgDecoration.colors as [string, string, ...string[]]}
              locations={bgDecoration.locations as [number, number, ...number[]] | undefined}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.decorAccentStrip}
            />
          );
        }
        if (bgDecoration.type === 'solid' && bgDecoration.color) {
          return <View style={[styles.decorAccentStrip, { backgroundColor: bgDecoration.color }]} />;
        }
        return null;
      })()}
      {/* Main Tweet Content */}
      <View style={styles.tweetMainContent}>
        {/* Avatar Column */}
        <TouchableOpacity
          style={styles.avatarColumn}
          onPress={() => onNavigateToProfile(post.user.id, post.user.username)}
        >
          <Avatar
            size={40}
            username={post.user.username}
            customizations={post.user.activeAvatar?.customizations}
            avatarStyle={post.user.activeAvatar?.style}
          />
        </TouchableOpacity>

        {/* Content Column */}
        <View style={styles.contentColumn}>
          {/* Header Row - Clickable to go to profile */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.userInfoRow}
              onPress={() => onNavigateToProfile(post.user.id, post.user.username)}
            >
              <Text style={[styles.displayName, { color: dTextColor }]} numberOfLines={1}>
                {post.user.username}
              </Text>
              <Text style={[styles.username, { color: dSecondaryColor }]} numberOfLines={1}>
                @{post.user.username}
              </Text>
              <Text style={[styles.dot, { color: dSecondaryColor }]}>·</Text>
              <Text style={[styles.timestamp, { color: dSecondaryColor }]}>
                {formatTimeAgo(post.createdAt)}
              </Text>
            </TouchableOpacity>
            {post.topics && post.topics.length > 0 && (
              <View style={styles.topicTagRowInline}>
                {post.topics.map(topic => (
                  <TouchableOpacity
                    key={topic.id}
                    style={[styles.topicTag, { backgroundColor: dSecondaryColor + '18' }]}
                    onPress={() => onTopicPress(topic.slug)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.topicTagIcon}>{topic.iconEmoji || '#'}</Text>
                    {width >= TABLET_BREAKPOINT && (
                      <Text style={[styles.topicTagText, { color: dSecondaryColor }]} numberOfLines={1}>
                        {topic.name}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {isOwnPost && (
              <TouchableOpacity style={styles.moreButton} onPress={() => onMorePress(post)}>
                <Ionicons name="ellipsis-horizontal" size={16} color={dSecondaryColor} />
              </TouchableOpacity>
            )}
          </View>

          {/* Double-tap area for like (caption + image) */}
          <Pressable onPress={handleContentTap}>
            {/* Tweet Text */}
            {post.caption && (
              <Text style={[styles.tweetText, { color: dTextColor }]}>{post.caption}</Text>
            )}
          </Pressable>

          {/* Media - Single tap opens viewer, double tap likes */}
          {imageUri && (
            <Pressable
              style={[styles.mediaContainer, { borderColor: colors.border }, frameStyle]}
              onPress={handleImageTap}
            >
              <Image
                source={{ uri: imageUri }}
                style={[styles.mediaImage, { width: imageWidth, height: imageWidth * 0.75, backgroundColor: colors.mediaBackground }]}
                resizeMode="cover"
              />
              {frameCornerConfig && <CornerDecorations config={frameCornerConfig} muted />}
              {/* Heart overlay animation */}
              {showHeartOverlay && (
                <Animated.View
                  style={[
                    styles.heartOverlay,
                    {
                      transform: [{ scale: heartScale }],
                      opacity: heartOpacity,
                    },
                  ]}
                >
                  <Ionicons name="heart" size={80} color="#FFF" />
                </Animated.View>
              )}
            </Pressable>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {/* Reply/Comment */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onComment(post.id)}
            >
              <Ionicons name="chatbubble-outline" size={18} color={dCommentColor} />
              <Text style={[styles.actionCount, { color: dSecondaryColor }]}>
                {formatCount(post.commentsCount)}
              </Text>
            </TouchableOpacity>

            {/* Repost */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRepost}
            >
              <Ionicons
                name="repeat-outline"
                size={20}
                color={dRepostColor(reposted)}
              />
              <Text style={[styles.actionCount, { color: reposted ? dRepostColor(true) : dSecondaryColor }]}>
                {formatCount(repostCount)}
              </Text>
            </TouchableOpacity>

            {/* Like */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLike}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={18}
                color={dLikeColor(liked)}
              />
              <Text style={[styles.actionCount, { color: liked ? dLikeColor(true) : dSecondaryColor }]}>
                {formatCount(likesCount)}
              </Text>
            </TouchableOpacity>

            {/* Gift/Coins - Hidden for own posts */}
            {!isOwnPost && (
              <View
                style={styles.giftButtonContainer}
                onTouchStart={handleGiftTouchStart}
                onTouchMove={handleGiftTouchMove}
                onTouchEnd={handleGiftTouchEnd}
                onTouchCancel={handleGiftTouchCancel}
              >
                <TouchableOpacity
                  style={[styles.actionButton, width >= TABLET_BREAKPOINT && styles.giftButtonLarge]}
                  onPress={() => onGiveCoins(post)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="gift" size={width >= TABLET_BREAKPOINT ? 20 : 18} color={dGiftColor} />
                  {width >= TABLET_BREAKPOINT && (
                    <Text style={[styles.giftButtonText, { color: dGiftColor }]}>Send</Text>
                  )}
                </TouchableOpacity>

                {/* Instagram-style Coin Picker - appears above when holding */}
                {showCoinPicker && (
                  <View style={[styles.coinPickerOverlay, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.coinPickerRow}>
                      {coinAmounts.map((amount, index) => {
                        const isHovered = hoveredCoinIndex === index;
                        return (
                          <View
                            key={amount}
                            style={[
                              styles.coinPickerOption,
                              isHovered && styles.coinPickerOptionHovered,
                            ]}
                          >
                            <View style={[
                              styles.artCoin,
                              isHovered && styles.artCoinHovered,
                            ]}>
                              <View style={[
                                styles.artCoinInner,
                                isHovered && styles.artCoinInnerHovered,
                              ]}>
                                <View style={styles.kindnessSymbol}>
                                  <Ionicons name="leaf" size={isHovered ? 6 : 4} color="rgba(255,255,255,0.8)" style={styles.pickerLeafLeft} />
                                  <Ionicons name="heart" size={isHovered ? 10 : 7} color="#FFF" />
                                  <Ionicons name="leaf" size={isHovered ? 6 : 4} color="rgba(255,255,255,0.8)" style={styles.pickerLeafRight} />
                                </View>
                              </View>
                            </View>
                            <Text style={[
                              styles.coinPickerAmount,
                              { color: isHovered ? '#FBBF24' : colors.textSecondary },
                            ]}>
                              {amount}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <Text style={styles.coinPickerHint}>← drag to select →</Text>
                    <View style={styles.coinPickerArrow} />
                  </View>
                )}
              </View>
            )}

            {/* Share */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onShare(post)}
            >
              <Ionicons name="share-outline" size={18} color={dShareColor} />
            </TouchableOpacity>
          </View>

          {/* Celebration Animation - Shared Component (Modal style) */}
          <CoinCelebration
            visible={showCelebration}
            amount={sentCoinAmount}
            source="gift"
            recipientUsername={post.user.username}
            onClose={() => setShowCelebration(false)}
            asModal={true}
          />

          {/* Comment Preview */}
          {post.recentComments && post.recentComments.length > 0 && (
            <CommentPreview
              comments={post.recentComments}
              totalComments={post.commentsCount}
              maxComments={3}
              onViewAllComments={() => onComment(post.id)}
              onUserPress={(userId) => {
                const comment = post.recentComments?.find(c => c.user.id === userId);
                if (comment) {
                  onNavigateToProfile(userId, comment.user.username);
                }
              }}
              colors={{
                text: colors.text,
                textSecondary: colors.textSecondary,
                accent: colors.accent,
              }}
            />
          )}
        </View>
      </View>
    </View>
  );

  return cardContent;
}

// Twitter-style Image Viewer Modal
function ImageViewerModal({
  visible,
  post,
  onClose,
  onLike,
  onComment,
  onUserPress,
  onRepost,
  onShare,
}: {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onRepost: (post: Post) => void;
  onShare: (post: Post) => void;
}) {
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = React.useState(post?.likedByMe || false);
  const [likesCount, setLikesCount] = React.useState(post?.likesCount || 0);
  const [reposted, setReposted] = React.useState(post?.repostedByMe || false);
  const [repostCount, setRepostCount] = React.useState(post?.repostCount || 0);

  // Reset state when post changes
  React.useEffect(() => {
    if (post) {
      setLiked(post.likedByMe || false);
      setLikesCount(post.likesCount);
      setReposted(post.repostedByMe || false);
      setRepostCount(post.repostCount || 0);
    }
  }, [post]);

  if (!post) return null;

  const fullImageUri = getImageUrl(post.originalImageUrl) || getImageUrl(post.imageUrl) || getImageUrl(post.thumbnailUrl);

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    onLike(post.id);
  };

  const handleRepost = () => {
    // Don't toggle state here - let the modal handle it
    onRepost(post);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

    const month = postDate.toLocaleString('en-US', { month: 'short' });
    const day = postDate.getDate();
    return `${month} ${day}`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count > 0 ? count.toString() : '';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <View style={styles.imageViewerContainer}>
        {/* Header */}
        <View style={[styles.imageViewerHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.imageViewerCloseButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageViewerUserInfo}
            onPress={() => {
              onClose();
              onUserPress(post.user.id);
            }}
          >
            <Avatar
              size={32}
              username={post.user.username}
              customizations={post.user.activeAvatar?.customizations}
              avatarStyle={post.user.activeAvatar?.style}
            />
            <View style={styles.imageViewerUserText}>
              <Text style={styles.imageViewerDisplayName}>{post.user.username}</Text>
              <Text style={styles.imageViewerUsername}>@{post.user.username}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.imageViewerMoreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <Pressable
          style={styles.imageViewerContent}
          onPress={onClose}
        >
          {fullImageUri && (
            <Image
              source={{ uri: fullImageUri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </Pressable>

        {/* Bottom Section with Text and Actions */}
        <View style={[styles.imageViewerBottom, { paddingBottom: insets.bottom + 8 }]}>
          {/* Caption */}
          {post.caption && (
            <ScrollView
              style={styles.imageViewerCaptionScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.imageViewerCaption}>{post.caption}</Text>
            </ScrollView>
          )}

          {/* Timestamp */}
          <Text style={styles.imageViewerTimestamp}>
            {formatTimeAgo(post.createdAt)}
          </Text>

          {/* Actions Row */}
          <View style={styles.imageViewerActions}>
            {/* Comment */}
            <TouchableOpacity
              style={styles.imageViewerActionButton}
              onPress={() => {
                onClose();
                onComment(post.id);
              }}
            >
              <Ionicons name="chatbubble-outline" size={22} color="#FFF" />
              <Text style={styles.imageViewerActionCount}>
                {formatCount(post.commentsCount)}
              </Text>
            </TouchableOpacity>

            {/* Repost */}
            <TouchableOpacity
              style={styles.imageViewerActionButton}
              onPress={handleRepost}
            >
              <Ionicons
                name="repeat-outline"
                size={24}
                color={reposted ? '#00BA7C' : '#FFF'}
              />
              <Text style={[styles.imageViewerActionCount, reposted && { color: '#00BA7C' }]}>
                {formatCount(repostCount)}
              </Text>
            </TouchableOpacity>

            {/* Like */}
            <TouchableOpacity
              style={styles.imageViewerActionButton}
              onPress={handleLike}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={22}
                color={liked ? '#F91880' : '#FFF'}
              />
              <Text style={[styles.imageViewerActionCount, liked && { color: '#F91880' }]}>
                {formatCount(likesCount)}
              </Text>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              style={styles.imageViewerActionButton}
              onPress={() => onShare(post)}
            >
              <Ionicons name="share-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const SWIPE_THRESHOLD = 80; // Minimum swipe distance to trigger

// Large screen sidebar width
const SIDEBAR_WIDTH = 260;

// Sidebar component showing friends & communities with seen/unseen ratios for large screens
interface FriendEntry {
  userId: string;
  username: string;
  avatar?: ActiveAvatar | null;
  totalPosts: number;
  seenPosts: number;
  firstUnseenPostId: string | null;
  firstPostId: string;
}

interface CommunityEntry {
  topicId: string;
  name: string;
  iconEmoji: string | null;
  totalPosts: number;
  seenPosts: number;
  firstUnseenPostId: string | null;
  firstPostId: string;
}

function FeedSidebar({
  posts,
  viewedPostIds,
  onPostPress,
  colors,
}: {
  posts: Post[];
  viewedPostIds: Set<string>;
  onPostPress: (postId: string, userId: string, username: string) => void;
  colors: ThemeColors;
}) {
  const { colors: themeColors } = useTheme();

  // Friends section: group ALL posts by author with seen/unseen ratio
  const friends = useMemo(() => {
    const map = new Map<string, FriendEntry>();
    for (const post of posts) {
      const postKey = post.feedItemId || post.id;
      const userId = post.isRepost && post.repostedBy ? post.repostedBy.id : post.user.id;
      const username = post.isRepost && post.repostedBy ? post.repostedBy.username : post.user.username;
      const avatar = post.isRepost && post.repostedBy ? post.repostedBy.activeAvatar : post.user.activeAvatar;
      const isSeen = viewedPostIds.has(postKey);

      if (map.has(userId)) {
        const entry = map.get(userId)!;
        entry.totalPosts++;
        if (isSeen) entry.seenPosts++;
        if (!isSeen && !entry.firstUnseenPostId) entry.firstUnseenPostId = postKey;
      } else {
        map.set(userId, {
          userId,
          username,
          avatar,
          totalPosts: 1,
          seenPosts: isSeen ? 1 : 0,
          firstUnseenPostId: isSeen ? null : postKey,
          firstPostId: postKey,
        });
      }
    }
    // Sort: users with unseen posts first, then by most unseen
    return Array.from(map.values()).sort((a, b) => {
      const aUnseen = a.totalPosts - a.seenPosts;
      const bUnseen = b.totalPosts - b.seenPosts;
      if (aUnseen > 0 && bUnseen === 0) return -1;
      if (bUnseen > 0 && aUnseen === 0) return 1;
      return bUnseen - aUnseen;
    });
  }, [posts, viewedPostIds]);

  // Communities section: group ALL posts by topic with seen/unseen ratio
  const communities = useMemo(() => {
    const map = new Map<string, CommunityEntry>();
    for (const post of posts) {
      if (!post.topics || post.topics.length === 0) continue;
      const postKey = post.feedItemId || post.id;
      const isSeen = viewedPostIds.has(postKey);

      for (const topic of post.topics) {
        if (map.has(topic.id)) {
          const entry = map.get(topic.id)!;
          entry.totalPosts++;
          if (isSeen) entry.seenPosts++;
          if (!isSeen && !entry.firstUnseenPostId) entry.firstUnseenPostId = postKey;
        } else {
          map.set(topic.id, {
            topicId: topic.id,
            name: topic.name,
            iconEmoji: topic.iconEmoji,
            totalPosts: 1,
            seenPosts: isSeen ? 1 : 0,
            firstUnseenPostId: isSeen ? null : postKey,
            firstPostId: postKey,
          });
        }
      }
    }
    // Sort: topics with unseen posts first, then by most unseen
    return Array.from(map.values()).sort((a, b) => {
      const aUnseen = a.totalPosts - a.seenPosts;
      const bUnseen = b.totalPosts - b.seenPosts;
      if (aUnseen > 0 && bUnseen === 0) return -1;
      if (bUnseen > 0 && aUnseen === 0) return 1;
      return bUnseen - aUnseen;
    });
  }, [posts, viewedPostIds]);

  const totalFriendUnseen = friends.reduce((sum, f) => sum + (f.totalPosts - f.seenPosts), 0);
  const totalCommunityUnseen = communities.reduce((sum, c) => sum + (c.totalPosts - c.seenPosts), 0);
  const allCaughtUp = totalFriendUnseen === 0 && totalCommunityUnseen === 0;

  // No posts loaded at all
  if (friends.length === 0 && communities.length === 0) {
    return (
      <View style={sidebarStyles.container}>
        <View style={[sidebarStyles.sectionHeader, { borderBottomColor: colors.separator }]}>
          <Ionicons name="newspaper-outline" size={16} color={themeColors.text.link} />
          <Text style={[sidebarStyles.headerTitle, { color: colors.text }]}>Feed</Text>
        </View>
        <View style={sidebarStyles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={28} color={colors.textSecondary} />
          <Text style={[sidebarStyles.emptyText, { color: colors.textSecondary }]}>
            No posts yet
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={sidebarStyles.container}>
      {/* All caught up banner */}
      {allCaughtUp && (
        <View style={[sidebarStyles.sectionHeader, { borderBottomColor: colors.separator }]}>
          <Ionicons name="checkmark-circle" size={16} color={themeColors.text.link} />
          <Text style={[sidebarStyles.headerTitle, { color: colors.text }]}>All caught up</Text>
        </View>
      )}
      <ScrollView
        style={sidebarStyles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={sidebarStyles.listContent}
      >
        {/* Friends Section */}
        {friends.length > 0 && (
          <>
            <View style={[sidebarStyles.sectionHeader, { borderBottomColor: colors.separator }]}>
              <Ionicons name="people-outline" size={16} color={themeColors.text.link} />
              <Text style={[sidebarStyles.headerTitle, { color: colors.text }]}>Friends</Text>
              {totalFriendUnseen > 0 && (
                <View style={[sidebarStyles.countBadge, { backgroundColor: themeColors.text.link }]}>
                  <Text style={sidebarStyles.countBadgeText}>{totalFriendUnseen}</Text>
                </View>
              )}
            </View>
            {friends.map((entry) => {
              const unseen = entry.totalPosts - entry.seenPosts;
              const isCaughtUp = unseen === 0;
              return (
                <TouchableOpacity
                  key={entry.userId}
                  style={[sidebarStyles.userRow, isCaughtUp && sidebarStyles.dimmedRow]}
                  onPress={() => onPostPress(
                    entry.firstUnseenPostId || entry.firstPostId,
                    entry.userId,
                    entry.username
                  )}
                  activeOpacity={0.7}
                >
                  <Avatar
                    size={32}
                    username={entry.username}
                    customizations={entry.avatar?.customizations}
                    avatarStyle={entry.avatar?.style}
                  />
                  <Text
                    style={[
                      sidebarStyles.username,
                      { color: isCaughtUp ? colors.textSecondary : colors.text }
                    ]}
                    numberOfLines={1}
                  >
                    {entry.username}
                  </Text>
                  <View style={[
                    sidebarStyles.ratioBadge,
                    isCaughtUp
                      ? sidebarStyles.ratioBadgeCaughtUp
                      : { backgroundColor: themeColors.text.link + '22' }
                  ]}>
                    <Text style={[
                      sidebarStyles.ratioText,
                      { color: isCaughtUp ? colors.textSecondary : themeColors.text.link }
                    ]}>
                      {entry.seenPosts}/{entry.totalPosts}
                    </Text>
                  </View>
                  {!isCaughtUp && (
                    <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Divider between sections */}
        {friends.length > 0 && communities.length > 0 && (
          <View style={[sidebarStyles.sectionDivider, { backgroundColor: colors.separator }]} />
        )}

        {/* Communities Section */}
        {communities.length > 0 && (
          <>
            <View style={[sidebarStyles.sectionHeader, { borderBottomColor: colors.separator }]}>
              <Ionicons name="grid-outline" size={16} color={themeColors.text.link} />
              <Text style={[sidebarStyles.headerTitle, { color: colors.text }]}>Communities</Text>
              {totalCommunityUnseen > 0 && (
                <View style={[sidebarStyles.countBadge, { backgroundColor: themeColors.text.link }]}>
                  <Text style={sidebarStyles.countBadgeText}>{totalCommunityUnseen}</Text>
                </View>
              )}
            </View>
            {communities.map((entry) => {
              const unseen = entry.totalPosts - entry.seenPosts;
              const isCaughtUp = unseen === 0;
              return (
                <TouchableOpacity
                  key={entry.topicId}
                  style={[sidebarStyles.userRow, isCaughtUp && sidebarStyles.dimmedRow]}
                  onPress={() => onPostPress(
                    entry.firstUnseenPostId || entry.firstPostId,
                    '',
                    entry.name
                  )}
                  activeOpacity={0.7}
                >
                  <View style={sidebarStyles.emojiContainer}>
                    <Text style={sidebarStyles.emojiText}>{entry.iconEmoji || '#'}</Text>
                  </View>
                  <Text
                    style={[
                      sidebarStyles.username,
                      { color: isCaughtUp ? colors.textSecondary : colors.text }
                    ]}
                    numberOfLines={1}
                  >
                    {entry.name}
                  </Text>
                  <View style={[
                    sidebarStyles.ratioBadge,
                    isCaughtUp
                      ? sidebarStyles.ratioBadgeCaughtUp
                      : { backgroundColor: themeColors.text.link + '22' }
                  ]}>
                    <Text style={[
                      sidebarStyles.ratioText,
                      { color: isCaughtUp ? colors.textSecondary : themeColors.text.link }
                    ]}>
                      {entry.seenPosts}/{entry.totalPosts}
                    </Text>
                  </View>
                  {!isCaughtUp && (
                    <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const sidebarStyles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
    gap: 10,
  },
  dimmedRow: {
    opacity: 0.55,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  ratioBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ratioBadgeCaughtUp: {
    backgroundColor: 'transparent',
  },
  ratioText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emojiContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(128,128,128,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 16,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default function FeedScreen() {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const { colors: themeColors, isDark } = useTheme();
  const isTablet = width >= TABLET_BREAKPOINT;
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadCount();

  // Map global theme to flat FeedColors used by TweetCard
  const colors: FeedColors = useMemo(() => ({
    background: themeColors.background,
    cardBackground: themeColors.card,
    text: themeColors.text.primary,
    textSecondary: themeColors.text.secondary,
    separator: themeColors.separator,
    border: themeColors.border,
    accent: themeColors.text.link,
    like: themeColors.like,
    gift: themeColors.gift,
    iconDefault: themeColors.icon.secondary,
    mediaBackground: themeColors.surfaceVariant,
    emptyIconBg: 'rgba(29, 155, 240, 0.1)',
  }), [themeColors]);

  const [refreshing, setRefreshing] = React.useState(false);
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [giveModalVisible, setGiveModalVisible] = React.useState(false);
  const [selectedPost, setSelectedPost] = React.useState<Post | null>(null);
  const [imageViewerPost, setImageViewerPost] = React.useState<Post | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = React.useState(false);
  const [repostModalVisible, setRepostModalVisible] = React.useState(false);
  const [repostModalPost, setRepostModalPost] = React.useState<Post | null>(null);
  const [chatDrawerVisible, setChatDrawerVisible] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string>('');
  const [postOptionsPost, setPostOptionsPost] = React.useState<Post | null>(null);
  const [postOptionsVisible, setPostOptionsVisible] = React.useState(false);
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [editCaption, setEditCaption] = React.useState('');
  const [editImageUri, setEditImageUri] = React.useState<string | null>(null);
  const [editedImageUri, setEditedImageUri] = React.useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = React.useState(false);

  // Track viewed posts for sidebar (large screens)
  const [viewedPostIds, setViewedPostIds] = React.useState<Set<string>>(new Set());
  const flatListRef = React.useRef<FlatList>(null);

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 800,
  }).current;

  const onViewableItemsChanged = React.useRef(({ viewableItems }: { viewableItems: Array<{ item: Post }> }) => {
    setViewedPostIds(prev => {
      const next = new Set(prev);
      let changed = false;
      for (const vi of viewableItems) {
        const key = vi.item.feedItemId || vi.item.id;
        if (!next.has(key)) {
          next.add(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }).current;

  // Scroll to a specific post (used by sidebar)
  const scrollToPost = React.useCallback((postId: string) => {
    const index = posts.findIndex(p => (p.feedItemId || p.id) === postId);
    if (index >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
    }
  }, [posts]);

  // Animated value for page position (0 = Feed visible, 1 = Messages visible)
  const screenWidth = Dimensions.get('window').width;
  const pageAnim = useRef(new Animated.Value(0)).current;
  const isSwipingPage = useRef(false);
  const currentPagePosition = useRef(0); // Track current page position (0 = Feed, 1 = Messages)

  // Ref to ChatDrawer for triggering fast animations
  const chatDrawerRef = useRef<ChatDrawerRef>(null);
  // Track if any coin picker is active (to block page swipe)
  const coinPickerActiveRef = useRef(false);

  // Listen to pageAnim changes to track position
  React.useEffect(() => {
    const listenerId = pageAnim.addListener(({ value }) => {
      currentPagePosition.current = value;
    });
    return () => {
      pageAnim.removeListener(listenerId);
    };
  }, []);

  // PanResponder for swipe between Feed and Messages pages
  // Only handles swipe LEFT to open Messages (from Feed)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Don't capture if a coin picker is active (user is dragging to select coins)
        if (coinPickerActiveRef.current) return false;
        // Don't capture if Messages is already visible or mostly visible
        if (chatDrawerVisible || currentPagePosition.current > 0.5) return false;
        // Only activate on horizontal LEFT swipe (to open Messages)
        const isSwipingLeft = gestureState.dx < -15;
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
        return isSwipingLeft && isHorizontalSwipe;
      },
      onPanResponderGrant: () => {
        isSwipingPage.current = true;
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate page position based on swipe (0 to 1)
        // dx is negative when swiping left
        const progress = Math.min(1, Math.max(0, -gestureState.dx / screenWidth));
        pageAnim.setValue(progress);
      },
      onPanResponderRelease: (_, gestureState) => {
        isSwipingPage.current = false;
        // Open Messages if swiped left enough or with enough velocity
        if (gestureState.dx < -SWIPE_THRESHOLD || gestureState.vx < -0.5) {
          // Set visible - this triggers the useEffect which animates pageAnim to 1
          setChatDrawerVisible(true);
        } else {
          // Snap back to Feed with smooth animation
          Animated.spring(pageAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
            mass: 0.8,
          }).start();
        }
      },
    })
  ).current;

  // Animate page position when chatDrawerVisible changes
  React.useEffect(() => {
    if (chatDrawerVisible) {
      // When opening Messages (via tap or swipe), animate pageAnim to 1
      Animated.spring(pageAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      }).start();
    } else {
      // When closing Messages, animate pageAnim back to 0
      Animated.spring(pageAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      }).start();
    }
  }, [chatDrawerVisible]);

  // Messages slides in from right, Feed stays in place
  const messagesTranslateX = pageAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth, 0], // Messages slides in from right
  });

  // Track if Messages page is currently visible (for hiding header)
  const [isMessagesShowing, setIsMessagesShowing] = React.useState(false);

  // Listen to pageAnim to track when Messages is visible
  React.useEffect(() => {
    const listenerId = pageAnim.addListener(({ value }) => {
      setIsMessagesShowing(value > 0.5);
    });
    return () => {
      pageAnim.removeListener(listenerId);
    };
  }, []);

  // Hide navigation header - we'll use custom headers for each page
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Listen for tab press to trigger fast animation when Messages/Chatbox is open
  React.useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    const unsubscribe = parent.addListener('tabPress', (e) => {
      // If Messages page is visible, trigger fast animation to go back to Home
      if (chatDrawerVisible || currentPagePosition.current > 0.1) {
        // Prevent default behavior (which would do nothing since we're already on this tab)
        e.preventDefault();
        // Trigger fast animated transition back to Home
        chatDrawerRef.current?.triggerGoHome();
      }
    });

    return unsubscribe;
  }, [navigation, chatDrawerVisible]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
      loadCurrentUser();
    }, [])
  );

  const loadCurrentUser = async () => {
    try {
      const response = await api.getProfile();
      const user = response.user || response;
      setCurrentUserId(user.id);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadFeed = async () => {
    try {
      const data = await api.getAlgorithmicFeed(1);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching feed:', error);
      try {
        const data = await api.getFeed(1);
        setPosts(data.posts || []);
      } catch (fallbackError) {
        console.error('Error fetching fallback feed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setViewedPostIds(new Set()); // Reset viewed tracking on refresh
    try {
      const data = await api.getAlgorithmicFeed(1);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await api.post(`/posts/${postId}/like`);
      await api.trackInteraction(postId, 'like');
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (postId: string) => {
    navigation.navigate('Comments', { postId });
    api.trackInteraction(postId, 'comment_view').catch(console.error);
  };

  const handleUserPress = (userId: string) => {
    api.trackInteraction(userId, 'profile_view').catch(console.error);
    console.log('View user profile:', userId);
  };

  const handleGiveCoins = (post: Post) => {
    setSelectedPost(post);
    setGiveModalVisible(true);
  };

  // Quick give coins without modal - returns success flag
  const handleQuickGiveCoins = async (post: Post, amount: number): Promise<string | null> => {
    try {
      const toUserId = post.isRepost && post.repostedBy ? post.repostedBy.id : post.user.id;
      const response = await api.giveCoins({
        toUserId,
        amount,
        contextType: 'post',
        contextId: post.id,
      });
      return response.transactionId || response.id || 'success';
    } catch (error: any) {
      console.error('Error giving coins:', error);
      // Extract error message from API response
      const errorMessage = error?.response?.data?.error ||
                          error?.message ||
                          'Failed to send coins. Please try again.';
      Alert.alert('Could not send coins', errorMessage);
      return null;
    }
  };

  const handleImagePress = (post: Post) => {
    setImageViewerPost(post);
    setImageViewerVisible(true);
  };

  const handleRepost = (post: Post) => {
    // Show the repost options modal
    setRepostModalPost(post);
    setRepostModalVisible(true);
  };

  const handleRepostSuccess = (reposted: boolean, type?: RepostType) => {
    if (repostModalPost) {
      // Update local posts state
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === repostModalPost.id
            ? {
                ...p,
                repostedByMe: reposted,
                repostCount: reposted
                  ? (p.repostCount || 0) + 1
                  : Math.max((p.repostCount || 0) - 1, 0),
              }
            : p
        )
      );

      // Also update imageViewerPost if it's the same post
      if (imageViewerPost?.id === repostModalPost.id) {
        setImageViewerPost(prev =>
          prev
            ? {
                ...prev,
                repostedByMe: reposted,
                repostCount: reposted
                  ? (prev.repostCount || 0) + 1
                  : Math.max((prev.repostCount || 0) - 1, 0),
              }
            : null
        );
      }
    }
  };

  const handleShare = async (post: Post) => {
    try {
      const shareablePost: ShareablePost = {
        id: post.id,
        caption: post.caption,
        user: post.user,
        imageUrl: post.imageUrl,
        originalImageUrl: post.originalImageUrl,
        thumbnailUrl: post.thumbnailUrl,
      };

      const result = await sharePost(shareablePost);

      if (result.success && result.action === 'sharedAction') {
        // Track the share interaction
        trackShare(post.id);
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  const handleNavigateToProfile = (userId: string, username: string) => {
    navigateToUserProfile(navigation, userId, username);
  };

  const handleMorePress = (post: Post) => {
    setPostOptionsPost(post);
    setPostOptionsVisible(true);
  };

  const handleEditPost = () => {
    if (!postOptionsPost) return;
    setPostOptionsVisible(false);
    setEditCaption(postOptionsPost.caption || '');
    // Use the original image if available, otherwise processed/thumbnail
    const imgUri = getImageUrl(postOptionsPost.originalImageUrl)
      || getImageUrl(postOptionsPost.imageUrl)
      || getImageUrl(postOptionsPost.thumbnailUrl);
    setEditImageUri(imgUri || null);
    setEditedImageUri(null);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!postOptionsPost) return;
    try {
      const result = await api.updatePost(postOptionsPost.id, editCaption, editedImageUri || undefined);
      setPosts(prev =>
        prev.map(p => {
          if (p.id !== postOptionsPost.id) return p;
          const updated = { ...p, caption: editCaption };
          if (result.post?.thumbnailUrl) updated.thumbnailUrl = result.post.thumbnailUrl;
          if (result.post?.processedImageUrl) updated.imageUrl = result.post.processedImageUrl;
          return updated;
        })
      );
      setEditModalVisible(false);
      setPostOptionsPost(null);
      setEditedImageUri(null);
      setEditImageUri(null);
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post. Please try again.');
    }
  };

  const handleDeletePost = () => {
    if (!postOptionsPost) return;
    setPostOptionsVisible(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePost(postOptionsPost.id);
              setPosts(prev => prev.filter(p => p.id !== postOptionsPost.id));
              setPostOptionsPost(null);
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleArchivePost = () => {
    if (!postOptionsPost) return;
    setPostOptionsVisible(false);
    Alert.alert(
      'Archive Post',
      'This post will be hidden from feeds. You can unarchive it later from your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              await api.archivePost(postOptionsPost.id);
              setPosts(prev => prev.filter(p => p.id !== postOptionsPost.id));
              setPostOptionsPost(null);
            } catch (error) {
              console.error('Error archiving post:', error);
              Alert.alert('Error', 'Failed to archive post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const navigateToFindFriends = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Search',
        params: {
          screen: 'SearchUsers',
        },
      })
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TweetCard
      post={item}
      onLike={handleLike}
      onComment={handleComment}
      onUserPress={handleUserPress}
      onGiveCoins={handleGiveCoins}
      onQuickGiveCoins={handleQuickGiveCoins}
      onImagePress={handleImagePress}
      onRepost={handleRepost}
      onShare={handleShare}
      onNavigateToProfile={handleNavigateToProfile}
      onTopicPress={(slug: string) => navigation.navigate('TopicPage', { topicSlug: slug })}
      onMorePress={handleMorePress}
      onCoinPickerChange={(active: boolean) => { coinPickerActiveRef.current = active; }}
      currentUserId={currentUserId}
      colors={colors}
    />
  );

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: colors.separator }]} />
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        // Remove overflow hidden when Messages is showing so ChatDrawer can extend beyond container
        isMessagesShowing && { overflow: 'visible' },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Feed Page - with optional sidebar on large screens */}
      <View style={[styles.feedPageLayout, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.feedContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {/* Custom Home Header */}
          <View
            style={[
              styles.customHeader,
              {
                backgroundColor: colors.background,
                borderBottomColor: colors.separator,
                paddingTop: insets.top,
              },
            ]}
          >
            <Text style={[styles.customHeaderTitle, { color: colors.text }]}>Home</Text>
            <TouchableOpacity
              style={styles.headerChatButton}
              onPress={() => setChatDrawerVisible(true)}
            >
              <Ionicons name="chatbubbles-outline" size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={styles.headerChatBadge}>
                  <Text style={styles.headerChatBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={posts}
            keyExtractor={(item) => item.feedItemId || item.id}
            renderItem={renderPost}
            ItemSeparatorComponent={renderSeparator}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.emptyIconBg }]}>
                  <Ionicons name="newspaper-outline" size={48} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Welcome to your timeline!</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  When you follow people, their posts will show up here.
                </Text>
                <TouchableOpacity
                  style={[styles.findFriendsButton, { backgroundColor: colors.accent }]}
                  onPress={navigateToFindFriends}
                >
                  <Text style={styles.findFriendsText}>Find people to follow</Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={posts.length === 0 ? { flex: 1 } : undefined}
          />
        </View>

        {/* Sidebar - only on large screens */}
        {isTablet && (
          <View style={{ paddingTop: insets.top, borderLeftWidth: 1, borderLeftColor: colors.separator }}>
            <FeedSidebar
              posts={posts}
              viewedPostIds={viewedPostIds}
              onPostPress={(postId, _userId, _username) => scrollToPost(postId)}
              colors={colors}
            />
          </View>
        )}
      </View>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={imageViewerVisible}
        post={imageViewerPost}
        onClose={() => {
          setImageViewerVisible(false);
          setImageViewerPost(null);
        }}
        onLike={handleLike}
        onComment={handleComment}
        onUserPress={handleUserPress}
        onRepost={handleRepost}
        onShare={handleShare}
      />

      {/* Give Coins Modal */}
      {selectedPost && (
        <GiveCoinsModal
          visible={giveModalVisible}
          recipientId={selectedPost.user.id}
          recipientUsername={selectedPost.user.username}
          contextType="post"
          contextId={selectedPost.id}
          onClose={() => {
            setGiveModalVisible(false);
            setSelectedPost(null);
          }}
          onSuccess={() => {
            setGiveModalVisible(false);
            setSelectedPost(null);
          }}
        />
      )}

      {/* Repost Options Modal */}
      {repostModalPost && (
        <RepostOptionsModal
          visible={repostModalVisible}
          onClose={() => {
            setRepostModalVisible(false);
            setRepostModalPost(null);
          }}
          postId={repostModalPost.id}
          isReposted={repostModalPost.repostedByMe || false}
          onRepostSuccess={handleRepostSuccess}
          originalCaption={repostModalPost.caption}
          originalUsername={repostModalPost.user.username}
        />
      )}

      {/* Post Options Modal (three-dot menu) */}
      <Modal
        visible={postOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPostOptionsVisible(false);
          setPostOptionsPost(null);
        }}
      >
        <Pressable
          style={styles.optionsOverlay}
          onPress={() => {
            setPostOptionsVisible(false);
            setPostOptionsPost(null);
          }}
        >
          <View style={[styles.optionsSheet, { backgroundColor: colors.cardBackground }]}>
            {postOptionsPost && (postOptionsPost.user.id === currentUserId) && (
              <>
                <TouchableOpacity
                  style={styles.optionsItem}
                  onPress={handleEditPost}
                >
                  <Ionicons name="create-outline" size={22} color={colors.text} />
                  <Text style={[styles.optionsItemText, { color: colors.text }]}>Edit Post</Text>
                </TouchableOpacity>
                <View style={[styles.optionsDivider, { backgroundColor: colors.separator }]} />
                <TouchableOpacity
                  style={styles.optionsItem}
                  onPress={handleArchivePost}
                >
                  <Ionicons name="eye-off-outline" size={22} color={colors.text} />
                  <Text style={[styles.optionsItemText, { color: colors.text }]}>Archive Post</Text>
                </TouchableOpacity>
                <View style={[styles.optionsDivider, { backgroundColor: colors.separator }]} />
                <TouchableOpacity
                  style={styles.optionsItem}
                  onPress={handleDeletePost}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  <Text style={[styles.optionsItemText, { color: '#EF4444' }]}>Delete Post</Text>
                </TouchableOpacity>
                <View style={[styles.optionsDivider, { backgroundColor: colors.separator }]} />
              </>
            )}
            <TouchableOpacity
              style={styles.optionsItem}
              onPress={() => {
                setPostOptionsVisible(false);
                setPostOptionsPost(null);
              }}
            >
              <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.optionsItemText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={editModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setEditModalVisible(false);
          setPostOptionsPost(null);
          setEditedImageUri(null);
          setEditImageUri(null);
        }}
      >
        <KeyboardAvoidingView
          style={[styles.editModalFull, { backgroundColor: colors.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.editModalHeader, { borderBottomColor: colors.separator, paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.editModalHeaderBtn}
              onPress={() => {
                setEditModalVisible(false);
                setPostOptionsPost(null);
                setEditedImageUri(null);
                setEditImageUri(null);
              }}
            >
              <Text style={[styles.editModalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.editModalTitle, { color: colors.text }]}>Edit Post</Text>
            <TouchableOpacity style={styles.editModalHeaderBtn} onPress={handleSaveEdit}>
              <Text style={[styles.editModalSave, { color: colors.accent }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.editModalBody}
            contentContainerStyle={styles.editModalBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Post Image - tap to open ImageEditor */}
            {(editedImageUri || editImageUri) && (
              <TouchableOpacity
                style={styles.editImageContainer}
                onPress={() => {
                  if (editImageUri) setShowImageEditor(true);
                }}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: editedImageUri || editImageUri || '' }}
                  style={[styles.editImagePreview, { backgroundColor: colors.mediaBackground }]}
                  resizeMode="cover"
                />
                <View style={styles.editImageOverlay}>
                  <View style={[styles.editImageBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <Ionicons name="crop-outline" size={16} color="#FFF" />
                    <Text style={styles.editImageBadgeText}>Tap to adjust crop</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Caption Input */}
            <TextInput
              style={[
                styles.editModalInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.mediaBackground,
                },
              ]}
              value={editCaption}
              onChangeText={setEditCaption}
              multiline
              placeholder="Write a caption..."
              placeholderTextColor={colors.textSecondary}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ImageEditor overlay */}
        {editImageUri && (
          <ImageEditor
            imageUri={editImageUri}
            visible={showImageEditor}
            onComplete={(croppedUri: string, _originalUri: string, _wasCropped: boolean) => {
              setShowImageEditor(false);
              setEditedImageUri(croppedUri);
            }}
            onCancel={() => setShowImageEditor(false)}
          />
        )}
      </Modal>

      {/* Swipe indicator on right edge */}
      {!chatDrawerVisible && (
        <View style={styles.swipeIndicator} pointerEvents="none">
          <View style={[styles.swipeIndicatorBar, { backgroundColor: colors.textSecondary }]} />
        </View>
      )}

      {/* Messages Page - Full screen, slides in from right */}
      <ChatDrawer
        ref={chatDrawerRef}
        visible={chatDrawerVisible}
        onClose={() => setChatDrawerVisible(false)}
        pageAnim={pageAnim}
        isPageStyle={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  feedPageLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  feedContainer: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  customHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tweet Card Styles
  tweetContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Thin accent strip on the left edge showing decoration color
  decorAccentStrip: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  // Wider icon binder strip for premium backgrounds
  decorIconBinder: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 16,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  // Compact repost styles
  repostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 3,
  },
  repostBadgeText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  compactOriginalPost: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  compactPostContent: {
    flex: 1,
    marginRight: 10,
  },
  compactPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  compactPostUsername: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactPostCaption: {
    fontSize: 13,
    lineHeight: 18,
  },
  compactExpandHint: {
    fontSize: 11,
    marginTop: 4,
  },
  compactPostImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  // Expanded original post styles
  expandedOriginalPost: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  expandedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  expandedPostUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandedPostCaption: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 10,
  },
  expandedPostImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
  },
  tweetMainContent: {
    flexDirection: 'row',
  },
  avatarColumn: {
    marginRight: 12,
  },
  contentColumn: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 6,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 4,
    maxWidth: '40%',
  },
  username: {
    fontSize: 15,
    maxWidth: '30%',
  },
  dot: {
    fontSize: 15,
    marginHorizontal: 4,
  },
  timestamp: {
    fontSize: 15,
  },
  moreButton: {
    padding: 4,
  },
  topicTagRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    marginRight: 4,
    gap: 4,
    flexShrink: 0,
  },
  topicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  topicTagIcon: {
    fontSize: 14,
  },
  topicTagText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 3,
    maxWidth: 100,
  },
  tweetText: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 4,
  },
  mediaContainer: {
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  mediaImage: {},
  heartOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingRight: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionCount: {
    fontSize: 13,
    minWidth: 20,
  },
  // Large-screen gift button - more prominent with text label
  giftButtonLarge: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  giftButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Coin Slider Styles
  coinSliderOverlay: {
    position: 'absolute',
    top: -80,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  coinSliderContainer: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  coinSliderTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  coinSliderTrack: {
    flexDirection: 'row',
    gap: 8,
  },
  coinSliderOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 36,
  },
  coinSliderOptionSelected: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  coinSliderAmount: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  coinSliderHint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },

  // Instagram-style Coin Picker Styles
  giftButtonContainer: {
    position: 'relative',
    zIndex: 50,
  },
  coinPickerOverlay: {
    position: 'absolute',
    bottom: 45,
    right: -20,
    width: 220,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  coinPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  coinPickerOption: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 12,
    width: 34,
    height: 50,
  },
  coinPickerOptionHovered: {
    backgroundColor: 'rgba(251, 191, 36, 0.4)',
    transform: [{ scale: 1.3 }],
  },
  // Art Gold Coin Styles (for picker)
  artCoin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  artCoinHovered: {
    width: 32,
    height: 32,
    borderRadius: 16,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  artCoinInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artCoinInnerHovered: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  kindnessSymbol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLeafLeft: {
    transform: [{ rotate: '-45deg' }],
    marginRight: -2,
    marginTop: -3,
  },
  pickerLeafRight: {
    transform: [{ rotate: '45deg' }, { scaleX: -1 }],
    marginLeft: -2,
    marginTop: -3,
  },
  coinPickerAmount: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  coinPickerArrow: {
    position: 'absolute',
    bottom: -10,
    right: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(251, 191, 36, 0.5)',
  },
  coinPickerHint: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 6,
  },

  // Separator
  separator: {
    height: 1,
  },

  // Empty State
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  findFriendsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  findFriendsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },

  // Image Viewer Modal Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  imageViewerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  imageViewerUserText: {
    marginLeft: 8,
  },
  imageViewerDisplayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  imageViewerUsername: {
    fontSize: 13,
    color: '#71767B',
  },
  imageViewerMoreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerBottom: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  imageViewerCaptionScroll: {
    maxHeight: 100,
    marginBottom: 8,
  },
  imageViewerCaption: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 20,
  },
  imageViewerTimestamp: {
    fontSize: 13,
    color: '#71767B',
    marginBottom: 12,
  },
  imageViewerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageViewerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  imageViewerActionCount: {
    fontSize: 14,
    color: '#FFF',
  },

  // Header Chat Button Styles
  headerChatButton: {
    marginRight: 16,
    padding: 4,
    position: 'relative',
  },
  headerChatButtonLeft: {
    marginLeft: 16,
    padding: 4,
    position: 'relative',
  },
  headerChatBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerChatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Swipe indicator on right edge
  swipeIndicator: {
    position: 'absolute',
    right: 0,
    top: '40%',
    bottom: '40%',
    width: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  swipeIndicatorBar: {
    width: 3,
    height: 40,
    borderRadius: 2,
    opacity: 0.3,
  },

  // Post Options Modal
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 16,
  },
  optionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  optionsItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionsDivider: {
    height: 1,
  },

  // Edit Caption Modal (full screen)
  editModalFull: {
    flex: 1,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  editModalHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  editModalCancel: {
    fontSize: 16,
  },
  editModalSave: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  editModalBody: {
    flex: 1,
  },
  editModalBodyContent: {
    padding: 16,
  },
  editImageContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  editImagePreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  editImageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  editImageBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  editModalInput: {
    fontSize: 16,
    lineHeight: 22,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
