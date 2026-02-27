import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import PostViewerModal from '../../components/PostViewerModal';

const { width } = Dimensions.get('window');
const GRID_GAP = 1;
const IMAGE_SIZE = (width - GRID_GAP * 2) / 3;

export default function ArchivedPostsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [archivedPosts, setArchivedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadArchivedPosts();
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const response = await api.getProfile();
      setProfile(response.user || response);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadArchivedPosts = async () => {
    setLoading(true);
    try {
      const data = await api.getArchivedPosts();
      setArchivedPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading archived posts:', error);
      setArchivedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchivePost = async (postId: string) => {
    try {
      await api.unarchivePost(postId);
      setArchivedPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
    } catch (error) {
      console.error('Error unarchiving post:', error);
      Alert.alert('Error', 'Failed to unarchive post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await api.deletePost(postId);
      setArchivedPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  const openPost = (post: any, index: number) => {
    setSelectedPost(post);
    setSelectedPostIndex(index);
  };

  const closePost = () => {
    setSelectedPost(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text.secondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {archivedPosts.length > 0 ? (
        <View style={[styles.gridContainer, { backgroundColor: colors.background }]}>
          {archivedPosts.map((item, index) => {
            const imageUri = getImageUrl(item.processedImageUrl) || getImageUrl(item.thumbnailUrl) || getImageUrl(item.originalImageUrl);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItem}
                onPress={() => openPost(item, index)}
                activeOpacity={0.9}
              >
                {imageUri ? (
                  <View style={styles.gridImageContainer}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.gridImage}
                      resizeMode="cover"
                    />
                    <View style={styles.archiveOverlay}>
                      <Ionicons name="archive" size={16} color="#FFF" />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.gridImage, styles.placeholderImage, { backgroundColor: colors.surface }]}>
                    <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <View style={[styles.emptyIcon, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
            <Ionicons name="archive-outline" size={44} color={colors.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Archived Posts</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
            Posts you archive will appear here
          </Text>
        </View>
      )}

      {/* Post Viewer Modal */}
      <PostViewerModal
        visible={!!selectedPost}
        posts={archivedPosts.map((post) => ({
          ...post,
          user: {
            id: profile?.id || '',
            username: profile?.username || '',
            avatarUrl: profile?.avatarUrl,
            activeAvatar: profile?.activeAvatar || null,
          },
        }))}
        initialIndex={selectedPostIndex}
        title="Archived Posts"
        onClose={closePost}
        onCommentPress={(postId) => {
          closePost();
          navigation.navigate('Comments', { postId });
        }}
        onUserPress={(userId, username) => {
          closePost();
          navigation.navigate('UserProfile', { userId, username });
        }}
        isOwnProfile={true}
        isArchiveView={true}
        onUnarchivePost={handleUnarchivePost}
        onDeletePost={handleDeletePost}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginBottom: GRID_GAP,
  },
  gridImageContainer: {
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 10,
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
