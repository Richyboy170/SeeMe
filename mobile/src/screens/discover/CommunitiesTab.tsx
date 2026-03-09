import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import CapsuleCommunityCard from '../../components/CapsuleCommunityCard';

const PAGE_SIZE = 8;

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
  type?: 'community' | 'private' | 'broadcast';
  followerCount: number;
  postCount: number;
  weeklyPostCount: number;
  isFollowing: boolean;
  previewPosts?: PreviewPost[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface GuideRefs {
  typeFiltersRef?: React.RefObject<View | null>;
  categoryFiltersRef?: React.RefObject<View | null>;
  communityGridRef?: React.RefObject<View | null>;
}

interface CommunitiesTabProps {
  searchQuery: string;
  navigation: any;
  guideRefs?: GuideRefs;
}

export default function CommunitiesTab({ searchQuery, navigation, guideRefs }: CommunitiesTabProps) {
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth >= 768 ? 4 : 2;
  const cardWidth = (screenWidth - 32 - (numColumns - 1) * 12) / numColumns;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cancelRef = useRef(0); // incremented to cancel in-flight background loads

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  // Reset and reload when filters change
  useEffect(() => {
    loadAll();
  }, [searchQuery, selectedCategory, selectedType]);

  const buildParams = (offset: number) => {
    const params = new URLSearchParams();
    params.append('limit', String(PAGE_SIZE));
    params.append('offset', String(offset));
    if (selectedCategory) params.append('category', selectedCategory);
    if (searchQuery) params.append('search', searchQuery);
    if (selectedType) params.append('type', selectedType);
    return params.toString();
  };

  const loadAll = async () => {
    const token = ++cancelRef.current;
    try {
      setLoading(true);

      // First batch + categories in parallel
      const [topicsRes, categoriesRes] = await Promise.all([
        api.get(`/topics?${buildParams(0)}`),
        api.get('/topics/categories'),
      ]);

      if (cancelRef.current !== token) return; // stale
      const firstBatch: Topic[] = topicsRes.data.topics || [];
      setTopics(firstBatch);
      setCategories(categoriesRes.data.categories || []);
      setLoading(false);
      setRefreshing(false);

      // Keep loading remaining batches in the background
      let offset = firstBatch.length;
      let hasMore = topicsRes.data.hasMore ?? firstBatch.length >= PAGE_SIZE;

      while (hasMore && cancelRef.current === token) {
        const response = await api.get(`/topics?${buildParams(offset)}`);
        if (cancelRef.current !== token) return; // stale
        const batch: Topic[] = response.data.topics || [];
        if (batch.length === 0) break;
        setTopics(prev => [...prev, ...batch]);
        offset += batch.length;
        hasMore = response.data.hasMore ?? batch.length >= PAGE_SIZE;
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      setLoading(false);
      setRefreshing(false);
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
    loadAll();
  };

  const TYPE_FILTERS = [
    { key: null, label: 'All', icon: 'apps-outline' },
    { key: 'community', label: 'Communities', icon: 'people-outline' },
    { key: 'private', label: 'Private', icon: 'lock-closed-outline' },
    { key: 'broadcast', label: 'Channels', icon: 'megaphone-outline' },
  ] as const;

  const renderCategoriesHeader = () => (
    <View style={styles.headerContainer}>
      {/* Type filter chips */}
      <View ref={guideRefs?.typeFiltersRef} collapsable={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
          contentContainerStyle={styles.categoriesContent}
        >
          {TYPE_FILTERS.map((tf) => (
            <TouchableOpacity
              key={tf.label}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.background, borderColor: colors.border },
                selectedType === tf.key && styles.categoryChipActive,
                !tf.key && !selectedType && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedType(selectedType === tf.key ? null : tf.key)}
            >
              <Ionicons name={tf.icon as any} size={14} color={
                (selectedType === tf.key || (!tf.key && !selectedType)) ? '#FFFFFF' : colors.text.secondary
              } />
              <Text
                style={[
                  styles.categoryText,
                  { color: colors.text.secondary },
                  (selectedType === tf.key || (!tf.key && !selectedType)) && styles.categoryTextActive,
                ]}
              >
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Category filter chips */}
      <View ref={guideRefs?.categoryFiltersRef} collapsable={false}>
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
      </View>
    </View>
  );

  const renderTopic = ({ item }: { item: Topic }) => (
    <CapsuleCommunityCard
      topic={item}
      onPress={() => navigation.navigate('TopicPage', { topicSlug: item.slug })}
      onToggleFollow={handleFollowTopic}
      cardWidth={cardWidth}
    />
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
    <View style={{ flex: 1 }} ref={guideRefs?.communityGridRef} collapsable={false}>
      <FlatList
        key={`cols-${numColumns}`}
        data={topics}
        renderItem={renderTopic}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
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
    </View>
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
  headerContainer: {
    marginBottom: 8,
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
});
