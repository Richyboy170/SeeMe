import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { FeedStackParamList, useUnreadCount } from '../../navigation/types';
import { socketService } from '../../services/socket';
import Avatar from '../../components/Avatar';
import { AvatarCustomizations } from '../../components/AvatarRenderer';
import { useTheme, Colors, Spacing, Typography } from '../../theme';

// Bond rank info helper
const getBondRankInfo = (trustScore: number) => {
  if (trustScore >= 80) return {
    label: 'BF',
    fullLabel: 'Best Friend',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    gradient: ['#8B5CF6', '#A855F7'] as [string, string],
    icon: 'heart' as const,
  };
  if (trustScore >= 60) return {
    label: 'CF',
    fullLabel: 'Close Friend',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    gradient: ['#EC4899', '#F472B6'] as [string, string],
    icon: 'heart-half' as const,
  };
  if (trustScore >= 40) return {
    label: 'GF',
    fullLabel: 'Good Friend',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    gradient: ['#F59E0B', '#FBBF24'] as [string, string],
    icon: 'sunny' as const,
  };
  if (trustScore >= 20) return {
    label: 'BD',
    fullLabel: 'Building',
    color: '#10B981',
    bgColor: '#D1FAE5',
    gradient: ['#10B981', '#34D399'] as [string, string],
    icon: 'leaf' as const,
  };
  return {
    label: 'NEW',
    fullLabel: 'New',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    gradient: ['#9CA3AF', '#D1D5DB'] as [string, string],
    icon: 'sparkles' as const,
  };
};

interface BondData {
  trustScore: number;
  currentStreak: number;
}

interface ActiveAvatar {
  id: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  customizations: AvatarCustomizations;
}

interface User {
  id: string;
  username: string;
  avatarUrl?: string;
  activeAvatar?: ActiveAvatar | null;
}

interface Message {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  user1: User;
  user2: User;
  lastMessage: Message | null;
  lastMessageAt: string;
  unreadCount: number;
}

type ConversationsScreenNavigationProp = StackNavigationProp<FeedStackParamList, 'Conversations'>;

