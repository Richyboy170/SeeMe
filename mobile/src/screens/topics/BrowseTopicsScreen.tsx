import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, RefreshControl, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api, getImageUrl } from '../../services/api';

// Detect if an icon value is an Ionicons name (lowercase ASCII + hyphens)
const isIoniconName = (value: string): boolean => /^[a-z][a-z0-9-]*$/.test(value);

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
}

interface Category {
    id: string;
    name: string;
    icon: string;
    description: string;
}

export default function BrowseTopicsScreen({ navigation }: any) {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Add Create button to header (like Messages page)
    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={{ marginRight: 16, padding: 4 }}
                    onPress={() => navigation.navigate('CreateTopic')}
                >
                    <Ionicons name="add-circle-outline" size={24} color="#7C3AED" />
                </TouchableOpacity>
            ),
        });
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const [topicsRes, categoriesRes] = await Promise.all([
                api.get('/topics'),
                api.get('/topics/categories')
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
        loadTopics(categoryId || undefined, searchQuery || undefined);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        loadTopics(selectedCategory || undefined, query || undefined);
    };

    const handleFollowTopic = async (topicId: string, isFollowing: boolean) => {
        try {
            if (isFollowing) {
                await api.delete(`/topics/${topicId}/follow`);
            } else {
                await api.post(`/topics/${topicId}/follow`);
            }
            // Update local state
            setTopics(prev => prev.map(t =>
                t.id === topicId ? { ...t, isFollowing: !isFollowing } : t
            ));
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const renderCategory = ({ item }: { item: Category }) => (
        <TouchableOpacity
            style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.categoryChipActive
            ]}
            onPress={() => handleCategorySelect(
                selectedCategory === item.id ? null : item.id
            )}
        >
            <Text style={styles.categoryEmoji}>{item.icon}</Text>
            <Text style={[
                styles.categoryText,
                selectedCategory === item.id && styles.categoryTextActive
            ]}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    const renderTopic = ({ item }: { item: Topic }) => (
        <TouchableOpacity
            style={styles.topicCard}
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
                    <Text style={styles.topicName}>{item.name}</Text>
                    <Text style={styles.topicStats}>
                        {item.followerCount} members · {item.weeklyPostCount} posts/week
                    </Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.followButton,
                        item.isFollowing && styles.followingButton
                    ]}
                    onPress={() => handleFollowTopic(item.id, item.isFollowing)}
                >
                    <Text style={[
                        styles.followButtonText,
                        item.isFollowing && styles.followingButtonText
                    ]}>
                        {item.isFollowing ? 'Joined' : 'Join'}
                    </Text>
                </TouchableOpacity>
            </View>
            {item.description && (
                <Text style={styles.topicDescription} numberOfLines={2}>
                    {item.description}
                </Text>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.loadingText}>Loading communities...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search communities..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Categories */}
            <FlatList
                horizontal
                data={categories}
                renderItem={renderCategory}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesList}
                contentContainerStyle={styles.categoriesContent}
            />

            {/* Topics List */}
            <FlatList
                data={topics}
                renderItem={renderTopic}
                keyExtractor={item => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadData} />
                }
                contentContainerStyle={styles.topicsList}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="compass-outline" size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No communities found</Text>
                        <Text style={styles.emptySubtitle}>
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
        backgroundColor: '#FFFFFF'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF'
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderRadius: 12
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        fontSize: 16,
        color: '#1F2937'
    },
    categoriesList: {
        maxHeight: 50
    },
    categoriesContent: {
        paddingHorizontal: 16,
        gap: 8
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginRight: 8
    },
    categoryChipActive: {
        backgroundColor: '#EDE9FE',
        borderColor: '#7C3AED'
    },
    categoryEmoji: {
        fontSize: 14,
        marginRight: 4
    },
    categoryText: {
        fontSize: 14,
        color: '#6B7280'
    },
    categoryTextActive: {
        color: '#7C3AED',
        fontWeight: '600'
    },
    topicsList: {
        padding: 16,
        paddingTop: 8
    },
    topicCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    topicHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    topicEmoji: {
        fontSize: 36,
        marginRight: 12
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
        flex: 1
    },
    topicName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937'
    },
    topicStats: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#7C3AED',
        borderRadius: 20
    },
    followingButton: {
        backgroundColor: '#E5E7EB'
    },
    followButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF'
    },
    followingButtonText: {
        color: '#4B5563'
    },
    topicDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
        lineHeight: 20
    },
    emptyState: {
        alignItems: 'center',
        padding: 40
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4
    }
});
