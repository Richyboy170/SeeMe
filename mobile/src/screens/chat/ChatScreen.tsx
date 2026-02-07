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
  Animated,
  Easing,
  Vibration,
  StatusBar,
  PanResponder,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { socketService } from '../../services/socket';
import { api, getImageUrl } from '../../services/api';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUnreadCount } from '../../navigation/types';
import GifPicker from '../../components/chat/GifPicker';
import Avatar from '../../components/Avatar';
import { useTheme, Spacing, Typography, Colors } from '../../theme';

// New chat components
import ReactionBar from '../../components/chat/ReactionBar';
import MessageReactions from '../../components/chat/MessageReactions';
import ReplyPreview from '../../components/chat/ReplyPreview';
import QuotedMessage from '../../components/chat/QuotedMessage';
import MessageActionsSheet from '../../components/chat/MessageActionsSheet';
import VoiceRecorder from '../../components/chat/VoiceRecorder';
import VoiceMessageBubble from '../../components/chat/VoiceMessageBubble';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ImageViewMode = 'keep' | 'view_once' | 'time_bomb';

interface User {
  id: string;
  username: string;
  avatarUrl?: string;
}

interface ReactionUser {
  id: string;
  username: string;
}

interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  user: ReactionUser;
}

interface ReplyToMessage {
  id: string;
  content: string | null;
  senderId: string;
  messageType: string;
  sender?: { id: string; username: string };
}

interface Message {
  id: string;
  senderId: string;
  content: string | null;
  messageType: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  tempId?: string;
  mediaUrl?: string;
  imageViewMode?: ImageViewMode;
  viewedAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  reactions?: MessageReaction[];
  replyToId?: string;
  replyTo?: ReplyToMessage;
  isUnsent?: boolean;
  duration?: number;
  waveform?: string;
}

interface ChatScreenProps {
  route: {
    params: {
      conversationId: string;
      otherUser: User;
    };
  };
  navigation: any;
}

// Animated typing dots component
const TypingDots = ({ color }: { color: string }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={typingStyles.container}>
      <Animated.View style={[typingStyles.dot, { backgroundColor: color }, dotStyle(dot1)]} />
      <Animated.View style={[typingStyles.dot, { backgroundColor: color }, dotStyle(dot2)]} />
      <Animated.View style={[typingStyles.dot, { backgroundColor: color }, dotStyle(dot3)]} />
    </View>
  );
};

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

