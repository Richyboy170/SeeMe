import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import Avatar from '../../components/Avatar';
import { AvatarCustomizations } from '../../components/AvatarRenderer';
import KindnessCoin from '../../components/coins/KindnessCoin';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LeaderboardUser {
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    activeAvatarId?: string;
    positivityRank: string;
    activeAvatar?: {
      id: string;
      style: 'cartoon' | 'anime' | 'minimalist';
      customizations: AvatarCustomizations;
    } | null;
  };
  lifetimeGiven: number;
  rank: string;
}

const RANK_DATA: { [key: string]: {
  color: string;
  gradient: [string, string];
  emoji: string;
}} = {
  beginner: { color: '#9CA3AF', gradient: ['#E5E7EB', '#D1D5DB'], emoji: '🌱' },
  kind:     { color: '#60A5FA', gradient: ['#BFDBFE', '#93C5FD'], emoji: '💙' },
  generous: { color: '#A78BFA', gradient: ['#DDD6FE', '#C4B5FD'], emoji: '💜' },
  inspirational: { color: '#F59E0B', gradient: ['#FDE68A', '#FCD34D'], emoji: '⭐' },
  legend:   { color: '#EF4444', gradient: ['#FECACA', '#FCA5A5'], emoji: '🏆' },
};

const getRank = (rank: string) => RANK_DATA[rank] || RANK_DATA.beginner;

const PODIUM_COLORS: [string, string][] = [
  ['#FBBF24', '#F59E0B'], // gold
  ['#D1D5DB', '#9CA3AF'], // silver
  ['#D97706', '#B45309'], // bronze
];

