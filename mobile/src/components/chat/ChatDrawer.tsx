import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
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
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow, format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { api, getImageUrl } from '../../services/api';
import { socketService } from '../../services/socket';
import { useUnreadCount } from '../../navigation/types';
import Avatar from '../Avatar';
import { AvatarCustomizations } from '../AvatarRenderer';
import GifPicker from './GifPicker';
import MessageReactions from './MessageReactions';
import QuotedMessage from './QuotedMessage';
import VoiceMessageBubble from './VoiceMessageBubble';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH;

type ImageViewMode = 'keep' | 'view_once' | 'time_bomb';

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

interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: { id: string; username: string };
}

interface ReplyTo {
  id: string;
  content: string;
  senderId: string;
  messageType: string;
  sender?: { id: string; username: string };
}

interface Message {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  isRead: boolean;
  senderId: string;
  mediaUrl?: string;
  imageViewMode?: ImageViewMode;
  viewedAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  reactions?: MessageReaction[];
  replyToId?: string;
  replyTo?: ReplyTo;
  isUnsent?: boolean;
  duration?: number;
  waveform?: string | number[];
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
  externalAnim?: Animated.Value; // External animation value for smooth swipe-to-open (legacy drawer)
  pageAnim?: Animated.Value; // Page animation value (0 = Feed visible, 1 = Messages visible)
  isPageStyle?: boolean; // When true, renders as solid page instead of drawer overlay
}

// Ref methods exposed to parent component
export interface ChatDrawerRef {
  triggerGoHome: () => void; // Fast animated transition: Chatbox → Messages → Home
  isInChatbox: () => boolean; // Check if currently viewing a conversation
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

const ChatDrawer = forwardRef<ChatDrawerRef, ChatDrawerProps>(({ visible, onClose, externalAnim, pageAnim, isPageStyle = false }, ref) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? themes.dark : themes.light;
  const insets = useSafeAreaInsets();
  const { refreshUnreadCount, decrementUnreadCount } = useUnreadCount();

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

  // Image message states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageViewModeModalVisible, setImageViewModeModalVisible] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<Message | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewOnceCountdown, setViewOnceCountdown] = useState<number | null>(null);
  const [timeBombDuration, setTimeBombDuration] = useState(10);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // GIF picker state
  const [gifPickerVisible, setGifPickerVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  // Animation for chatbox slide (0 = chatbox visible, 1 = chatbox off-screen to right)
  const chatboxAnim = useRef(new Animated.Value(0)).current;

  // Refs to track current prop values for pan responder
  const isPageStyleRef = useRef(isPageStyle);
  const pageAnimRef = useRef(pageAnim);
  const onCloseRef = useRef(onClose);
  const selectedConversationRef = useRef(selectedConversation);
  const chatboxAnimRef = useRef(chatboxAnim);

  // Keep refs updated
  useEffect(() => {
    isPageStyleRef.current = isPageStyle;
    pageAnimRef.current = pageAnim;
    onCloseRef.current = onClose;
    selectedConversationRef.current = selectedConversation;
    chatboxAnimRef.current = chatboxAnim;
  }, [isPageStyle, pageAnim, onClose, selectedConversation, chatboxAnim]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    // Trigger fast animated transition: Chatbox → Messages → Home
    triggerGoHome: () => {
      // Fast animation parameters
      const fastAnimConfig = {
        useNativeDriver: true,
        damping: 25,
        stiffness: 400,
        mass: 0.6,
      };

      if (selectedConversationRef.current) {
        // In chatbox: animate chatbox off first, then messages off
        Animated.spring(chatboxAnimRef.current, {
          toValue: 1,
          ...fastAnimConfig,
        }).start(() => {
          // After chatbox slides off, slide messages off
          setSelectedConversation(null);
          setMessages([]);

          if (pageAnimRef.current) {
            Animated.spring(pageAnimRef.current, {
              toValue: 0,
              ...fastAnimConfig,
            }).start(() => {
              onCloseRef.current();
              chatboxAnimRef.current.setValue(0);
            });
          } else {
            onCloseRef.current();
            chatboxAnimRef.current.setValue(0);
          }
        });
      } else {
        // In messages list: just slide messages off
        if (pageAnimRef.current) {
          Animated.spring(pageAnimRef.current, {
            toValue: 0,
            ...fastAnimConfig,
          }).start(() => {
            onCloseRef.current();
          });
        } else {
          onCloseRef.current();
        }
      }
    },
    // Check if currently viewing a conversation
    isInChatbox: () => {
      return selectedConversationRef.current !== null;
    },
  }), []);