// Animated message component
const AnimatedMessage = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 30, 150),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: Math.min(index * 30, 150),
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// Swipe-to-reply wrapper
const SwipeableMessage = ({
  children,
  onSwipeReply,
  isOwnMessage,
}: {
  children: React.ReactNode;
  onSwipeReply: () => void;
  isOwnMessage: boolean;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const replyIconOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        // Only capture rightward horizontal swipes on other's messages
        // or leftward on own messages
        const isHorizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 2;
        if (!isHorizontal) return false;
        if (isOwnMessage) return gs.dx < -10;
        return gs.dx > 10;
      },
      onPanResponderMove: (_, gs) => {
        if (isOwnMessage) {
          const val = Math.max(gs.dx, -80);
          translateX.setValue(val);
          replyIconOpacity.setValue(Math.min(Math.abs(val) / 50, 1));
        } else {
          const val = Math.min(gs.dx, 80);
          translateX.setValue(val);
          replyIconOpacity.setValue(Math.min(val / 50, 1));
        }
      },
      onPanResponderRelease: (_, gs) => {
        const threshold = 50;
        const triggered = isOwnMessage ? gs.dx < -threshold : gs.dx > threshold;

        if (triggered) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onSwipeReply();
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();

        Animated.timing(replyIconOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View>
      {/* Reply icon indicator */}
      <Animated.View
        style={[
          swipeStyles.replyIcon,
          isOwnMessage ? swipeStyles.replyIconLeft : swipeStyles.replyIconRight,
          { opacity: replyIconOpacity },
        ]}
      >
        <Ionicons name="arrow-undo" size={20} color={Colors.brand.blue} />
      </Animated.View>
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const swipeStyles = StyleSheet.create({
  replyIcon: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyIconLeft: {
    right: 8,
  },
  replyIconRight: {
    left: 8,
  },
});

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { conversationId, otherUser } = route.params;
  const { colors, isDark, gradientColors } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { refreshUnreadCount } = useUnreadCount();

  // Image message states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageViewModeModalVisible, setImageViewModeModalVisible] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [viewingImage, setViewingImage] = useState<Message | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewOnceCountdown, setViewOnceCountdown] = useState<number | null>(null);
  const [timeBombDuration, setTimeBombDuration] = useState(10);

  // GIF picker state
  const [gifPickerVisible, setGifPickerVisible] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Reaction bar state
  const [reactionBarVisible, setReactionBarVisible] = useState(false);
  const [reactionTargetMessage, setReactionTargetMessage] = useState<Message | null>(null);

  // Message actions sheet state
  const [actionsSheetVisible, setActionsSheetVisible] = useState(false);
  const [actionsTargetMessage, setActionsTargetMessage] = useState<Message | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);

  // Online status
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);

  // Heart animation
  const heartScale = useRef(new Animated.Value(1)).current;

  // Dynamic styles based on theme
  const dynamicStyles = createDynamicStyles(colors, isDark);

  // Hide default navigation header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    joinConversation();

    const socket = socketService.getSocket();
    if (socket) {
      socket.on('chat:new_message', handleNewMessage);
      socket.on('chat:message_sent', handleMessageSent);
      socket.on('chat:messages_read', handleMessagesRead);
      socket.on('chat:user_typing', handleUserTyping);
      socket.on('chat:user_stopped_typing', handleUserStoppedTyping);
      socket.on('chat:reaction_added', handleReactionAdded);
      socket.on('chat:reaction_removed', handleReactionRemoved);
      socket.on('chat:message_unsent', handleMessageUnsent);
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
        socket.off('chat:reaction_added', handleReactionAdded);
        socket.off('chat:reaction_removed', handleReactionRemoved);
        socket.off('chat:message_unsent', handleMessageUnsent);
      }
    };
  }, [conversationId]);

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

      setMessages(prev =>
        prev.map(msg =>
          unreadMessageIds.includes(msg.id)
            ? { ...msg, isRead: true, readAt: new Date().toISOString() }
            : msg
        )
      );

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
      const response = await api.getMessages(conversationId);
      setMessages(response.messages || []);
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
    markMessagesAsReadNow();
  };

  // Socket event handlers
  const handleNewMessage = (data: any) => {
    if (data.conversationId === conversationId) {
      setMessages(prev => [...prev, data.message]);
      markMessagesAsRead();
      scrollToBottom();
      Vibration.vibrate(50);
    }
  };

  const handleMessageSent = (data: any) => {
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

  // New socket handlers
  const handleReactionAdded = (data: any) => {
    if (data.conversationId === conversationId) {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === data.messageId) {
            const existingReactions = msg.reactions || [];
            // Remove any existing reaction from the same user
            const filtered = existingReactions.filter(r => r.userId !== data.reaction.userId);
            return { ...msg, reactions: [...filtered, data.reaction] };
          }
          return msg;
        })
      );
    }
  };

  const handleReactionRemoved = (data: any) => {
    if (data.conversationId === conversationId) {
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
  };

  const handleMessageUnsent = (data: any) => {
    if (data.conversationId === conversationId) {
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === data.messageId) {
            return { ...msg, isUnsent: true, content: null, mediaUrl: undefined };
          }
          return msg;
        })
      );
    }
  };

  // Send message
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
      isRead: false,
      replyToId: replyingTo?.id,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        senderId: replyingTo.senderId,
        messageType: replyingTo.messageType,
        sender: replyingTo.senderId === currentUserId
          ? { id: currentUserId, username: 'You' }
          : { id: otherUser.id, username: otherUser.username },
      } : undefined,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    setReplyingTo(null);
    scrollToBottom();

    socketService.emit('chat:send_message', {
      conversationId,
      receiverId: otherUser.id,
      messageType: 'text',
      content: inputText.trim(),
      tempId,
      replyToId: replyingTo?.id,
    });

    stopTyping();
  };

  const sendHeartMessage = () => {
    if (!currentUserId) return;

    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.4,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    Vibration.vibrate(30);

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      senderId: currentUserId,
      content: '\u2764\uFE0F',
      messageType: 'text',
      createdAt: new Date().toISOString(),
      isRead: false
    };

    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    socketService.emit('chat:send_message', {
      conversationId,
      receiverId: otherUser.id,
      messageType: 'text',
      content: '\u2764\uFE0F',
      tempId
    });
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socketService.emit('chat:typing_start', {
        conversationId,
        receiverId: otherUser.id
      });
    }

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

  // Reaction handling
  const handleLongPress = (message: Message) => {
    if (message.isUnsent) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReactionTargetMessage(message);
    setReactionBarVisible(true);
    setActionsTargetMessage(message);
    setActionsSheetVisible(true);
  };

  const handleSelectReaction = (emoji: string) => {
    if (!reactionTargetMessage) return;
    setReactionBarVisible(false);

    // Check if already reacted with this emoji
    const existing = reactionTargetMessage.reactions?.find(
      r => r.userId === currentUserId && r.emoji === emoji
    );

    if (existing) {
      socketService.emit('chat:remove_reaction', {
        messageId: reactionTargetMessage.id,
        conversationId,
      });
    } else {
      socketService.emit('chat:add_reaction', {
        messageId: reactionTargetMessage.id,
        emoji,
        conversationId,
      });
    }

    setReactionTargetMessage(null);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const existing = message.reactions?.find(
      r => r.userId === currentUserId && r.emoji === emoji
    );

    if (existing) {
      socketService.emit('chat:remove_reaction', { messageId, conversationId });
    } else {
      socketService.emit('chat:add_reaction', { messageId, emoji, conversationId });
    }
  };

  // Reply handling
  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setActionsSheetVisible(false);
    setReactionBarVisible(false);
  };

  const handleSwipeReply = (message: Message) => {
    setReplyingTo(message);
  };

  // Copy handling
  const handleCopy = () => {
    if (actionsTargetMessage?.content) {
      Clipboard.setStringAsync(actionsTargetMessage.content);
    }
    setActionsSheetVisible(false);
    setReactionBarVisible(false);
  };

  // Unsend handling
  const handleUnsend = () => {
    if (!actionsTargetMessage) return;
    Alert.alert(
      'Unsend Message',
      'This message will be removed for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsend',
          style: 'destructive',
          onPress: () => {
            socketService.emit('chat:unsend_message', {
              messageId: actionsTargetMessage.id,
              conversationId,
            });
          },
        },
      ]
    );
    setActionsSheetVisible(false);
    setReactionBarVisible(false);
  };

  // Voice message handling
  const handleVoiceSend = (uri: string, duration: number, waveform: number[]) => {
    if (!currentUserId) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      senderId: currentUserId,
      content: null,
      messageType: 'voice',
      createdAt: new Date().toISOString(),
      isRead: false,
      duration,
      waveform: JSON.stringify(waveform),
      mediaUrl: uri,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    socketService.emit('chat:send_message', {
      conversationId,
      receiverId: otherUser.id,
      messageType: 'voice',
      mediaUrl: uri,
      tempId,
      duration,
      waveform: JSON.stringify(waveform),
    });

    setIsRecording(false);
  };

  // Scroll to message (for quoted message tap)
  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
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
    if (!selectedImage || !currentUserId) return;

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
    if (message.isExpired) {
      Alert.alert('Expired', 'This image has expired and can no longer be viewed.');
      return;
    }

    if (message.imageViewMode === 'view_once' && message.viewedAt && message.senderId !== currentUserId) {
      Alert.alert('Already Viewed', 'This image can only be viewed once.');
      return;
    }

    setViewingImage(message);
    setImageViewerVisible(true);

    if (message.imageViewMode === 'view_once' && message.senderId !== currentUserId && !message.viewedAt) {
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

  const sendGifMessage = (gif: { id: string; url: string; previewUrl: string }) => {
    if (!currentUserId) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      senderId: currentUserId,
      content: gif.url,
      messageType: 'gif',
      createdAt: new Date().toISOString(),
      isRead: false,
      mediaUrl: gif.url,
    };

    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    socketService.emit('chat:send_message', {
      conversationId,
      receiverId: otherUser.id,
      messageType: 'gif',
      content: gif.url,
      tempId,
    });
  };

  // Format date for separators
  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt);
    const prevDate = new Date(prevMsg.createdAt);
    return !isSameDay(currentDate, prevDate);
  };

  const isLastInGroup = (currentMsg: Message, nextMsg?: Message) => {
    if (!nextMsg) return true;
    if (currentMsg.senderId !== nextMsg.senderId) return true;
    const timeDiff = new Date(nextMsg.createdAt).getTime() - new Date(currentMsg.createdAt).getTime();
    return timeDiff > 60000;
  };

  const isFirstInGroup = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    if (currentMsg.senderId !== prevMsg.senderId) return true;
    const timeDiff = new Date(currentMsg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime();
    return timeDiff > 60000;
  };

  const getLastReadMessageId = () => {
    const ownMessages = messages.filter(m => m.senderId === currentUserId && m.isRead);
    return ownMessages.length > 0 ? ownMessages[ownMessages.length - 1].id : null;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === currentUserId;
    const isImageMessage = item.messageType === 'image';
    const isGifMessage = item.messageType === 'gif';
    const isVoiceMessage = item.messageType === 'voice';
    const prevMsg = messages[index - 1];
    const nextMsg = messages[index + 1];

    const showDateSeparator = shouldShowDateSeparator(item, prevMsg);
    const isLast = isLastInGroup(item, nextMsg);
    const isFirst = isFirstInGroup(item, prevMsg);
    const lastReadId = getLastReadMessageId();
    const showReadReceipt = isOwnMessage && item.isRead && item.id === lastReadId;

    // Unsent message
    if (item.isUnsent) {
      return (
        <AnimatedMessage index={index}>
          {showDateSeparator && (
            <View style={dynamicStyles.dateSeparator}>
              <Text style={dynamicStyles.dateSeparatorText}>
                {formatDateSeparator(new Date(item.createdAt))}
              </Text>
            </View>
          )}
          <View style={[
            dynamicStyles.messageRow,
            isOwnMessage ? dynamicStyles.ownMessageRow : dynamicStyles.otherMessageRow
          ]}>
            {!isOwnMessage && (
              <View style={dynamicStyles.avatarContainer}>
                {isLast ? (
                  <Avatar size={28} username={otherUser.username} avatarUrl={otherUser.avatarUrl} />
                ) : (
                  <View style={dynamicStyles.avatarPlaceholder} />
                )}
              </View>
            )}
            <View style={[
              dynamicStyles.messageContainer,
              isOwnMessage ? dynamicStyles.ownMessage : dynamicStyles.otherMessage
            ]}>
              <View style={[dynamicStyles.messageBubble, dynamicStyles.unsentBubble]}>
                <Ionicons name="ban-outline" size={14} color={colors.text.secondary} />
                <Text style={dynamicStyles.unsentText}>Message unsent</Text>
              </View>
            </View>
          </View>
        </AnimatedMessage>
      );
    }

    // Image status
    const getImageStatusText = () => {
      if (!isImageMessage) return null;
      if (item.isExpired) {
        return item.imageViewMode === 'view_once' ? 'Photo viewed' : 'Photo expired';
      }
      if (item.imageViewMode === 'view_once') {
        if (item.viewedAt && !isOwnMessage) return 'Photo viewed';
        return 'View once';
      }
      if (item.imageViewMode === 'time_bomb') {
        if (item.expiresAt) {
          const remaining = Math.max(0, Math.floor((new Date(item.expiresAt).getTime() - Date.now()) / 1000));
          if (remaining <= 0) return 'Photo expired';
          return `${remaining}s`;
        }
        return 'Timed photo';
      }
      return null;
    };

    const imageStatusText = getImageStatusText();
    const canViewImage = isImageMessage && !item.isExpired &&
      !(item.imageViewMode === 'view_once' && item.viewedAt && !isOwnMessage);

    // Bubble corner radius
    const getBubbleStyle = () => {
      const baseRadius = Spacing.bubble.borderRadius;
      const smallRadius = Spacing.bubble.borderRadiusSmall;

      if (isOwnMessage) {
        return {
          borderTopLeftRadius: baseRadius,
          borderTopRightRadius: isFirst ? baseRadius : smallRadius,
          borderBottomLeftRadius: baseRadius,
          borderBottomRightRadius: isLast ? baseRadius : smallRadius,
        };
      } else {
        return {
          borderTopLeftRadius: isFirst ? baseRadius : smallRadius,
          borderTopRightRadius: baseRadius,
          borderBottomLeftRadius: isLast ? baseRadius : smallRadius,
          borderBottomRightRadius: baseRadius,
        };
      }
    };

    const bubbleRadiusStyle = getBubbleStyle();

    // Check if message is a single emoji
    const isSingleEmoji = (text: string) => {
      const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
      return emojiRegex.test(text.trim());
    };

    const isEmojiOnly = item.messageType === 'text' && item.content && isSingleEmoji(item.content);

    // Render message content based on type
    const renderBubbleContent = () => {
      if (isVoiceMessage) {
        return (
          <VoiceMessageBubble
            uri={item.mediaUrl ? getImageUrl(item.mediaUrl) || item.mediaUrl : ''}
            duration={item.duration || 0}
            waveform={item.waveform}
            isOwnMessage={isOwnMessage}
          />
        );
      }

      if (isGifMessage) {
        return (
          <Image
            source={{ uri: item.mediaUrl || item.content || '' }}
            style={dynamicStyles.gifImage}
            resizeMode="contain"
          />
        );
      }

      if (isImageMessage) {
        return (
          <TouchableOpacity
            onPress={() => canViewImage && handleViewImage(item)}
            activeOpacity={canViewImage ? 0.8 : 1}
          >
            {item.isExpired || (item.imageViewMode === 'view_once' && item.viewedAt && !isOwnMessage) ? (
              <View style={dynamicStyles.expiredImagePlaceholder}>
                <Ionicons
                  name={item.imageViewMode === 'view_once' ? 'eye-off' : 'time'}
                  size={28}
                  color={isOwnMessage ? 'rgba(255,255,255,0.7)' : colors.text.secondary}
                />
                <Text style={isOwnMessage ? dynamicStyles.expiredImageTextOwn : dynamicStyles.expiredImageText}>
                  {imageStatusText}
                </Text>
              </View>
            ) : (
              <View>
                {item.mediaUrl && (
                  <Image
                    source={{ uri: getImageUrl(item.mediaUrl) || '' }}
                    style={dynamicStyles.messageImage}
                    resizeMode="cover"
                  />
                )}
                {item.imageViewMode && item.imageViewMode !== 'keep' && (
                  <View style={dynamicStyles.viewModeOverlay}>
                    <Ionicons
                      name={item.imageViewMode === 'view_once' ? 'eye' : 'time'}
                      size={14}
                      color="#FFF"
                    />
                    <Text style={dynamicStyles.viewModeText}>
                      {item.imageViewMode === 'view_once' ? '1' : imageStatusText}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      }

      // Text message
      return (
        <Text style={isOwnMessage ? dynamicStyles.ownText : dynamicStyles.otherText}>
          {item.content}
        </Text>
      );
    };

    return (
      <AnimatedMessage index={index}>
        {showDateSeparator && (
          <View style={dynamicStyles.dateSeparator}>
            <Text style={dynamicStyles.dateSeparatorText}>
              {formatDateSeparator(new Date(item.createdAt))}
            </Text>
          </View>
        )}

        <SwipeableMessage
          onSwipeReply={() => handleSwipeReply(item)}
          isOwnMessage={isOwnMessage}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={300}
          >
            <View style={[
              dynamicStyles.messageRow,
              isOwnMessage ? dynamicStyles.ownMessageRow : dynamicStyles.otherMessageRow
            ]}>
              {/* Other user's avatar */}
              {!isOwnMessage && (
                <View style={dynamicStyles.avatarContainer}>
                  {isLast ? (
                    <Avatar size={28} username={otherUser.username} avatarUrl={otherUser.avatarUrl} />
                  ) : (
                    <View style={dynamicStyles.avatarPlaceholder} />
                  )}
                </View>
              )}

              <View style={[
                dynamicStyles.messageContainer,
                isOwnMessage ? dynamicStyles.ownMessage : dynamicStyles.otherMessage
              ]}>
                {isEmojiOnly ? (
                  <Text style={dynamicStyles.emojiMessage}>{item.content}</Text>
                ) : isOwnMessage ? (
                  <LinearGradient
                    colors={gradientColors as unknown as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      dynamicStyles.messageBubble,
                      dynamicStyles.ownBubble,
                      (isImageMessage || isGifMessage || isVoiceMessage) && dynamicStyles.mediaBubble,
                      bubbleRadiusStyle
                    ]}
                  >
                    {/* Quoted message inside bubble */}
                    {item.replyTo && (
                      <QuotedMessage
                        replyTo={item.replyTo}
                        isOwnMessage={true}
                        onPress={() => scrollToMessage(item.replyTo!.id)}
                      />
                    )}
                    {renderBubbleContent()}
                  </LinearGradient>
                ) : (
                  <View style={[
                    dynamicStyles.messageBubble,
                    dynamicStyles.otherBubble,
                    (isImageMessage || isGifMessage || isVoiceMessage) && dynamicStyles.mediaBubble,
                    bubbleRadiusStyle
                  ]}>
                    {/* Quoted message inside bubble */}
                    {item.replyTo && (
                      <QuotedMessage
                        replyTo={item.replyTo}
                        isOwnMessage={false}
                        onPress={() => scrollToMessage(item.replyTo!.id)}
                      />
                    )}
                    {renderBubbleContent()}
                  </View>
                )}

                {/* Message reactions */}
                {item.reactions && item.reactions.length > 0 && (
                  <MessageReactions
                    reactions={item.reactions}
                    isOwnMessage={isOwnMessage}
                    currentUserId={currentUserId}
                    onToggleReaction={(emoji) => handleToggleReaction(item.id, emoji)}
                  />
                )}

                {/* Timestamp */}
                {isFirst && !isEmojiOnly && (
                  <Text style={[
                    dynamicStyles.timestamp,
                    isOwnMessage ? dynamicStyles.ownTimestamp : dynamicStyles.otherTimestamp
                  ]}>
                    {format(new Date(item.createdAt), 'h:mm a')}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </SwipeableMessage>

        {/* Read receipt */}
        {showReadReceipt && (
          <View style={dynamicStyles.readReceiptContainer}>
            <Avatar size={14} username={otherUser.username} avatarUrl={otherUser.avatarUrl} />
          </View>
        )}
      </AnimatedMessage>
    );
  };

  if (loading) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  const hasInput = inputText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={dynamicStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Custom Chat Header */}
      <View style={dynamicStyles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={dynamicStyles.headerBackButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.headerUserInfo} activeOpacity={0.7}>
          <Avatar size={32} username={otherUser.username} avatarUrl={otherUser.avatarUrl} />
          <View style={dynamicStyles.headerUserText}>
            <Text style={dynamicStyles.headerUsername}>{otherUser.username}</Text>
            {isOtherUserOnline && (
              <View style={dynamicStyles.onlineRow}>
                <View style={dynamicStyles.onlineDot} />
                <Text style={dynamicStyles.onlineText}>Active now</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={dynamicStyles.headerActions}>
          <TouchableOpacity style={dynamicStyles.headerActionBtn}>
            <Ionicons name="call-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={dynamicStyles.headerActionBtn}>
            <Ionicons name="videocam-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={dynamicStyles.messagesList}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />

      {/* Typing indicator */}
      {isOtherUserTyping && (
        <View style={dynamicStyles.typingContainer}>
          <Avatar size={28} username={otherUser.username} avatarUrl={otherUser.avatarUrl} />
          <View style={dynamicStyles.typingBubble}>
            <TypingDots color={colors.text.secondary} />
          </View>
        </View>
      )}

      {/* Reply preview above input */}
      {replyingTo && (
        <ReplyPreview
          replyTo={{
            id: replyingTo.id,
            content: replyingTo.content,
            senderId: replyingTo.senderId,
            messageType: replyingTo.messageType,
            sender: replyingTo.senderId === currentUserId
              ? { username: 'yourself' }
              : { username: otherUser.username },
          }}
          onCancel={() => setReplyingTo(null)}
        />
      )}

      {/* Input Bar */}
      <View style={dynamicStyles.inputWrapper}>
        {isRecording ? (
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={() => setIsRecording(false)}
            isRecording={isRecording}
            onStartRecording={() => {}}
            onStopRecording={() => setIsRecording(false)}
          />
        ) : (
          <View style={dynamicStyles.inputContainer}>
            {/* Camera button - hide when typing */}
            {!hasInput && (
              <TouchableOpacity style={dynamicStyles.cameraButton} onPress={takePhoto}>
                <LinearGradient
                  colors={[Colors.gradient.start, Colors.gradient.middle, Colors.gradient.end]}
                  style={dynamicStyles.cameraGradient}
                >
                  <Ionicons name="camera" size={20} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Text input */}
            <TextInput
              style={dynamicStyles.input}
              value={inputText}
              onChangeText={handleInputChange}
              placeholder="Message..."
              placeholderTextColor={colors.text.secondary}
              multiline
              maxLength={1000}
            />

            {/* Action buttons */}
            {hasInput ? (
              <TouchableOpacity style={dynamicStyles.sendButton} onPress={sendMessage}>
                <Text style={dynamicStyles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            ) : (
              <View style={dynamicStyles.actionButtons}>
                {/* Mic button */}
                <TouchableOpacity
                  style={dynamicStyles.actionButton}
                  onPress={() => setIsRecording(true)}
                >
                  <Ionicons name="mic-outline" size={24} color={colors.icon.primary} />
                </TouchableOpacity>

                {/* Gallery button */}
                <TouchableOpacity style={dynamicStyles.actionButton} onPress={pickImage}>
                  <Ionicons name="image-outline" size={24} color={colors.icon.primary} />
                </TouchableOpacity>

                {/* GIF button */}
                <TouchableOpacity style={dynamicStyles.actionButton} onPress={() => setGifPickerVisible(true)}>
                  <Text style={[dynamicStyles.gifButtonText, { color: colors.text.primary }]}>GIF</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Reaction Bar (floating) */}
      <ReactionBar
        visible={reactionBarVisible}
        onSelectEmoji={handleSelectReaction}
        onClose={() => {
          setReactionBarVisible(false);
          setReactionTargetMessage(null);
        }}
      />

      {/* Message Actions Sheet */}
      <MessageActionsSheet
        visible={actionsSheetVisible}
        onClose={() => {
          setActionsSheetVisible(false);
          setReactionBarVisible(false);
          setActionsTargetMessage(null);
          setReactionTargetMessage(null);
        }}
        message={actionsTargetMessage}
        isOwnMessage={actionsTargetMessage?.senderId === currentUserId}
        onCopy={handleCopy}
        onReply={() => actionsTargetMessage && handleReply(actionsTargetMessage)}
        onUnsend={handleUnsend}
      />

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
        <View style={dynamicStyles.viewModeModalContainer}>
          <View style={dynamicStyles.viewModeModalHeader}>
            <TouchableOpacity onPress={() => {
              setImageViewModeModalVisible(false);
              setSelectedImage(null);
            }}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={dynamicStyles.viewModeModalTitle}>Send Photo</Text>
            <View style={{ width: 28 }} />
          </View>

          {selectedImage && (
            <View style={dynamicStyles.imagePreviewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={dynamicStyles.imagePreview}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Timer duration selector */}
          <View style={dynamicStyles.timeBombSelector}>
            <Text style={dynamicStyles.timeBombLabel}>Timer: {timeBombDuration}s</Text>
            <View style={dynamicStyles.timeBombButtons}>
              {[5, 10, 15, 30].map(seconds => (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    dynamicStyles.timeBombButton,
                    timeBombDuration === seconds && dynamicStyles.timeBombButtonActive
                  ]}
                  onPress={() => setTimeBombDuration(seconds)}
                >
                  <Text style={[
                    dynamicStyles.timeBombButtonText,
                    timeBombDuration === seconds && dynamicStyles.timeBombButtonTextActive
                  ]}>
                    {seconds}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Send Options */}
          <View style={dynamicStyles.sendOptionsContainer}>
            <TouchableOpacity
              style={dynamicStyles.sendOptionButton}
              onPress={() => sendImageMessage('keep')}
              disabled={sendingImage}
            >
              <View style={[dynamicStyles.sendOptionIcon, { backgroundColor: Colors.brand.blue }]}>
                <Ionicons name="chatbubble" size={24} color="#FFF" />
              </View>
              <Text style={dynamicStyles.sendOptionTitle}>Keep</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.sendOptionButton}
              onPress={() => sendImageMessage('view_once')}
              disabled={sendingImage}
            >
              <View style={[dynamicStyles.sendOptionIcon, { backgroundColor: Colors.brand.primary }]}>
                <Ionicons name="eye" size={24} color="#FFF" />
              </View>
              <Text style={dynamicStyles.sendOptionTitle}>View Once</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={dynamicStyles.sendOptionButton}
              onPress={() => sendImageMessage('time_bomb')}
              disabled={sendingImage}
            >
              <View style={[dynamicStyles.sendOptionIcon, { backgroundColor: Colors.brand.accent }]}>
                <Ionicons name="time" size={24} color="#FFF" />
              </View>
              <Text style={dynamicStyles.sendOptionTitle}>{timeBombDuration}s Timer</Text>
            </TouchableOpacity>
          </View>

          {sendingImage && (
            <View style={dynamicStyles.sendingOverlay}>
              <ActivityIndicator size="large" color={Colors.brand.primary} />
              <Text style={dynamicStyles.sendingText}>Sending...</Text>
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
        <View style={dynamicStyles.imageViewerContainer}>
          <TouchableOpacity style={dynamicStyles.imageViewerClose} onPress={closeImageViewer}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>

          {viewingImage?.mediaUrl && (
            <Image
              source={{ uri: getImageUrl(viewingImage.mediaUrl) || '' }}
              style={dynamicStyles.fullScreenImage}
              resizeMode="contain"
            />
          )}

          {viewOnceCountdown !== null && (
            <View style={dynamicStyles.countdownContainer}>
              <Ionicons
                name={viewingImage?.imageViewMode === 'view_once' ? 'eye' : 'time'}
                size={24}
                color="#FFF"
              />
              <Text style={dynamicStyles.countdownText}>{viewOnceCountdown}</Text>
            </View>
          )}

          {viewingImage?.imageViewMode && viewingImage.imageViewMode !== 'keep' && (
            <View style={dynamicStyles.viewerModeIndicator}>
              <Ionicons
                name={viewingImage.imageViewMode === 'view_once' ? 'eye' : 'time'}
                size={16}
                color="#FFF"
              />
              <Text style={dynamicStyles.viewerModeText}>
                {viewingImage.imageViewMode === 'view_once' ? 'View Once' : 'Timed Photo'}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {/* GIF Picker Modal */}
      <GifPicker
        visible={gifPickerVisible}
        onClose={() => setGifPickerVisible(false)}
        onSelectGif={sendGifMessage}
      />
    </KeyboardAvoidingView>
  );
}

// Dynamic styles based on theme
const createDynamicStyles = (colors: typeof Colors.light, isDark: boolean) => StyleSheet.create({
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

  // Custom header
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : StatusBar.currentHeight || 24,
    paddingBottom: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerBackButton: {
    padding: 4,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerUserText: {
    marginLeft: 10,
  },
  headerUsername: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: colors.text.primary,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand.green,
    marginRight: 4,
  },
  onlineText: {
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionBtn: {
    padding: 8,
  },

  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.lg,
  },

  // Date separator
  dateSeparator: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dateSeparatorText: {
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },

  // Message row
  messageRow: {
    flexDirection: 'row',
    marginVertical: 1,
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },

  // Avatar
  avatarContainer: {
    width: 28,
    marginRight: Spacing.sm,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
  },

  // Message container
  messageContainer: {
    maxWidth: '75%',
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },

  // Message bubble
  messageBubble: {
    paddingHorizontal: Spacing.bubble.paddingHorizontal,
    paddingVertical: Spacing.bubble.paddingVertical,
    maxWidth: '100%',
  },
  ownBubble: {},
  otherBubble: {
    backgroundColor: colors.chat.otherBubble,
  },
  mediaBubble: {
    padding: 3,
    overflow: 'hidden',
  },

  // Unsent message
  unsentBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    borderRadius: Spacing.bubble.borderRadius,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed',
  },
  unsentText: {
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },

  // Text styles
  ownText: {
    fontSize: Typography.size.md,
    color: Colors.common.white,
    lineHeight: Typography.size.md * Typography.lineHeight.normal,
  },
  otherText: {
    fontSize: Typography.size.md,
    color: colors.text.primary,
    lineHeight: Typography.size.md * Typography.lineHeight.normal,
  },
  emojiMessage: {
    fontSize: 48,
    lineHeight: 56,
  },

  // Timestamp
  timestamp: {
    fontSize: Typography.size.xs,
    marginTop: Spacing.xs,
  },
  ownTimestamp: {
    color: colors.text.secondary,
    marginRight: Spacing.xs,
  },
  otherTimestamp: {
    color: colors.text.secondary,
    marginLeft: Spacing.xs,
  },

  // Read receipt
  readReceiptContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
    marginRight: Spacing.xs,
  },

  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  typingBubble: {
    backgroundColor: colors.chat.otherBubble,
    borderRadius: Spacing.bubble.borderRadius,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },

  // Input area
  inputWrapper: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.chat.inputBackground,
    borderRadius: Spacing.input.borderRadius,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.chat.inputBorder,
  },
  cameraButton: {
    marginRight: Spacing.sm,
  },
  cameraGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: Typography.size.lg,
    color: colors.text.primary,
    maxHeight: 100,
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: Spacing.sm,
  },
  gifButtonText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  sendButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  sendButtonText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.brand.blue,
  },

  // GIF & Image styles
  gifImage: {
    width: Spacing.bubble.imageSize,
    height: Spacing.bubble.gifHeight,
    borderRadius: Spacing.radius.xl,
    backgroundColor: colors.surfaceVariant,
  },
  messageImage: {
    width: Spacing.bubble.imageSize,
    height: Spacing.bubble.imageSize,
    borderRadius: Spacing.radius.xl,
  },
  expiredImagePlaceholder: {
    width: Spacing.bubble.imageSize,
    height: 120,
    backgroundColor: colors.surfaceVariant,
    borderRadius: Spacing.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredImageText: {
    fontSize: Typography.size.xs,
    color: colors.text.secondary,
    marginTop: 6,
  },
  expiredImageTextOwn: {
    fontSize: Typography.size.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  viewModeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Spacing.radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewModeText: {
    color: '#FFF',
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
  },

  // View Mode Modal
  viewModeModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  viewModeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  viewModeModalTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: colors.text.primary,
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: Colors.common.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  timeBombSelector: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  timeBombLabel: {
    fontSize: Typography.size.sm,
    color: colors.text.secondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  timeBombButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  timeBombButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.radius.xl,
    backgroundColor: colors.surfaceVariant,
  },
  timeBombButtonActive: {
    backgroundColor: Colors.brand.accent,
  },
  timeBombButtonText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: colors.text.secondary,
  },
  timeBombButtonTextActive: {
    color: Colors.common.white,
  },
  sendOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  sendOptionButton: {
    alignItems: 'center',
  },
  sendOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sendOptionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: colors.text.primary,
  },
  sendingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendingText: {
    marginTop: Spacing.md,
    fontSize: Typography.size.lg,
    color: Colors.brand.primary,
  },

  // Full screen image viewer
  imageViewerContainer: {
    flex: 1,
    backgroundColor: Colors.common.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: Spacing.sm,
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
    borderRadius: Spacing.radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  countdownText: {
    color: Colors.common.white,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },
  viewerModeIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Spacing.radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: 6,
  },
  viewerModeText: {
    color: Colors.common.white,
    fontSize: Typography.size.sm,
  },
});
