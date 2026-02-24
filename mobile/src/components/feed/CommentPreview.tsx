/**
 * CommentPreview Component
 * Twitter/X-style threaded comment preview with smooth connectivity lines
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
  replies?: Comment[];
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

interface FlatComment {
  id: string;
  content: string;
  user: { id: string; username: string };
  isReply: boolean;
  parentUsername?: string;
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

  const flatList: FlatComment[] = [];
  for (const comment of comments) {
    flatList.push({
      id: comment.id,
      content: comment.content,
      user: comment.user,
      isReply: false,
    });
    if (comment.replies) {
      for (const reply of comment.replies) {
        flatList.push({
          id: reply.id,
          content: reply.content,
          user: reply.user,
          isReply: true,
          parentUsername: comment.user.username,
        });
      }
    }
  }

  const displayComments = flatList.slice(0, maxComments);
  const hasMoreComments = totalComments > maxComments;
  const lineColor = colors.textSecondary + '35';

  return (
    <View style={styles.container}>
      {displayComments.map((comment, index) => {
        const isLast = index === displayComments.length - 1 && !hasMoreComments;

        if (comment.isReply) {
          return (
            <View key={comment.id} style={styles.row}>
              {/* Curved branch: vertical line continues + smooth L-curve to the right */}
              <View style={styles.threadCol}>
                {/* Vertical line continuing down (or stopping) */}
                <View style={[styles.verticalLine, { backgroundColor: isLast ? 'transparent' : lineColor }]} />
                {/* The curve: sits in the top-left, border-left + border-bottom with radius */}
                <View
                  style={[
                    styles.curve,
                    {
                      borderLeftColor: lineColor,
                      borderBottomColor: lineColor,
                    },
                  ]}
                />
              </View>

              {/* Reply content — indented */}
              <View style={styles.replyBody}>
                <View style={styles.textRow}>
                  <TouchableOpacity onPress={() => onUserPress(comment.user.id)}>
                    <Text style={[styles.username, { color: colors.text }]}>
                      {comment.user.username}
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[styles.commentText, { color: colors.textSecondary }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {comment.content}
                  </Text>
                </View>
              </View>
            </View>
          );
        }

        // Regular top-level comment
        return (
          <View key={comment.id} style={styles.row}>
            <View style={styles.threadCol}>
              {/* Continuous vertical line — transparent above first item */}
              <View style={[
                styles.verticalLine,
                { backgroundColor: index === 0 ? 'transparent' : lineColor },
              ]} />
              {/* Small circle indicator */}
              <View style={[styles.circle, { borderColor: lineColor }]} />
              {/* Vertical line below — hidden if last */}
              <View style={[
                styles.verticalLineBelow,
                { backgroundColor: isLast ? 'transparent' : lineColor },
              ]} />
            </View>

            <View style={styles.commentBody}>
              <View style={styles.textRow}>
                <TouchableOpacity onPress={() => onUserPress(comment.user.id)}>
                  <Text style={[styles.username, { color: colors.text }]}>
                    {comment.user.username}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[styles.commentText, { color: colors.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {comment.content}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* View all comments */}
      {hasMoreComments && (
        <TouchableOpacity onPress={onViewAllComments} style={styles.row}>
          <View style={styles.threadCol}>
            <View style={[styles.verticalLine, { backgroundColor: lineColor }]} />
            <View style={[styles.circle, { borderColor: colors.accent + '50' }]} />
            <View style={[styles.verticalLineBelow, { backgroundColor: 'transparent' }]} />
          </View>
          <View style={styles.commentBody}>
            <Text style={[styles.viewAllText, { color: colors.textSecondary }]}>
              View all {totalComments} comments
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const LINE_WIDTH = 2;
const THREAD_COL_WIDTH = 20;
const CURVE_SIZE = 14;

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    minHeight: 26,
  },

  // --- Thread column (left gutter) ---
  threadCol: {
    width: THREAD_COL_WIDTH,
    alignItems: 'center',
    position: 'relative',
  },
  verticalLine: {
    width: LINE_WIDTH,
    height: 10,
    borderRadius: 1,
  },
  verticalLineBelow: {
    width: LINE_WIDTH,
    flex: 1,
    borderRadius: 1,
  },
  circle: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: LINE_WIDTH,
    backgroundColor: 'transparent',
  },

  // --- Curved branch for replies (Twitter-style L-curve) ---
  curve: {
    position: 'absolute',
    top: 0,
    left: (THREAD_COL_WIDTH / 2) - (LINE_WIDTH / 2),
    width: CURVE_SIZE,
    height: CURVE_SIZE,
    borderLeftWidth: LINE_WIDTH,
    borderBottomWidth: LINE_WIDTH,
    borderBottomLeftRadius: 10,
  },

  // --- Content areas ---
  commentBody: {
    flex: 1,
    paddingVertical: 3,
    paddingLeft: 6,
    justifyContent: 'center',
  },
  replyBody: {
    flex: 1,
    paddingVertical: 3,
    paddingLeft: CURVE_SIZE + 2,
    justifyContent: 'center',
  },
  textRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  viewAllText: {
    fontSize: 13,
  },
});

export default CommentPreview;
