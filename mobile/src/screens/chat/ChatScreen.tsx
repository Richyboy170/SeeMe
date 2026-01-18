import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { socketService } from '../../services/socket';
import { api } from '../../services/api';
import { format } from 'date-fns';

interface User {
  id: string;
  username: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  tempId?: string; // For optimistic updates
}

interface ChatScreenProps {
  route: {
    params: {
      conversationId: string;
      otherUser: User;
    };
  };
}

export default function ChatScreen({ route }: ChatScreenProps) {
  const { conversationId, otherUser } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    joinConversation();

    // Socket listeners
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('chat:new_message', handleNewMessage);
      socket.on('chat:message_sent', handleMessageSent);
      socket.on('chat:messages_read', handleMessagesRead);
      socket.on('chat:user_typing', handleUserTyping);
      socket.on('chat:user_stopped_typing', handleUserStoppedTyping);
    }

    return () => {
      leaveConversation();
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('chat:new_message', handleNewMessage);
        socket.off('chat:message_sent', handleMessageSent);
        socket.off('chat:messages_read', handleMessagesRead);
        socket.off('chat:user_typing', handleUserTyping);
        socket.off('chat:user_stopped_typing', handleUserStoppedTyping);
      }
    };
  }, [conversationId]);

  const loadCurrentUser = async () => {
    try {
      const response = await api.getProfile();
      const user = response.user || response;
      setCurrentUserId(user.id);
    } catch (error) {
      console.error('Load current user error:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      setMessages(response.data.messages);
      markMessagesAsRead();
    } catch (error) {
      console.error('Load messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinConversation = () => {
    socketService.emit('chat:join_conversation', conversationId);
  };

  const leaveConversation = () => {
    socketService.emit('chat:leave_conversation', conversationId);
  };

  const markMessagesAsRead = () => {
    const unreadMessageIds = messages
      .filter(m => !m.isRead && m.senderId === otherUser.id)
      .map(m => m.id);

    if (unreadMessageIds.length > 0) {
      socketService.emit('chat:mark_read', {
        conversationId,
        messageIds: unreadMessageIds
      });
    }
  };

  const handleNewMessage = (data: any) => {
    if (data.conversationId === conversationId) {
      setMessages(prev => [...prev, data.message]);
      markMessagesAsRead();
      scrollToBottom();
    }
  };

  const handleMessageSent = (data: any) => {
    // Replace temp message with real one
    setMessages(prev =>
      prev.map(msg =>
        msg.tempId === data.tempId ? data.message : msg
      )
    );
  };

  const handleMessagesRead = (data: any) => {
    if (data.conversationId === conversationId && Array.isArray(data.messageIds)) {
      setMessages(prev =>
        prev.map(msg =>
          data.messageIds.includes(msg.id)
            ? { ...msg, isRead: true, readAt: data.readAt }
            : msg
        )
      );
    }
  };

  const handleUserTyping = (data: any) => {
    if (data.conversationId === conversationId && data.userId === otherUser.id) {
      setIsOtherUserTyping(true);
    }
  };

  const handleUserStoppedTyping = (data: any) => {
    if (data.conversationId === conversationId && data.userId === otherUser.id) {
      setIsOtherUserTyping(false);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !currentUserId) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      senderId: currentUserId,
      content: inputText.trim(),
      messageType: 'text',
      createdAt: new Date().toISOString(),
      isRead: false
    };

    // Optimistic update
    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    scrollToBottom();

    // Send via socket
    socketService.emit('chat:send_message', {
      conversationId,
      receiverId: otherUser.id,
      messageType: 'text',
      content: inputText.trim(),
      tempId
    });

    // Stop typing
    stopTyping();
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    // Typing indicators
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socketService.emit('chat:typing_start', {
        conversationId,
        receiverId: otherUser.id
      });
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socketService.emit('chat:typing_stop', {
        conversationId,
        receiverId: otherUser.id
      });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === currentUserId;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownText : styles.otherText
            ]}
          >
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timestamp,
              isOwnMessage && styles.ownTimestamp
            ]}>
              {format(new Date(item.createdAt), 'HH:mm')}
            </Text>
            {isOwnMessage && (
              <Text style={styles.readReceipt}>
                {item.isRead ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
      />

      {isOtherUserTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{otherUser.username} is typing...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  messagesList: {
    padding: 16
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%'
  },
  ownMessage: {
    alignSelf: 'flex-end'
  },
  otherMessage: {
    alignSelf: 'flex-start'
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '100%'
  },
  ownBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20
  },
  ownText: {
    color: '#FFFFFF'
  },
  otherText: {
    color: '#111827'
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4
  },
  timestamp: {
    fontSize: 11,
    color: '#6B7280'
  },
  ownTimestamp: {
    color: 'rgba(255,255,255,0.7)'
  },
  readReceipt: {
    fontSize: 12,
    color: '#60A5FA'
  },
  typingIndicator: {
    padding: 8,
    paddingLeft: 16
  },
  typingText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#6B7280'
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15
  }
});
