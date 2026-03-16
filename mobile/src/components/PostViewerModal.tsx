import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
  ViewToken,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../services/api';
import Avatar from './Avatar';
import PostActionsBar from './PostActionsBar';
import GiveCoinsModal from './coins/GiveCoinsModal';
import SharePostModal from './SharePostModal';
import { usePostInteractions, Post } from '../hooks/usePostInteractions';
import { formatTimeAgo, getPostImageUrl } from '../utils/postHelpers';
import { useTheme } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PostViewerModalProps {
  visible: boolean;
  posts: Post[];
  initialIndex: number;
  title?: string;
  onClose: () => void;
  onCommentPress: (postId: string) => void;
  onUserPress?: (userId: string, username: string) => void;
  onPostChange?: (index: number, post: Post) => void;
  onArchivePost?: (postId: string) => void;
  onUnarchivePost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  isOwnProfile?: boolean;
  isArchiveView?: boolean;
}

export default function PostViewerModal({
  visible,
  posts,
  initialIndex,
  title = 'Posts',
  onClose,
  onCommentPress,
  onUserPress,
  onPostChange,
  onArchivePost,
  onUnarchivePost,
  onDeletePost,
  isOwnProfile = false,
  isArchiveView = false,
}: PostViewerModalProps) {
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [giveModalVisible, setGiveModalVisible] = useState(false);
  const [giveModalPost, setGiveModalPost] = useState<Post | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareModalPostId, setShareModalPostId] = useState<string>('');
  const [shareModalPostImage, setShareModalPostImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Initialize post interactions hook
  const {
    isLiked,
    isSaved,
    getLikeCount,
    handleLike,
    handleDoubleTap,
    handleSave,
    handleComment,
    handleUserPress: onUserPressInternal,
    reinitializeState,
    animatingPostId,
    heartScale,
    heartOpacity,
  } = usePostInteractions(posts, {
    onCommentPress,
    onUserPress,
  });

  // Reinitialize state when posts change
  useEffect(() => {
    reinitializeState(posts);
  }, [posts, reinitializeState]);

  // Reset current index when modal opens with new initial index
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        setCurrentIndex(newIndex);
        onPostChange?.(newIndex, posts[newIndex]);
      }
    },
    [posts, onPostChange]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleGiveCoins = useCallback((post: Post) => {
    setGiveModalPost(post);
    setGiveModalVisible(true);
  }, []);

  const handleShare = useCallback((post: Post) => {
    setShareModalPostId(post.id);
    setShareModalPostImage(getPostImageUrl(post));
    setShareModalVisible(true);
  }, []);

  const handlePostOptions = useCallback((post: Post) => {
    if (!isOwnProfile) return;

    const options: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [];

    if (isArchiveView) {
      options.push({
        text: 'Unarchive Post',
        onPress: () => {
          Alert.alert('Unarchive Post', 'This post will be visible on your profile again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unarchive', onPress: () => onUnarchivePost?.(post.id) },
          ]);
        },
      });
    } else {
      options.push({
        text: 'Archive Post',
        onPress: () => {
          Alert.alert('Archive Post', 'This post will be hidden from your profile but not deleted.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Archive', onPress: () => onArchivePost?.(post.id) },
          ]);
        },
      });
    }

    options.push({
      text: 'Delete Post',
      style: 'destructive',
      onPress: () => {
        Alert.alert('Delete Post', 'This post will be permanently deleted. This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDeletePost?.(post.id) },
        ]);
      },
    });

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Post Options', undefined, options);
  }, [isOwnProfile, isArchiveView, onArchivePost, onUnarchivePost, onDeletePost]);

  const currentPost = posts[currentIndex];

  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    const imageUri = getImageUrl(getPostImageUrl(item));

    return (
      <View style={styles.postItem}>
        {/* User Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            onPress={() => onUserPressInternal(item.user.id, item.user.username)}
          >
            <Avatar
              size={36}
              avatarUrl={!item.user.activeAvatar ? item.user.avatarUrl : undefined}
              username={item.user.username}
              customizations={item.user.activeAvatar?.customizations}
              avatarStyle={item.user.activeAvatar?.style}
            />
            <View style={styles.postUserInfo}>
              <Text style={[styles.postUsername, { color: colors.text.primary }]}>@{item.user.username}</Text>
              <Text style={[styles.postTime, { color: colors.text.tertiary }]}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity style={styles.moreButton} onPress={() => handlePostOptions(item)}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.icon.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Image with double tap support */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => handleDoubleTap(item.id)}
        >
          <View>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.postImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.postImage, styles.imagePlaceholder, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="image-outline" size={48} color={colors.icon.secondary} />
              </View>
            )}

            {/* Heart overlay animation - only for the specific post being animated */}
            {animatingPostId === item.id && (
              <Animated.View
                style={[
                  styles.heartOverlay,
                  {
                    opacity: heartOpacity,
                    transform: [{ scale: heartScale }],
                  },
                ]}
              >
                <Ionicons name="heart" size={100} color="#FFF" />
              </Animated.View>
            )}
          </View>
        </TouchableOpacity>

        {/* Actions */}
        <PostActionsBar
          isLiked={isLiked(item.id)}
          isSaved={isSaved(item.id)}
          likesCount={getLikeCount(item.id)}
          commentsCount={item.commentsCount}
          onLike={() => handleLike(item.id)}
          onComment={() => handleComment(item.id)}
          onGiveCoins={() => handleGiveCoins(item)}
          onShare={() => handleShare(item)}
          onSave={() => handleSave(item.id)}
          showShare={true}
          showSave={true}
          showGiveCoins={true}
        />

        {/* Likes count */}
        {getLikeCount(item.id) > 0 && (
          <Text style={[styles.likesText, { color: colors.text.primary }]}>
            {getLikeCount(item.id)} {getLikeCount(item.id) === 1 ? 'like' : 'likes'}
          </Text>
        )}

        {/* Caption */}
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={[styles.captionText, { color: colors.text.primary }]}>
              <Text style={styles.captionUsername}>{item.user.username}</Text>
              {'  '}
              {item.caption}
            </Text>
          </View>
        )}

        {/* View comments link */}
        {item.commentsCount > 0 && (
          <TouchableOpacity
            style={styles.viewComments}
            onPress={() => handleComment(item.id)}
          >
            <Text style={[styles.viewCommentsText, { color: colors.text.secondary }]}>
              View all {item.commentsCount} comments
            </Text>
          </TouchableOpacity>
        )}

        {/* Separator */}
        {index < posts.length - 1 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={colors.icon.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{title}</Text>
          <Text style={[styles.headerCounter, { color: colors.text.secondary }]}>
            {currentIndex + 1}/{posts.length}
          </Text>
        </View>

        {/* Posts List */}
        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH + 180,
            offset: (SCREEN_WIDTH + 180) * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
        />
      </View>

      {/* Give Coins Modal */}
      {giveModalPost && (
        <GiveCoinsModal
          visible={giveModalVisible}
          recipientId={giveModalPost.user.id}
          recipientUsername={giveModalPost.user.username}
          contextType="post"
          contextId={giveModalPost.id}
          onClose={() => {
            setGiveModalVisible(false);
            setGiveModalPost(null);
          }}
          onSuccess={() => {
            setGiveModalVisible(false);
            setGiveModalPost(null);
          }}
        />
      )}

      {/* Share Post Modal */}
      <SharePostModal
        visible={shareModalVisible}
        postId={shareModalPostId}
        postImageUrl={shareModalPostImage}
        onClose={() => {
          setShareModalVisible(false);
          setShareModalPostId('');
          setShareModalPostImage(null);
        }}
        onSuccess={() => {
          setShareModalVisible(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerCounter: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  postItem: {
    backgroundColor: '#FFFFFF',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postUserInfo: {
    flex: 1,
    marginLeft: 10,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  postTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  moreButton: {
    padding: 4,
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  captionContainer: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  captionText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
  },
  viewComments: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  viewCommentsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  separator: {
    height: 8,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
  },
});
