import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';
import Avatar from '../../components/Avatar';
import { useTheme } from '../../theme';

interface FollowRequest {
  id: string;
  status: string;
  createdAt: string;
  requester: {
    id: string;
    username: string;
    activeAvatarId?: string;
    activeAvatar?: any;
    positivityRank?: string;
  };
}

export default function FollowRequestsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadRequests(true);
    }, [])
  );

  const loadRequests = async (refresh = false) => {
    if (refresh) {
      setLoading(true);
      setPage(1);
    }

    try {
      const response = await api.getFollowRequests(refresh ? 1 : page);
      const newRequests = response.followRequests || [];

      if (refresh) {
        setRequests(newRequests);
      } else {
        setRequests(prev => [...prev, ...newRequests]);
      }

      setHasMore(response.pagination?.hasMore || false);
      if (!refresh) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading follow requests:', error);
      Alert.alert('Error', 'Failed to load follow requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests(true);
  };

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await api.acceptFollowRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      Alert.alert('Success', 'Follow request accepted');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept follow request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await api.rejectFollowRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      Alert.alert('Error', 'Failed to reject follow request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserPress = (requester: FollowRequest['requester']) => {
    navigation.navigate('UserProfile', {
      userId: requester.id,
      username: requester.username,
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const renderRequestItem = ({ item }: { item: FollowRequest }) => {
    const isLoading = actionLoading === item.id;

    return (
      <View style={[styles.requestItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => handleUserPress(item.requester)}
          activeOpacity={0.7}
        >
          <Avatar
            size={50}
            avatarUrl={!item.requester.activeAvatar ? item.requester.avatarUrl : undefined}
            username={item.requester.username}
            customizations={item.requester.activeAvatar?.customizations}
            avatarStyle={item.requester.activeAvatar?.style}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.text.primary }]}>{item.requester.username}</Text>
            <Text style={[styles.timeAgo, { color: colors.text.secondary }]}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.text.link} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.acceptButton, { backgroundColor: colors.text.link }]}
                onPress={() => handleAccept(item.id)}
              >
                <Text style={[styles.acceptButtonText, { color: colors.text.inverse }]}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectButton, { backgroundColor: colors.surface }]}
                onPress={() => handleReject(item.id)}
              >
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading && requests.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text.link} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestItem}
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={() => hasMore && !loading && loadRequests(false)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Follow Requests</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
              When someone requests to follow you, you'll see it here
            </Text>
          </View>
        }
        ListFooterComponent={
          loading && requests.length > 0 ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.text.link} />
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
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceptButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
