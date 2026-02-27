import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ScrollView, RefreshControl, Share, ActivityIndicator,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getImageUrl } from '../../services/api';
import Avatar from '../../components/Avatar';
import PostViewerModal from '../../components/PostViewerModal';
import TopicMembersModal from '../../components/TopicMembersModal';
import TopicEditModal from '../../components/TopicEditModal';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Detect if an icon value is an Ionicons name (lowercase ASCII + hyphens)
const isIoniconName = (value: string): boolean => /^[a-z][a-z0-9-]*$/.test(value);

interface Topic {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    iconEmoji: string | null;
    iconImageUrl: string | null;
    coverImageUrl: string | null;
    category: string;
    type?: 'community' | 'private' | 'broadcast';
    followerCount: number;
    memberCount?: number;
    postCount: number;
    weeklyPostCount: number;
    isFollowing: boolean;
    isMember?: boolean;
    isPendingRequest?: boolean;
    isBroadcaster?: boolean;
    isAdmin?: boolean;
    pendingRequestCount?: number;
    inviteCode: string;
    creatorId?: string;
    creator?: {
        id: string;
        username: string;
        avatarUrl: string;
    };
    recentMembers?: Array<{
        id: string;
        username: string;
        avatarUrl: string;
    }>;
}

interface LeaderboardEntry {
    user: {
        id: string;
        username: string;
        avatarUrl: string;
    };
    totalGiven: number;
    giftCount: number;
    currentStreak?: number;
}

type TabType = 'posts' | 'about' | 'encouragers';