export default function ConversationsScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [bondDataMap, setBondDataMap] = useState<{ [userId: string]: BondData }>({});
  const navigation = useNavigation<ConversationsScreenNavigationProp>();
  const { refreshUnreadCount } = useUnreadCount();
  const { colors, isDark } = useTheme();

  // Dynamic styles based on theme
  const dynamicStyles = createDynamicStyles(colors);

  useEffect(() => {
    loadCurrentUser();
    loadConversations();

    // Socket listeners for real-time updates
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('chat:new_message', handleSocketNewMessage);
      socket.on('chat:messages_read', handleMessagesRead);
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('chat:new_message', handleSocketNewMessage);
        socket.off('chat:messages_read', handleMessagesRead);
      }
    };
  }, []);

  // Refresh conversations and unread count when screen gets focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      refreshUnreadCount();
    }, [refreshUnreadCount])
  );

  // Load bond data when currentUserId and conversations are available
  useEffect(() => {
    if (currentUserId && conversations.length > 0) {
      loadBondDataForConversations(conversations);
    }
  }, [currentUserId]);

  const handleSocketNewMessage = (data: any) => {
    loadConversations();
  };

  const handleMessagesRead = (data: any) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === data.conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
  };

  // Add New Message button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 16, padding: 4 }}
          onPress={handleNewMessage}
        >
          <Ionicons name="create-outline" size={24} color={Colors.brand.blue} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const handleNewMessage = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Search',
      })
    );
  };

  const loadCurrentUser = async () => {
    try {
      const response = await api.getProfile();
      const user = response.user || response;
      setCurrentUserId(user.id);
    } catch (error) {
      console.error('Load current user error:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.getConversations();
      const convs = response.conversations || [];
      setConversations(convs);

      // Load bond data for each conversation
      if (convs.length > 0 && currentUserId) {
        loadBondDataForConversations(convs);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBondDataForConversations = async (convs: Conversation[]) => {
    try {
      const bondPromises = convs.map(async (conv) => {
        const otherUserId = conv.user1.id === currentUserId ? conv.user2.id : conv.user1.id;
        try {
          const response = await api.getTrustScore(otherUserId);
          return {
            userId: otherUserId,
            data: {
              trustScore: response.trustScore || 0,
              currentStreak: response.currentStreak || 0,
            }
          };
        } catch {
          return {
            userId: otherUserId,
            data: { trustScore: 0, currentStreak: 0 }
          };
        }
      });

      const results = await Promise.all(bondPromises);
      const newBondMap: { [userId: string]: BondData } = {};
      results.forEach(result => {
        newBondMap[result.userId] = result.data;
      });
      setBondDataMap(newBondMap);
    } catch (error) {
      console.error('Load bond data error:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const getMessagePreview = (message: Message | null): string => {
    if (!message) return '';

    switch (message.messageType) {
      case 'image':
        return '📷 Photo';
      case 'gif':
        return 'GIF';
      case 'post_share':
        return '📤 Shared a post';
      default:
        return message.content || '';
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = item.user1.id === currentUserId ? item.user2 : item.user1;
    const hasUnread = item.unreadCount > 0;
    const bondData = bondDataMap[otherUser.id];
    const rankInfo = bondData ? getBondRankInfo(bondData.trustScore) : null;

    return (
      <TouchableOpacity
        style={dynamicStyles.conversationItem}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.id,
          otherUser
        })}
        activeOpacity={0.7}
      >
        <View style={dynamicStyles.avatarWrapper}>
          {/* Avatar with bond ring */}
          <View style={[
            dynamicStyles.avatarRing,
            rankInfo && { borderColor: rankInfo.color }
          ]}>
            <Avatar
              size={50}
              avatarUrl={!otherUser.activeAvatar ? otherUser.avatarUrl : undefined}
              username={otherUser.username}
              customizations={otherUser.activeAvatar?.customizations}
              avatarStyle={otherUser.activeAvatar?.style}
            />
          </View>
          {/* Bond score badge */}
          {rankInfo && bondData && bondData.trustScore > 0 && (
            <LinearGradient
              colors={rankInfo.gradient}
              style={dynamicStyles.bondBadge}
            >
              <Text style={dynamicStyles.bondBadgeText}>{bondData.trustScore}</Text>
            </LinearGradient>
          )}
          {/* Streak indicator */}
          {bondData && bondData.currentStreak > 0 && (
            <View style={dynamicStyles.streakIndicator}>
              <Ionicons name="flame" size={10} color="#FFF" />
            </View>
          )}
        </View>

        <View style={dynamicStyles.conversationContent}>
          <View style={dynamicStyles.conversationHeader}>
            <View style={dynamicStyles.usernameRow}>
              <Text style={[
                dynamicStyles.username,
                hasUnread && dynamicStyles.usernameUnread
              ]}>
                {otherUser.username}
              </Text>
              {/* Rank label badge */}
              {rankInfo && bondData && bondData.trustScore >= 20 && (
                <View style={[dynamicStyles.rankMini, { backgroundColor: rankInfo.bgColor }]}>
                  <Ionicons name={rankInfo.icon} size={10} color={rankInfo.color} />
                </View>
              )}
            </View>
            {item.lastMessageAt && (
              <Text style={[
                dynamicStyles.timestamp,
                hasUnread && dynamicStyles.timestampUnread
              ]}>
                {formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: false })}
              </Text>
            )}
          </View>

          <View style={dynamicStyles.lastMessageRow}>
            <Text
              style={[
                dynamicStyles.lastMessage,
                hasUnread && dynamicStyles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {getMessagePreview(item.lastMessage)}
            </Text>

            {hasUnread && (
              <View style={dynamicStyles.unreadBadge}>
                <Text style={dynamicStyles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={dynamicStyles.emptyState}>
              <View style={dynamicStyles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.text.tertiary} />
              </View>
              <Text style={dynamicStyles.emptyText}>No conversations yet</Text>
              <Text style={dynamicStyles.emptySubtext}>
                Start chatting with your friends!
              </Text>
              <TouchableOpacity
                style={dynamicStyles.startChatButton}
                onPress={handleNewMessage}
              >
                <Text style={dynamicStyles.startChatButtonText}>Send Message</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createDynamicStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: '#E5E7EB',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bondBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    minWidth: 22,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.background,
  },
  bondBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  streakIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  rankMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.status.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  username: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
    color: colors.text.primary,
  },
  usernameUnread: {
    fontWeight: Typography.weight.semibold,
  },
  timestamp: {
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
  },
  timestampUnread: {
    color: colors.text.primary,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
  },
  unreadMessage: {
    fontWeight: Typography.weight.medium,
    color: colors.text.primary,
  },
  unreadBadge: {
    backgroundColor: Colors.brand.accent,
    borderRadius: Spacing.radius.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: Spacing.sm,
  },
  unreadCount: {
    color: Colors.common.white,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: Typography.size.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  startChatButton: {
    backgroundColor: Colors.brand.blue,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.radius.lg,
  },
  startChatButtonText: {
    color: Colors.common.white,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
});
