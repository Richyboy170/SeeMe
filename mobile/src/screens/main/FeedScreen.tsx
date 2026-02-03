import React, { useCallback, useRef, useState } from 'react';
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
  useColorScheme,
  Modal,
  StatusBar,
  Pressable,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/Avatar';
import GiveCoinsModal from '../../components/coins/GiveCoinsModal';
import { CommentPreview } from '../../components/feed/CommentPreview';
import { RepostOptionsModal } from '../../components/feed/RepostOptionsModal';
import ChatDrawer from '../../components/chat/ChatDrawer';
import { api, getImageUrl } from '../../services/api';
import { sharePost, ShareablePost } from '../../services/shareService';
import { RepostType } from '../../services/repostService';
import { trackShare } from '../../services/postInteractionService';
import { useDoubleTap } from '../../hooks/useDoubleTap';
import { FeedStackParamList, useUnreadCount } from '../../navigation/types';
import { AvatarCustomizations } from '../../components/AvatarRenderer';
import { navigateToUserProfile } from '../../utils/feedNavigation';

type FeedScreenNavigationProp = StackNavigationProp<FeedStackParamList, 'FeedHome'>;

const TABLET_BREAKPOINT = 600;
const MAX_CONTENT_WIDTH = 600;

// Theme colors
const themes = {
  dark: {
    background: '#000000',
    cardBackground: '#000000',
    text: '#E7E9EA',
    textSecondary: '#71767B',
    separator: '#2F3336',
    border: '#2F3336',
    accent: '#1D9BF0',
    like: '#F91880',
    gift: '#FBBF24',
    iconDefault: '#71767B',
    mediaBackground: '#16181C',
    emptyIconBg: 'rgba(29, 155, 240, 0.1)',
  },
  light: {
    background: '#FFFFFF',
    cardBackground: '#FFFFFF',
    text: '#0F1419',
    textSecondary: '#536471',
    separator: '#EFF3F4',
    border: '#CFD9DE',
    accent: '#1D9BF0',
    like: '#F91880',
    gift: '#FBBF24',
    iconDefault: '#536471',
    mediaBackground: '#F7F9F9',
    emptyIconBg: 'rgba(29, 155, 240, 0.1)',
  },
};

type ThemeColors = typeof themes.dark;

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
  // Repost-specific fields (for showing "X reposted" header)
  isRepost?: boolean;
  repostedBy?: RepostedByUser;
  repostType?: 'repost' | 'quote';
  repostComment?: string | null;
  repostCreatedAt?: string;
}