export default function TopicPageScreen({ route, navigation }: any) {
    const { topicSlug } = route.params;
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const [topic, setTopic] = useState<Topic | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('posts');

    // Leaderboard state
    const [leaderboardView, setLeaderboardView] = useState<'community' | 'global'>('community');
    const [communityLeaderboard, setCommunityLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    // Post modal state
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [selectedPostIndex, setSelectedPostIndex] = useState(0);

    // Members and Edit modal state
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Check if current user is admin
    const isAdmin = topic?.isAdmin || (currentUserId && (topic?.creatorId === currentUserId || topic?.creator?.id === currentUserId));

    // Load current user ID
    useEffect(() => {
        const loadUserId = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    setCurrentUserId(user.id);
                }
            } catch (error) {
                console.error('Error loading user:', error);
            }
        };
        loadUserId();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadTopicPage();
        }, [topicSlug])
    );

    useEffect(() => {
        if (topic && activeTab === 'encouragers') {
            loadLeaderboard();
        }
    }, [activeTab, leaderboardView, topic]);

    const loadTopicPage = async () => {
        try {
            const response = await api.get(`/topics/${topicSlug}`);
            setTopic(response.data.topic);

            if (response.data.topic) {
                const postsRes = await api.get(`/topics/${response.data.topic.id}/posts`);
                const fetchedPosts = postsRes.data.posts || [];
                setPosts(fetchedPosts);
            }
        } catch (error) {
            console.error('Error loading topic page:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadLeaderboard = async () => {
        if (!topic) return;
        setLoadingLeaderboard(true);

        try {
            const topicId = leaderboardView === 'community' ? topic.id : 'global';
            const response = await api.get(`/topics/${topicId}/leaderboard?type=givers&limit=20`);

            if (leaderboardView === 'community') {
                setCommunityLeaderboard(response.data.leaderboard || []);
            } else {
                setGlobalLeaderboard(response.data.leaderboard || []);
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const handleFollow = async () => {
        if (!topic) return;

        try {
            if (topic.isFollowing || topic.isMember) {
                await api.delete(`/topics/${topic.id}/follow`);
                setTopic(prev => prev ? { ...prev, isFollowing: false, isMember: false, isPendingRequest: false } : null);
            } else if (topic.type === 'private') {
                // Request to join private group
                await api.requestToJoinTopic(topic.id);
                setTopic(prev => prev ? { ...prev, isPendingRequest: true } : null);
            } else {
                await api.post(`/topics/${topic.id}/follow`);
                setTopic(prev => prev ? { ...prev, isFollowing: true, isMember: true } : null);
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const handleShare = async () => {
        if (!topic) return;

        try {
            await Share.share({
                message: `Join ${topic.name} on SeeMe! seeme.app/t/${topic.slug}`,
                title: topic.name
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    // Post modal functions
    const openPost = (post: any, index: number) => {
        setSelectedPost(post);
        setSelectedPostIndex(index);
    };

    const closePost = () => {
        setSelectedPost(null);
    };

    const currentLeaderboard = leaderboardView === 'community' ? communityLeaderboard : globalLeaderboard;

    const handleEditSave = (updates: any) => {
        // Update local topic state with the new values
        setTopic(prev => prev ? { ...prev, ...updates } : null);
    };

    const renderHeader = () => (
        <View>
            {/* Cover Image */}
            <View style={[styles.coverContainer, { height: 150 + insets.top }]}>
                {topic?.coverImageUrl ? (
                    <Image source={{ uri: getImageUrl(topic.coverImageUrl) || topic.coverImageUrl }} style={styles.coverImage} />
                ) : (
                    <View style={[styles.coverImage, styles.coverPlaceholder]}>
                        {topic?.iconEmoji && isIoniconName(topic.iconEmoji) ? (
                            <Ionicons name={`${topic.iconEmoji}-outline` as any} size={64} color="rgba(255,255,255,0.3)" />
                        ) : (
                            <Text style={styles.coverEmoji}>{topic?.iconEmoji || '🏷️'}</Text>
                        )}
                    </View>
                )}
                <View style={styles.coverOverlay} />

                {/* Admin Edit Button on Cover */}
                {isAdmin && (
                    <TouchableOpacity
                        style={[styles.editCoverButton, { top: Math.max(insets.top + 4, 12) }]}
                        onPress={() => setShowEditModal(true)}
                    >
                        <Ionicons name="pencil" size={18} color="#FFFFFF" />
                        <Text style={styles.editCoverText}>Edit</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Info Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <View style={[styles.emojiContainer, { backgroundColor: colors.inputBackground, borderColor: colors.card }]}>
                    {topic?.iconImageUrl ? (
                        <Image
                            source={{ uri: getImageUrl(topic.iconImageUrl) || topic.iconImageUrl }}
                            style={{ width: 64, height: 64, borderRadius: 32 }}
                        />
                    ) : topic?.iconEmoji && isIoniconName(topic.iconEmoji) ? (
                        <Ionicons name={`${topic.iconEmoji}-outline` as any} size={36} color="#7C3AED" />
                    ) : (
                        <Text style={styles.emoji}>{topic?.iconEmoji || '🏷️'}</Text>
                    )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {topic?.type === 'private' && (
                        <Ionicons name="lock-closed" size={18} color="#EF4444" />
                    )}
                    {topic?.type === 'broadcast' && (
                        <Ionicons name="megaphone" size={18} color="#F59E0B" />
                    )}
                    <Text style={[styles.topicName, { color: colors.text.primary }]}>{topic?.name}</Text>
                </View>

                {/* Stats - Members is now clickable */}
                <View style={[styles.statsRow, { borderColor: colors.separator }]}>
                    <TouchableOpacity
                        style={styles.stat}
                        onPress={() => setShowMembersModal(true)}
                    >
                        <Text style={[styles.statNumber, { color: colors.text.primary }]}>{topic?.followerCount || 0}</Text>
                        <Text style={[styles.statLabel, styles.statLabelClickable]}>Members</Text>
                        <Ionicons name="chevron-forward" size={12} color="#7C3AED" style={styles.statChevron} />
                    </TouchableOpacity>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.stat}>
                        <Text style={[styles.statNumber, { color: colors.text.primary }]}>{topic?.postCount || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Posts</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.stat}>
                        <Text style={[styles.statNumber, { color: colors.text.primary }]}>{topic?.weeklyPostCount || 0}</Text>
                        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>This Week</Text>
                    </View>
                </View>

                {topic?.description && (
                    <Text style={[styles.description, { color: colors.text.secondary }]}>{topic.description}</Text>
                )}

                {/* Actions */}
                <View style={styles.actionRow}>
                    {topic?.isPendingRequest ? (
                        <TouchableOpacity
                            style={[styles.joinButton, { backgroundColor: '#F59E0B' }]}
                            disabled
                        >
                            <Ionicons name="time" size={20} color="#FFFFFF" />
                            <Text style={styles.joinButtonText}>Request Pending</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.joinButton, (topic?.isFollowing || topic?.isMember) && styles.joinedButton]}
                            onPress={handleFollow}
                        >
                            <Ionicons
                                name={(topic?.isFollowing || topic?.isMember) ? 'checkmark' :
                                      topic?.type === 'private' ? 'lock-closed' : 'add'}
                                size={20}
                                color={(topic?.isFollowing || topic?.isMember) ? '#10B981' : '#FFFFFF'}
                            />
                            <Text style={[styles.joinButtonText, (topic?.isFollowing || topic?.isMember) && styles.joinedButtonText]}>
                                {(topic?.isFollowing || topic?.isMember) ? 'Joined' :
                                 topic?.type === 'private' ? 'Request to Join' : 'Join'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.inputBackground }]} onPress={handleShare}>
                        <Ionicons name="share-outline" size={24} color={colors.text.secondary} />
                    </TouchableOpacity>
                </View>

                {/* Creator */}
                {topic?.creator && (
                    <TouchableOpacity
                        style={styles.creatorRow}
                        onPress={() => navigation.navigate('Profile', { userId: topic.creator!.id })}
                    >
                        <Image
                            source={{ uri: topic.creator.avatarUrl || 'https://via.placeholder.com/24' }}
                            style={styles.creatorAvatar}
                        />
                        <Text style={[styles.creatorText, { color: colors.text.secondary }]}>
                            Created by <Text style={styles.creatorName}>@{topic.creator.username}</Text>
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Tabs */}
            <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                {(['posts', 'about', 'encouragers'] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Ionicons
                            name={tab === 'posts' ? 'grid' : tab === 'about' ? 'information-circle' : 'heart'}
                            size={20}
                            color={activeTab === tab ? '#7C3AED' : colors.text.secondary}
                        />
                        <Text style={[styles.tabText, { color: colors.text.secondary }, activeTab === tab && styles.tabTextActive]}>
                            {tab === 'posts' ? 'Posts' : tab === 'about' ? 'About' : 'Top Helpers'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderEncouragersTab = () => (
        <View style={styles.encouragersContainer}>
            <Text style={[styles.encouragersTitle, { color: colors.text.primary }]}>Top Encouragers</Text>
            <Text style={[styles.encouragersSubtitle, { color: colors.text.secondary }]}>
                These members help beginners the most!
            </Text>

            {/* Toggle: Community vs Global */}
            <View style={[styles.leaderboardToggle, { backgroundColor: colors.inputBackground }]}>
                <TouchableOpacity
                    style={[
                        styles.leaderboardToggleBtn,
                        leaderboardView === 'community' && [styles.leaderboardToggleBtnActive, { backgroundColor: colors.card }]
                    ]}
                    onPress={() => setLeaderboardView('community')}
                >
                    <Text style={styles.leaderboardToggleEmoji}>{topic?.iconEmoji}</Text>
                    <Text style={[
                        styles.leaderboardToggleText,
                        { color: colors.text.secondary },
                        leaderboardView === 'community' && styles.leaderboardToggleTextActive
                    ]}>
                        This Community
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.leaderboardToggleBtn,
                        leaderboardView === 'global' && [styles.leaderboardToggleBtnActive, { backgroundColor: colors.card }]
                    ]}
                    onPress={() => setLeaderboardView('global')}
                >
                    <Ionicons
                        name="globe"
                        size={16}
                        color={leaderboardView === 'global' ? '#7C3AED' : colors.text.secondary}
                    />
                    <Text style={[
                        styles.leaderboardToggleText,
                        { color: colors.text.secondary },
                        leaderboardView === 'global' && styles.leaderboardToggleTextActive
                    ]}>
                        Global
                    </Text>
                </TouchableOpacity>
            </View>

            <Text style={[styles.leaderboardScopeText, { color: colors.text.secondary }]}>
                {leaderboardView === 'community'
                    ? `Coins given to posts in ${topic?.name}`
                    : 'Total coins given across all communities'
                }
            </Text>

            {loadingLeaderboard ? (
                <View style={styles.loadingLeaderboard}>
                    <ActivityIndicator color="#7C3AED" />
                </View>
            ) : currentLeaderboard.length > 0 ? (
                <>
                    {currentLeaderboard.map((entry, index) => (
                        <TouchableOpacity
                            key={entry.user.id}
                            style={[styles.encouragerItem, { backgroundColor: colors.card }]}
                            onPress={() => navigation.navigate('Profile', { userId: entry.user.id })}
                        >
                            <View style={styles.rankContainer}>
                                {index === 0 && <Text style={styles.medal}>🥇</Text>}
                                {index === 1 && <Text style={styles.medal}>🥈</Text>}
                                {index === 2 && <Text style={styles.medal}>🥉</Text>}
                                {index > 2 && <Text style={styles.encouragerRank}>#{index + 1}</Text>}
                            </View>
                            <Image
                                source={{ uri: entry.user.avatarUrl || 'https://via.placeholder.com/44' }}
                                style={styles.encouragerAvatar}
                            />
                            <View style={styles.encouragerInfo}>
                                <Text style={[styles.encouragerName, { color: colors.text.primary }]}>@{entry.user.username}</Text>
                                <View style={styles.encouragerStats}>
                                    <Ionicons name="logo-bitcoin" size={14} color="#F59E0B" />
                                    <Text style={styles.encouragerCoins}>
                                        {entry.totalGiven} coins
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                        style={styles.viewFullLeaderboard}
                        onPress={() => navigation.navigate('CoinLeaderboard', {
                            initialTab: 'givers',
                            topicId: leaderboardView === 'community' ? topic?.id : null
                        })}
                    >
                        <Text style={styles.viewFullLeaderboardText}>
                            View Full Leaderboard
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#7C3AED" />
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.emptyEncouragers}>
                    <Ionicons name="heart-outline" size={48} color={colors.disabled} />
                    <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                        {leaderboardView === 'community'
                            ? 'No encouragers in this community yet. Be the first to help beginners!'
                            : 'No encouragers yet. Start giving coins to climb the leaderboard!'
                        }
                    </Text>
                </View>
            )}
        </View>
    );

    const renderAboutTab = () => (
        <View style={styles.aboutContainer}>
            <View style={[styles.aboutSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.aboutSectionTitle, { color: colors.text.primary }]}>About</Text>
                <Text style={[styles.aboutText, { color: colors.text.secondary }]}>
                    {topic?.description || 'No description available.'}
                </Text>
            </View>

            <View style={[styles.aboutSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.aboutSectionTitle, { color: colors.text.primary }]}>Our Values</Text>
                <View style={styles.valueItem}>
                    <Text style={styles.valueEmoji}>🌱</Text>
                    <Text style={[styles.valueText, { color: colors.text.secondary }]}>
                        <Text style={[styles.valueBold, { color: colors.text.primary }]}>Beginner-Friendly:</Text> Everyone starts somewhere. Encourage growth!
                    </Text>
                </View>
                <View style={styles.valueItem}>
                    <Text style={styles.valueEmoji}>💝</Text>
                    <Text style={[styles.valueText, { color: colors.text.secondary }]}>
                        <Text style={[styles.valueBold, { color: colors.text.primary }]}>Encouragement First:</Text> Give coins to uplift, not judge quality.
                    </Text>
                </View>
                <View style={styles.valueItem}>
                    <Text style={styles.valueEmoji}>🤝</Text>
                    <Text style={[styles.valueText, { color: colors.text.secondary }]}>
                        <Text style={[styles.valueBold, { color: colors.text.primary }]}>Supportive Community:</Text> Help each other improve together.
                    </Text>
                </View>
            </View>

            <View style={[styles.aboutSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.aboutSectionTitle, { color: colors.text.primary }]}>Invite Link</Text>
                <View style={[styles.inviteLinkBox, { backgroundColor: colors.inputBackground }]}>
                    <Text style={styles.inviteLink}>seeme.app/invite/{topic?.inviteCode}</Text>
                    <TouchableOpacity style={styles.copyButton} onPress={handleShare}>
                        <Ionicons name="share" size={16} color="#7C3AED" />
                        <Text style={styles.copyButtonText}>Share</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Admin Management Section */}
            {isAdmin && (
                <View style={[styles.aboutSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.aboutSectionTitle, { color: colors.text.primary }]}>Admin</Text>

                    {topic?.type === 'private' && (
                        <TouchableOpacity
                            style={[styles.adminActionBtn, { borderColor: colors.border }]}
                            onPress={() => navigation.navigate('PendingRequests', { topicId: topic?.id })}
                        >
                            <Ionicons name="people" size={20} color="#7C3AED" />
                            <Text style={[styles.adminActionText, { color: colors.text.primary }]}>
                                Pending Requests
                            </Text>
                            {(topic?.pendingRequestCount || 0) > 0 && (
                                <View style={styles.badgeCircle}>
                                    <Text style={styles.badgeText}>{topic?.pendingRequestCount}</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    )}

                    {topic?.type === 'broadcast' && (
                        <TouchableOpacity
                            style={[styles.adminActionBtn, { borderColor: colors.border }]}
                            onPress={() => navigation.navigate('BroadcasterManagement', { topicId: topic?.id })}
                        >
                            <Ionicons name="megaphone" size={20} color="#F59E0B" />
                            <Text style={[styles.adminActionText, { color: colors.text.primary }]}>
                                Manage Broadcasters
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );

    const renderPostsHeader = () => (
        <View style={[styles.postsHeaderContainer, { backgroundColor: colors.background }]}>
            <View style={styles.postsHeaderLeft}>
                <Ionicons name="images" size={20} color="#7C3AED" />
                <Text style={[styles.postsHeaderTitle, { color: colors.text.primary }]}>Community Posts</Text>
            </View>
            <Text style={[styles.postsHeaderCount, { color: colors.text.secondary }]}>{posts.length} posts</Text>
        </View>
    );

    const renderPost = ({ item, index }: { item: any; index: number }) => {
        const hasStats = (item.likesCount > 0) || (item.commentsCount > 0);
        return (
            <TouchableOpacity
                style={styles.postItem}
                onPress={() => openPost(item, index)}
                activeOpacity={0.9}
            >
                <View style={[styles.postImageContainer, { backgroundColor: colors.border }]}>
                    <Image
                        source={{ uri: getImageUrl(item.processedImageUrl) || getImageUrl(item.originalImageUrl) || '' }}
                        style={styles.postImage}
                    />

                    {/* Gradient overlay at bottom for stats */}
                    {hasStats && (
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={styles.postOverlay}
                        />
                    )}

                    {/* Engagement stats */}
                    {hasStats && (
                        <View style={styles.postStats}>
                            {item.likesCount > 0 && (
                                <View style={styles.postStatItem}>
                                    <Ionicons name="heart" size={12} color="#FFFFFF" />
                                    <Text style={styles.postStatText}>{item.likesCount}</Text>
                                </View>
                            )}
                            {item.commentsCount > 0 && (
                                <View style={styles.postStatItem}>
                                    <Ionicons name="chatbubble" size={11} color="#FFFFFF" />
                                    <Text style={styles.postStatText}>{item.commentsCount}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* User avatar in corner */}
                    {item.user && (
                        <View style={styles.postUserBadge}>
                            <Avatar
                                size={24}
                                avatarUrl={!item.user.activeAvatar ? item.user.avatarUrl : undefined}
                                username={item.user.username}
                                customizations={item.user.activeAvatar?.customizations}
                                avatarStyle={item.user.activeAvatar?.style}
                            />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={[styles.loadingText, { color: colors.text.tertiary }]}>Loading community...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {activeTab === 'posts' ? (
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={item => item.id}
                    numColumns={3}
                    ListHeaderComponent={
                        <>
                            {renderHeader()}
                            {posts.length > 0 && renderPostsHeader()}
                        </>
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={loadTopicPage} />
                    }
                    contentContainerStyle={styles.postsGrid}
                    ListEmptyComponent={
                        <View style={[styles.emptyPosts, { backgroundColor: colors.card }]}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="camera-outline" size={32} color="#7C3AED" />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No posts yet</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
                                Be the first to share in {topic?.name}!
                            </Text>
                            {topic?.isFollowing && (
                                <TouchableOpacity
                                    style={styles.emptyPostButton}
                                    onPress={() => navigation.navigate('CreatePost', { preselectedTopic: topic })}
                                >
                                    <Ionicons name="add" size={20} color="#FFFFFF" />
                                    <Text style={styles.emptyPostButtonText}>Create First Post</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            ) : (
                <ScrollView refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadTopicPage} />
                }>
                    {renderHeader()}
                    {activeTab === 'about' && renderAboutTab()}
                    {activeTab === 'encouragers' && renderEncouragersTab()}
                </ScrollView>
            )}

            {/* FAB for creating posts */}
            {topic?.isFollowing && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('CreatePost', { preselectedTopic: topic })}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>
            )}

            {/* Post View Modal - Uses shared component for all post interactions */}
            <PostViewerModal
                visible={!!selectedPost}
                posts={posts}
                initialIndex={selectedPostIndex}
                title={topic?.name || 'Posts'}
                onClose={closePost}
                onCommentPress={(postId) => {
                    closePost();
                    navigation.navigate('Comments', { postId });
                }}
                onUserPress={(userId, username) => {
                    closePost();
                    navigation.navigate('UserProfile', { userId, username });
                }}
            />

            {/* Members Modal */}
            {topic && (
                <TopicMembersModal
                    visible={showMembersModal}
                    topicId={topic.id}
                    topicName={topic.name}
                    onClose={() => setShowMembersModal(false)}
                    onUserPress={(userId, username) => {
                        setShowMembersModal(false);
                        navigation.navigate('UserProfile', { userId, username });
                    }}
                />
            )}

            {/* Edit Modal (Admin only) */}
            {topic && isAdmin && (
                <TopicEditModal
                    visible={showEditModal}
                    topic={topic}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditSave}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB'
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
    coverContainer: {
        position: 'relative'
    },
    coverImage: {
        width: '100%',
        height: '100%'
    },
    coverPlaceholder: {
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center'
    },
    coverEmoji: {
        fontSize: 64,
        opacity: 0.3
    },
    coverOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    editCoverButton: {
        position: 'absolute',
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    editCoverText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        marginTop: -40,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
    },
    emojiContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -56,
        borderWidth: 4,
        borderColor: '#FFFFFF'
    },
    emoji: {
        fontSize: 36
    },
    topicName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 12,
        textAlign: 'center'
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F3F4F6'
    },
    stat: {
        flex: 1,
        alignItems: 'center'
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937'
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2
    },
    statLabelClickable: {
        color: '#7C3AED',
    },
    statChevron: {
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E7EB'
    },
    description: {
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
        width: '100%'
    },
    joinButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8
    },
    joinedButton: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#10B981'
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600'
    },
    joinedButtonText: {
        color: '#10B981'
    },
    shareButton: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center'
    },
    creatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        gap: 8
    },
    creatorAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12
    },
    creatorText: {
        fontSize: 13,
        color: '#6B7280'
    },
    creatorName: {
        color: '#7C3AED',
        fontWeight: '600'
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginTop: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#7C3AED'
    },
    tabText: {
        fontSize: 14,
        color: '#6B7280'
    },
    tabTextActive: {
        color: '#7C3AED',
        fontWeight: '600'
    },
    // Posts tab
    postsGrid: {
        paddingBottom: 100,
        paddingHorizontal: 8,
    },
    postsHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 16,
        backgroundColor: '#F9FAFB',
    },
    postsHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    postsHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    postsHeaderCount: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    postItem: {
        flex: 1 / 3,
        aspectRatio: 1,
        padding: 4,
    },
    postImageContainer: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
    },
    postImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    postOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
    },
    postStats: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        gap: 6,
    },
    postStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    postStatText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    postUserBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
        overflow: 'hidden',
    },
    emptyPosts: {
        padding: 48,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 8,
        marginTop: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#F3E8FF',
        borderStyle: 'dashed',
    },
    emptyIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F3E8FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyPostButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        marginTop: 20,
        gap: 8,
    },
    emptyPostButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    // About tab
    aboutContainer: {
        padding: 16
    },
    aboutSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12
    },
    aboutSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 12
    },
    aboutText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22
    },
    valueItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12
    },
    valueEmoji: {
        fontSize: 20
    },
    valueText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20
    },
    valueBold: {
        fontWeight: '600',
        color: '#1F2937'
    },
    inviteLinkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 12
    },
    inviteLink: {
        flex: 1,
        fontSize: 14,
        color: '#7C3AED',
        fontWeight: '500'
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    copyButtonText: {
        fontSize: 14,
        color: '#7C3AED',
        fontWeight: '600'
    },
    // Encouragers tab
    encouragersContainer: {
        padding: 16
    },
    encouragersTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4
    },
    encouragersSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16
    },
    leaderboardToggle: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 4,
        marginBottom: 12
    },
    leaderboardToggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 6,
        gap: 6
    },
    leaderboardToggleBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    leaderboardToggleEmoji: {
        fontSize: 14
    },
    leaderboardToggleText: {
        fontSize: 14,
        color: '#6B7280'
    },
    leaderboardToggleTextActive: {
        color: '#7C3AED',
        fontWeight: '600'
    },
    leaderboardScopeText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 12,
        fontStyle: 'italic'
    },
    loadingLeaderboard: {
        padding: 40,
        alignItems: 'center'
    },
    encouragerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8
    },
    rankContainer: {
        width: 32,
        alignItems: 'center'
    },
    medal: {
        fontSize: 20
    },
    encouragerRank: {
        fontSize: 16,
        fontWeight: '700',
        color: '#7C3AED'
    },
    encouragerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22
    },
    encouragerInfo: {
        flex: 1,
        marginLeft: 12
    },
    encouragerName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937'
    },
    encouragerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 4
    },
    encouragerCoins: {
        fontSize: 13,
        color: '#F59E0B',
        fontWeight: '600'
    },
    viewFullLeaderboard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginTop: 8,
        gap: 4
    },
    viewFullLeaderboardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7C3AED'
    },
    emptyEncouragers: {
        alignItems: 'center',
        padding: 40
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12
    },
    // FAB
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8
    },
    adminActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 8,
        gap: 10,
    },
    adminActionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    badgeCircle: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
});
