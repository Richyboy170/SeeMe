import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { socketService } from '../../services/socket';
import { api, getImageUrl } from '../../services/api';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUnreadCount } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ImageViewMode = 'keep' | 'view_once' | 'time_bomb';

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
  mediaUrl?: string;
  imageViewMode?: ImageViewMode;
  viewedAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
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

  // Unread count context for badge updates
  const { refreshUnreadCount } = useUnreadCount();

  // Image message states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageViewModeModalVisible, setImageViewModeModalVisible] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<Message | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewOnceCountdown, setViewOnceCountdown] = useState<number | null>(null);
  const [timeBombDuration, setTimeBombDuration] = useState(10); // seconds

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

  // Mark messages as read when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (messages.length > 0 && currentUserId) {
        markMessagesAsReadNow();
      }
    }, [messages, currentUserId])
  );

  const markMessagesAsReadNow = () => {
    const unreadMessageIds = messages
      .filter(m => !m.isRead && m.senderId === otherUser.id)
      .map(m => m.id);

    if (unreadMessageIds.length > 0) {
      socketService.emit('chat:mark_read', {
        conversationId,
        messageIds: unreadMessageIds
      });

      // Update local state immediately
      setMessages(prev =>
        prev.map(msg =>
          unreadMessageIds.includes(msg.id)
            ? { ...msg, isRead: true, readAt: new Date().toISOString() }
            : msg
        )
      );

      // Refresh the global unread count for the tab badge
      refreshUnreadCount();
    }
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
    // Use the improved version that also updates local state
    markMessagesAsReadNow();
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

  // Image handling functions
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageViewModeModalVisible(true);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageViewModeModalVisible(true);
    }
  };

  const sendImageMessage = async (viewMode: ImageViewMode) => {
    if (!selectedImage || !currentUserId) return;

    setSendingImage(true);
    setImageViewModeModalVisible(false);

    try {
      // Create form data for image upload
      const formData = new FormData();
      const filename = selectedImage.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: selectedImage,
        name: filename,
        type,
      } as any);
      formData.append('conversationId', conversationId);
      formData.append('receiverId', otherUser.id);
      formData.append('messageType', 'image');
      formData.append('imageViewMode', viewMode);
      if (viewMode === 'time_bomb') {
        formData.append('expiresInSeconds', timeBombDuration.toString());
      }

      const response = await api.sendImageMessage(formData);

      if (response.message) {
        setMessages(prev => [...prev, response.message]);
        scrollToBottom();
      }

      setSelectedImage(null);
    } catch (error) {
      console.error('Failed to send image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setSendingImage(false);
    }
  };

  const handleViewImage = (message: Message) => {
    // Check if image is expired
    if (message.isExpired) {
      Alert.alert('Expired', 'This image has expired and can no longer be viewed.');
      return;
    }

    // For view_once, check if already viewed
    if (message.imageViewMode === 'view_once' && message.viewedAt && message.senderId !== currentUserId) {
      Alert.alert('Already Viewed', 'This image can only be viewed once.');
      return;
    }

    setViewingImage(message);
    setImageViewerVisible(true);

    // Handle view_once - mark as viewed after opening
    if (message.imageViewMode === 'view_once' && message.senderId !== currentUserId && !message.viewedAt) {
      // Start countdown
      setViewOnceCountdown(5);
      const interval = setInterval(() => {
        setViewOnceCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            closeImageViewer();
            markImageAsViewed(message.id);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Handle time_bomb - auto close when expired
    if (message.imageViewMode === 'time_bomb' && message.expiresAt) {
      const expiresAt = new Date(message.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

      if (remaining > 0) {
        setViewOnceCountdown(remaining);
        const interval = setInterval(() => {
          setViewOnceCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              closeImageViewer();
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setViewingImage(null);
    setViewOnceCountdown(null);
  };

  const markImageAsViewed = async (messageId: string) => {
    try {
      await api.markImageViewed(messageId);
      // Update local state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, viewedAt: new Date().toISOString(), isExpired: msg.imageViewMode === 'view_once' }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to mark image as viewed:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const isImageMessage = item.messageType === 'image';

    // Determine image status for display
    const getImageStatusText = () => {
      if (!isImageMessage) return null;

      if (item.isExpired) {
        return item.imageViewMode === 'view_once' ? 'Photo viewed' : 'Photo expired';
      }

      if (item.imageViewMode === 'view_once') {
        if (item.viewedAt && !isOwnMessage) return 'Photo viewed';
        return 'View once photo';
      }

      if (item.imageViewMode === 'time_bomb') {
        if (item.expiresAt) {
          const expiresAt = new Date(item.expiresAt).getTime();
          const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
          if (remaining <= 0) return 'Photo expired';
          return `Expires in ${remaining}s`;
        }
        return 'Timed photo';
      }

      return null;
    };

    const imageStatusText = getImageStatusText();
    const canViewImage = isImageMessage && !item.isExpired &&
      !(item.imageViewMode === 'view_once' && item.viewedAt && !isOwnMessage);

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
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
            isImageMessage && styles.imageBubble
          ]}
        >
          {isImageMessage ? (
            <TouchableOpacity
              onPress={() => canViewImage && handleViewImage(item)}
              activeOpacity={canViewImage ? 0.8 : 1}
            >
              {item.isExpired || (item.imageViewMode === 'view_once' && item.viewedAt && !isOwnMessage) ? (
                // Show placeholder for expired/viewed images
                <View style={styles.expiredImagePlaceholder}>
                  <Ionicons
                    name={item.imageViewMode === 'view_once' ? 'eye-off' : 'time'}
                    size={32}
                    color="#9CA3AF"
                  />
                  <Text style={styles.expiredImageText}>{imageStatusText}</Text>
                </View>
              ) : (
                // Show image preview
                <View>
                  {item.mediaUrl && (
                    <Image
                      source={{ uri: getImageUrl(item.mediaUrl) || '' }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  )}
                  {/* View mode indicator overlay */}
                  {item.imageViewMode && item.imageViewMode !== 'keep' && (
                    <View style={styles.viewModeOverlay}>
                      <Ionicons
                        name={item.imageViewMode === 'view_once' ? 'eye' : 'time'}
                        size={16}
                        color="#FFF"
                      />
                      <Text style={styles.viewModeText}>
                        {item.imageViewMode === 'view_once' ? '1' : imageStatusText?.replace('Expires in ', '')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownText : styles.otherText
              ]}
            >
              {item.content}
            </Text>
          )}
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
        {/* Camera button */}
        <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
          <Ionicons name="camera" size={24} color="#6B7280" />
        </TouchableOpacity>

        {/* Gallery button */}
        <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
          <Ionicons name="image" size={24} color="#6B7280" />
        </TouchableOpacity>

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
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Image View Mode Selection Modal */}
      <Modal
        visible={imageViewModeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setImageViewModeModalVisible(false);
          setSelectedImage(null);
        }}
      >
        <View style={styles.viewModeModalContainer}>
          <View style={styles.viewModeModalHeader}>
            <TouchableOpacity onPress={() => {
              setImageViewModeModalVisible(false);
              setSelectedImage(null);
            }}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.viewModeModalTitle}>Send Photo</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Image Preview */}
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Time Bomb Duration Selector (shown only when time_bomb is selected) */}
          <View style={styles.timeBombSelector}>
            <Text style={styles.timeBombLabel}>Timer duration: {timeBombDuration}s</Text>
            <View style={styles.timeBombButtons}>
              {[5, 10, 15, 30].map(seconds => (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    styles.timeBombButton,
                    timeBombDuration === seconds && styles.timeBombButtonActive
                  ]}
                  onPress={() => setTimeBombDuration(seconds)}
                >
                  <Text style={[
                    styles.timeBombButtonText,
                    timeBombDuration === seconds && styles.timeBombButtonTextActive
                  ]}>
                    {seconds}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Send Options */}
          <View style={styles.sendOptionsContainer}>
            <TouchableOpacity
              style={styles.sendOptionButton}
              onPress={() => sendImageMessage('keep')}
              disabled={sendingImage}
            >
              <View style={styles.sendOptionIcon}>
                <Ionicons name="chatbubble" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.sendOptionTitle}>Keep in Chat</Text>
              <Text style={styles.sendOptionDesc}>Photo stays in conversation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendOptionButton}
              onPress={() => sendImageMessage('view_once')}
              disabled={sendingImage}
            >
              <View style={styles.sendOptionIcon}>
                <Ionicons name="eye" size={28} color="#F59E0B" />
              </View>
              <Text style={styles.sendOptionTitle}>View Once</Text>
              <Text style={styles.sendOptionDesc}>Photo disappears after viewing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sendOptionButton}
              onPress={() => sendImageMessage('time_bomb')}
              disabled={sendingImage}
            >
              <View style={styles.sendOptionIcon}>
                <Ionicons name="time" size={28} color="#EF4444" />
              </View>
              <Text style={styles.sendOptionTitle}>Time Bomb</Text>
              <Text style={styles.sendOptionDesc}>Photo expires after {timeBombDuration}s</Text>
            </TouchableOpacity>
          </View>

          {sendingImage && (
            <View style={styles.sendingOverlay}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.sendingText}>Sending...</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Full Screen Image Viewer */}
      <Modal
        visible={imageViewerVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeImageViewer}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={closeImageViewer}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>

          {viewingImage?.mediaUrl && (
            <Image
              source={{ uri: getImageUrl(viewingImage.mediaUrl) || '' }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}

          {/* Countdown indicator for view_once and time_bomb */}
          {viewOnceCountdown !== null && (
            <View style={styles.countdownContainer}>
              <Ionicons
                name={viewingImage?.imageViewMode === 'view_once' ? 'eye' : 'time'}
                size={24}
                color="#FFF"
              />
              <Text style={styles.countdownText}>{viewOnceCountdown}</Text>
            </View>
          )}

          {/* View mode indicator */}
          {viewingImage?.imageViewMode && viewingImage.imageViewMode !== 'keep' && (
            <View style={styles.viewerModeIndicator}>
              <Ionicons
                name={viewingImage.imageViewMode === 'view_once' ? 'eye' : 'time'}
                size={16}
                color="#FFF"
              />
              <Text style={styles.viewerModeText}>
                {viewingImage.imageViewMode === 'view_once' ? 'View Once' : 'Timed Photo'}
              </Text>
            </View>
          )}
        </View>
      </Modal>
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
  },
  mediaButton: {
    padding: 8,
    marginRight: 4,
  },
  // Image message styles
  imageBubble: {
    padding: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  expiredImagePlaceholder: {
    width: 200,
    height: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredImageText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  viewModeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewModeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // View Mode Modal styles
  viewModeModalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  viewModeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewModeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  timeBombSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  timeBombLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeBombButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  timeBombButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  timeBombButtonActive: {
    backgroundColor: '#EF4444',
  },
  timeBombButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeBombButtonTextActive: {
    color: '#FFF',
  },
  sendOptionsContainer: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sendOptionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendOptionIcon: {
    marginBottom: 8,
  },
  sendOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sendOptionDesc: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  sendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3B82F6',
  },
  // Full screen image viewer styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  countdownContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  countdownText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  viewerModeIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  viewerModeText: {
    color: '#FFF',
    fontSize: 14,
  },
});
