import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  metadata?: {
    fromUsername?: string;
    toUsername?: string;
    message?: string;
  };
}

export default function CoinHistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.getCoinsHistory(50);
      setTransactions(response.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'cooldown_claim':
        return { name: 'time', color: '#10B981' };
      case 'give':
        return { name: 'arrow-up', color: '#EF4444' };
      case 'receive':
        return { name: 'arrow-down', color: '#10B981' };
      case 'post_reward':
        return { name: 'create', color: '#FBBF24' };
      case 'comment_reward':
        return { name: 'chatbubble', color: '#FBBF24' };
      case 'ad_reward':
        return { name: 'play-circle', color: '#8B5CF6' };
      case 'welcome_bonus':
        return { name: 'gift', color: '#10B981' };
      default:
        return { name: 'ellipse', color: '#9CA3AF' };
    }
  };

  const getTransactionTitle = (transaction: Transaction): string => {
    switch (transaction.type) {
      case 'cooldown_claim':
        return 'Claimed Cooldown Coins';
      case 'give':
        return transaction.metadata?.toUsername
          ? `Gave to @${transaction.metadata.toUsername}`
          : 'Gave Coins';
      case 'receive':
        return transaction.metadata?.fromUsername
          ? `Received from @${transaction.metadata.fromUsername}`
          : 'Received Coins';
      case 'post_reward':
        return 'Earned from Meaningful Post';
      case 'comment_reward':
        return 'Earned from Positive Comment';
      case 'ad_reward':
        return 'Earned from Ad';
      case 'welcome_bonus':
        return 'Welcome Bonus';
      default:
        return 'Transaction';
    }
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

  const renderItem = ({ item }: { item: Transaction }) => {
    const icon = getTransactionIcon(item.type);
    const title = getTransactionTitle(item);
    const isIncrease = !item.type?.includes('give') || item.type === 'receive';

    return (
      <View style={styles.item}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(item.createdAt)}</Text>
          {item.metadata?.message && (
            <Text style={styles.message} numberOfLines={2}>
              "{item.metadata.message}"
            </Text>
          )}
        </View>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={[
            styles.amount,
            isIncrease ? styles.amountIncrease : styles.amountDecrease
          ]}>
            {isIncrease ? '+' : '-'}{Math.abs(item.amount)}
          </Text>
          <Text style={styles.balance}>
            Balance: {item.balanceAfter}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Text style={styles.subtitle}>Your coin activity</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Start earning and giving coins to see your history here!
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
    flexDirection: 'row',
    alignItems: 'center',
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  details: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  timestamp: {
    fontSize: 13,
    color: '#9CA3AF'
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic'
  },
  amountContainer: {
    alignItems: 'flex-end'
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2
  },
  amountIncrease: {
    color: '#10B981'
  },
  amountDecrease: {
    color: '#EF4444'
  },
  balance: {
    fontSize: 12,
    color: '#9CA3AF'
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