  // Reset chatbox animation when entering a conversation
  useEffect(() => {
    if (selectedConversation) {
      chatboxAnim.setValue(0);
    }
  }, [selectedConversation]);

  // Pan responder for swipe to close (different behavior for page style vs drawer style)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture intentional horizontal swipes, not taps or slight movements
        const isHorizontalSwipe = gestureState.dx > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
        return isHorizontalSwipe;
      },
      onPanResponderTerminationRequest: () => true, // Allow other responders to take over
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          // In chatbox mode - animate chatbox sliding off
          if (selectedConversationRef.current) {
            const progress = Math.min(1, gestureState.dx / DRAWER_WIDTH);
            chatboxAnimRef.current.setValue(progress);
            return;
          }
          if (isPageStyleRef.current && pageAnimRef.current) {
            // Page style: update pageAnim (1 = Messages visible, 0 = Feed visible)
            const progress = Math.max(0, 1 - gestureState.dx / DRAWER_WIDTH);
            pageAnimRef.current.setValue(progress);
          } else {
            slideAnim.setValue(gestureState.dx);
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > DRAWER_WIDTH * 0.3 || gestureState.vx > 0.5) {
          // Check if we're in chatbox mode - if so, animate out then go back to conversation list
          if (selectedConversationRef.current) {
            // Animate chatbox off-screen, then switch to conversation list
            Animated.spring(chatboxAnimRef.current, {
              toValue: 1,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
              mass: 0.8,
            }).start(() => {
              // After animation completes, go back to conversation list
              setSelectedConversation(null);
              setMessages([]);
              loadConversations();
              // Reset animation for next time
              chatboxAnimRef.current.setValue(0);
            });
            return;
          }

          if (isPageStyleRef.current && pageAnimRef.current) {
            // In conversation list: close and go to Home
            onCloseRef.current();
            Animated.spring(pageAnimRef.current, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
              mass: 0.8,
            }).start();
          } else {
            handleClose();
          }
        } else {
          // Snap back
          if (selectedConversationRef.current) {
            // Snap chatbox back to visible
            Animated.spring(chatboxAnimRef.current, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
              mass: 0.8,
            }).start();
            return;
          }

          if (isPageStyleRef.current && pageAnimRef.current) {
            // Snap back to Messages visible with smooth animation
            Animated.spring(pageAnimRef.current, {
              toValue: 1,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
              mass: 0.8,
            }).start();
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
              mass: 0.8,
            }).start();
          }
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      loadCurrentUser();
      loadConversations();

      // If externalAnim is provided, sync slideAnim to it (swipe-to-open case)
      // Otherwise animate normally (tap button case)
      if (externalAnim) {
        // Sync internal animation with external one
        slideAnim.setValue(0);
        overlayAnim.setValue(1);
      } else {
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
      }

      const socket = socketService.getSocket();
      if (socket) {
        socket.on('chat:new_message', handleSocketNewMessage);
        socket.on('chat:messages_read', handleMessagesRead);
        socket.on('chat:message_sent', handleMessageSent);
        socket.on('chat:reaction_added', handleReactionAdded);
        socket.on('chat:reaction_removed', handleReactionRemoved);
        socket.on('chat:message_unsent', handleMessageUnsent);
      }
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('chat:new_message', handleSocketNewMessage);
        socket.off('chat:messages_read', handleMessagesRead);
        socket.off('chat:message_sent', handleMessageSent);
        socket.off('chat:reaction_added', handleReactionAdded);
        socket.off('chat:reaction_removed', handleReactionRemoved);
        socket.off('chat:message_unsent', handleMessageUnsent);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [visible]);

  const handleSocketNewMessage = useCallback((data: any) => {
    if (data.message) {
      if (selectedConversation && data.conversationId === selectedConversation.id) {
        setMessages(prev => [data.message, ...prev]);
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
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [data.message, ...prev];
      });
    }
  }, [selectedConversation]);

  const handleReactionAdded = useCallback((data: any) => {
    if (data.reaction) {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === data.reaction.messageId) {
            const existing = msg.reactions || [];
            // Remove old reaction by same user, add new one
            const filtered = existing.filter(r => r.userId !== data.reaction.userId);
            return { ...msg, reactions: [...filtered, data.reaction] };
          }
          return msg;
        })
      );
    }
  }, []);

  const handleReactionRemoved = useCallback((data: any) => {
    if (data.messageId && data.userId) {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === data.messageId) {
            return {
              ...msg,
              reactions: (msg.reactions || []).filter(r => r.userId !== data.userId),
            };
          }
          return msg;
        })
      );
    }
  }, []);

  const handleMessageUnsent = useCallback((data: any) => {
    if (data.messageId) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId
            ? { ...msg, isUnsent: true, content: '', mediaUrl: undefined }
            : msg
        )
      );
    }
  }, []);

  const handleClose = () => {
    setSelectedConversation(null);
    if (isPageStyle && pageAnim) {
      // Page style: close immediately then animate smoothly
      onClose();
      Animated.spring(pageAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      }).start();
    } else {
      // Drawer style: animate with overlay
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose();
      });
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

  const loadConversations = async () => {
    try {
      const response = await api.getConversations();
      setConversations(response.conversations || []);
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
      const response = await api.getMessages(conversationId);
      const loadedMessages = response.messages || [];
      setMessages(loadedMessages);

      // Mark unread messages as read via socket
      const unreadMessageIds = loadedMessages
        .filter((msg: Message) => !msg.isRead && msg.senderId !== currentUserId)
        .map((msg: Message) => msg.id);

      if (unreadMessageIds.length > 0) {
        const socket = socketService.getSocket();
        if (socket) {
          socket.emit('chat:mark_read', {
            conversationId,
            messageIds: unreadMessageIds,
          });
        }
      }

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

    // Decrement unread count and update local state
    if (conversation.unreadCount > 0) {
      decrementUnreadCount(conversation.unreadCount);
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
        )
      );
    }
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
      const response = await api.sendMessage(selectedConversation.id, {
        content: text,
        messageType: 'text',
      });

      if (response.message) {
        setMessages(prev => [response.message, ...prev]);
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  // Image handling
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
    if (!selectedImage || !currentUserId || !selectedConversation) return;

    setSendingImage(true);
    setImageViewModeModalVisible(false);

    try {
      const formData = new FormData();
      const filename = selectedImage.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: selectedImage,
        name: filename,
        type,
      } as any);
      formData.append('conversationId', selectedConversation.id);
      formData.append('receiverId', selectedConversation.otherUser.id);
      formData.append('messageType', 'image');
      formData.append('imageViewMode', viewMode);
      if (viewMode === 'time_bomb') {
        formData.append('expiresInSeconds', timeBombDuration.toString());
      }

      const response = await api.sendImageMessage(formData);

      if (response.message) {
        setMessages(prev => [response.message, ...prev]);
      }

      setSelectedImage(null);
    } catch (error) {
      console.error('Failed to send image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setSendingImage(false);
    }
  };

  // Handle viewing image - Timer starts ONLY when recipient clicks to view
  const handleViewImage = (message: Message) => {
    const isMe = message.senderId === currentUserId;

    // Check if already expired
    if (message.isExpired) {
      Alert.alert('Expired', 'This image has expired and can no longer be viewed.');
      return;
    }

    // For view_once: check if already viewed (for recipient only)
    if (message.imageViewMode === 'view_once' && message.viewedAt && !isMe) {
      Alert.alert('Already Viewed', 'This image can only be viewed once.');
      return;
    }

    setViewingImage(message);
    setImageViewerVisible(true);

    // For recipient: Start countdown when they click to view
    if (!isMe) {
      if (message.imageViewMode === 'view_once') {
        // View once: 5 second countdown, then mark as viewed
        setViewOnceCountdown(5);
        countdownIntervalRef.current = setInterval(() => {
          setViewOnceCountdown(prev => {
            if (prev === null || prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
              closeImageViewer();
              markImageAsViewed(message.id);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (message.imageViewMode === 'time_bomb') {
        // Time bomb: Start the timer NOW when recipient clicks to view
        const duration = timeBombDuration; // Use the set duration
        setViewOnceCountdown(duration);
        countdownIntervalRef.current = setInterval(() => {
          setViewOnceCountdown(prev => {
            if (prev === null || prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
              closeImageViewer();
              markImageAsExpired(message.id);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  const closeImageViewer = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setImageViewerVisible(false);
    setViewingImage(null);
    setViewOnceCountdown(null);
  };

  const markImageAsViewed = async (messageId: string) => {
    try {
      await api.markImageViewed(messageId);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, viewedAt: new Date().toISOString(), isExpired: true }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to mark image as viewed:', error);
    }
  };

  const markImageAsExpired = async (messageId: string) => {
    try {
      await api.markImageViewed(messageId);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, isExpired: true }
            : msg
        )
      );
    } catch (error) {
      console.error('Failed to mark image as expired:', error);
    }
  };

  // Send GIF
  const sendGifMessage = async (gif: { id: string; url: string; previewUrl: string }) => {
    if (!currentUserId || !selectedConversation) return;

    setSending(true);

    try {
      const response = await api.sendMessage(selectedConversation.id, {
        content: gif.previewUrl || gif.url, // Use preview URL as content fallback
        messageType: 'gif',
        mediaUrl: gif.url, // Store full GIF URL in mediaUrl
      });

      if (response.message) {
        setMessages(prev => [response.message, ...prev]);
      }
    } catch (error) {
      console.error('Send GIF error:', error);
      Alert.alert('Error', 'Failed to send GIF. Please try again.');
    } finally {
      setSending(false);
      setGifPickerVisible(false);
    }
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
          size={52}
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
                {item.lastMessage.isUnsent ? 'Message unsent' :
                 item.lastMessage.messageType === 'image' ? '📷 Photo' :
                 item.lastMessage.messageType === 'gif' ? '🎬 GIF' :
                 item.lastMessage.messageType === 'voice' ? '🎤 Voice message' :
                 item.lastMessage.content || 'Image'}
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

  const handleToggleReaction = useCallback((messageId: string, emoji: string) => {
    const socket = socketService.getSocket();
    if (!socket || !selectedConversation) return;

    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(
      r => r.userId === currentUserId && r.emoji === emoji
    );

    if (existingReaction) {
      socket.emit('chat:remove_reaction', {
        messageId,
        conversationId: selectedConversation.id,
      });
    } else {
      socket.emit('chat:add_reaction', {
        messageId,
        emoji,
        conversationId: selectedConversation.id,
      });
    }
  }, [selectedConversation, messages, currentUserId]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUserId;
    const isImageMessage = item.messageType === 'image';
    const isGifMessage = item.messageType === 'gif';
    const isVoiceMessage = item.messageType === 'voice';

    // Unsent message placeholder
    if (item.isUnsent) {
      return (
        <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
          <View
            style={[
              styles.unsentBubble,
              {
                borderColor: colors.textSecondary,
                backgroundColor: 'transparent',
              },
            ]}
          >
            <Text style={[styles.unsentText, { color: colors.textSecondary }]}>
              Message unsent
            </Text>
          </View>
        </View>
      );
    }

    // Check if image should be hidden (view_once or time_bomb for recipient)
    const shouldHideImage = isImageMessage && !isMe &&
      (item.imageViewMode === 'view_once' || item.imageViewMode === 'time_bomb') &&
      !item.viewedAt && !item.isExpired;

    // Check if image is expired or already viewed
    const isImageExpiredOrViewed = isImageMessage && (
      item.isExpired ||
      (item.imageViewMode === 'view_once' && item.viewedAt && !isMe)
    );

    const getImageStatusText = () => {
      if (!isImageMessage) return null;

      if (item.isExpired || (item.imageViewMode === 'view_once' && item.viewedAt && !isMe)) {
        return item.imageViewMode === 'view_once' ? 'Photo opened' : 'Photo expired';
      }

      if (item.imageViewMode === 'view_once') {
        return 'Tap to view once';
      }

      if (item.imageViewMode === 'time_bomb') {
        return `Tap to view (${timeBombDuration}s timer)`;
      }

      return null;
    };

    const imageStatusText = getImageStatusText();

    // Parse waveform data
    const waveformData: number[] = isVoiceMessage
      ? (typeof item.waveform === 'string'
          ? (() => { try { return JSON.parse(item.waveform); } catch { return []; } })()
          : item.waveform || [])
      : [];

    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        <View>
          <View
            style={[
              styles.messageBubble,
              isMe
                ? [styles.messageBubbleMe, { backgroundColor: colors.accent }]
                : [styles.messageBubbleOther, { backgroundColor: colors.inputBg }],
              (isImageMessage || isGifMessage) && styles.mediaBubble,
            ]}
          >
            {/* Quoted message (reply) */}
            {item.replyTo && (
              <QuotedMessage
                senderName={item.replyTo.sender?.username || 'Unknown'}
                content={item.replyTo.content}
                messageType={item.replyTo.messageType as any}
                isOwnMessage={isMe}
              />
            )}

            {isVoiceMessage ? (
              <VoiceMessageBubble
                uri={item.mediaUrl || ''}
                duration={item.duration || 0}
                waveform={waveformData}
                isOwnMessage={isMe}
              />
            ) : isGifMessage ? (
              <Image
                source={{ uri: item.mediaUrl || item.content }}
                style={styles.gifImage}
                resizeMode="contain"
              />
            ) : isImageMessage ? (
              <TouchableOpacity
                onPress={() => !isImageExpiredOrViewed && handleViewImage(item)}
                activeOpacity={isImageExpiredOrViewed ? 1 : 0.8}
              >
                {isImageExpiredOrViewed ? (
                  <View style={[styles.expiredImagePlaceholder, { backgroundColor: colors.cardBackground }]}>
                    <Ionicons
                      name={item.imageViewMode === 'view_once' ? 'eye-off' : 'time'}
                      size={32}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.expiredImageText, { color: colors.textSecondary }]}>
                      {imageStatusText}
                    </Text>
                  </View>
                ) : shouldHideImage ? (
                  <View style={[styles.hiddenImagePlaceholder, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.hiddenImageIcon}>
                      <Ionicons
                        name={item.imageViewMode === 'view_once' ? 'eye' : 'time'}
                        size={36}
                        color={item.imageViewMode === 'view_once' ? '#F59E0B' : '#EF4444'}
                      />
                    </View>
                    <Text style={[styles.hiddenImageText, { color: colors.text }]}>
                      {item.imageViewMode === 'view_once' ? 'View Once Photo' : 'Timed Photo'}
                    </Text>
                    <Text style={[styles.hiddenImageSubtext, { color: colors.textSecondary }]}>
                      {imageStatusText}
                    </Text>
                  </View>
                ) : (
                  <View>
                    {item.mediaUrl && (
                      <Image
                        source={{ uri: getImageUrl(item.mediaUrl) || '' }}
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    )}
                    {item.imageViewMode && item.imageViewMode !== 'keep' && (
                      <View style={styles.viewModeOverlay}>
                        <Ionicons
                          name={item.imageViewMode === 'view_once' ? 'eye' : 'time'}
                          size={14}
                          color="#FFF"
                        />
                        <Text style={styles.viewModeText}>
                          {item.imageViewMode === 'view_once' ? '1' : `${timeBombDuration}s`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : colors.text }]}>
                {item.content}
              </Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTimestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                {format(new Date(item.createdAt), 'HH:mm')}
              </Text>
              {isMe && (
                <Text style={[styles.readReceipt, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.accent }]}>
                  {item.isRead ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>

          {/* Reactions display */}
          {item.reactions && item.reactions.length > 0 && (
            <MessageReactions
              reactions={item.reactions}
              isOwnMessage={isMe}
              currentUserId={currentUserId}
              onToggleReaction={(emoji) => handleToggleReaction(item.id, emoji)}
            />
          )}
        </View>
      </View>
    );
  };

  // Determine which animation value to use for transform
  // Page style: derive from pageAnim (0 = Feed, 1 = Messages)
  // Drawer style: use externalAnim or slideAnim
  const translateXAnim = isPageStyle && pageAnim
    ? pageAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [DRAWER_WIDTH, 0],
        extrapolate: 'clamp',
      })
    : (visible ? slideAnim : (externalAnim || slideAnim));

  // Calculate overlay opacity based on drawer position (only for non-page style)
  const overlayOpacityAnim = visible ? overlayAnim : (externalAnim ? externalAnim.interpolate({
    inputRange: [0, DRAWER_WIDTH],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  }) : overlayAnim);

  // Track if Messages page is currently visible (for pointerEvents)
  const [isMessagesVisible, setIsMessagesVisible] = useState(false);

  // Listen to pageAnim to track visibility
  useEffect(() => {
    if (pageAnim) {
      const listenerId = pageAnim.addListener(({ value }) => {
        // Consider visible if animation value > 0.01 (being swiped or open)
        setIsMessagesVisible(value > 0.01);
      });
      return () => {
        pageAnim.removeListener(listenerId);
      };
    }
  }, [pageAnim]);

  // Show drawer during swipe animation or when visible
  // Page style: always render when pageAnim exists (controlled by parent)
  const shouldRender = isPageStyle ? (pageAnim !== undefined) : (visible || externalAnim !== undefined);

  if (!shouldRender) return null;

  // Tab bar height (approximately)
  const TAB_BAR_HEIGHT = 60;

  // Page style: render as full-screen overlay (no Modal to avoid blocking touches)
  // When on conversation list - show navbar (leave transparent space at bottom)
  // When in chatbox - hide navbar (full screen with background)
  if (isPageStyle) {
    const showNavbar = !selectedConversation;

    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          elevation: 1000,
        }}
        pointerEvents={isMessagesVisible ? 'auto' : 'none'}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            transform: [{ translateX: translateXAnim }],
            // Add padding at bottom for tab bar when showing conversation list
            paddingBottom: showNavbar ? TAB_BAR_HEIGHT + insets.bottom : 0,
          }}
          {...panResponder.panHandlers}
        >
          {/* Conversation List Layer (always rendered underneath) */}
          <View style={StyleSheet.absoluteFill}>
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  backgroundColor: colors.headerBg,
                  borderBottomColor: colors.separator,
                  paddingTop: insets.top,
                },
              ]}
            >
              <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                <Ionicons name="chevron-back" size={26} color={colors.accent} />
              </TouchableOpacity>
              <Text style={[styles.headerTitleMain, { color: colors.text }]}>Messages</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Conversation List Content */}
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
          </View>

          {/* Chatbox Layer (slides over conversation list) */}
          {selectedConversation && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: colors.background,
                  transform: [{
                    translateX: chatboxAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, DRAWER_WIDTH],
                    }),
                  }],
                },
              ]}
            >
              {/* Chatbox Header */}
              <View
                style={[
                  styles.header,
                  {
                    backgroundColor: colors.headerBg,
                    borderBottomColor: colors.separator,
                    paddingTop: insets.top,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToConversations}
                >
                  <Ionicons name="chevron-back" size={26} color={colors.accent} />
                </TouchableOpacity>
                <View style={styles.headerUserInfo}>
                  <Avatar
                    size={36}
                    username={selectedConversation.otherUser.username}
                    customizations={selectedConversation.otherUser.activeAvatar?.customizations}
                    avatarStyle={selectedConversation.otherUser.activeAvatar?.style}
                  />
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {selectedConversation.otherUser.username}
                  </Text>
                </View>
                <View style={{ width: 36 }} />
              </View>

              {/* Messages List */}
              <View style={{ flex: 1 }}>
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
              </View>

              {/* Input Area - Always at bottom */}
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.headerBg,
                    borderTopColor: colors.separator,
                    paddingBottom: Math.max(insets.bottom, 4),
                  },
                ]}
              >
                <View style={styles.inputRow}>
                  {/* Media Buttons */}
                  <View style={styles.mediaButtonsRow}>
                    <TouchableOpacity style={[styles.mediaButton, { backgroundColor: colors.inputBg }]} onPress={takePhoto}>
                      <Ionicons name="camera" size={22} color={colors.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.mediaButton, { backgroundColor: colors.inputBg }]} onPress={pickImage}>
                      <Ionicons name="image" size={22} color={colors.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.mediaButton, { backgroundColor: colors.inputBg }]} onPress={() => setGifPickerVisible(true)}>
                      <Text style={[styles.gifButtonText, { color: colors.accent }]}>GIF</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Text Input */}
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

                  {/* Send Button */}
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      { backgroundColor: messageText.trim() && !sending ? colors.accent : colors.inputBg },
                    ]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                  >
                    <Ionicons
                      name="send"
                      size={18}
                      color={messageText.trim() && !sending ? '#FFF' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Image View Mode Modal */}
          <Modal
          visible={imageViewModeModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setImageViewModeModalVisible(false);
            setSelectedImage(null);
          }}
        >
          <View style={[styles.viewModeModalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.viewModeModalHeader, { borderBottomColor: colors.separator }]}>
              <TouchableOpacity onPress={() => {
                setImageViewModeModalVisible(false);
                setSelectedImage(null);
              }}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.viewModeModalTitle, { color: colors.text }]}>Send Photo</Text>
              <View style={{ width: 28 }} />
            </View>

            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={[styles.timeBombSelector, { backgroundColor: colors.cardBackground, borderTopColor: colors.separator }]}>
              <Text style={[styles.timeBombLabel, { color: colors.textSecondary }]}>
                Timer for Time Bomb: {timeBombDuration}s
              </Text>
              <View style={styles.timeBombButtons}>
                {[5, 10, 15, 30].map(seconds => (
                  <TouchableOpacity
                    key={seconds}
                    style={[
                      styles.timeBombButton,
                      { backgroundColor: colors.inputBg },
                      timeBombDuration === seconds && styles.timeBombButtonActive
                    ]}
                    onPress={() => setTimeBombDuration(seconds)}
                  >
                    <Text style={[
                      styles.timeBombButtonText,
                      { color: colors.textSecondary },
                      timeBombDuration === seconds && styles.timeBombButtonTextActive
                    ]}>
                      {seconds}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.sendOptionsContainer, { borderTopColor: colors.separator }]}>
              <TouchableOpacity
                style={[styles.sendOptionButton, { backgroundColor: colors.cardBackground, borderColor: colors.separator }]}
                onPress={() => sendImageMessage('keep')}
                disabled={sendingImage}
              >
                <Ionicons name="chatbubble" size={28} color="#3B82F6" />
                <Text style={[styles.sendOptionTitle, { color: colors.text }]}>Keep</Text>
                <Text style={[styles.sendOptionDesc, { color: colors.textSecondary }]}>Stays visible</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendOptionButton, { backgroundColor: colors.cardBackground, borderColor: colors.separator }]}
                onPress={() => sendImageMessage('view_once')}
                disabled={sendingImage}
              >
                <Ionicons name="eye" size={28} color="#F59E0B" />
                <Text style={[styles.sendOptionTitle, { color: colors.text }]}>View Once</Text>
                <Text style={[styles.sendOptionDesc, { color: colors.textSecondary }]}>One time only</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendOptionButton, { backgroundColor: colors.cardBackground, borderColor: colors.separator }]}
                onPress={() => sendImageMessage('time_bomb')}
                disabled={sendingImage}
              >
                <Ionicons name="time" size={28} color="#EF4444" />
                <Text style={[styles.sendOptionTitle, { color: colors.text }]}>Time Bomb</Text>
                <Text style={[styles.sendOptionDesc, { color: colors.textSecondary }]}>{timeBombDuration}s timer</Text>
              </TouchableOpacity>
            </View>

            {sendingImage && (
              <View style={[styles.sendingOverlay, { backgroundColor: colors.background + 'F0' }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.sendingText, { color: colors.accent }]}>Sending...</Text>
              </View>
            )}
          </View>
        </Modal>

        {/* Image Viewer */}
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

          {/* GIF Picker */}
          <GifPicker
            visible={gifPickerVisible}
            onClose={() => setGifPickerVisible(false)}
            onSelectGif={sendGifMessage}
          />
        </Animated.View>
      </View>
    );
  }

  // Drawer style (legacy): render with overlay
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.overlay,
            {
              backgroundColor: colors.overlay,
              opacity: overlayOpacityAnim,
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
            backgroundColor: colors.background,
            transform: [{ translateX: translateXAnim }],
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
                paddingTop: insets.top,
              },
            ]}
          >
            {selectedConversation ? (
              <>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBackToConversations}
                >
                  <Ionicons name="chevron-back" size={26} color={colors.accent} />
                </TouchableOpacity>
                <View style={styles.headerUserInfo}>
                  <Avatar
                    size={36}
                    username={selectedConversation.otherUser.username}
                    customizations={selectedConversation.otherUser.activeAvatar?.customizations}
                    avatarStyle={selectedConversation.otherUser.activeAvatar?.style}
                  />
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {selectedConversation.otherUser.username}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[styles.headerTitleMain, { color: colors.text }]}>Messages</Text>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {selectedConversation ? (
            <>
              {/* Messages List */}
              <View style={{ flex: 1 }}>
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
              </View>

              {/* Input Area - Always at bottom */}
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.headerBg,
                    borderTopColor: colors.separator,
                    paddingBottom: Math.max(insets.bottom, 4),
                  },
                ]}
              >
                <View style={styles.inputRow}>
                  {/* Media Buttons */}
                  <View style={styles.mediaButtonsRow}>
                    <TouchableOpacity style={[styles.mediaButton, { backgroundColor: colors.inputBg }]} onPress={takePhoto}>
                      <Ionicons name="camera" size={22} color={colors.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.mediaButton, { backgroundColor: colors.inputBg }]} onPress={pickImage}>
                      <Ionicons name="image" size={22} color={colors.accent} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.mediaButton, { backgroundColor: colors.inputBg }]} onPress={() => setGifPickerVisible(true)}>
                      <Text style={[styles.gifButtonText, { color: colors.accent }]}>GIF</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Text Input */}
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

                  {/* Send Button */}
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      { backgroundColor: messageText.trim() && !sending ? colors.accent : colors.inputBg },
                    ]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                  >
                    <Ionicons
                      name="send"
                      size={18}
                      color={messageText.trim() && !sending ? '#FFF' : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
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
          {/* Image View Mode Modal */}
          <Modal
          visible={imageViewModeModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setImageViewModeModalVisible(false);
            setSelectedImage(null);
          }}
        >
          <View style={[styles.viewModeModalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.viewModeModalHeader, { borderBottomColor: colors.separator }]}>
              <TouchableOpacity onPress={() => {
                setImageViewModeModalVisible(false);
                setSelectedImage(null);
              }}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.viewModeModalTitle, { color: colors.text }]}>Send Photo</Text>
              <View style={{ width: 28 }} />
            </View>

            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={[styles.timeBombSelector, { backgroundColor: colors.cardBackground, borderTopColor: colors.separator }]}>
              <Text style={[styles.timeBombLabel, { color: colors.textSecondary }]}>
                Timer for Time Bomb: {timeBombDuration}s
              </Text>
              <View style={styles.timeBombButtons}>
                {[5, 10, 15, 30].map(seconds => (
                  <TouchableOpacity
                    key={seconds}
                    style={[
                      styles.timeBombButton,
                      { backgroundColor: colors.inputBg },
                      timeBombDuration === seconds && styles.timeBombButtonActive
                    ]}
                    onPress={() => setTimeBombDuration(seconds)}
                  >
                    <Text style={[
                      styles.timeBombButtonText,
                      { color: colors.textSecondary },
                      timeBombDuration === seconds && styles.timeBombButtonTextActive
                    ]}>
                      {seconds}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.sendOptionsContainer, { borderTopColor: colors.separator }]}>
              <TouchableOpacity
                style={[styles.sendOptionButton, { backgroundColor: colors.cardBackground, borderColor: colors.separator }]}
                onPress={() => sendImageMessage('keep')}
                disabled={sendingImage}
              >
                <Ionicons name="chatbubble" size={28} color="#3B82F6" />
                <Text style={[styles.sendOptionTitle, { color: colors.text }]}>Keep</Text>
                <Text style={[styles.sendOptionDesc, { color: colors.textSecondary }]}>Stays visible</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendOptionButton, { backgroundColor: colors.cardBackground, borderColor: colors.separator }]}
                onPress={() => sendImageMessage('view_once')}
                disabled={sendingImage}
              >
                <Ionicons name="eye" size={28} color="#F59E0B" />
                <Text style={[styles.sendOptionTitle, { color: colors.text }]}>View Once</Text>
                <Text style={[styles.sendOptionDesc, { color: colors.textSecondary }]}>One time only</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sendOptionButton, { backgroundColor: colors.cardBackground, borderColor: colors.separator }]}
                onPress={() => sendImageMessage('time_bomb')}
                disabled={sendingImage}
              >
                <Ionicons name="time" size={28} color="#EF4444" />
                <Text style={[styles.sendOptionTitle, { color: colors.text }]}>Time Bomb</Text>
                <Text style={[styles.sendOptionDesc, { color: colors.textSecondary }]}>{timeBombDuration}s timer</Text>
              </TouchableOpacity>
            </View>

            {sendingImage && (
              <View style={[styles.sendingOverlay, { backgroundColor: colors.background + 'F0' }]}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.sendingText, { color: colors.accent }]}>Sending...</Text>
              </View>
            )}
          </View>
        </Modal>

        {/* Image Viewer */}
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

        {/* GIF Picker */}
        <GifPicker
          visible={gifPickerVisible}
          onClose={() => setGifPickerVisible(false)}
          onSelectGif={sendGifMessage}
        />
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
});

