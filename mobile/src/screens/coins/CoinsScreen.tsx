import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    ScrollView,
    Text,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Animated,
    Dimensions,
    PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { api } from '../../services/api';
import TrustConnectionItem from '../../components/TrustConnectionItem';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import { Ionicons } from '@expo/vector-icons';
import KindnessCoin from '../../components/coins/KindnessCoin';
import SkyCoinIcon, { SKY_COIN_COLORS } from '../../components/coins/SkyCoinIcon';
import EncouragementModal from '../../components/coins/EncouragementModal';
import DecorationStoreContent from '../../components/DecorationStoreContent';
import { AvatarCustomizations } from '../../components/AvatarRenderer';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 0.5;
const SEGMENT_H_PADDING = 16;
const SEGMENT_INNER_PADDING = 3;
const SEGMENT_TAB_WIDTH = (SCREEN_WIDTH - SEGMENT_H_PADDING * 2 - SEGMENT_INNER_PADDING * 2) / 2;

interface ReceivedCoin {
    id: string;
    fromUserId: string;
    fromUsername: string;
    amount: number;
    message: string | null;
    collected: boolean;
    createdAt: string;
    fromActiveAvatar?: {
        id: string;
        style: string;
        customizations: AvatarCustomizations;
    } | null;
}

interface TrustConnection {
    id: string;
    otherUser: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    trustScore: number;
    currentStreak: number;
    longestStreak: number;
    isMutualFollow: boolean;
    totalExchangeDays: number;
    lastExchangeDate: string;
}

