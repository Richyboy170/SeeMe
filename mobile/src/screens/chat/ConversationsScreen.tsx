import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { api } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { ChatStackParamList } from '../../navigation';

interface User {
  id: string;
  username: string;
  avatarUrl?: string;
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

type ConversationsScreenNavigationProp = StackNavigationProp<ChatStackParamList, 'Conversations'>;

export default function ConversationsScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const navigation = useNavigation<ConversationsScreenNavigationProp>();

  useEffect(() => {
    loadCurrentUser();
    loadConversations();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await api.getProfile();
      setCurrentUserId(response.user.id);
    } catch (error) {
      console.error('Load current user error:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    // Determine the other user
    const otherUser = item.user1.id === currentUserId ? item.user2 : item.user1;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.id,
          otherUser
        })}
      >
        <Image
          source={{ uri: otherUser.avatarUrl || 'https://via.placeholder.com/56' }}
          style={styles.avatar}
        />

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.username}>{otherUser.username}</Text>
            {item.lastMessageAt && (
              <Text style={styles.timestamp}>
                {formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: true })}
              </Text>
            )}
          </View>

          <View style={styles.lastMessageRow}>
            {item.lastMessage && (
              <Text
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.unreadMessage
                ]}
                numberOfLines={1}
              >
                {item.lastMessage.content || '📷 Image'}
              </Text>
            )}

            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Start chatting with your friends!
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
    backgroundColor: '#FFFFFF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center'
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280'
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#111827'
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  emptyState: {
    padding: 48,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center'
  }
});
