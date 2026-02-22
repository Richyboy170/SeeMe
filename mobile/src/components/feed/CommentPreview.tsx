/**
 * CommentPreview Component
 * Shows a preview of recent comments below a post in the feed
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Comment {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
  };
  createdAt: string;
}

interface CommentPreviewProps {
  comments: Comment[];
  totalComments: number;
  onViewAllComments: () => void;
  onUserPress: (userId: string) => void;
  maxComments?: number;
  colors: {
    text: string;
    textSecondary: string;
    accent: string;
  };
}

export function CommentPreview({
  comments,
  totalComments,
  onViewAllComments,
  onUserPress,
  maxComments = 3,
  colors,
}: CommentPreviewProps) {
  if (!comments || comments.length === 0) {
    return null;
  }

  const displayComments = comments.slice(0, maxComments);
  const hasMoreComments = totalComments > maxComments;

  return (
    <View style={styles.container}>
      {/* Comment previews */}
      {displayComments.map((comment) => (
        <View key={comment.id} style={styles.commentRow}>
          <TouchableOpacity onPress={() => onUserPress(comment.user.id)}>
            <Text style={[styles.username, { color: colors.text }]}>
              {comment.user.username}
            </Text>
          </TouchableOpacity>
          <Text
            style={[styles.commentText, { color: colors.text }]}
            numberOfLines={2}
          >
            {comment.content}
          </Text>
        </View>
      ))}

      {/* View all comments link */}
      {hasMoreComments && (
        <TouchableOpacity
          onPress={onViewAllComments}
          style={styles.viewAllButton}
        >
          <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>
            View all {totalComments} comments
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 4,
  },
  viewAllButton: {
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 14,
  },
  commentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 2,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  commentText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});

export default CommentPreview;
