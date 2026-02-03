import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    ScrollView,
    Text,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Animated
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { api } from '../../services/api';
import CooldownCoinsWidget from '../../components/coins/CooldownCoinsWidget';
import CoinsBalance from '../../components/coins/CoinsBalance';
import GiveCounterBadge from '../../components/coins/GiveCounterBadge';
import TrustConnectionItem from '../../components/TrustConnectionItem';
import { Ionicons } from '@expo/vector-icons';

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
    const [showAllReceived, setShowAllReceived] = useState(false);
    const [trustConnections, setTrustConnections] = useState<TrustConnection[]>([]);
    const [showAllTrust, setShowAllTrust] = useState(false);

    // Animation for notification cards
    const notificationAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadCoins();
        loadReceivedCoins();
        loadTrustConnections();

        // Refresh every minute to update cooldown timer
        const interval = setInterval(loadCoins, 60000);
        return () => clearInterval(interval);
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
            Alert.alert(
                'Coins Claimed!',
                `You received ${response.coinsClaimed} free coins!`,
                [{ text: 'Awesome!', onPress: loadCoins }]
            );
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
                    <Ionicons name="gift" size={24} color="#FBBF24" />
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

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            {/* Received Coins Notifications */}
            {receivedCoins.length > 0 && (
                <View style={styles.notificationsSection}>
                    <View style={styles.notificationHeader}>
                        <View style={styles.notificationHeaderLeft}>
                            <Ionicons name="heart" size={20} color="#EF4444" />
                            <Text style={styles.notificationHeaderTitle}>Kindness Received</Text>
                        </View>
                        {receivedCoins.length > 3 && (
                            <TouchableOpacity onPress={() => setShowAllReceived(!showAllReceived)}>
                                <Text style={styles.showMoreText}>
                                    {showAllReceived ? 'Show less' : `See all (${receivedCoins.length})`}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {(showAllReceived ? receivedCoins : receivedCoins.slice(0, 3)).map((item, index) =>
                        renderReceivedNotification(item, index)
                    )}
                </View>
            )}

            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Your Balance</Text>
                <CoinsBalance totalCoins={coinsData.totalCoins} size="large" />
            </View>

            {/* Cooldown Coins */}
            <View style={styles.section}>
                <CooldownCoinsWidget
                    cooldownCoinsAvailable={coinsData.cooldownCoinsAvailable}
                    minutesUntilNext={coinsData.minutesUntilNextCooldown}
                    secondsUntilNext={coinsData.secondsUntilNextCooldown}
                    onPress={handleClaimCooldown}
                />
                <Text style={styles.cooldownInfo}>
                    Free coins regenerate every 3 hours (max 3)
                </Text>
            </View>

            {/* Give Counter */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Impact</Text>
                <GiveCounterBadge
                    giveCounter={coinsData.lifetimeGiven}
                    rank={coinsData.rank}
                />
                <Text style={styles.giveInfo}>
                    You've spread {coinsData.lifetimeGiven} positive vibes! Keep it up!
                </Text>
            </View>

            {/* Earn More Coins */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earn More Coins</Text>

                <EarnOption
                    icon="create-outline"
                    title="Write a Meaningful Post"
                    reward="+2 coins"
                    description="Write a caption with 20+ characters"
                    onPress={() => navigation.navigate('CreatePost')}
                />

                <EarnOption
                    icon="chatbubble-outline"
                    title="Leave a Kind Comment"
                    reward="+1 coin"
                    description="10+ characters with positive words or emojis"
                    onPress={() => navigation.navigate('Feed')}
                />

                <EarnOption
                    icon="play-circle-outline"
                    title="Watch an Ad"
                    reward="+5 coins"
                    description="Max 3 per day"
                    onPress={() => Alert.alert('Coming Soon', 'Ad rewards feature coming soon!')}
                />
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('CoinHistory')}
                >
                    <Ionicons name="list-outline" size={24} color="#007AFF" />
                    <Text style={styles.actionText}>Transaction History</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('GiveLeaderboard')}
                >
                    <Ionicons name="trophy-outline" size={24} color="#F59E0B" />
                    <Text style={styles.actionText}>Kindness Leaderboard</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('GivingActivity')}
                >
                    <Ionicons name="heart-outline" size={24} color="#EF4444" />
                    <Text style={styles.actionText}>Recent Giving Activity</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            {/* Friendship Consistency Score Section */}
            {trustConnections.length > 0 && (
                <View style={styles.trustSection}>
                    <View style={styles.trustHeader}>
                        <View style={styles.trustHeaderLeft}>
                            <Ionicons name="sparkles" size={20} color="#8B5CF6" />
                            <Text style={styles.trustHeaderTitle}>Friendship Consistency</Text>
                        </View>
                        {trustConnections.length > 3 && (
                            <TouchableOpacity onPress={() => setShowAllTrust(!showAllTrust)}>
                                <Text style={styles.showMoreText}>
                                    {showAllTrust ? 'Show less' : `See all (${trustConnections.length})`}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.trustDescription}>
                        Consistency builds stronger friendships over time
                    </Text>
                    {(showAllTrust ? trustConnections : trustConnections.slice(0, 3)).map((connection) => (
                        <TrustConnectionItem
                            key={connection.id}
                            connection={connection}
                            onPress={handleTrustConnectionPress}
                        />
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

interface EarnOptionProps {
    icon: any;
    title: string;
    reward: string;
    description: string;
    onPress: () => void;
}

function EarnOption({ icon, title, reward, description, onPress }: EarnOptionProps) {
    return (
        <TouchableOpacity style={styles.earnOption} onPress={onPress}>
            <View style={styles.earnIcon}>
                <Ionicons name={icon} size={28} color="#007AFF" />
            </View>
            <View style={styles.earnContent}>
                <View style={styles.earnHeader}>
                    <Text style={styles.earnTitle}>{title}</Text>
                    <View style={styles.rewardBadge}>
                        <Text style={styles.rewardText}>{reward}</Text>
                    </View>
                </View>
                <Text style={styles.earnDescription}>{description}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB'
    },
    balanceCard: {
        backgroundColor: '#FFF',
        margin: 16,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    balanceLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    section: {
        padding: 16
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12
    },
    cooldownInfo: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 12,
        textAlign: 'center'
    },
    giveInfo: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 12,
        textAlign: 'center'
    },
    earnOption: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    earnIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    earnContent: {
        flex: 1
    },
    earnHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    earnTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827'
    },
    rewardBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8
    },
    rewardText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF'
    },
    earnDescription: {
        fontSize: 14,
        color: '#6B7280'
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2
    },
    actionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginLeft: 12
    },

    // Notification styles
    notificationsSection: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    notificationHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    notificationHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827'
    },
    showMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF'
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8
    },
    notificationIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2
    },
    notificationContent: {
        flex: 1
    },
    notificationTitle: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20
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
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4
    },
    notificationBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12
    },
    notificationBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF'
    },

    // Trust Connections styles
    trustSection: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 24,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    trustHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    trustHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    trustHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827'
    },
    trustDescription: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 12
    }
});
