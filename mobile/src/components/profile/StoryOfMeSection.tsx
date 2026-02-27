import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useTheme } from '../../theme';
import StoryViewerModal from './StoryViewerModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

// ── Main component ────────────────────────────────────────────────────

const DEFAULT_GRADIENT: [string, string, string] = ['#9CA3AF', '#6B7280', '#4B5563'];
const DEFAULT_COLOR = '#9CA3AF';

export default function StoryOfMeSection({ userId, isOwnProfile = false, rankGradient, rankColor }: StoryOfMeSectionProps) {
    const { colors } = useTheme();
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
    const openerCard = highlights.find(c => c.type === 'opener') as Extract<HighlightCard, { type: 'opener' }> | undefined;

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.separator }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="book" size={18} color={accentColor} />
                    <Text style={[styles.title, { color: colors.text.primary }]}>Story of Me</Text>
                </View>
            </View>

            {/* Period Tabs */}
            <View style={styles.tabsRow}>
                {PERIOD_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.periodTab,
                            selectedPeriod === tab.key && { backgroundColor: accentLight },
                        ]}
                        onPress={() => handlePeriodChange(tab.key)}
                    >
                        <Text style={[
                            styles.periodTabText,
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
            ) : story && highlights.length > 0 ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => setViewerVisible(true)}>
                    <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.storyCard}
                    >
                        <Text style={styles.storyTitle}>{story.title}</Text>
                        {openerCard && (
                            <Text style={styles.openerTeaser} numberOfLines={2}>
                                {openerCard.text}
                            </Text>
                        )}
                        <View style={styles.tapHintRow}>
                            <Text style={styles.tapHint}>Tap to view story</Text>
                            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            ) : (
                <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
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
                highlights={highlights}
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
    tabsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    periodTab: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
    },
    periodTabActive: {
    },
    periodTabText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
    },
    periodTabTextActive: {
    },
    cardLoading: {
        padding: 24,
        alignItems: 'center',
    },
    storyCard: {
        borderRadius: 16,
        padding: 20,
    },
    storyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 6,
    },
    openerTeaser: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 20,
        marginBottom: 12,
    },
    tapHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tapHint: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
    },
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