export default ChatDrawer;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  page: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 100,
    elevation: 100,
  },
  pageModal: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pageContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerTitleMain: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 4,
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
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 13,
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
    borderRadius: 20,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 6,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 6,
  },
  mediaBubble: {
    padding: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTimestamp: {
    fontSize: 11,
  },
  readReceipt: {
    fontSize: 12,
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
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifButtonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    minHeight: 36,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Image styles
  gifImage: {
    width: 180,
    height: 135,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
  },
  hiddenImagePlaceholder: {
    width: 180,
    height: 140,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  hiddenImageIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  hiddenImageText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  hiddenImageSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  expiredImagePlaceholder: {
    width: 180,
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredImageText: {
    fontSize: 12,
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
  // Modal styles
  viewModeModalContainer: {
    flex: 1,
  },
  viewModeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  viewModeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  timeBombLabel: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  timeBombButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  timeBombButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timeBombButtonActive: {
    backgroundColor: '#EF4444',
  },
  timeBombButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  sendOptionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  sendOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendOptionDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  sendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendingText: {
    marginTop: 12,
    fontSize: 16,
  },
  // Image viewer styles
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  countdownText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  viewerModeIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  viewerModeText: {
    color: '#FFF',
    fontSize: 14,
  },
  unsentBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  unsentText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
