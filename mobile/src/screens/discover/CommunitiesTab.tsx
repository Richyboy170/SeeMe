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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import CapsuleCommunityCard from '../../components/CapsuleCommunityCard';

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
    <View style={styles.headerContainer}>
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
  );

  const renderTopic = ({ item }: { item: Topic }) => (
    <CapsuleCommunityCard
      topic={item}
      onPress={() => navigation.navigate('TopicPage', { topicSlug: item.slug })}
      onToggleFollow={handleFollowTopic}
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
    <FlatList
      data={topics}
      renderItem={renderTopic}
      keyExtractor={item => item.id}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
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
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
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
