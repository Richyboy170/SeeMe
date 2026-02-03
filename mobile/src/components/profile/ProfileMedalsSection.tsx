import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

interface CommunityMedal {
    id: string;
    medalType: 'gold' | 'silver' | 'bronze';
    leaderboardType: 'givers' | 'receivers';
    periodType: 'weekly' | 'monthly' | 'all_time';
    topicName: string;
    topicEmoji: string | null;
    rankPosition: number;
    coinsAmount: number;
    awardedAt: string;
}

interface GlobalMedal {
    id: string;
    medalType: 'gold' | 'silver' | 'bronze';
    leaderboardType: 'givers' | 'receivers';
    periodType: 'weekly' | 'monthly' | 'all_time';
    rankPosition: number;
    coinsAmount: number;
    awardedAt: string;
}

interface ProfileMedalsSectionProps {
    userId: string;
    isOwnProfile?: boolean;
}

const MEDAL_COLORS = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32'
};

const MEDAL_ICONS = {
    gold: 'medal',
    silver: 'medal-outline',
    bronze: 'ribbon'
};

export default function ProfileMedalsSection({ userId, isOwnProfile = false }: ProfileMedalsSectionProps) {
    const [communityMedals, setCommunityMedals] = useState<CommunityMedal[]>([]);
    const [globalMedals, setGlobalMedals] = useState<GlobalMedal[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadMedals();
    }, [userId]);

    const loadMedals = async () => {
        try {
            const response = await api.get(`/medals/user/${userId}`);
            setCommunityMedals(response.data.communityMedals || []);
            setGlobalMedals(response.data.globalMedals || []);
        } catch (error) {
            console.error('Error loading medals:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalMedals = communityMedals.length + globalMedals.length;

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#7C3AED" />
            </View>
        );
    }

    if (totalMedals === 0) {
        return null;
    }

    const getMedalLabel = (leaderboardType: string, periodType: string) => {
        const leaderboard = leaderboardType === 'givers' ? 'Top Giver' : 'Most Encouraged';
        const period = periodType === 'weekly' ? 'Weekly' : periodType === 'monthly' ? 'Monthly' : 'All-Time';
        return `${period} ${leaderboard}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const displayedMedals = expanded ? [...communityMedals, ...globalMedals.map(m => ({ ...m, topicName: 'Global', topicEmoji: '🌍' }))] :
        [...communityMedals, ...globalMedals.map(m => ({ ...m, topicName: 'Global', topicEmoji: '🌍' }))].slice(0, 3);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="trophy" size={18} color="#7C3AED" />
                    <Text style={styles.title}>Medals</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{totalMedals}</Text>
                    </View>
                </View>
                {totalMedals > 3 && (
                    <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                        <Text style={styles.seeAllText}>
                            {expanded ? 'Show Less' : 'See All'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.medalsGrid}>
                {displayedMedals.map((medal: any, index: number) => (
                    <View key={medal.id || index} style={styles.medalCard}>
                        <View style={[styles.medalIcon, { backgroundColor: MEDAL_COLORS[medal.medalType as keyof typeof MEDAL_COLORS] + '20' }]}>
                            <Ionicons
                                name={MEDAL_ICONS[medal.medalType as keyof typeof MEDAL_ICONS] as any}
                                size={24}
                                color={MEDAL_COLORS[medal.medalType as keyof typeof MEDAL_COLORS]}
                            />
                        </View>
                        <View style={styles.medalInfo}>
                            <Text style={styles.medalRank}>#{medal.rankPosition}</Text>
                            <Text style={styles.medalLabel} numberOfLines={1}>
                                {getMedalLabel(medal.leaderboardType, medal.periodType)}
                            </Text>
                            <View style={styles.medalSource}>
                                <Text style={styles.medalEmoji}>{medal.topicEmoji || '🏷️'}</Text>
                                <Text style={styles.medalTopicName} numberOfLines={1}>
                                    {medal.topicName}
                                </Text>
                            </View>
                            <Text style={styles.medalDate}>{formatDate(medal.awardedAt)}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6'
    },
    loadingContainer: {
        padding: 16,
        alignItems: 'center'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937'
    },
    countBadge: {
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10
    },
    countText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7C3AED'
    },
    seeAllText: {
        fontSize: 14,
        color: '#7C3AED',
        fontWeight: '500'
    },
    medalsGrid: {
        gap: 10
    },
    medalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        gap: 12
    },
    medalIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    medalInfo: {
        flex: 1
    },
    medalRank: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937'
    },
    medalLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2
    },
    medalSource: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4
    },
    medalEmoji: {
        fontSize: 14
    },
    medalTopicName: {
        fontSize: 12,
        color: '#7C3AED',
        fontWeight: '500',
        flex: 1
    },
    medalDate: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2
    }
});
