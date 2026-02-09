import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';

interface PreviewPost {
  id: string;
  processedImageUrl: string | null;
  originalImageUrl: string | null;
  coinsReceived: number;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconEmoji: string | null;
  iconImageUrl: string | null;
  category: string;
  followerCount: number;
  postCount: number;
  weeklyPostCount: number;
  isFollowing: boolean;
  previewPosts?: PreviewPost[];
}

// Detect if an icon value is an Ionicons name (lowercase ASCII + hyphens)
const isIoniconName = (value: string): boolean => /^[a-z][a-z0-9-]*$/.test(value);

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface CommunitiesTabProps {
  searchQuery: string;
  navigation: any;
}

export default function CommunitiesTab({ searchQuery, navigation }: CommunitiesTabProps) {
  const { colors, isDark } = useTheme();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Handle search query changes
  useEffect(() => {
    loadTopics(selectedCategory || undefined, searchQuery || undefined);
  }, [searchQuery, selectedCategory]);

  const loadData = async () => {
    try {
      const [topicsRes, categoriesRes] = await Promise.all([
        api.get('/topics'),
        api.get('/topics/categories'),
      ]);
      setTopics(topicsRes.data.topics || []);
      setCategories(categoriesRes.data.categories || []);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTopics = async (category?: string, search?: string) => {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);

      const response = await api.get(`/topics?${params.toString()}`);
      setTopics(response.data.topics || []);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const handleFollowTopic = async (topicId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await api.delete(`/topics/${topicId}/follow`);
      } else {
        await api.post(`/topics/${topicId}/follow`);
      }
      setTopics(prev =>
        prev.map(t =>
          t.id === topicId ? { ...t, isFollowing: !isFollowing } : t
        )
      );
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderCategoriesHeader = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoriesList}
      contentContainerStyle={styles.categoriesContent}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryChip,
            { backgroundColor: colors.background, borderColor: colors.border },
            selectedCategory === category.id && styles.categoryChipActive,
          ]}
          onPress={() =>
            handleCategorySelect(
              selectedCategory === category.id ? null : category.id
            )
          }
        >
          <Text style={styles.categoryEmoji}>{category.icon}</Text>
          <Text
            style={[
              styles.categoryText,
              { color: colors.text.secondary },
              selectedCategory === category.id && styles.categoryTextActive,
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderTopic = ({ item }: { item: Topic }) => (
    <TouchableOpacity
      style={[styles.topicCard, { backgroundColor: colors.card, shadowColor: '#000' }]}
      onPress={() => navigation.navigate('TopicPage', { topicSlug: item.slug })}
    >
      <View style={styles.topicHeader}>
        {item.iconImageUrl ? (
          <Image source={{ uri: getImageUrl(item.iconImageUrl) || item.iconImageUrl }} style={styles.topicIconImage} />
        ) : item.iconEmoji && isIoniconName(item.iconEmoji) ? (
          <View style={styles.topicIconWrap}>
            <Ionicons name={`${item.iconEmoji}-outline` as any} size={24} color="#7C3AED" />
          </View>
        ) : (
          <Text style={styles.topicEmoji}>{item.iconEmoji || '🏷️'}</Text>
        )}
        <View style={styles.topicInfo}>
          <Text style={[styles.topicName, { color: colors.text.primary }]}>{item.name}</Text>
          <Text style={[styles.topicStats, { color: colors.text.secondary }]}>
            {item.followerCount} members · {item.weeklyPostCount} posts/week
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.followButton,
            item.isFollowing && [styles.followingButton, { backgroundColor: colors.border }],
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleFollowTopic(item.id, item.isFollowing);
          }}
        >
          <Text
            style={[
              styles.followButtonText,
              item.isFollowing && styles.followingButtonText,
            ]}
          >
            {item.isFollowing ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>
      {item.description && (
        <Text style={[styles.topicDescription, { color: colors.text.secondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      {/* Preview Posts Row - 5 most attractive posts */}
      {item.previewPosts && item.previewPosts.length > 0 && (
        <View style={styles.previewPostsContainer}>
          {item.previewPosts.slice(0, 5).map((post, index) => (
            <View key={post.id} style={styles.previewPostWrapper}>
              <Image
                source={{ uri: getImageUrl(post.processedImageUrl) || getImageUrl(post.originalImageUrl) || '' }}
                style={[styles.previewPostImage, { backgroundColor: colors.surface }]}
              />
              {post.coinsReceived > 0 && (
                <View style={styles.previewPostBadge}>
                  <Text style={styles.previewPostBadgeText}>{post.coinsReceived}</Text>
                </View>
              )}
            </View>
          ))}
          {/* Fill empty slots with placeholders */}
          {Array.from({ length: Math.max(0, 5 - (item.previewPosts?.length || 0)) }).map((_, index) => (
            <View key={`empty-${index}`} style={[styles.previewPostWrapper, styles.previewPostEmpty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="image-outline" size={20} color={colors.text.tertiary} />
            </View>
          ))}
        </View>
      )}
      {/* Show empty state if no posts */}
      {(!item.previewPosts || item.previewPosts.length === 0) && (
        <View style={[styles.noPreviewContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.noPreviewText, { color: colors.text.secondary }]}>No posts yet - be the first to share!</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading communities...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={topics}
      renderItem={renderTopic}
      keyExtractor={item => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.topicsList}
      ListHeaderComponent={renderCategoriesHeader}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="compass-outline" size={48} color={colors.text.tertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No communities found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
            {searchQuery
              ? 'Try a different search term'
              : 'Be the first to create one!'}
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  categoriesList: {
    maxHeight: 50,
    marginTop: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  categoryEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  topicsList: {
    padding: 16,
    paddingTop: 8,
  },
  topicCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  topicIconImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  topicIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 18,
    fontWeight: '600',
  },
  topicStats: {
    fontSize: 13,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 20,
  },
  followingButton: {
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: '#4B5563',
  },
  topicDescription: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  // Preview posts styles
  previewPostsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
  },
  previewPostWrapper: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewPostImage: {
    width: '100%',
    height: '100%',
  },
  previewPostEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPostBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  previewPostBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noPreviewContainer: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  noPreviewText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