// Twitter-style Tweet Card Component
function TweetCard({
  post,
  onLike,
  onComment,
  onUserPress,
  onGiveCoins,
  onImagePress,
  onRepost,
  onShare,
  onNavigateToProfile,
  colors,
}: {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onUserPress: (userId: string) => void;
  onGiveCoins: (post: Post) => void;
  onImagePress: (post: Post) => void;
  onRepost: (post: Post) => void;
  onShare: (post: Post) => void;
  onNavigateToProfile: (userId: string, username: string) => void;
  colors: ThemeColors;
}) {
  const { width } = useWindowDimensions();
  const [liked, setLiked] = React.useState(post.likedByMe || false);
  const [likesCount, setLikesCount] = React.useState(post.likesCount);
  const [reposted, setReposted] = React.useState(post.repostedByMe || false);
  const [repostCount, setRepostCount] = React.useState(post.repostCount || 0);
  const [showHeartOverlay, setShowHeartOverlay] = React.useState(false);

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

  const imageUri = getImageUrl(post.thumbnailUrl) || getImageUrl(post.imageUrl) || getImageUrl(post.originalImageUrl);
  const imageWidth = Math.min(width - 82, MAX_CONTENT_WIDTH - 82);

  return (
    <View style={[styles.tweetContainer, { backgroundColor: colors.cardBackground }]}>
      {/* Repost Header - Shows who reposted this with their avatar */}
      {post.isRepost && post.repostedBy && (
        <TouchableOpacity
          style={styles.repostHeaderRow}
          onPress={() => onNavigateToProfile(post.repostedBy!.id, post.repostedBy!.username)}
        >
          <Avatar
            size={20}
            username={post.repostedBy.username}
            customizations={post.repostedBy.activeAvatar?.customizations}
            avatarStyle={post.repostedBy.activeAvatar?.style}
          />
          <Ionicons name="repeat" size={14} color="#10B981" />
          <Text style={[styles.repostHeaderText, { color: colors.textSecondary }]}>
            <Text style={styles.repostHeaderUsername}>{post.repostedBy.username}</Text> reposted
          </Text>
        </TouchableOpacity>
      )}

      {/* Quote Comment - For quote reposts */}
      {post.isRepost && post.repostType === 'quote' && post.repostComment && (
        <View style={[styles.quoteCommentRow, { borderLeftColor: '#10B981' }]}>
          <Text style={[styles.quoteCommentText, { color: colors.text }]}>
            "{post.repostComment}"
          </Text>
        </View>
      )}

      {/* Main Tweet Content */}
      <View style={[
        styles.tweetMainContent,
        post.isRepost && [styles.repostedTweetContent, { borderColor: colors.border, backgroundColor: colors.mediaBackground }]
      ]}>
        {/* Avatar Column */}
        <TouchableOpacity
          style={styles.avatarColumn}
          onPress={() => onNavigateToProfile(post.user.id, post.user.username)}
        >
          <Avatar
            size={post.isRepost ? 32 : 40}
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
              <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                {post.user.username}
              </Text>
              <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
                @{post.user.username}
              </Text>
              <Text style={[styles.dot, { color: colors.textSecondary }]}>·</Text>
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {formatTimeAgo(post.createdAt)}
              </Text>
            </TouchableOpacity>
            {!post.isRepost && (
              <TouchableOpacity style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

        {/* Double-tap area for like (caption + image) */}
        <Pressable onPress={handleContentTap}>
          {/* Tweet Text */}
          {post.caption && (
            <Text style={[styles.tweetText, { color: colors.text }]}>{post.caption}</Text>
          )}
        </Pressable>

        {/* Media - Single tap opens viewer, double tap likes */}
        {imageUri && (
          <Pressable
            style={[styles.mediaContainer, { borderColor: colors.border }]}
            onPress={handleImageTap}
          >
            <Image
              source={{ uri: imageUri }}
              style={[styles.mediaImage, { width: imageWidth, height: imageWidth * 0.75, backgroundColor: colors.mediaBackground }]}
              resizeMode="cover"
            />
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
            <Ionicons name="chatbubble-outline" size={18} color={colors.iconDefault} />
            <Text style={[styles.actionCount, { color: colors.textSecondary }]}>
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
              color={reposted ? '#00BA7C' : colors.iconDefault}
            />
            <Text style={[styles.actionCount, { color: reposted ? '#00BA7C' : colors.textSecondary }]}>
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
              color={liked ? colors.like : colors.iconDefault}
            />
            <Text style={[styles.actionCount, { color: liked ? colors.like : colors.textSecondary }]}>
              {formatCount(likesCount)}
            </Text>
          </TouchableOpacity>

          {/* Gift/Coins */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onGiveCoins(post)}
          >
            <Ionicons name="gift-outline" size={18} color={colors.gift} />
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onShare(post)}
          >
            <Ionicons name="share-outline" size={18} color={colors.iconDefault} />
          </TouchableOpacity>
        </View>

        {/* Comment Preview */}
        {post.recentComments && post.recentComments.length > 0 && (
          <CommentPreview
            comments={post.recentComments}
            totalComments={post.commentsCount}
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

export default function FeedScreen() {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isTablet = width >= TABLET_BREAKPOINT;
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadCount();

  // Get theme colors based on system preference
  const colors = colorScheme === 'dark' ? themes.dark : themes.light;

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

  // Update header style based on theme with chat icon
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: colors.background,
        shadowColor: 'transparent',
        elevation: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
      },
      headerTintColor: colors.text,
      headerTitleStyle: {
        color: colors.text,
        fontWeight: '700',
        fontSize: 20,
      },
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerChatButton}
          onPress={() => setChatDrawerVisible(true)}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={24}
            color={colors.text}
          />
          {unreadCount > 0 && (
            <View style={styles.headerChatBadge}>
              <Text style={styles.headerChatBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors, unreadCount]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [])
  );

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
      onImagePress={handleImagePress}
      onRepost={handleRepost}
      onShare={handleShare}
      onNavigateToProfile={handleNavigateToProfile}
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.feedContainer,
        { backgroundColor: colors.background },
        isTablet && { maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' }
      ]}>
        <FlatList
          data={posts}
          keyExtractor={(item) => item.feedItemId || item.id}
          renderItem={renderPost}
          ItemSeparatorComponent={renderSeparator}
          showsVerticalScrollIndicator={false}
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

      {/* Chat Drawer - slides from right */}
      <ChatDrawer
        visible={chatDrawerVisible}
        onClose={() => setChatDrawerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
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
  // Repost header styles
  repostHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  repostHeaderText: {
    fontSize: 13,
    fontWeight: '400',
  },
  repostHeaderUsername: {
    fontWeight: '600',
  },
  quoteCommentRow: {
    marginBottom: 10,
    paddingLeft: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
  },
  quoteCommentText: {
    fontSize: 15,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  tweetMainContent: {
    flexDirection: 'row',
  },
  repostedTweetContent: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
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
    justifyContent: 'space-between',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
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
});
