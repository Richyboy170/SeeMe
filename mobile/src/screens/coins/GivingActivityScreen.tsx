import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useTheme } from '../../theme';

interface GivingActivity {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  message?: string;
  createdAt: string;
  giver: {
    id: string;
    username: string;
    activeAvatarId?: string;
    positivityRank?: string;
  };
  receiver: {
    id: string;
    username: string;
    activeAvatarId?: string;
    positivityRank?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function GivingActivityScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [activity, setActivity] = useState<GivingActivity[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadActivity(1);
  }, []);

  const loadActivity = async (page: number = 1) => {
    try {
      const response = await api.getGivingActivity(page);

      if (page === 1) {
        setActivity(response.activity || []);
      } else {
        setActivity(prev => [...prev, ...(response.activity || [])]);
      }

      setPagination(response.pagination || {
        page,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false
      });
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivity(1);
  };

  const handleLoadMore = () => {
    if (!loadingMore && pagination.hasMore) {
      setLoadingMore(true);
      loadActivity(pagination.page + 1);
    }
  };

  const handleUserPress = (userId: string) => {
    navigation.navigate('Profile', { userId });
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

  const renderItem = ({ item }: { item: GivingActivity }) => {
    return (
      <View style={[styles.item, { backgroundColor: colors.card }]}>
        {/* Giver */}
        <TouchableOpacity
          style={styles.user}
          onPress={() => handleUserPress(item.giver.id)}
        >
          <Ionicons name="person-circle" size={40} color={colors.text.tertiary} />
          <Text style={[styles.username, { color: colors.text.primary }]}>@{item.giver.username}</Text>
        </TouchableOpacity>

        {/* Gift Icon with Amount */}
        <View style={styles.giftContainer}>
          <View style={styles.giftIcon}>
            <Ionicons name="gift" size={24} color="#FBBF24" />
          </View>
          <View style={styles.amountBadge}>
            <Text style={styles.amountText}>{item.amount}</Text>
          </View>
        </View>

        {/* Receiver */}
        <TouchableOpacity
          style={styles.user}
          onPress={() => handleUserPress(item.receiver.id)}
        >
          <Ionicons name="person-circle" size={40} color={colors.text.tertiary} />
          <Text style={[styles.username, { color: colors.text.primary }]}>@{item.receiver.username}</Text>
        </TouchableOpacity>

        {/* Timestamp */}
        <Text style={[styles.timestamp, { color: colors.text.tertiary }]}>{formatTimeAgo(item.createdAt)}</Text>

        {/* Message (if provided) */}
        {item.message && (
          <View style={[styles.messageContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.message, { color: colors.text.secondary }]} numberOfLines={3}>
              "{item.message}"
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Giving Activity</Text>
        <Text style={[styles.subtitle, { color: colors.text.tertiary }]}>Recent acts of kindness</Text>
      </View>

      <FlatList
        data={activity}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#FBBF24" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={colors.disabled} />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No activity yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
              Be the first to give coins and spread positivity!
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
    backgroundColor: '#F9FAFB'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280'
  },
  list: {
    paddingVertical: 8
  },
  item: {
    backgroundColor: '#FFF',
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  giftContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginVertical: 12
  },
  giftIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  amountBadge: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  amountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center'
  },
  messageContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8
  },
  message: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center'
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 280
  }
});
