import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GiveCoinsModal from './coins/GiveCoinsModal';
import { getImageUrl } from '../services/api';

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: {
    id: string;
    user: {
      id: string;
      username: string;
      activeAvatarId?: string;
    };
    imageUrl?: string;
    originalImageUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
    likesCount: number;
    commentsCount: number;
    likedByMe?: boolean;
    createdAt: string;
  };
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onUserPress?: (userId: string) => void;
}

export default function PostCard({
  post,
  onLike,
  onComment,
  onUserPress,
}: PostCardProps) {
  const [liked, setLiked] = useState(post.likedByMe || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [giveModalVisible, setGiveModalVisible] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    if (onLike) {
      onLike(post.id);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(post.id);
    }
  };

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress(post.user.id);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={handleUserPress}>
        <View style={styles.userAvatar}>
          <Ionicons name="person-circle" size={40} color="#9CA3AF" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{post.user.username}</Text>
          <Text style={styles.timestamp}>{formatTimeAgo(post.createdAt)}</Text>
        </View>
      </TouchableOpacity>

      {/* Image */}
      {(() => {
        // Try thumbnailUrl, then imageUrl (processedImageUrl), then originalImageUrl as fallback
        const imageUri = getImageUrl(post.thumbnailUrl) || getImageUrl(post.imageUrl) || getImageUrl(post.originalImageUrl);
        return imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.postImage, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={48} color="#9CA3AF" />
          </View>
        );
      })()}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? '#FF3B30' : '#000'}
            />
            {likesCount > 0 && (
              <Text style={styles.actionCount}>{likesCount}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={26} color="#000" />
            {post.commentsCount > 0 && (
              <Text style={styles.actionCount}>{post.commentsCount}</Text>
            )}
          </TouchableOpacity>

          {/* Give Coins Button */}
          <TouchableOpacity
            onPress={() => setGiveModalVisible(true)}
            style={styles.actionButton}
          >
            <Ionicons name="gift" size={26} color="#FBBF24" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Caption */}
      {post.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>
            <Text style={styles.captionUsername}>@{post.user.username} </Text>
            {post.caption}
          </Text>
        </View>
      )}

      {/* Give Coins Modal */}
      <GiveCoinsModal
        visible={giveModalVisible}
        recipientId={post.user.id}
        recipientUsername={post.user.username}
        contextType="post"
        contextId={post.id}
        onClose={() => setGiveModalVisible(false)}
        onSuccess={() => {
          // Optionally reload post or show animation
          setGiveModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  userAvatar: {
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#F3F4F6',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '600',
    color: '#111827',
  },
});