export default function CoinsScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [coinsData, setCoinsData] = useState({
        totalCoins: 0,
        skyCoins: 0,
        lifetimeGiven: 0,
        cooldownCoinsAvailable: 0,
        minutesUntilNextCooldown: null,
        secondsUntilNextCooldown: null,
        rank: 'beginner',
        nextRank: null as string | null,
        coinsToNextRank: null as number | null,
        rankProgress: 0,
        rankPercentile: 0
    });
    const [receivedCoins, setReceivedCoins] = useState<ReceivedCoin[]>([]);
    const [uncollectedCoins, setUncollectedCoins] = useState<ReceivedCoin[]>([]);
    const [uncollectedCount, setUncollectedCount] = useState(0);
    const [trustConnections, setTrustConnections] = useState<TrustConnection[]>([]);
    const [showAllTrust, setShowAllTrust] = useState(false);
    const [showEncouragement, setShowEncouragement] = useState(false);
    const [activeTab, setActiveTab] = useState<'wallet' | 'store'>('wallet');

    // Tab slide animation: 0 = wallet (left), 1 = store (right)
    const slideAnim = useRef(new Animated.Value(0)).current;
    const currentIndexRef = useRef(0);
    const activeTabRef = useRef<'wallet' | 'store'>('wallet');

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    // Sync animation when activeTab changes from button press
    useEffect(() => {
        const targetIndex = activeTab === 'wallet' ? 0 : 1;
        if (currentIndexRef.current !== targetIndex) {
            currentIndexRef.current = targetIndex;
            Animated.spring(slideAnim, {
                toValue: targetIndex,
                useNativeDriver: true,
                tension: 100,
                friction: 15,
            }).start();
        }
    }, [activeTab]);

    const tabPanResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, { dx, dy }) =>
                Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
            onPanResponderMove: (_, { dx }) => {
                const normalized = currentIndexRef.current - dx / SCREEN_WIDTH;
                slideAnim.setValue(Math.max(0, Math.min(1, normalized)));
            },
            onPanResponderRelease: (_, { dx, vx }) => {
                let targetIndex = currentIndexRef.current;

                if (Math.abs(vx) > VELOCITY_THRESHOLD) {
                    targetIndex = vx < 0 ? 1 : 0;
                } else if (Math.abs(dx) > SWIPE_THRESHOLD) {
                    targetIndex = dx < 0
                        ? Math.min(1, currentIndexRef.current + 1)
                        : Math.max(0, currentIndexRef.current - 1);
                }

                targetIndex = Math.max(0, Math.min(1, targetIndex));
                currentIndexRef.current = targetIndex;

                Animated.spring(slideAnim, {
                    toValue: targetIndex,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 15,
                }).start();

                const newTab = targetIndex === 0 ? 'wallet' : 'store';
                if (newTab !== activeTabRef.current) {
                    setActiveTab(newTab as 'wallet' | 'store');
                }
            },
        })
    ).current;

    const contentTranslateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -SCREEN_WIDTH],
    });

    const segmentIndicatorX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SEGMENT_TAB_WIDTH],
    });

    // Coin celebration hook
    const { showCelebration } = useCoinCelebration();

    const scrollViewRef = useRef<ScrollView>(null);

    // Scroll to top when tab is re-tapped
    useEffect(() => {
        const parent = navigation.getParent();
        if (!parent) return;

        const unsubscribe = parent.addListener('tabPress', (e: any) => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        });

        return unsubscribe;
    }, [navigation]);

    // Animations for hero section
    const coinPulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        loadCoins();
        loadReceivedCoins();
        loadUncollectedCoins();
        loadTrustConnections();

        // Refresh every minute to update cooldown timer
        const interval = setInterval(loadCoins, 60000);
        return () => clearInterval(interval);
    }, []);


    // Hero animations
    useEffect(() => {
        // Coin pulse animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(coinPulse, {
                    toValue: 1.08,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(coinPulse, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

    }, []);

    const loadReceivedCoins = async () => {
        try {
            const response = await api.getReceivedCoins(30);
            setReceivedCoins(response.received || []);
        } catch (error) {
            console.error('Error loading received coins:', error);
        }
    };

    const loadUncollectedCoins = async () => {
        try {
            const response = await api.getReceivedCoins(50, false);
            setUncollectedCoins(response.received || []);
        } catch (error) {
            console.error('Error loading uncollected coins:', error);
        }
    };

    const loadTrustConnections = async () => {
        try {
            const response = await api.getTrustConnections(1, 10, 'score');
            setTrustConnections(response.connections || []);
        } catch (error) {
            console.error('Error loading trust connections:', error);
        }
    };

    const loadCoins = async () => {
        try {
            const response = await api.getMyCoins();
            // Fallback: if secondsUntilNextCooldown is not available, calculate from minutes
            const secondsUntilNext = response.coins.secondsUntilNextCooldown ??
                (response.coins.minutesUntilNextCooldown ? response.coins.minutesUntilNextCooldown * 60 : null);

            setCoinsData({
                totalCoins: response.coins.totalCoins,
                skyCoins: response.coins.skyCoins || 0,
                lifetimeGiven: response.coins.lifetimeGiven,
                cooldownCoinsAvailable: response.coins.cooldownCoinsAvailable,
                minutesUntilNextCooldown: response.coins.minutesUntilNextCooldown,
                secondsUntilNextCooldown: secondsUntilNext,
                rank: response.coins.rank || 'beginner',
                nextRank: response.coins.nextRank || null,
                coinsToNextRank: response.coins.coinsToNextRank ?? null,
                rankProgress: response.coins.rankProgress || 0,
                rankPercentile: response.coins.rankPercentile || 0
            });
            setUncollectedCount(response.coins.uncollectedCount || 0);
        } catch (error) {
            console.error('Error loading coins:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleClaimCooldown = async () => {
        try {
            const response = await api.claimCooldownCoins();
            // Show celebration animation
            showCelebration(response.coinsClaimed, 'claim');
            // Reload coins after short delay
            setTimeout(loadCoins, 500);
        } catch (error: any) {
            const errorMessage = error.response?.data?.error ||
                                error.response?.data?.message ||
                                error.message ||
                                'Failed to claim coins';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadCoins();
        loadReceivedCoins();
        loadUncollectedCoins();
        loadTrustConnections();
    };

    const handleEncouragementClose = () => {
        setShowEncouragement(false);
        // Refresh data after modal close to pick up collected coins
        loadCoins();
        loadUncollectedCoins();
        loadReceivedCoins();
    };

    const handleTrustConnectionPress = (connection: TrustConnection) => {
        navigation.navigate('FriendshipDetail', {
            otherUserId: connection.otherUser.id,
            otherUsername: connection.otherUser.username,
            otherAvatarUrl: connection.otherUser.avatarUrl,
        });
    };

    const handleProfilePress = (connection: TrustConnection) => {
        // Navigate to Feed stack's UserProfile screen
        navigation.dispatch(
            CommonActions.navigate({
                name: 'Feed',
                params: {
                    screen: 'UserProfile',
                    params: {
                        userId: connection.otherUser.id,
                        username: connection.otherUser.username,
                    },
                },
            })
        );
    };

    const handleMessagePress = (connection: TrustConnection) => {
        // Navigate to Messages tab and open chat with this user
        navigation.dispatch(
            CommonActions.navigate({
                name: 'Messages',
                params: {
                    screen: 'Chat',
                    params: {
                        recipientId: connection.otherUser.id,
                        recipientUsername: connection.otherUser.username,
                        recipientAvatarUrl: connection.otherUser.avatarUrl,
                    },
                },
            })
        );
    };

    const getRankInfo = (rank: string) => {
        const rankData: { [key: string]: {
            color: string;
            gradient: [string, string];
            heroGradient: [string, string, string];
            coinGradient: [string, string, string];
            emoji: string;
            coinEmoji: string;
        } } = {
            beginner: {
                color: '#9CA3AF',
                gradient: ['#E5E7EB', '#D1D5DB'],
                heroGradient: ['#6B7280', '#4B5563', '#374151'],
                coinGradient: ['#E5E7EB', '#D1D5DB', '#9CA3AF'],
                emoji: '🌱',
                coinEmoji: '🌱',
            },
            kind: {
                color: '#60A5FA',
                gradient: ['#BFDBFE', '#93C5FD'],
                heroGradient: ['#3B82F6', '#2563EB', '#1D4ED8'],
                coinGradient: ['#BFDBFE', '#93C5FD', '#60A5FA'],
                emoji: '💙',
                coinEmoji: '🌿',
            },
            generous: {
                color: '#A78BFA',
                gradient: ['#DDD6FE', '#C4B5FD'],
                heroGradient: ['#8B5CF6', '#7C3AED', '#6D28D9'],
                coinGradient: ['#EDE9FE', '#DDD6FE', '#A78BFA'],
                emoji: '💜',
                coinEmoji: '🌸',
            },
            inspirational: {
                color: '#F59E0B',
                gradient: ['#FDE68A', '#FCD34D'],
                heroGradient: ['#F59E0B', '#D97706', '#B45309'],
                coinGradient: ['#FEF3C7', '#FDE68A', '#F59E0B'],
                emoji: '⭐',
                coinEmoji: '🌻',
            },
            legend: {
                color: '#EF4444',
                gradient: ['#FECACA', '#FCA5A5'],
                heroGradient: ['#EF4444', '#DC2626', '#B91C1C'],
                coinGradient: ['#FECACA', '#FCA5A5', '#EF4444'],
                emoji: '🏆',
                coinEmoji: '🌳',
            }
        };
        return rankData[rank] || rankData.beginner;
    };

    const rankInfo = getRankInfo(coinsData.rank);

    return (
        <View style={styles.rootContainer}>
        {/* Segmented Control */}
        <View style={[styles.segmentedControlContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceVariant }]}>
                {/* Sliding pill indicator */}
                <Animated.View
                    style={[
                        styles.segmentedIndicator,
                        {
                            backgroundColor: colors.background,
                            width: SEGMENT_TAB_WIDTH,
                            transform: [{ translateX: segmentIndicatorX }],
                        },
                    ]}
                />
                <TouchableOpacity
                    style={styles.segmentedTab}
                    onPress={() => setActiveTab('wallet')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="wallet-outline" size={14} color={activeTab === 'wallet' ? colors.text.primary : colors.text.secondary} />
                    <Text style={[
                        styles.segmentedTabText,
                        { color: activeTab === 'wallet' ? colors.text.primary : colors.text.secondary },
                        activeTab === 'wallet' && styles.segmentedTabTextActive
                    ]}>Wallet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.segmentedTab}
                    onPress={() => setActiveTab('store')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="storefront-outline" size={14} color={activeTab === 'store' ? colors.text.primary : colors.text.secondary} />
                    <Text style={[
                        styles.segmentedTabText,
                        { color: activeTab === 'store' ? colors.text.primary : colors.text.secondary },
                        activeTab === 'store' && styles.segmentedTabTextActive
                    ]}>Store</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.tabContentContainer}>
        <Animated.View
            style={[styles.tabSlidingContainer, { transform: [{ translateX: contentTranslateX }] }]}
            {...tabPanResponder.panHandlers}
        >
        <View style={styles.tabPage}>
        <ScrollView
            ref={scrollViewRef}
            style={[styles.container, { backgroundColor: colors.surface }]}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text.secondary} />
            }
        >
            {/* ============ HERO SECTION ============ */}
            <View style={[styles.heroWrapper, { backgroundColor: colors.surface }]}>
                {/* Rank-colored half circle accent */}
                <LinearGradient
                    colors={rankInfo.heroGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroArc}
                />

                {/* Main Balance */}
                <View style={styles.heroContent}>
                    <Animated.View style={[styles.coinContainer, { transform: [{ scale: coinPulse }] }]}>
                        <KindnessCoin
                            size={72}
                            rimColors={rankInfo.coinGradient}
                            faceColors={rankInfo.coinGradient}
                        />
                    </Animated.View>

                    <Text style={[styles.balanceAmount, { color: colors.text.primary }]}>
                        {coinsData.totalCoins.toLocaleString()}
                    </Text>
                    <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>Positivity Coins</Text>
                </View>
            </View>

            {/* ============ COINS GIVEN & SKY COINS — SIDE BY SIDE ============ */}
            <View style={styles.panelsRow}>
                {/* Coins Given Panel */}
                <View style={styles.panelCard}>
                    <LinearGradient
                        colors={[rankInfo.heroGradient[0], rankInfo.heroGradient[1], rankInfo.heroGradient[2]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.panelGradient}
                    >
                        <Ionicons name="heart" size={44} color="rgba(255,255,255,0.06)" style={styles.panelDecor1} />

                        {/* Slot 1: Header */}
                        <View style={styles.panelHeader}>
                            <View style={styles.panelIconCircle}>
                                <Ionicons name="heart" size={14} color="#FFF" />
                            </View>
                            <Text style={styles.panelTitle}>Given</Text>
                        </View>

                        {/* Slot 2: Amount */}
                        <Text style={styles.panelAmount}>
                            {coinsData.lifetimeGiven.toLocaleString()}
                        </Text>

                        {/* Slot 3: Badge */}
                        <View style={styles.panelBadgeSlot}>
                            <TouchableOpacity
                                style={styles.panelBadge}
                                onPress={() => navigation.navigate('GiveLeaderboard')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.panelBadgeEmoji}>{rankInfo.emoji}</Text>
                                <Text style={styles.panelBadgeLabel}>
                                    {coinsData.rank.charAt(0).toUpperCase() + coinsData.rank.slice(1)}
                                </Text>
                                <Ionicons name="chevron-forward" size={9} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>

                        {/* Slot 4: Middle info */}
                        <View style={styles.panelMidSlot}>
                            <View style={styles.panelProgressTrack}>
                                <View
                                    style={[
                                        styles.panelProgressFill,
                                        { width: `${Math.min(Math.max(coinsData.rankProgress, 3), 100)}%` }
                                    ]}
                                />
                            </View>
                            {coinsData.nextRank && coinsData.coinsToNextRank !== null ? (
                                <Text style={styles.panelMidText}>
                                    <Text style={{ fontWeight: '800' }}>{coinsData.coinsToNextRank}</Text>
                                    {' '}to {coinsData.nextRank.charAt(0).toUpperCase() + coinsData.nextRank.slice(1)}
                                </Text>
                            ) : (
                                <Text style={styles.panelMidText}>Max rank!</Text>
                            )}
                        </View>

                        {/* Slot 5: Footer pill */}
                        <View style={styles.panelFooterSlot}>
                            <View style={styles.panelStatPill}>
                                <Ionicons name="people" size={10} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.panelStatText}>Top {coinsData.rankPercentile}%</Text>
                            </View>
                        </View>

                        {/* Slot 6: CTA */}
                        <TouchableOpacity
                            style={styles.panelCTA}
                            onPress={() => navigation.dispatch(
                                CommonActions.navigate({ name: 'Feed' })
                            )}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="gift" size={13} color={rankInfo.heroGradient[1]} />
                            <Text style={[styles.panelCTAText, { color: rankInfo.heroGradient[1] }]}>
                                Spread Kindness
                            </Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* Sky Coins Panel */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowEncouragement(true)}
                    style={styles.panelCard}
                >
                    <LinearGradient
                        colors={SKY_COIN_COLORS.cardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.panelGradient}
                    >
                        <Ionicons name="cloud" size={44} color="rgba(255,255,255,0.06)" style={styles.panelDecor1} />

                        {/* Notification badge */}
                        {uncollectedCount > 0 && (
                            <View style={styles.panelNotifBadge}>
                                <Text style={styles.panelNotifText}>
                                    {uncollectedCount > 99 ? '99+' : uncollectedCount}
                                </Text>
                            </View>
                        )}

                        {/* Slot 1: Header */}
                        <View style={styles.panelHeader}>
                            <View style={styles.panelIconCircle}>
                                <SkyCoinIcon size={18} />
                            </View>
                            <Text style={styles.panelTitle}>Sky Coins</Text>
                        </View>

                        {/* Slot 2: Amount */}
                        <Text style={styles.panelAmount}>
                            {coinsData.skyCoins.toLocaleString()}
                        </Text>

                        {/* Slot 3: Badge */}
                        <View style={styles.panelBadgeSlot}>
                            <View style={styles.panelBadge}>
                                <Ionicons name="arrow-down" size={10} color="rgba(255,255,255,0.85)" />
                                <Text style={styles.panelBadgeLabel}>Received</Text>
                            </View>
                        </View>

                        {/* Slot 4: Middle info */}
                        <View style={styles.panelMidSlot}>
                            <Text style={styles.panelMidText}>
                                Earned when others send you coins
                            </Text>
                        </View>

                        {/* Slot 5: Footer pill */}
                        <View style={styles.panelFooterSlot}>
                            <View style={styles.panelStatPill}>
                                <Ionicons name="storefront-outline" size={10} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.panelStatText}>Use in Store</Text>
                            </View>
                        </View>

                        {/* Slot 6: CTA */}
                        <View style={styles.panelCTA}>
                            {uncollectedCount > 0 ? (
                                <>
                                    <Ionicons name="sparkles" size={13} color={SKY_COIN_COLORS.cardGradient[1]} />
                                    <Text style={[styles.panelCTAText, { color: SKY_COIN_COLORS.cardGradient[1] }]}>
                                        Collect {uncollectedCount}
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="basket-outline" size={13} color={SKY_COIN_COLORS.cardGradient[1]} />
                                    <Text style={[styles.panelCTAText, { color: SKY_COIN_COLORS.cardGradient[1] }]}>
                                        Store
                                    </Text>
                                </>
                            )}
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* ============ GET MORE COINS - UNIFIED SECTION ============ */}
            <View style={styles.getCoinsSection}>
                {/* Free Coins Card */}
                <View style={[styles.freeCoinsCard, { backgroundColor: colors.background }]}>
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.freeCoinsGradient}
                    >
                        <View style={styles.freeCoinsLeft}>
                            <View style={[styles.freeCoinsBadge, { backgroundColor: colors.background }]}>
                                <Ionicons name="gift" size={20} color="#10B981" />
                            </View>
                            <View style={styles.freeCoinsInfo}>
                                <Text style={styles.freeCoinsTitle}>Free Coins</Text>
                                <Text style={styles.freeCoinsSubtitle}>
                                    {coinsData.cooldownCoinsAvailable > 0
                                        ? `${coinsData.cooldownCoinsAvailable} ready to claim!`
                                        : 'Regenerates every 3 hours'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.claimButton,
                                { backgroundColor: colors.background },
                                coinsData.cooldownCoinsAvailable === 0 && styles.claimButtonDisabled
                            ]}
                            onPress={handleClaimCooldown}
                            disabled={coinsData.cooldownCoinsAvailable === 0}
                        >
                            {coinsData.cooldownCoinsAvailable > 0 ? (
                                <>
                                    <Ionicons name="sparkles" size={16} color="#10B981" />
                                    <Text style={styles.claimButtonText}>Claim {coinsData.cooldownCoinsAvailable}</Text>
                                </>
                            ) : (
                                <CooldownTimer secondsUntilNext={coinsData.secondsUntilNextCooldown} colors={colors} />
                            )}
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* Coin slots indicator */}
                    <View style={[styles.coinSlots, { backgroundColor: colors.surface }]}>
                        {[0, 1, 2].map((i) => (
                            <View
                                key={i}
                                style={[
                                    styles.coinSlot,
                                    { backgroundColor: colors.border, borderColor: colors.border },
                                    i < coinsData.cooldownCoinsAvailable && styles.coinSlotFilled
                                ]}
                            >
                                {i < coinsData.cooldownCoinsAvailable && (
                                    <Ionicons name="checkmark" size={10} color="#FFF" />
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Earn Options - Compact Row */}
                <View style={styles.earnRow}>
                    <EarnChip
                        icon="create"
                        iconColor="#8B5CF6"
                        iconBg="#EDE9FE"
                        label="Post"
                        reward="+4"
                        colors={colors}
                        onPress={() => navigation.dispatch(
                            CommonActions.navigate({ name: 'CreatePost' })
                        )}
                    />
                    <EarnChip
                        icon="chatbubble"
                        iconColor="#10B981"
                        iconBg="#D1FAE5"
                        label="Comment"
                        reward="+2"
                        colors={colors}
                        onPress={() => navigation.dispatch(
                            CommonActions.navigate({ name: 'Feed' })
                        )}
                    />
                    <EarnChip
                        icon="play"
                        iconColor="#F59E0B"
                        iconBg="#FEF3C7"
                        label="Ad"
                        reward="+5"
                        disabled
                        colors={colors}
                        onPress={() => Alert.alert('Coming Soon', 'Ad rewards feature coming soon!')}
                    />
                </View>
            </View>

            {/* ============ FRIENDSHIP BONDS ============ */}
            {trustConnections.length > 0 && (
                <View style={styles.trustSection}>
                    {/* Compact inline label row */}
                    <View style={styles.trustLabelRow}>
                        <View style={styles.trustLabelAccent} />
                        <Ionicons name="people" size={13} color="#8B5CF6" />
                        <Text style={[styles.trustLabelText, { color: colors.text.secondary }]}>Bonds</Text>
                        {trustConnections.length > 3 && (
                            <TouchableOpacity
                                style={[styles.seeAllBtn, { backgroundColor: colors.surfaceVariant }]}
                                onPress={() => setShowAllTrust(!showAllTrust)}
                            >
                                <Text style={styles.seeAllText}>
                                    {showAllTrust ? 'Less' : `All (${trustConnections.length})`}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {(showAllTrust ? trustConnections : trustConnections.slice(0, 3)).map((connection) => (
                        <TrustConnectionItem
                            key={connection.id}
                            connection={connection}
                            onPress={handleTrustConnectionPress}
                            onMessagePress={handleMessagePress}
                            onProfilePress={handleProfilePress}
                        />
                    ))}
                </View>
            )}

            {/* ============ VIEW ALL ACTIVITY — BOTTOM ============ */}
            <TouchableOpacity
                style={[styles.viewAllActivityBottom, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => navigation.navigate('CoinHistory')}
                activeOpacity={0.7}
            >
                <Ionicons name="receipt-outline" size={16} color="#6366F1" />
                <Text style={styles.viewAllActivityText}>View All Activity</Text>
                <Ionicons name="chevron-forward" size={14} color="#6366F1" />
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />

            <EncouragementModal
                visible={showEncouragement}
                coins={uncollectedCoins}
                onClose={handleEncouragementClose}
            />
        </ScrollView>
        </View>
        <View style={styles.tabPage}>
            <DecorationStoreContent
                skyCoins={coinsData.skyCoins}
                onPurchase={loadCoins}
            />
        </View>
        </Animated.View>
        </View>

        </View>
    );
}

// Earn Chip Component with press animation
function EarnChip({ icon, iconColor, iconBg, label, reward, disabled, onPress, colors }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    label: string;
    reward: string;
    disabled?: boolean;
    onPress: () => void;
    colors: any;
}) {
    const scale = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.93,
            friction: 8,
            tension: 200,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 5,
            tension: 150,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={[styles.earnChip, { transform: [{ scale }], backgroundColor: colors.background, borderColor: colors.border }]}>
            <TouchableOpacity
                style={styles.earnChipInner}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <View style={[styles.earnChipIcon, { backgroundColor: iconBg }]}>
                    <Ionicons name={icon} size={15} color={iconColor} />
                </View>
                <Text style={[styles.earnChipLabel, { color: colors.text.primary }]}>{label}</Text>
                <View style={[styles.earnChipBadge, disabled && [styles.earnChipBadgeDisabled, { backgroundColor: colors.surface }]]}>
                    <Text style={[styles.earnChipReward, disabled && [styles.earnChipRewardDisabled, { color: colors.text.secondary }]]}>{reward}</Text>
                </View>
                <Ionicons
                    name={disabled ? 'lock-closed' : 'chevron-forward'}
                    size={10}
                    color={disabled ? colors.border : colors.text.secondary}
                    style={styles.earnChipArrow}
                />
            </TouchableOpacity>
        </Animated.View>
    );
}

// Cooldown Timer Component
function CooldownTimer({ secondsUntilNext, colors }: { secondsUntilNext: number | null; colors: any }) {
    const [seconds, setSeconds] = React.useState(secondsUntilNext);

    React.useEffect(() => {
        setSeconds(secondsUntilNext);
    }, [secondsUntilNext]);

    React.useEffect(() => {
        if (seconds === null || seconds <= 0) return;
        const interval = setInterval(() => {
            setSeconds(prev => (prev && prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [seconds]);

    const formatTime = (secs: number | null) => {
        if (secs === null || secs <= 0) return '0:00';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.timerContainer}>
            <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
            <Text style={[styles.timerText, { color: colors.text.secondary }]}>{formatTime(seconds)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
    },
    segmentedControlContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    segmentedControl: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 3,
        position: 'relative',
    },
    segmentedIndicator: {
        position: 'absolute',
        top: 3,
        bottom: 3,
        left: 3,
        borderRadius: 17,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentedTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        borderRadius: 17,
        gap: 5,
    },
    segmentedTabText: {
        fontSize: 13,
        fontWeight: '500',
    },
    segmentedTabTextActive: {
        fontWeight: '700',
    },
    tabContentContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    tabSlidingContainer: {
        flexDirection: 'row',
        width: SCREEN_WIDTH * 2,
        height: '100%',
    },
    tabPage: {
        width: SCREEN_WIDTH,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20
    },

    // ============ HERO SECTION ============
    heroWrapper: {
        paddingBottom: 8,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    heroArc: {
        position: 'absolute',
        top: 0,
        left: -SCREEN_WIDTH * 0.25,
        width: SCREEN_WIDTH * 1.5,
        height: SCREEN_WIDTH * 0.6,
        borderBottomLeftRadius: SCREEN_WIDTH * 0.6,
        borderBottomRightRadius: SCREEN_WIDTH * 0.6,
        opacity: 0.12,
    },
    heroContent: {
        alignItems: 'center',
        paddingTop: 32,
    },
    coinContainer: {
        marginBottom: 10,
    },
    balanceAmount: {
        fontSize: 40,
        fontWeight: '800',
        marginBottom: 2,
    },
    balanceLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    // ============ SIDE-BY-SIDE PANELS ============
    panelsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 14,
    },
    panelCard: {
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    panelGradient: {
        padding: 14,
        borderRadius: 18,
        overflow: 'hidden',
    },
    panelDecor1: {
        position: 'absolute',
        top: -6,
        right: -6,
    },
    // Slot 1: Header row
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
        gap: 7,
        marginBottom: 10,
    },
    panelIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    panelTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
    },
    // Slot 2: Amount
    panelAmount: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
        height: 30,
        lineHeight: 30,
        marginBottom: 8,
    },
    // Slot 3: Badge
    panelBadgeSlot: {
        height: 26,
        marginBottom: 10,
    },
    panelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.18)',
        height: 26,
        paddingHorizontal: 9,
        borderRadius: 13,
        gap: 4,
    },
    panelBadgeEmoji: {
        fontSize: 11,
    },
    panelBadgeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFF',
    },
    // Slot 4: Middle info (progress bar or description)
    panelMidSlot: {
        height: 34,
        marginBottom: 10,
        justifyContent: 'center',
    },
    panelProgressTrack: {
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
        marginBottom: 6,
    },
    panelProgressFill: {
        height: '100%',
        borderRadius: 2.5,
        backgroundColor: 'rgba(255,255,255,0.85)',
    },
    panelMidText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 14,
    },
    // Slot 5: Footer stat pill
    panelFooterSlot: {
        height: 22,
        marginBottom: 10,
    },
    panelStatPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.12)',
        height: 22,
        paddingHorizontal: 8,
        borderRadius: 11,
        gap: 4,
    },
    panelStatText: {
        fontSize: 10,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
    },
    // Slot 6: CTA button
    panelCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        height: 34,
        borderRadius: 12,
        gap: 5,
    },
    panelCTAText: {
        fontSize: 12,
        fontWeight: '800',
    },
    panelNotifBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#EF4444',
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: '#FFF',
        zIndex: 10,
    },
    panelNotifText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FFF',
    },
    // ============ SECTION STYLES ============
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8
    },
    sectionIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
    },
    seeAllBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#3B82F6'
    },

    // ============ GET MORE COINS SECTION ============
    getCoinsSection: {
        marginTop: 0,
        marginHorizontal: 16
    },
    freeCoinsCard: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4
    },
    freeCoinsGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12
    },
    freeCoinsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    freeCoinsBadge: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    freeCoinsInfo: {
        flex: 1
    },
    freeCoinsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 1
    },
    freeCoinsSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)'
    },
    claimButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 5
    },
    claimButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    claimButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981'
    },
    coinSlots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    coinSlot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    coinSlotFilled: {
        backgroundColor: '#10B981',
        borderColor: '#059669'
    },
    earnRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    earnChip: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    earnChipInner: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        gap: 4,
    },
    earnChipIcon: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    earnChipLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    earnChipBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    earnChipBadgeDisabled: {
    },
    earnChipReward: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981',
    },
    earnChipRewardDisabled: {
    },
    earnChipArrow: {
        position: 'absolute',
        top: 6,
        right: 6,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    timerText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // ============ VIEW ALL ACTIVITY (bottom) ============
    viewAllActivityBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        marginHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 6,
    },
    viewAllActivityText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },

    // ============ TRUST SECTION ============
    trustSection: {
        marginTop: 14,
        marginHorizontal: 16,
    },
    trustLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 5,
    },
    trustLabelAccent: {
        width: 3,
        height: 14,
        borderRadius: 1.5,
        backgroundColor: '#8B5CF6',
    },
    trustLabelText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },

    bottomSpacer: {
        height: 30
    },

});
