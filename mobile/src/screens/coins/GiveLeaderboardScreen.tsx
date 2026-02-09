import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import GiveCounterBadge from '../../components/coins/GiveCounterBadge';
import { useTheme } from '../../theme';

interface LeaderboardUser {
  user: {
    id: string;
    username: string;
    activeAvatarId?: string;
    positivityRank: string;
  };
  lifetimeGiven: number;
  rank: string;
}

export default function GiveLeaderboardScreen() {
  const { colors, isDark } = useTheme();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

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

  const handleUserPress = (userId: string) => {
    // TODO: Navigate to user profile
    console.log('View user profile:', userId);
  };

  const renderItem = ({ item, index }: { item: LeaderboardUser; index: number }) => {
    const isTopThree = index < 3;
    const medals = ['🥇', '🥈', '🥉'];

    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.background }]}
        onPress={() => handleUserPress(item.user.id)}
      >
        {/* Rank Badge */}
        <View style={[styles.rankBadge, { backgroundColor: colors.surfaceVariant }, isTopThree && styles.rankBadgeTop]}>
          {isTopThree ? (
            <Text style={styles.medal}>{medals[index]}</Text>
          ) : (
            <Text style={[styles.rankNumber, { color: colors.text.secondary }]}>{index + 1}</Text>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={48} color={colors.text.secondary} />
          </View>
          <View style={styles.details}>
            <Text style={[styles.username, { color: colors.text.primary }]}>@{item.user.username}</Text>
            <Text style={[styles.rankLabel, { color: colors.text.secondary }]}>{item.rank}</Text>
          </View>
        </View>

        {/* Give Counter */}
        <View style={styles.counter}>
          <Text style={styles.counterNumber}>{item.lifetimeGiven.toLocaleString()}</Text>
          <Text style={[styles.counterLabel, { color: colors.text.secondary }]}>given</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Kindness Leaderboard</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>Top spreaders of positivity 🌟</Text>
      </View>

      {/* Leaderboard List */}
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.user.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>No leaderboard data yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
              Start giving coins to appear on the leaderboard!
            </Text>
          </View>
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  list: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankBadgeTop: {
    backgroundColor: '#FEF3C7',
  },
  medal: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  rankLabel: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  counter: {
    alignItems: 'flex-end',
  },
  counterNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBBF24',
  },
  counterLabel: {
    fontSize: 12,
  },
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
