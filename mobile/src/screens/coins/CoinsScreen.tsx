import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Easing
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
        rank: 'beginner'
    });
    const [receivedCoins, setReceivedCoins] = useState<ReceivedCoin[]>([]);
    const [uncollectedCoins, setUncollectedCoins] = useState<ReceivedCoin[]>([]);
    const [uncollectedCount, setUncollectedCount] = useState(0);
    const [trustConnections, setTrustConnections] = useState<TrustConnection[]>([]);
    const [showAllTrust, setShowAllTrust] = useState(false);
    const [showEncouragement, setShowEncouragement] = useState(false);
    const [activeTab, setActiveTab] = useState<'wallet' | 'store'>('wallet');

    // Coin celebration hook
    const { showCelebration } = useCoinCelebration();

    // Rainbow animation for encouragement button
    const [rainbowIndex, setRainbowIndex] = useState(0);
    const RAINBOW_COLORS: [string, string, string][] = [
        ['#EF4444', '#F97316', '#FBBF24'],
        ['#F97316', '#FBBF24', '#22C55E'],
        ['#FBBF24', '#22C55E', '#3B82F6'],
        ['#22C55E', '#3B82F6', '#8B5CF6'],
        ['#3B82F6', '#8B5CF6', '#EC4899'],
        ['#8B5CF6', '#EC4899', '#EF4444'],
        ['#EC4899', '#EF4444', '#F97316'],
    ];

    // Animations for hero section
    const coinPulse = useRef(new Animated.Value(1)).current;
    const rankGlow = useRef(new Animated.Value(0)).current;

    // Wind blast — explodes from Sky Coins and hits you in the face
    const WIND_COUNT = 32;
    const [windActive, setWindActive] = useState(false);
    const windParticles = useRef(
        Array.from({ length: WIND_COUNT }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(0),
            rotate: new Animated.Value(0),
            scale: new Animated.Value(0.1),
        }))
    ).current;
    const windFlash = useRef(new Animated.Value(0)).current;
    const RING_COUNT = 4;
    const windRings = useRef(
        Array.from({ length: RING_COUNT }, () => ({
            scale: new Animated.Value(0),
            opacity: new Animated.Value(0),
        }))
    ).current;

    const triggerWind = useCallback(() => {
        if (windActive) return;
        setWindActive(true);

        const { height: SCREEN_HEIGHT } = Dimensions.get('window');
        const originX = SCREEN_WIDTH / 2;
        const originY = SCREEN_HEIGHT * 0.32;

        // Reset rings
        windRings.forEach(r => {
            r.scale.setValue(0);
            r.opacity.setValue(0);
        });

        // Expanding rings — ripple outward from center
        const ringAnimations = windRings.map((r, i) => {
            const ringDelay = i * 180;
            const peakOpacity = 0.4 - i * 0.07;
            return Animated.sequence([
                Animated.delay(ringDelay),
                Animated.parallel([
                    Animated.timing(r.scale, {
                        toValue: 1,
                        duration: 1100,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(r.opacity, {
                            toValue: peakOpacity,
                            duration: 180,
                            useNativeDriver: true,
                        }),
                        Animated.timing(r.opacity, {
                            toValue: 0,
                            duration: 920,
                            easing: Easing.in(Easing.quad),
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]);
        });

        // Soft center glow
        windFlash.setValue(0);
        const flashAnim = Animated.sequence([
            Animated.timing(windFlash, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(windFlash, {
                toValue: 0,
                duration: 1000,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
        ]);

        // Wind particles — flow outward in 3 progressive waves
        const particleAnimations = windParticles.map((p, i) => {
            const baseAngle = (i / WIND_COUNT) * Math.PI * 2;
            const angle = baseAngle + (Math.random() - 0.5) * 0.4;

            // Wave grouping: inner → mid → outer
            const wave = Math.floor(i / (WIND_COUNT / 3));
            const dist = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * (0.4 + wave * 0.3 + Math.random() * 0.2);

            const endX = originX + Math.cos(angle) * dist;
            const endY = originY + Math.sin(angle) * dist;

            p.x.setValue(originX);
            p.y.setValue(originY);
            p.opacity.setValue(0);
            p.rotate.setValue(0);
            p.scale.setValue(0.2);

            // Each wave flows out after the previous
            const waveDelay = wave * 200;
            const delay = waveDelay + Math.random() * 100;
            const duration = 900 + Math.random() * 400;
            const peakOpacity = 0.55 - wave * 0.08 + Math.random() * 0.15;
            const endScale = 1.2 + wave * 0.6 + Math.random() * 0.8;

            return Animated.parallel([
                // Opacity: fade in, hold briefly, fade out
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(p.opacity, {
                        toValue: peakOpacity,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.delay(duration * 0.15),
                    Animated.timing(p.opacity, {
                        toValue: 0,
                        duration: duration * 0.7,
                        useNativeDriver: true,
                    }),
                ]),
                // X: smooth flow outward
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(p.x, {
                        toValue: endX,
                        duration,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]),
                // Y: smooth flow outward
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(p.y, {
                        toValue: endY,
                        duration,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]),
                // Scale: grow as it flows out
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(p.scale, {
                        toValue: endScale,
                        duration: duration * 0.85,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]),
                // Gentle rotation
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(p.rotate, {
                        toValue: (Math.random() - 0.5) * 3,
                        duration,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                ]),
            ]);
        });

        Animated.parallel([
            flashAnim,
            ...ringAnimations,
            ...particleAnimations,
        ]).start(() => setWindActive(false));
    }, [windActive]);

    useEffect(() => {
        loadCoins();
        loadReceivedCoins();
        loadUncollectedCoins();
        loadTrustConnections();

        // Refresh every minute to update cooldown timer
        const interval = setInterval(loadCoins, 60000);
        return () => clearInterval(interval);
    }, []);

    // Rainbow cycling effect when uncollected coins exist
    useEffect(() => {
        if (uncollectedCount === 0) return;
        const interval = setInterval(() => {
            setRainbowIndex(prev => (prev + 1) % RAINBOW_COLORS.length);
        }, 600);
        return () => clearInterval(interval);
    }, [uncollectedCount]);

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

        // Rank glow animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(rankGlow, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(rankGlow, {
                    toValue: 0,
                    duration: 2000,
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
                rank: response.coins.rank || 'beginner'
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
                <TouchableOpacity
                    style={[
                        styles.segmentedTab,
                        activeTab === 'wallet' && [styles.segmentedTabActive, { backgroundColor: colors.background }]
                    ]}
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
                    style={[
                        styles.segmentedTab,
                        activeTab === 'store' && [styles.segmentedTabActive, { backgroundColor: colors.background }]
                    ]}
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

        {activeTab === 'store' ? (
            <DecorationStoreContent
                skyCoins={coinsData.skyCoins}
                onPurchase={loadCoins}
            />
        ) : (
        <ScrollView
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

                    {/* Sky Coins Display */}
                    <TouchableOpacity activeOpacity={0.85} onPress={triggerWind} style={styles.skyCoinsCard}>
                        <LinearGradient
                            colors={SKY_COIN_COLORS.cardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.skyCoinsGradientFill}
                        >
                            {/* Decorative clouds */}
                            <Ionicons name="cloud" size={50} color="rgba(255,255,255,0.08)" style={styles.skyCloud1} />
                            <Ionicons name="cloud" size={32} color="rgba(255,255,255,0.06)" style={styles.skyCloud2} />
                            <Ionicons name="cloud" size={40} color="rgba(255,255,255,0.07)" style={styles.skyCloud3} />

                            {/* Sparkle accents */}
                            <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.25)" style={styles.skySpark1} />
                            <Ionicons name="sparkles" size={10} color="rgba(255,255,255,0.2)" style={styles.skySpark2} />

                            <View style={styles.skyCoinsContent}>
                                <View style={styles.skyCoinIconWrap}>
                                    <View style={styles.skyCoinGlow} />
                                    <SkyCoinIcon size={48} />
                                </View>
                                <View style={styles.skyCoinsTextBlock}>
                                    <Text style={styles.skyCoinsAmount}>
                                        {coinsData.skyCoins.toLocaleString()}
                                    </Text>
                                    <Text style={styles.skyCoinsLabel}>Sky Coins</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Stats Row */}
                    <View style={[styles.heroStatsRow, { backgroundColor: colors.background }]}>
                        <View style={styles.heroStatHalf}>
                            <Text style={[styles.heroStatValue, { color: colors.text.primary }]}>{coinsData.lifetimeGiven}</Text>
                            <Text style={[styles.heroStatLabel, { color: colors.text.secondary }]}>Given</Text>
                        </View>
                        <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity style={styles.heroStatHalf} onPress={() => navigation.navigate('GiveLeaderboard')}>
                            <View style={[styles.rankDotInline, { backgroundColor: rankInfo.heroGradient[0] }]} />
                            <Text style={[styles.heroStatValue, { color: colors.text.primary }]}>
                                {coinsData.rank.charAt(0).toUpperCase() + coinsData.rank.slice(1)}
                            </Text>
                            <Ionicons name="chevron-forward" size={11} color={colors.text.secondary} />
                        </TouchableOpacity>
                    </View>
                </View>
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

            {/* ============ KINDNESS RECEIVED + TRANSACTION HISTORY ============ */}
            <View style={[styles.receivedSection, { backgroundColor: colors.background }]}>
                <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="heart" size={16} color="#EF4444" />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Kindness Received</Text>
                </View>

                {uncollectedCount > 0 ? (
                    <TouchableOpacity
                        style={styles.encouragementButton}
                        onPress={() => setShowEncouragement(true)}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={RAINBOW_COLORS[rainbowIndex]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.encouragementGradient}
                        >
                            <Ionicons name="heart" size={16} color="#FFF" />
                            <Text style={styles.encouragementButtonText}>
                                View Encouragement ({uncollectedCount})
                            </Text>
                            <Ionicons name="sparkles" size={16} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.emptyReceived}>
                        <Ionicons name="gift-outline" size={24} color={colors.border} />
                        <Text style={[styles.emptyReceivedText, { color: colors.text.secondary }]}>No uncollected coins</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.viewAllActivityBtn, { borderTopColor: colors.surfaceVariant }]}
                    onPress={() => navigation.navigate('CoinHistory')}
                >
                    <Ionicons name="receipt-outline" size={16} color="#6366F1" />
                    <Text style={styles.viewAllActivityText}>View All Activity</Text>
                    <Ionicons name="chevron-forward" size={14} color="#6366F1" />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacer} />

            <EncouragementModal
                visible={showEncouragement}
                coins={uncollectedCoins}
                onClose={handleEncouragementClose}
            />
        </ScrollView>
        )}

        {/* Wind expanding overlay */}
        {windActive && (
            <View style={styles.windOverlay} pointerEvents="none">
                {/* Soft center glow */}
                <Animated.View style={[
                    styles.windFlash,
                    { opacity: windFlash.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.2],
                    })},
                ]}>
                    <View style={styles.windRadialCenter}>
                        <View style={styles.windRadialGlow} />
                    </View>
                </Animated.View>

                {/* Expanding rings — ripple outward from Sky Coins */}
                {windRings.map((r, i) => {
                    const screenH = Dimensions.get('window').height;
                    const ringSize = Math.max(SCREEN_WIDTH, screenH) * 1.6;
                    return (
                        <Animated.View
                            key={`ring-${i}`}
                            style={[
                                styles.windRing,
                                {
                                    width: ringSize,
                                    height: ringSize,
                                    borderRadius: ringSize / 2,
                                    left: SCREEN_WIDTH / 2 - ringSize / 2,
                                    top: screenH * 0.32 - ringSize / 2,
                                    opacity: r.opacity,
                                    transform: [{ scale: r.scale }],
                                    borderWidth: 2.5 - i * 0.4,
                                },
                            ]}
                        />
                    );
                })}

                {/* Wind particles — flowing outward in waves */}
                {windParticles.map((p, i) => {
                    const angle = (i / WIND_COUNT) * Math.PI * 2 + (i % 3) * 0.12;
                    const angleDeg = angle * 180 / Math.PI;
                    const icons: Array<keyof typeof Ionicons.glyphMap> = [
                        'reorder-three-outline', 'reorder-two-outline', 'remove-outline',
                    ];
                    const icon = icons[i % 3];
                    const size = 20 + (i % 4) * 4;
                    const alpha = 0.4 + (i % 3) * 0.1;
                    const color = i % 3 === 0
                        ? `rgba(255,255,255,${alpha})`
                        : i % 3 === 1
                        ? `rgba(186,230,253,${alpha})`
                        : `rgba(224,242,254,${alpha})`;

                    return (
                        <Animated.View
                            key={`p-${i}`}
                            style={[
                                styles.windParticle,
                                {
                                    opacity: p.opacity,
                                    transform: [
                                        { translateX: p.x },
                                        { translateY: p.y },
                                        { scale: p.scale },
                                        { rotate: `${angleDeg}deg` },
                                    ],
                                },
                            ]}
                        >
                            <Ionicons name={icon} size={size} color={color} />
                        </Animated.View>
                    );
                })}
            </View>
        )}
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
    segmentedTabActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentedTabText: {
        fontSize: 13,
        fontWeight: '500',
    },
    segmentedTabTextActive: {
        fontWeight: '700',
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20
    },

    // ============ HERO SECTION ============
    heroWrapper: {
        paddingBottom: 16,
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
        marginBottom: 12,
    },
    // ============ SKY COINS ============
    skyCoinsCard: {
        width: SCREEN_WIDTH - 60,
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 14,
        shadowColor: SKY_COIN_COLORS.deepDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    skyCoinsGradientFill: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    skyCloud1: {
        position: 'absolute',
        top: -8,
        right: 10,
    },
    skyCloud2: {
        position: 'absolute',
        bottom: -4,
        left: 16,
    },
    skyCloud3: {
        position: 'absolute',
        top: 4,
        left: -6,
    },
    skySpark1: {
        position: 'absolute',
        top: 10,
        right: 50,
    },
    skySpark2: {
        position: 'absolute',
        bottom: 12,
        right: 24,
    },
    skyCoinsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 22,
        gap: 16,
    },
    skyCoinIconWrap: {
        position: 'relative',
    },
    skyCoinGlow: {
        position: 'absolute',
        top: -6,
        left: -6,
        right: -6,
        bottom: -6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    skyCoinsTextBlock: {
        alignItems: 'flex-start',
    },
    skyCoinsAmount: {
        fontSize: 30,
        fontWeight: '800',
        color: '#FFF',
    },
    skyCoinsLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginTop: -1,
    },
    heroStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: SCREEN_WIDTH - 60,
        borderRadius: 14,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    heroStatHalf: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    heroStatValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    heroStatLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    heroStatDivider: {
        width: StyleSheet.hairlineWidth,
        height: 24,
    },
    rankDotInline: {
        width: 8,
        height: 8,
        borderRadius: 4,
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
        marginTop: 8,
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

    // ============ ENCOURAGEMENT BUTTON ============
    encouragementButton: {
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
    },
    encouragementGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        gap: 8,
    },
    encouragementButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },

    // ============ RECEIVED SECTION ============
    receivedSection: {
        marginTop: 14,
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3
    },

    emptyReceived: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 6,
    },
    emptyReceivedText: {
        fontSize: 13,
        fontWeight: '500',
    },
    viewAllActivityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginTop: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 5,
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

    // ============ WIND EFFECT ============
    windOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
    },
    windFlash: {
        ...StyleSheet.absoluteFillObject,
    },
    windRadialCenter: {
        position: 'absolute',
        top: '32%',
        left: '50%',
        marginLeft: -100,
        marginTop: -100,
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    windRadialGlow: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(56,189,248,0.4)',
    },
    windRing: {
        position: 'absolute',
        borderColor: 'rgba(125,211,252,0.4)',
        backgroundColor: 'rgba(56,189,248,0.04)',
    },
    windParticle: {
        position: 'absolute',
    },
});