export default function GiveLeaderboardScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Podium entrance animation
  const podiumAnim = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  useEffect(() => {
    loadLeaderboard();
  }, []);

  useEffect(() => {
    if (!loading && leaderboard.length >= 3) {
      Animated.spring(podiumAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Shimmer sweep on podium
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerX, {
            toValue: SCREEN_WIDTH,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.delay(3000),
          Animated.timing(shimmerX, {
            toValue: -SCREEN_WIDTH,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [loading, leaderboard.length]);

  const loadLeaderboard = async () => {
    try {
      const response = await api.getGiveLeaderboard();
      setLeaderboard(response.leaderboard || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const handleUserPress = (userId: string, username: string) => {
    navigation.navigate('UserProfile', { userId, username });
  };

  // Top 3 podium
  const renderPodium = () => {
    if (leaderboard.length < 3) return null;
    // Display order: 2nd, 1st, 3rd
    const order = [1, 0, 2];
    const heights = [100, 130, 80];
    const avatarSizes = [48, 60, 44];
    const medals = ['🥇', '🥈', '🥉'];

    return (
      <Animated.View style={[styles.podiumSection, {
        opacity: podiumAnim,
        transform: [{ translateY: podiumAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
      }]}>
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.podiumGradient}
        >
          {/* Shimmer overlay */}
          <Animated.View
            style={[styles.podiumShimmer, { transform: [{ translateX: shimmerX }] }]}
            pointerEvents="none"
          />

          {/* Decorative elements */}
          <Ionicons name="sparkles" size={16} color="rgba(255,255,255,0.15)" style={{ position: 'absolute', top: 16, left: 20 }} />
          <Ionicons name="star" size={12} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', top: 30, right: 28 }} />
          <Ionicons name="heart" size={10} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', bottom: 40, left: 30 }} />

          <Text style={styles.podiumTitle}>Top Kindness Spreaders</Text>

          <View style={styles.podiumRow}>
            {order.map((idx) => {
              const item = leaderboard[idx];
              const rank = getRank(item.rank);
              return (
                <TouchableOpacity
                  key={item.user.id}
                  style={styles.podiumSlot}
                  activeOpacity={0.7}
                  onPress={() => handleUserPress(item.user.id, item.user.username)}
                >
                  {/* Medal */}
                  <Text style={styles.podiumMedal}>{medals[idx]}</Text>

                  {/* Avatar with ring */}
                  <View style={[styles.podiumAvatarRing, {
                    borderColor: PODIUM_COLORS[idx][0],
                    width: avatarSizes[idx] + 8,
                    height: avatarSizes[idx] + 8,
                    borderRadius: (avatarSizes[idx] + 8) / 2,
                    backgroundColor: '#FFF',
                  }]}>
                    <Avatar
                      size={avatarSizes[idx]}
                      avatarUrl={!item.user.activeAvatar ? item.user.avatarUrl : undefined}
                      username={item.user.username}
                      customizations={item.user.activeAvatar?.customizations}
                      avatarStyle={item.user.activeAvatar?.style}
                      style={{ backgroundColor: isDark ? '#3a3a4a' : '#F2F2F7' }}
                    />
                  </View>

                  {/* Username */}
                  <Text style={styles.podiumUsername} numberOfLines={1}>
                    @{item.user.username}
                  </Text>

                  {/* Coin count */}
                  <View style={styles.podiumCountRow}>
                    <KindnessCoin size={14} />
                    <Text style={styles.podiumCount}>
                      {item.lifetimeGiven.toLocaleString()}
                    </Text>
                  </View>

                  {/* Rank badge */}
                  <View style={[styles.podiumRankBadge, { backgroundColor: rank.color + '25' }]}>
                    <Text style={{ fontSize: 10 }}>{rank.emoji}</Text>
                    <Text style={[styles.podiumRankText, { color: rank.color }]}>
                      {item.rank.charAt(0).toUpperCase() + item.rank.slice(1)}
                    </Text>
                  </View>

                  {/* Podium bar */}
                  <LinearGradient
                    colors={PODIUM_COLORS[idx]}
                    style={[styles.podiumBar, { height: heights[idx] }]}
                  >
                    <Text style={styles.podiumBarNumber}>{idx + 1}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  // List items for rank 4+
  const renderItem = useCallback(({ item, index }: { item: LeaderboardUser; index: number }) => {
    const rank = getRank(item.rank);
    const position = index + 4; // offset by top 3

    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.card }]}
        activeOpacity={0.7}
        onPress={() => handleUserPress(item.user.id, item.user.username)}
      >
        {/* Position */}
        <View style={[styles.positionCircle, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.positionText, { color: colors.text.secondary }]}>{position}</Text>
        </View>

        {/* Avatar */}
        <Avatar
          size={44}
          avatarUrl={!item.user.activeAvatar ? item.user.avatarUrl : undefined}
          username={item.user.username}
          customizations={item.user.activeAvatar?.customizations}
          avatarStyle={item.user.activeAvatar?.style}
        />

        {/* User info */}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemUsername, { color: colors.text.primary }]} numberOfLines={1}>
            @{item.user.username}
          </Text>
          <View style={styles.itemRankRow}>
            <Text style={{ fontSize: 11 }}>{rank.emoji}</Text>
            <Text style={[styles.itemRankLabel, { color: rank.color }]}>
              {item.rank.charAt(0).toUpperCase() + item.rank.slice(1)}
            </Text>
          </View>
        </View>

        {/* Coin count */}
        <View style={styles.itemCountContainer}>
          <View style={styles.itemCountRow}>
            <KindnessCoin size={16} />
            <Text style={[styles.itemCount, { color: rank.color }]}>
              {item.lifetimeGiven.toLocaleString()}
            </Text>
          </View>
          <Text style={[styles.itemCountLabel, { color: colors.text.secondary }]}>given</Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, isDark, navigation]);

  const keyExtractor = useCallback((item: LeaderboardUser) => item.user.id, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  const restOfList = useMemo(() => leaderboard.slice(3), [leaderboard]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <FlatList
        data={restOfList}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderPodium}
        contentContainerStyle={styles.list}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          leaderboard.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.text.primary }]}>No leaderboard data yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
                Start giving coins to appear on the leaderboard!
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 24,
  },

  // ── Podium ──
  podiumSection: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  podiumGradient: {
    paddingTop: 20,
    paddingBottom: 0,
    alignItems: 'center',
    overflow: 'hidden',
  },
  podiumShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-20deg' }],
  },
  podiumTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
  },
  podiumMedal: {
    fontSize: 22,
    marginBottom: 4,
  },
  podiumAvatarRing: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  podiumUsername: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    maxWidth: 90,
    textAlign: 'center',
    marginBottom: 3,
  },
  podiumCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  podiumCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  podiumRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 8,
  },
  podiumRankText: {
    fontSize: 10,
    fontWeight: '700',
  },
  podiumBar: {
    width: '85%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBarNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.35)',
  },

  // ── List items ──
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  positionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemInfo: {
    flex: 1,
  },
  itemUsername: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  itemRankLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCountContainer: {
    alignItems: 'flex-end',
  },
  itemCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemCount: {
    fontSize: 17,
    fontWeight: '800',
  },
  itemCountLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },

  // ── Empty state ──
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
});
