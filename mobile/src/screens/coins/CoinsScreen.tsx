import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    Text,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert
} from 'react-native';
import { api } from '../../services/api';
import CooldownCoinsWidget from '../../components/coins/CooldownCoinsWidget';
import CoinsBalance from '../../components/coins/CoinsBalance';
import GiveCounterBadge from '../../components/coins/GiveCounterBadge';
import { Ionicons } from '@expo/vector-icons';

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

    useEffect(() => {
        loadCoins();

        // Refresh every minute to update cooldown timer
        const interval = setInterval(loadCoins, 60000);
        return () => clearInterval(interval);
    }, []);

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
            Alert.alert('Error', error.message || 'Failed to claim coins');
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadCoins();
    };

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Positivity Coins</Text>
                <Text style={styles.subtitle}>Spread kindness, earn rewards</Text>
            </View>

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
                    description="Share something positive or helpful"
                    onPress={() => navigation.navigate('CreatePost')}
                />

                <EarnOption
                    icon="chatbubble-outline"
                    title="Leave a Kind Comment"
                    reward="+1 coin"
                    description="Brighten someone's day"
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
    header: {
        padding: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280'
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
    }
});
