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
    Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { api } from '../../services/api';
import TrustConnectionItem from '../../components/TrustConnectionItem';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ReceivedCoin {
    id: string;
    fromUserId: string;
    fromUsername: string;
    amount: number;
    message: string | null;
    createdAt: string;
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
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [coinsData, setCoinsData] = useState({
        totalCoins: 0,
        lifetimeGiven: 0,
        cooldownCoinsAvailable: 0,
        minutesUntilNextCooldown: null,
        secondsUntilNextCooldown: null,
        rank: 'beginner'
    });
    const [receivedCoins, setReceivedCoins] = useState<ReceivedCoin[]>([]);
    const [trustConnections, setTrustConnections] = useState<TrustConnection[]>([]);
    const [showAllTrust, setShowAllTrust] = useState(false);

    // Coin celebration hook
    const { showCelebration } = useCoinCelebration();

    // Animation for notification cards
    const notificationAnim = useRef(new Animated.Value(0)).current;

    // Animations for hero section
    const coinPulse = useRef(new Animated.Value(1)).current;
    const rankGlow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadCoins();
        loadReceivedCoins();
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
            const response = await api.getReceivedCoins(10);
            setReceivedCoins(response.received || []);

            // Animate in if there are new received coins
            if (response.received?.length > 0) {
                Animated.spring(notificationAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 100,
                    useNativeDriver: true,
                }).start();
            }
        } catch (error) {
            console.error('Error loading received coins:', error);
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
                lifetimeGiven: response.coins.lifetimeGiven,
                cooldownCoinsAvailable: response.coins.cooldownCoinsAvailable,
                minutesUntilNextCooldown: response.coins.minutesUntilNextCooldown,
                secondsUntilNextCooldown: secondsUntilNext,
                rank: response.coins.rank || 'beginner'
            });
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
        loadTrustConnections();
    };

    const handleTrustConnectionPress = (connection: TrustConnection) => {
        handleProfilePress(connection);
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

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const renderReceivedNotification = (item: ReceivedCoin, index: number) => {
        const slideAnim = notificationAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0],
        });

        return (
            <Animated.View
                key={item.id}
                style={[
                    styles.notificationCard,
                    {
                        opacity: notificationAnim,
                        transform: [{ translateX: slideAnim }],
                    },
                ]}
            >
                <View style={styles.notificationIcon}>
                    <Ionicons name="gift" size={18} color="#FBBF24" />
                </View>
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>
                        <Text style={styles.notificationUsername}>@{item.fromUsername}</Text>
                        {' '}sent you{' '}
                        <Text style={styles.notificationAmount}>{item.amount} coin{item.amount > 1 ? 's' : ''}</Text>
                    </Text>
                    {item.message && (
                        <Text style={styles.notificationMessage} numberOfLines={2}>
                            "{item.message}"
                        </Text>
                    )}
                    <Text style={styles.notificationTime}>{formatTimeAgo(item.createdAt)}</Text>
                </View>
                <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>+{item.amount}</Text>
                </View>
            </Animated.View>
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
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#9CA3AF" />
            }
        >
            {/* ============ HERO SECTION ============ */}
            <View style={styles.heroWrapper}>
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
                        {/* Custom Kindness Coin */}
                        <View style={styles.coinOuter}>
                            <LinearGradient
                                colors={rankInfo.coinGradient}
                                style={styles.coinRim}
                            >
                                <View style={styles.coinInner}>
                                    <LinearGradient
                                        colors={[rankInfo.coinGradient[0], rankInfo.coinGradient[2]]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.coinFace}
                                    >
                                        {/* Heart with leaves - Kindness symbol */}
                                        <View style={styles.coinSymbolContainer}>
                                            <Ionicons name="leaf" size={11} color="rgba(255,255,255,0.9)" style={styles.coinLeafLeft} />
                                            <Ionicons name="heart" size={22} color="#FFF" />
                                            <Ionicons name="leaf" size={11} color="rgba(255,255,255,0.9)" style={styles.coinLeafRight} />
                                        </View>
                                        {/* Coin shine effect */}
                                        <View style={styles.coinShine} />
                                    </LinearGradient>
                                </View>
                            </LinearGradient>
                        </View>
                    </Animated.View>

                    <Text style={styles.balanceAmount}>
                        {coinsData.totalCoins.toLocaleString()}
                    </Text>
                    <Text style={styles.balanceLabel}>Positivity Coins</Text>
                    {/* Stats Row */}
                    <View style={styles.heroStatsRow}>
                        <View style={styles.heroStatHalf}>
                            <Text style={styles.heroStatValue}>{coinsData.lifetimeGiven}</Text>
                            <Text style={styles.heroStatLabel}>Given</Text>
                        </View>
                        <View style={styles.heroStatDivider} />
                        <TouchableOpacity style={styles.heroStatHalf} onPress={() => navigation.navigate('GiveLeaderboard')}>
                            <View style={[styles.rankDotInline, { backgroundColor: rankInfo.heroGradient[0] }]} />
                            <Text style={styles.heroStatValue}>
                                {coinsData.rank.charAt(0).toUpperCase() + coinsData.rank.slice(1)}
                            </Text>
                            <Ionicons name="chevron-forward" size={11} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* ============ GET MORE COINS - UNIFIED SECTION ============ */}
            <View style={styles.getCoinsSection}>
                {/* Free Coins Card */}
                <View style={styles.freeCoinsCard}>
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.freeCoinsGradient}
                    >
                        <View style={styles.freeCoinsLeft}>
                            <View style={styles.freeCoinsBadge}>
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
                                <CooldownTimer secondsUntilNext={coinsData.secondsUntilNextCooldown} />
                            )}
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* Coin slots indicator */}
                    <View style={styles.coinSlots}>
                        {[0, 1, 2].map((i) => (
                            <View
                                key={i}
                                style={[
                                    styles.coinSlot,
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
                        reward="+2"
                        onPress={() => navigation.dispatch(
                            CommonActions.navigate({ name: 'CreatePost' })
                        )}
                    />
                    <EarnChip
                        icon="chatbubble"
                        iconColor="#10B981"
                        iconBg="#D1FAE5"
                        label="Comment"
                        reward="+1"
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
                        <Text style={styles.trustLabelText}>Bonds</Text>
                        {trustConnections.length > 3 && (
                            <TouchableOpacity
                                style={styles.seeAllBtn}
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
            <View style={styles.receivedSection}>
                <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="heart" size={16} color="#EF4444" />
                    </View>
                    <Text style={styles.sectionTitle}>Kindness Received</Text>
                </View>

                {receivedCoins.length > 0 ? (
                    <>
                        {receivedCoins.slice(0, 3).map((item, index) =>
                            renderReceivedNotification(item, index)
                        )}
                    </>
                ) : (
                    <View style={styles.emptyReceived}>
                        <Ionicons name="gift-outline" size={24} color="#D1D5DB" />
                        <Text style={styles.emptyReceivedText}>No coins received yet</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.viewAllActivityBtn}
                    onPress={() => navigation.navigate('CoinHistory')}
                >
                    <Ionicons name="receipt-outline" size={16} color="#6366F1" />
                    <Text style={styles.viewAllActivityText}>View All Activity</Text>
                    <Ionicons name="chevron-forward" size={14} color="#6366F1" />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

// Earn Chip Component with press animation
function EarnChip({ icon, iconColor, iconBg, label, reward, disabled, onPress }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    label: string;
    reward: string;
    disabled?: boolean;
    onPress: () => void;
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
        <Animated.View style={[styles.earnChip, { transform: [{ scale }] }]}>
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
                <Text style={styles.earnChipLabel}>{label}</Text>
                <View style={[styles.earnChipBadge, disabled && styles.earnChipBadgeDisabled]}>
                    <Text style={[styles.earnChipReward, disabled && styles.earnChipRewardDisabled]}>{reward}</Text>
                </View>
                <Ionicons
                    name={disabled ? 'lock-closed' : 'chevron-forward'}
                    size={10}
                    color={disabled ? '#D1D5DB' : '#9CA3AF'}
                    style={styles.earnChipArrow}
                />
            </TouchableOpacity>
        </Animated.View>
    );
}

// Cooldown Timer Component
function CooldownTimer({ secondsUntilNext }: { secondsUntilNext: number | null }) {
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
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={styles.timerText}>{formatTime(seconds)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6'
    },
    contentContainer: {
        paddingBottom: 20
    },

    // ============ HERO SECTION ============
    heroWrapper: {
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#F3F4F6',
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
        marginBottom: 10
    },
    // Custom Kindness Coin Styles
    coinOuter: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 12
    },
    coinRim: {
        width: 72,
        height: 72,
        borderRadius: 36,
        padding: 3,
        alignItems: 'center',
        justifyContent: 'center'
    },
    coinInner: {
        width: '100%',
        height: '100%',
        borderRadius: 33,
        backgroundColor: 'rgba(255,255,255,0.3)',
        padding: 3,
        alignItems: 'center',
        justifyContent: 'center'
    },
    coinFace: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    },
    coinSymbolContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    coinLeafLeft: {
        transform: [{ rotate: '-45deg' }],
        marginRight: -4,
        marginTop: -8
    },
    coinLeafRight: {
        transform: [{ rotate: '45deg' }, { scaleX: -1 }],
        marginLeft: -4,
        marginTop: -8
    },
    coinShine: {
        position: 'absolute',
        top: -20,
        left: -20,
        width: 50,
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.25)',
        transform: [{ rotate: '35deg' }]
    },
    balanceAmount: {
        fontSize: 40,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 2
    },
    balanceLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 14
    },
    heroStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: SCREEN_WIDTH - 60,
        backgroundColor: '#FFF',
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
        color: '#111827',
    },
    heroStatLabel: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    heroStatDivider: {
        width: StyleSheet.hairlineWidth,
        height: 24,
        backgroundColor: '#D1D5DB'
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
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center'
    },
    sectionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#111827'
    },
    seeAllBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#EFF6FF',
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
        backgroundColor: '#FFF',
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
        backgroundColor: '#FFF',
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
        backgroundColor: '#FFF',
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
        backgroundColor: '#F9FAFB'
    },
    coinSlot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#D1D5DB'
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
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
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
        color: '#374151',
        textAlign: 'center',
    },
    earnChipBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    earnChipBadgeDisabled: {
        backgroundColor: '#F3F4F6',
    },
    earnChipReward: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981',
    },
    earnChipRewardDisabled: {
        color: '#9CA3AF',
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
        color: '#6B7280'
    },

    // ============ RECEIVED SECTION ============
    receivedSection: {
        marginTop: 14,
        marginHorizontal: 16,
        backgroundColor: '#FFF',
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
        color: '#9CA3AF',
        fontWeight: '500',
    },
    viewAllActivityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginTop: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#F3F4F6',
        gap: 5,
    },
    viewAllActivityText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },

    // ============ NOTIFICATION STYLES ============
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FEF3C7'
    },
    notificationIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    notificationContent: {
        flex: 1
    },
    notificationTitle: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 18
    },
    notificationUsername: {
        fontWeight: '700',
        color: '#111827'
    },
    notificationAmount: {
        fontWeight: '700',
        color: '#F59E0B'
    },
    notificationMessage: {
        fontSize: 13,
        color: '#6B7280',
        fontStyle: 'italic',
        marginTop: 4
    },
    notificationTime: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4
    },
    notificationBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10
    },
    notificationBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF'
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
        color: '#6B7280',
        flex: 1,
    },

    bottomSpacer: {
        height: 30
    }
});
