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
    PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { api } from '../../services/api';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import { Ionicons } from '@expo/vector-icons';
import KindnessCoin from '../../components/coins/KindnessCoin';
import SkyCoinIcon, { SKY_COIN_COLORS } from '../../components/coins/SkyCoinIcon';
import EncouragementModal from '../../components/coins/EncouragementModal';
import DecorationStoreContent from '../../components/DecorationStoreContent';
import OnboardingMissions from '../../components/coins/OnboardingMissions';
import CoinsPageGuide from '../../components/coins/CoinsPageGuide';
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
    const [showEncouragement, setShowEncouragement] = useState(false);
    const [activeTab, setActiveTab] = useState<'wallet' | 'store'>('wallet');
    const [showGuide, setShowGuide] = useState(false);

    // Guide refs for each highlightable component
    const rootRef = useRef<View>(null);
    const guideTabsRef = useRef<View>(null);
    const guideBalanceRef = useRef<View>(null);
    const guideGivenRef = useRef<View>(null);
    const guideSkyRef = useRef<View>(null);
    const guideFreeRef = useRef<View>(null);
    const guideEarnRef = useRef<View>(null);
    const guideHistoryRef = useRef<View>(null);

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
                    targetIndex = vx < 0
                        ? Math.min(1, currentIndexRef.current + 1)
                        : Math.max(0, currentIndexRef.current - 1);
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

                const tabs: ('wallet' | 'store')[] = ['wallet', 'store'];
                const newTab = tabs[targetIndex];
                if (newTab !== activeTabRef.current) {
                    setActiveTab(newTab);
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

    // Sky panel playful animations
    const skyCloud1X = useRef(new Animated.Value(-20)).current;
    const skyCloud2X = useRef(new Animated.Value(15)).current;
    const skySparkle1 = useRef(new Animated.Value(0.2)).current;
    const skySparkle2 = useRef(new Animated.Value(0.6)).current;

    // Hero section decorative animations
    const heroHeart1Y = useRef(new Animated.Value(0)).current;
    const heroHeart1Opacity = useRef(new Animated.Value(0)).current;
    const heroHeart2Y = useRef(new Animated.Value(0)).current;
    const heroHeart2Opacity = useRef(new Animated.Value(0)).current;
    const heroSparkle1 = useRef(new Animated.Value(0.15)).current;
    const heroSparkle2 = useRef(new Animated.Value(0.4)).current;
    const heroRingScale = useRef(new Animated.Value(1)).current;
    const heroRingOpacity = useRef(new Animated.Value(0.3)).current;
    const heroStarRotate = useRef(new Animated.Value(0)).current;

    // Free Coins card animations
    const freeGiftBounce = useRef(new Animated.Value(0)).current;
    const freeShimmerX = useRef(new Animated.Value(-60)).current;
    const freeSparkleOpacity = useRef(new Animated.Value(0)).current;
    const freeSlotGlow = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        loadCoins();
        loadReceivedCoins();
        loadUncollectedCoins();

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

        // Hero floating hearts — rise up and fade out
        Animated.loop(
            Animated.sequence([
                // Reset
                Animated.parallel([
                    Animated.timing(heroHeart1Y, { toValue: 0, duration: 1, useNativeDriver: true }),
                    Animated.timing(heroHeart1Opacity, { toValue: 0, duration: 1, useNativeDriver: true }),
                ]),
                // Float up and fade in then out
                Animated.parallel([
                    Animated.timing(heroHeart1Y, { toValue: -30, duration: 2500, useNativeDriver: true }),
                    Animated.sequence([
                        Animated.timing(heroHeart1Opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
                        Animated.timing(heroHeart1Opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
                        Animated.timing(heroHeart1Opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
                    ]),
                ]),
                // Rest
                Animated.timing(heroHeart1Y, { toValue: -30, duration: 3000, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                // Offset start
                Animated.timing(heroHeart2Y, { toValue: 0, duration: 2000, useNativeDriver: true }),
                // Reset
                Animated.parallel([
                    Animated.timing(heroHeart2Y, { toValue: 0, duration: 1, useNativeDriver: true }),
                    Animated.timing(heroHeart2Opacity, { toValue: 0, duration: 1, useNativeDriver: true }),
                ]),
                // Float up
                Animated.parallel([
                    Animated.timing(heroHeart2Y, { toValue: -25, duration: 2200, useNativeDriver: true }),
                    Animated.sequence([
                        Animated.timing(heroHeart2Opacity, { toValue: 0.5, duration: 500, useNativeDriver: true }),
                        Animated.timing(heroHeart2Opacity, { toValue: 0.5, duration: 900, useNativeDriver: true }),
                        Animated.timing(heroHeart2Opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
                    ]),
                ]),
                // Rest
                Animated.timing(heroHeart2Y, { toValue: -25, duration: 2500, useNativeDriver: true }),
            ])
        ).start();

        // Hero sparkle twinkles
        Animated.loop(
            Animated.sequence([
                Animated.timing(heroSparkle1, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
                Animated.timing(heroSparkle1, { toValue: 0.1, duration: 1000, useNativeDriver: true }),
                Animated.timing(heroSparkle1, { toValue: 0.1, duration: 1500, useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(heroSparkle2, { toValue: 0.8, duration: 1300, useNativeDriver: true }),
                Animated.timing(heroSparkle2, { toValue: 0.15, duration: 1300, useNativeDriver: true }),
                Animated.timing(heroSparkle2, { toValue: 0.15, duration: 2000, useNativeDriver: true }),
            ])
        ).start();

        // Hero ring pulse behind the coin
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(heroRingScale, { toValue: 1.35, duration: 2000, useNativeDriver: true }),
                    Animated.timing(heroRingOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
                ]),
                // Reset
                Animated.parallel([
                    Animated.timing(heroRingScale, { toValue: 1, duration: 1, useNativeDriver: true }),
                    Animated.timing(heroRingOpacity, { toValue: 0.3, duration: 1, useNativeDriver: true }),
                ]),
                // Pause
                Animated.timing(heroRingScale, { toValue: 1, duration: 2500, useNativeDriver: true }),
            ])
        ).start();

        // Hero decorative star slow rotation
        Animated.loop(
            Animated.timing(heroStarRotate, {
                toValue: 1,
                duration: 12000,
                useNativeDriver: true,
            })
        ).start();

        // Sky panel cloud drift animations
        Animated.loop(
            Animated.sequence([
                Animated.timing(skyCloud1X, {
                    toValue: 20,
                    duration: 4000,
                    useNativeDriver: true,
                }),
                Animated.timing(skyCloud1X, {
                    toValue: -20,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(skyCloud2X, {
                    toValue: -18,
                    duration: 5500,
                    useNativeDriver: true,
                }),
                Animated.timing(skyCloud2X, {
                    toValue: 15,
                    duration: 5500,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Sky panel sparkle twinkle animations
        Animated.loop(
            Animated.sequence([
                Animated.timing(skySparkle1, {
                    toValue: 0.8,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(skySparkle1, {
                    toValue: 0.15,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(skySparkle2, {
                    toValue: 0.9,
                    duration: 1800,
                    useNativeDriver: true,
                }),
                Animated.timing(skySparkle2, {
                    toValue: 0.2,
                    duration: 1800,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Free Coins gift icon — single bounce then long rest
        Animated.loop(
            Animated.sequence([
                Animated.timing(freeGiftBounce, {
                    toValue: -5,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(freeGiftBounce, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
                // Rest for ~4 seconds before next bounce
                Animated.timing(freeGiftBounce, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Free Coins shimmer sweep
        Animated.loop(
            Animated.sequence([
                Animated.timing(freeShimmerX, {
                    toValue: SCREEN_WIDTH + 60,
                    duration: 2500,
                    useNativeDriver: true,
                }),
                // Pause before next sweep
                Animated.timing(freeShimmerX, {
                    toValue: SCREEN_WIDTH + 60,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                // Snap back
                Animated.timing(freeShimmerX, {
                    toValue: -60,
                    duration: 1,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Free Coins sparkle pop
        Animated.loop(
            Animated.sequence([
                Animated.timing(freeSparkleOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(freeSparkleOpacity, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                }),
                // Rest
                Animated.timing(freeSparkleOpacity, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Coin slot glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(freeSlotGlow, {
                    toValue: 1.25,
                    duration: 900,
                    useNativeDriver: true,
                }),
                Animated.timing(freeSlotGlow, {
                    toValue: 1,
                    duration: 900,
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
    };

    const handleStartGuide = () => {
        setActiveTab('wallet');
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        setTimeout(() => setShowGuide(true), 100);
    };

    // Update header right button
    useEffect(() => {
        navigation.setOptions({
            title: 'Positivity Coins',
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleStartGuide}
                    activeOpacity={0.7}
                    style={styles.headerHelpButton}
                >
                    <Ionicons name="help-circle-outline" size={24} color={colors.text.secondary} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, colors]);

    const handleEncouragementClose = () => {
        setShowEncouragement(false);
        // Refresh data after modal close to pick up collected coins
        loadCoins();
        loadUncollectedCoins();
        loadReceivedCoins();
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
        <View ref={rootRef} style={styles.rootContainer}>
        {/* Segmented Control */}
        <View style={[styles.segmentedControlContainer, { backgroundColor: colors.surface }]}>
            <View ref={guideTabsRef} collapsable={false} style={[styles.segmentedControl, { backgroundColor: colors.surfaceVariant }]}>
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
            scrollEnabled={!showGuide}
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

                {/* Decorative floating hearts */}
                <Animated.View style={[styles.heroFloatHeart1, { transform: [{ translateY: heroHeart1Y }], opacity: heroHeart1Opacity }]} pointerEvents="none">
                    <Ionicons name="heart" size={14} color={rankInfo.heroGradient[1]} />
                </Animated.View>
                <Animated.View style={[styles.heroFloatHeart2, { transform: [{ translateY: heroHeart2Y }], opacity: heroHeart2Opacity }]} pointerEvents="none">
                    <Ionicons name="heart" size={10} color={rankInfo.heroGradient[0]} />
                </Animated.View>

                {/* Twinkling sparkles */}
                <Animated.View style={[styles.heroSparkle1, { opacity: heroSparkle1 }]} pointerEvents="none">
                    <Ionicons name="sparkles" size={14} color={rankInfo.heroGradient[1]} />
                </Animated.View>
                <Animated.View style={[styles.heroSparkle2, { opacity: heroSparkle2 }]} pointerEvents="none">
                    <Ionicons name="star" size={10} color={rankInfo.heroGradient[0]} />
                </Animated.View>

                {/* Slowly rotating decorative star */}
                <Animated.View style={[styles.heroRotatingStar, { transform: [{ rotate: heroStarRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]} pointerEvents="none">
                    <Ionicons name="star-outline" size={18} color={rankInfo.heroGradient[2] + '20'} />
                </Animated.View>

                {/* Main Balance */}
                <View ref={guideBalanceRef} collapsable={false} style={styles.heroContent}>
                    {/* Expanding ring pulse behind coin */}
                    <Animated.View style={[styles.heroRingPulse, {
                        borderColor: rankInfo.heroGradient[1],
                        transform: [{ scale: heroRingScale }],
                        opacity: heroRingOpacity,
                    }]} pointerEvents="none" />

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

                {/* ============ COINS GIVEN & SKY COINS — SIDE BY SIDE ============ */}
                <View style={styles.panelsRow}>
                {/* Coins Given Panel */}
                <View ref={guideGivenRef} collapsable={false} style={styles.panelCard}>
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
                <View ref={guideSkyRef} collapsable={false} style={styles.panelCard}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setShowEncouragement(true)}
                    style={{ flex: 1 }}
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

                        {/* Slot 5+6: Animated sky scene or Collect CTA */}
                        {uncollectedCount > 0 ? (
                            <View style={{ marginTop: 4 }}>
                                <View style={styles.panelCTA}>
                                    <Ionicons name="sparkles" size={13} color={SKY_COIN_COLORS.cardGradient[1]} />
                                    <Text style={[styles.panelCTAText, { color: SKY_COIN_COLORS.cardGradient[1] }]}>
                                        Collect {uncollectedCount}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.skyAnimContainer}>
                                <View style={styles.skyAnimScene}>
                                    {/* Floating clouds */}
                                    <Animated.View style={[styles.skyCloudLeft, { transform: [{ translateX: skyCloud1X }] }]}>
                                        <Ionicons name="cloud" size={18} color="rgba(255,255,255,0.25)" />
                                    </Animated.View>
                                    <Animated.View style={[styles.skyCloudRight, { transform: [{ translateX: skyCloud2X }] }]}>
                                        <Ionicons name="cloud" size={13} color="rgba(255,255,255,0.18)" />
                                    </Animated.View>
                                    {/* Twinkling sparkles */}
                                    <Animated.View style={[styles.skyStar1, { opacity: skySparkle1 }]}>
                                        <Ionicons name="sparkles" size={10} color="rgba(255,255,255,0.6)" />
                                    </Animated.View>
                                    <Animated.View style={[styles.skyStar2, { opacity: skySparkle2 }]}>
                                        <Ionicons name="star" size={8} color="rgba(255,255,255,0.5)" />
                                    </Animated.View>
                                </View>
                                <Text style={styles.skyAnimText}>Kindness fills your sky</Text>
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
                </View>
                </View>

                {/* ============ ONBOARDING MISSIONS (inside hero) ============ */}
                <OnboardingMissions onClaimed={() => loadCoins()} />
            </View>

            {/* ============ GET MORE COINS - UNIFIED SECTION ============ */}
            <View style={styles.getCoinsSection}>
                {/* Free Coins Card */}
                <View ref={guideFreeRef} collapsable={false} style={[styles.freeCoinsCard, { backgroundColor: colors.background }]}>
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.freeCoinsGradient}
                    >
                        {/* Shimmer sweep overlay */}
                        <Animated.View
                            style={[styles.freeShimmer, { transform: [{ translateX: freeShimmerX }] }]}
                            pointerEvents="none"
                        />

                        {/* Floating sparkle accent */}
                        <Animated.View style={[styles.freeFloatingSparkle, { opacity: freeSparkleOpacity }]} pointerEvents="none">
                            <Ionicons name="sparkles" size={16} color="#6EE7B7" />
                        </Animated.View>

                        <View style={styles.freeCoinsLeft}>
                            <Animated.View style={[styles.freeCoinsBadge, { backgroundColor: colors.background, transform: [{ translateY: freeGiftBounce }] }]}>
                                <Ionicons name="gift" size={20} color="#10B981" />
                            </Animated.View>
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
                            <Animated.View
                                key={i}
                                style={[
                                    styles.coinSlot,
                                    { backgroundColor: colors.border, borderColor: colors.border },
                                    i < coinsData.cooldownCoinsAvailable && styles.coinSlotFilled,
                                    i < coinsData.cooldownCoinsAvailable && { transform: [{ scale: freeSlotGlow }] }
                                ]}
                            >
                                {i < coinsData.cooldownCoinsAvailable && (
                                    <Ionicons name="checkmark" size={10} color="#FFF" />
                                )}
                            </Animated.View>
                        ))}
                    </View>
                </View>

                {/* Earn Options - Compact Row */}
                <View ref={guideEarnRef} collapsable={false} style={styles.earnRow}>
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

            {/* ============ VIEW ALL ACTIVITY — BOTTOM ============ */}
            <View ref={guideHistoryRef} collapsable={false}>
            <TouchableOpacity
                style={[styles.viewAllActivityBottom, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => navigation.navigate('CoinHistory')}
                activeOpacity={0.7}
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
        </View>
        <View style={styles.tabPage}>
            <DecorationStoreContent
                skyCoins={coinsData.skyCoins}
                onPurchase={loadCoins}
            />
        </View>
        </Animated.View>
        </View>

        <CoinsPageGuide
            visible={showGuide}
            onClose={() => setShowGuide(false)}
            refs={{
                tabs: guideTabsRef,
                balance: guideBalanceRef,
                given: guideGivenRef,
                sky: guideSkyRef,
                free: guideFreeRef,
                earn: guideEarnRef,
                history: guideHistoryRef,
            }}
            scrollRef={scrollViewRef}
            rootRef={rootRef}
        />

        </View>
    );
}

// Earn Chip Component with wiggle + glow animations
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
    const iconRotate = React.useRef(new Animated.Value(0)).current;
    const iconGlow = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (!disabled) {
            // Icon wiggle: tilt left, tilt right, settle — then rest
            Animated.loop(
                Animated.sequence([
                    Animated.timing(iconRotate, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconRotate, {
                        toValue: -1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconRotate, {
                        toValue: 0.5,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconRotate, {
                        toValue: 0,
                        duration: 100,
                        useNativeDriver: true,
                    }),
                    // Rest
                    Animated.timing(iconRotate, {
                        toValue: 0,
                        duration: 3500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Icon background glow pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(iconGlow, {
                        toValue: 1.15,
                        duration: 1400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconGlow, {
                        toValue: 1,
                        duration: 1400,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, []);

    const spin = iconRotate.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-12deg', '0deg', '12deg'],
    });

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
                <Animated.View style={[
                    styles.earnChipIcon,
                    { backgroundColor: iconBg },
                    !disabled && { transform: [{ rotate: spin }, { scale: iconGlow }] }
                ]}>
                    <Ionicons name={icon} size={15} color={iconColor} />
                </Animated.View>
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
    headerHelpButton: {
        marginRight: 12,
        padding: 4,
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
        width: SCREEN_WIDTH * 3,
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
        alignItems: 'center',
        overflow: 'hidden',
    },
    heroArc: {
        position: 'absolute',
        top: 0,
        left: -SCREEN_WIDTH * 0.35,
        width: SCREEN_WIDTH * 1.7,
        height: SCREEN_WIDTH * 1.6,
        borderBottomLeftRadius: SCREEN_WIDTH * 0.85,
        borderBottomRightRadius: SCREEN_WIDTH * 0.85,
        opacity: 0.12,
    },
    heroFloatHeart1: {
        position: 'absolute',
        top: 38,
        left: '18%',
    },
    heroFloatHeart2: {
        position: 'absolute',
        top: 48,
        right: '16%',
    },
    heroSparkle1: {
        position: 'absolute',
        top: 22,
        right: '22%',
    },
    heroSparkle2: {
        position: 'absolute',
        top: 60,
        left: '24%',
    },
    heroRotatingStar: {
        position: 'absolute',
        top: 16,
        left: '12%',
    },
    heroRingPulse: {
        position: 'absolute',
        top: 32,
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 2,
    },
    heroContent: {
        alignItems: 'center',
        paddingTop: 32,
        paddingHorizontal: 20,
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
    // Sky panel playful animation
    skyAnimContainer: {
        height: 56,
        marginTop: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skyAnimScene: {
        width: '100%',
        height: 28,
        position: 'relative',
        overflow: 'hidden',
    },
    skyCloudLeft: {
        position: 'absolute',
        top: 2,
        left: '15%',
    },
    skyCloudRight: {
        position: 'absolute',
        top: 10,
        right: '18%',
    },
    skyStar1: {
        position: 'absolute',
        top: 0,
        right: '30%',
    },
    skyStar2: {
        position: 'absolute',
        top: 14,
        left: '38%',
    },
    skyAnimText: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.55)',
        fontStyle: 'italic',
        letterSpacing: 0.3,
        marginTop: 2,
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
        padding: 12,
        overflow: 'hidden',
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
    freeShimmer: {
        position: 'absolute',
        top: -10,
        left: 0,
        width: 50,
        height: 80,
        backgroundColor: 'rgba(110,231,183,0.3)',
        borderRadius: 25,
        zIndex: 1,
    },
    freeFloatingSparkle: {
        position: 'absolute',
        top: 6,
        right: '38%',
        zIndex: 2,
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

    bottomSpacer: {
        height: 30
    },

});
