import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  useColorScheme,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../services/api';
import { socketService } from '../../services/socket';
import { useUnreadCount } from '../../navigation/types';
import Avatar from '../Avatar';
import { AvatarCustomizations } from '../AvatarRenderer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 400);

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
  senderId: string;
}

interface Conversation {
  id: string;
  user1: User;
  user2: User;
  lastMessage: Message | null;
  lastMessageAt: string;
  unreadCount: number;
}

interface ChatDrawerProps {
  visible: boolean;
  onClose: () => void;
}

// Theme colors
const themes = {
  dark: {
    background: '#000000',
    cardBackground: '#16181C',
    text: '#E7E9EA',
    textSecondary: '#71767B',
    separator: '#2F3336',
    border: '#2F3336',
    accent: '#1D9BF0',
    headerBg: '#000000',
    inputBg: '#202327',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  light: {
    background: '#FFFFFF',
    cardBackground: '#F7F9F9',
    text: '#0F1419',
    textSecondary: '#536471',
    separator: '#EFF3F4',
    border: '#CFD9DE',
    accent: '#1D9BF0',
    headerBg: '#FFFFFF',
    inputBg: '#EFF3F4',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
};

export default function ChatDrawer({ visible, onClose }: ChatDrawerProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? themes.dark : themes.light;
  const insets = useSafeAreaInsets();
  const { refreshUnreadCount } = useUnreadCount();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    otherUser: User;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Pan responder for swipe to close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 10 && Math.abs(gestureState.dy) < 50;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > DRAWER_WIDTH * 0.3 || gestureState.vx > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      loadCurrentUser();
      loadConversations();
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 65,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Set up socket listeners
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('chat:new_message', handleSocketNewMessage);
        socket.on('chat:messages_read', handleMessagesRead);
        socket.on('chat:message_sent', handleMessageSent);
      }
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('chat:new_message', handleSocketNewMessage);
        socket.off('chat:messages_read', handleMessagesRead);
        socket.off('chat:message_sent', handleMessageSent);
      }
    };
  }, [visible]);

  const handleSocketNewMessage = useCallback((data: any) => {
    if (data.message) {
      // If we're in the chat view and this is from the current conversation
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setMessages(prev => [data.message, ...prev]);
        // Mark as read
        api.post(`/chat/conversations/${selectedConversation.id}/read`).catch(console.error);
      }
      loadConversations();
    }
  }, [selectedConversation]);

  const handleMessagesRead = useCallback((data: any) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === data.conversationId ? { ...conv, unreadCount: 0 } : conv
      )
    );
  }, []);

  const handleMessageSent = useCallback((data: any) => {
    if (data.message && selectedConversation) {
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [data.message, ...prev];
      });
    }
  }, [selectedConversation]);

  const handleClose = () => {
    setSelectedConversation(null);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
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
      const response = await api.get('/chat/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setChatLoading(true);
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      setMessages(response.data.messages || []);
      // Mark messages as read
      await api.post(`/chat/conversations/${conversationId}/read`);
      refreshUnreadCount();
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    const otherUser = conversation.user1.id === currentUserId ? conversation.user2 : conversation.user1;
    setSelectedConversation({ id: conversation.id, otherUser });
    loadMessages(conversation.id);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setMessages([]);
    loadConversations();
    refreshUnreadCount();
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const response = await api.post(`/chat/conversations/${selectedConversation.id}/messages`, {
        content: text,
        messageType: 'text',
      });

      if (response.data.message) {
        setMessages(prev => [response.data.message, ...prev]);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessageText(text); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = item.user1.id === currentUserId ? item.user2 : item.user1;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, { borderBottomColor: colors.separator }]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <Avatar
          size={50}
          avatarUrl={!otherUser.activeAvatar ? otherUser.avatarUrl : undefined}
          username={otherUser.username}
          customizations={otherUser.activeAvatar?.customizations}
          avatarStyle={otherUser.activeAvatar?.style}
        />

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
              {otherUser.username}
            </Text>
            {item.lastMessageAt && (
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {formatDistanceToNow(new Date(item.lastMessageAt), { addSuffix: false })}
              </Text>
            )}
          </View>

          <View style={styles.lastMessageRow}>
            {item.lastMessage && (
              <Text
                style={[
                  styles.lastMessage,
                  { color: colors.textSecondary },
                  item.unreadCount > 0 && { color: colors.text, fontWeight: '600' },
                ]}
                numberOfLines={1}
              >
                {item.lastMessage.content || 'Image'}
              </Text>
            )}

            {item.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUserId;

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        <View
          style={[
            styles.messageBubble,
            isMe
              ? [styles.messageBubbleMe, { backgroundColor: colors.accent }]
              : [styles.messageBubbleOther, { backgroundColor: colors.inputBg }],
          ]}
        >
          <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : colors.text }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.overlay,
            {
              backgroundColor: colors.overlay,
              opacity: overlayAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: colors.background,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.headerBg,
                borderBottomColor: colors.separator,
                paddingTop: insets.top + 8,
              },
            ]}
          >
            {selectedConversation ? (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToConversations}
                >
                  <Ionicons name="chevron-back" size={24} color={colors.accent} />
                </TouchableOpacity>
                <View style={styles.headerUserInfo}>
                  <Avatar
                    size={32}
                    username={selectedConversation.otherUser.username}
                    customizations={selectedConversation.otherUser.activeAvatar?.customizations}
                    avatarStyle={selectedConversation.otherUser.activeAvatar?.style}
                  />
                  <Text style={[styles.headerTitle, { color: colors.text, marginLeft: 10 }]}>
                    {selectedConversation.otherUser.username}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
              </>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {selectedConversation ? (
            // Chat View
            <View style={styles.chatContainer}>
              {chatLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              ) : (
                <FlatList
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id}
                  inverted
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.messagesList}
                  ListEmptyComponent={
                    <View style={styles.emptyChat}>
                      <Text style={[styles.emptyChatText, { color: colors.textSecondary }]}>
                        Start the conversation!
                      </Text>
                    </View>
                  }
                />
              )}

              {/* Input */}
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.headerBg,
                    borderTopColor: colors.separator,
                    paddingBottom: insets.bottom + 8,
                  },
                ]}
              >
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Message..."
                    placeholderTextColor={colors.textSecondary}
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={1000}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { opacity: messageText.trim() && !sending ? 1 : 0.5 },
                  ]}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim() || sending}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Conversations List
            <>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              ) : (
                <FlatList
                  data={conversations}
                  renderItem={renderConversation}
                  keyExtractor={(item) => item.id}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={colors.accent}
                    />
                  }
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={
                    conversations.length === 0 ? { flex: 1 } : undefined
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Ionicons
                        name="chatbubbles-outline"
                        size={64}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.emptyText, { color: colors.text }]}>
                        No messages yet
                      </Text>
                      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                        Start chatting with your friends!
                      </Text>
                    </View>
                  }
                />
              )}
            </>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    transform: [{ scaleY: -1 }],
  },
  emptyChatText: {
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
