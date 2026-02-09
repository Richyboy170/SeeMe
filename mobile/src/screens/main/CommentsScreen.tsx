import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { api } from '../../services/api';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import { useTheme } from '../../theme';
import Avatar from '../../components/Avatar';
import { AvatarCustomizations } from '../../components/AvatarRenderer';

interface ActiveAvatar {
  id: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  customizations: AvatarCustomizations;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentCommentId: string | null;
  user: {
    id: string;
    username: string;
    activeAvatarId?: string;
    activeAvatar?: ActiveAvatar | null;
  };
  replies?: Comment[];
}

type CommentsScreenRouteProp = RouteProp<{ Comments: { postId: string } }, 'Comments'>;

export default function CommentsScreen() {
  const route = useRoute<CommentsScreenRouteProp>();
  const { postId } = route.params;
  const { showCelebration } = useCoinCelebration();
  const { colors, isDark } = useTheme();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      const data = await api.getPostComments(postId);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const result = await api.createComment(
        postId,
        newComment.trim(),
        replyingTo?.id
      );

      if (result.comment) {
        if (replyingTo) {
          // Add reply to the parent comment
          setComments(prevComments =>
            prevComments.map(c => {
              if (c.id === replyingTo.id) {
                return {
                  ...c,
                  replies: [...(c.replies || []), result.comment]
                };
              }
              return c;
            })
          );
          // Expand replies for the parent comment
          setExpandedReplies(prev => new Set(prev).add(replyingTo.id));
        } else {
          // Add new top-level comment
          setComments(prevComments => [result.comment, ...prevComments]);
        }

        // Show coin celebration animation if applicable
        if (result.coinsEarned && result.coinsEarned > 0) {
          showCelebration(result.coinsEarned, 'comment');
        }
      }

      setNewComment('');
      setReplyingTo(null);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const toggleReplies = async (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
      // Load more replies if needed
      try {
        const data = await api.getCommentReplies(commentId);
        if (data.replies) {
          setComments(prevComments =>
            prevComments.map(c => {
              if (c.id === commentId) {
                return { ...c, replies: data.replies };
              }
              return c;
            })
          );
        }
      } catch (error) {
        console.error('Error loading replies:', error);
      }
    }
    setExpandedReplies(newExpanded);
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

  const renderReply = (reply: Comment, parentUsername: string) => (
    <View key={reply.id} style={styles.replyItem}>
      <Avatar
        size={28}
        username={reply.user.username}
        style={styles.replyAvatar}
        customizations={reply.user.activeAvatar?.customizations}
        avatarStyle={reply.user.activeAvatar?.style}
      />
      <View style={styles.replyContent}>
        <View style={styles.replyHeader}>
          <Text style={[styles.replyUsername, { color: colors.text.primary }]}>@{reply.user.username}</Text>
          <Text style={[styles.replyTime, { color: colors.text.secondary }]}>{formatTimeAgo(reply.createdAt)}</Text>
        </View>
        <Text style={[styles.replyText, { color: colors.text.primary }]}>
          <Text style={[styles.mentionText, { color: colors.text.link }]}>@{parentUsername} </Text>
          {reply.content}
        </Text>
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => handleReply(reply)}
        >
          <Text style={[styles.replyButtonText, { color: colors.text.secondary }]}>Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderComment = ({ item }: { item: Comment }) => {
    const hasReplies = item.replies && item.replies.length > 0;
    const isExpanded = expandedReplies.has(item.id);

    return (
      <View style={styles.commentContainer}>
        <View style={styles.commentItem}>
          <Avatar
            size={36}
            username={item.user.username}
            style={styles.avatar}
            customizations={item.user.activeAvatar?.customizations}
            avatarStyle={item.user.activeAvatar?.style}
          />
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={[styles.username, { color: colors.text.primary }]}>@{item.user.username}</Text>
              <Text style={[styles.timestamp, { color: colors.text.secondary }]}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
            <Text style={[styles.commentText, { color: colors.text.primary }]}>{item.content}</Text>
            <View style={styles.commentActions}>
              <TouchableOpacity
                style={styles.replyButton}
                onPress={() => handleReply(item)}
              >
                <Ionicons name="chatbubble-outline" size={14} color={colors.text.secondary} />
                <Text style={[styles.replyButtonText, { color: colors.text.secondary }]}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Replies section */}
        {hasReplies && (
          <View style={styles.repliesSection}>
            <TouchableOpacity
              style={styles.viewRepliesButton}
              onPress={() => toggleReplies(item.id)}
            >
              <View style={[styles.repliesLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.viewRepliesText, { color: colors.text.secondary }]}>
                {isExpanded
                  ? 'Hide replies'
                  : `View ${item.replies!.length} ${item.replies!.length === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.repliesList}>
                {item.replies!.map(reply => renderReply(reply, item.user.username))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gift} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.disabled} />
            <Text style={[styles.emptyText, { color: colors.text.primary }]}>No comments yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>Be the first to comment!</Text>
          </View>
        }
      />

      {/* Input area */}
      <View style={[styles.inputContainer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {replyingTo && (
          <View style={[styles.replyingToBar, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.replyingToText, { color: colors.text.secondary }]}>
              Replying to @{replyingTo.user.username}
            </Text>
            <TouchableOpacity onPress={cancelReply}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text.primary }]}
            placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
            placeholderTextColor={colors.text.secondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.gift },
              (!newComment.trim() || submitting) && [styles.sendButtonDisabled, { backgroundColor: colors.disabled }]
            ]}
            onPress={handleSubmit}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Ionicons name="send" size={20} color={colors.text.inverse} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  commentContainer: {
    marginBottom: 4,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  repliesSection: {
    marginLeft: 48,
    paddingLeft: 12,
  },
  viewRepliesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  repliesLine: {
    width: 24,
    height: 1,
    marginRight: 8,
  },
  viewRepliesText: {
    fontSize: 13,
    fontWeight: '500',
  },
  repliesList: {
    marginTop: 4,
  },
  replyItem: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  replyAvatar: {
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyUsername: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  replyTime: {
    fontSize: 11,
  },
  replyText: {
    fontSize: 14,
    lineHeight: 18,
  },
  mentionText: {
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  inputContainer: {
    borderTopWidth: 1,
  },
  replyingToBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyingToText: {
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    // backgroundColor applied dynamically via inline style
  },
});
