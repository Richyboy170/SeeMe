import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, UIManager,
    Image, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api, getImageUrl } from '../../services/api';
import { useTheme } from '../../theme';
import StoryViewerModal from './StoryViewerModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_COLS = 3;
const TILE_SIZE = (SCREEN_W - 32 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

// ── Types matching backend HighlightCard ──────────────────────────────

export interface PostSummary {
    id: string;
    imageUrl: string | null;
    caption: string | null;
    likesCount: number;
    commentsCount: number;
    repostCount: number;
    createdAt: string;
}

export type HighlightCard =
    | { type: 'opener'; text: string }
    | { type: 'top_post'; label: string; post: PostSummary }
    | { type: 'post_gallery'; label: string; posts: PostSummary[] }
    | { type: 'all_posts'; label: string; posts: PostSummary[] }
    | { type: 'stat_row'; items: { icon: string; value: number; label: string }[] }
    | { type: 'caption_quotes'; label: string; quotes: string[] }
    | { type: 'coins'; earned: number; given: number }
    | { type: 'closer'; text: string };

export interface StoryData {
    id: string;
    title: string;
    content: string;
    periodType: 'weekly' | 'monthly' | 'yearly';
    periodStart: string;
    periodEnd: string;
    stats: string;
    captionExcerpts: string;
    isPublished: boolean;
    createdAt: string;
}

interface StoryOfMeSectionProps {
    userId: string;
    isOwnProfile?: boolean;
    rankGradient?: [string, string, string];
    rankColor?: string;
}

export const PERIOD_TABS = [
    { key: 'weekly' as const, label: 'Week' },
    { key: 'monthly' as const, label: 'Month' },
    { key: 'yearly' as const, label: 'Year' },
];

export function parseHighlights(content: string): HighlightCard[] {
    try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatPostDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

// ── Main component ────────────────────────────────────────────────────

const DEFAULT_GRADIENT: [string, string, string] = ['#9CA3AF', '#6B7280', '#4B5563'];
const DEFAULT_COLOR = '#9CA3AF';

export default function StoryOfMeSection({ userId, isOwnProfile = false, rankGradient, rankColor }: StoryOfMeSectionProps) {
    const { colors, isDark } = useTheme();
    const accentColor = rankColor || DEFAULT_COLOR;
    const gradientColors = rankGradient || DEFAULT_GRADIENT;
    const accentLight = accentColor + '20';
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
    const [story, setStory] = useState<StoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const hasTriedGenerate = useRef<Record<string, boolean>>({});

    useEffect(() => {
        loadStory();
    }, [userId, selectedPeriod]);

    const loadStory = async () => {
        setLoading(true);
        let needsRegenerate = false;

        try {
            const response = await api.getLatestStory(userId, selectedPeriod);
            if (response.story) {
                const highlights = parseHighlights(response.story.content);
                if (highlights.length > 0) {
                    setStory(response.story);
                    setLoading(false);
                    return;
                }
                needsRegenerate = true;
            }
        } catch (error) {
            console.log('Story fetch failed, will try to generate:', error);
        }

        if (isOwnProfile && (needsRegenerate || !hasTriedGenerate.current[selectedPeriod])) {
            hasTriedGenerate.current[selectedPeriod] = true;
            try {
                const genResponse = await api.generateStory(selectedPeriod);
                setStory(genResponse.story || null);
            } catch (error) {
                console.log('Story generation failed:', error);
                setStory(null);
            }
        } else if (!needsRegenerate) {
            setStory(null);
        }

        setLoading(false);
    };

    const handlePeriodChange = (period: 'weekly' | 'monthly' | 'yearly') => {
        if (period === selectedPeriod) return;
        setSelectedPeriod(period);
    };

    if (!isOwnProfile && !loading && !story) {
        return null;
    }

    const highlights = story ? parseHighlights(story.content) : [];
    const allPostsCard = highlights.find(c => c.type === 'all_posts') as Extract<HighlightCard, { type: 'all_posts' }> | undefined;
    const allPosts = allPostsCard?.posts || [];
    const statsCard = highlights.find(c => c.type === 'stat_row') as Extract<HighlightCard, { type: 'stat_row' }> | undefined;
    const coinsCard = highlights.find(c => c.type === 'coins') as Extract<HighlightCard, { type: 'coins' }> | undefined;

    const periodLabel = selectedPeriod === 'weekly' ? 'this week' : selectedPeriod === 'monthly' ? 'this month' : 'this year';

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.separator }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="book" size={18} color={accentColor} />
                    <Text style={[styles.title, { color: colors.text.primary }]}>Story of Me</Text>
                </View>
                {story && highlights.length > 0 && (
                    <TouchableOpacity
                        style={[styles.viewStoryBtn, { backgroundColor: accentLight }]}
                        onPress={() => setViewerVisible(true)}
                    >
                        <Ionicons name="play" size={12} color={accentColor} />
                        <Text style={[styles.viewStoryText, { color: accentColor }]}>View Story</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Period Tabs */}
            <View style={styles.tabsRow}>
                {PERIOD_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.periodTab,
                            { backgroundColor: isDark ? colors.surfaceVariant : '#F3F4F6' },
                            selectedPeriod === tab.key && { backgroundColor: accentLight },
                        ]}
                        onPress={() => handlePeriodChange(tab.key)}
                    >
                        <Text style={[
                            styles.periodTabText,
                            { color: colors.text.tertiary },
                            selectedPeriod === tab.key && { color: accentColor, fontWeight: '600' as const },
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.cardLoading}>
                    <ActivityIndicator size="small" color={accentColor} />
                </View>
            ) : story && allPosts.length > 0 ? (
                <>
                    {/* Quick Stats Bar */}
                    {statsCard && (
                        <View style={[styles.quickStats, { backgroundColor: isDark ? colors.surfaceVariant : accentColor + '0A' }]}>
                            {statsCard.items.map((item, i) => (
                                <View key={i} style={styles.quickStatItem}>
                                    <Ionicons name={item.icon as any} size={14} color={accentColor} />
                                    <Text style={[styles.quickStatValue, { color: colors.text.primary }]}>{item.value}</Text>
                                    <Text style={[styles.quickStatLabel, { color: colors.text.tertiary }]}>{item.label}</Text>
                                </View>
                            ))}
                            {coinsCard && (coinsCard.earned > 0 || coinsCard.given > 0) && (
                                <View style={styles.quickStatItem}>
                                    <Ionicons name="star" size={14} color="#F59E0B" />
                                    <Text style={[styles.quickStatValue, { color: colors.text.primary }]}>{coinsCard.earned + coinsCard.given}</Text>
                                    <Text style={[styles.quickStatLabel, { color: colors.text.tertiary }]}>coins</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Posts Count */}
                    <Text style={[styles.postsCountLabel, { color: colors.text.secondary }]}>
                        {allPosts.length} {allPosts.length === 1 ? 'post' : 'posts'} {periodLabel}
                    </Text>

                    {/* All Posts Grid */}
                    <View style={styles.postsGrid}>
                        {allPosts.map((post) => {
                            const uri = getImageUrl(post.imageUrl);
                            return (
                                <View key={post.id} style={styles.postTile}>
                                    {uri ? (
                                        <Image source={{ uri }} style={styles.postImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.postImagePlaceholder, { backgroundColor: isDark ? '#2A2A2A' : '#F3F4F6' }]}>
                                            <Ionicons name="image-outline" size={20} color={colors.text.tertiary} />
                                        </View>
                                    )}
                                    {/* Date overlay */}
                                    <View style={styles.postDateOverlay}>
                                        <Text style={styles.postDateText}>{formatPostDate(post.createdAt)}</Text>
                                    </View>
                                    {/* Engagement overlay */}
                                    {(post.likesCount > 0 || post.commentsCount > 0) && (
                                        <View style={styles.postEngOverlay}>
                                            {post.likesCount > 0 && (
                                                <View style={styles.postEngItem}>
                                                    <Ionicons name="heart" size={10} color="#FFF" />
                                                    <Text style={styles.postEngText}>{post.likesCount}</Text>
                                                </View>
                                            )}
                                            {post.commentsCount > 0 && (
                                                <View style={styles.postEngItem}>
                                                    <Ionicons name="chatbubble" size={9} color="#FFF" />
                                                    <Text style={styles.postEngText}>{post.commentsCount}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </>
            ) : (
                <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.surfaceVariant : colors.surface }]}>
                    <Ionicons name="book-outline" size={24} color={colors.text.tertiary} />
                    <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                        No story yet for this period
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
                        Start posting to get your story!
                    </Text>
                </View>
            )}

            <StoryViewerModal
                visible={viewerVisible}
                onClose={() => setViewerVisible(false)}
                highlights={highlights.filter(c => c.type !== 'all_posts')}
                periodStart={story?.periodStart}
                periodEnd={story?.periodEnd}
                title={story?.title}
            />
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    viewStoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    viewStoryText: {
        fontSize: 12,
        fontWeight: '600',
    },
    tabsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    periodTab: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
    },
    periodTabText: {
        fontSize: 13,
        fontWeight: '500',
    },
    cardLoading: {
        padding: 24,
        alignItems: 'center',
    },

    // Quick stats
    quickStats: {
        flexDirection: 'row',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
        gap: 4,
    },
    quickStatItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    quickStatValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    quickStatLabel: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Posts count
    postsCountLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },

    // Posts grid
    postsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
    },
    postTile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: 8,
        overflow: 'hidden',
    },
    postImage: {
        width: '100%',
        height: '100%',
    },
    postImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    postDateOverlay: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 6,
    },
    postDateText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#FFF',
    },
    postEngOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        flexDirection: 'row',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 6,
    },
    postEngItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    postEngText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#FFF',
    },

    // Empty
    emptyCard: {
        borderRadius: 14,
        padding: 24,
        alignItems: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '500',
    },
    emptySubtext: {
        fontSize: 12,
        opacity: 0.7,
    },
});
