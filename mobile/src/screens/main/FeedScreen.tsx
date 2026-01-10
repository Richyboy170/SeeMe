import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import PostCard from '../../components/PostCard';
import { api } from '../../services/api';

export default function FeedScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [posts, setPosts] = React.useState([]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.getFeed(1);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLike = async (postId: string) => {
    // TODO: Implement like functionality
    console.log('Like post:', postId);
  };

  const handleComment = (postId: string) => {
    // TODO: Navigate to comments screen
    console.log('Comment on post:', postId);
  };

  const handleUserPress = (userId: string) => {
    // TODO: Navigate to user profile
    console.log('View user profile:', userId);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
            onUserPress={handleUserPress}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Follow users to see their posts here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
