import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  ViewToken,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import PostCard from '../../components/PostCard';
import { api } from '../../services/api';
import { FeedStackParamList } from '../../navigation/types';

type FeedScreenNavigationProp = StackNavigationProp<FeedStackParamList, 'FeedHome'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TABLET_BREAKPOINT = 600;
const MAX_CONTENT_WIDTH = 1100;

export default function FeedScreen() {
  const navigation = useNavigation<FeedScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [refreshing, setRefreshing] = React.useState(false);
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Calculate header height and item height for paging
  const headerHeight = 48;
  const itemHeight = SCREEN_HEIGHT - headerHeight - insets.top - insets.bottom;

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [])
  );

  const loadFeed = async () => {
    try {
      // Use the algorithmic feed endpoint
      const data = await api.getAlgorithmicFeed(1);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching feed:', error);
      // Fallback to regular feed if algorithmic fails
      try {
        const data = await api.getFeed(1);
        setPosts(data.posts || []);
      } catch (fallbackError) {
        console.error('Error fetching fallback feed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.getAlgorithmicFeed(1);
      setPosts(data.posts || []);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await api.post(`/posts/${postId}/like`);
      // Track interaction for algorithm
      await api.trackInteraction(postId, 'like');
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (postId: string) => {
    navigation.navigate('Comments', { postId });
    api.trackInteraction(postId, 'comment_view').catch(console.error);
  };

  const handleUserPress = (userId: string) => {
    api.trackInteraction(userId, 'profile_view').catch(console.error);
    console.log('View user profile:', userId);
  };

  const navigateToFindFriends = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Search',
        params: {
          screen: 'SearchUsers',
        },
      })
    );
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
      // Track post view for algorithm
      const post = viewableItems[0].item;
      if (post?.id) {
        api.trackInteraction(post.id, 'view').catch(console.error);
      }
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const getItemLayout = (_: any, index: number) => ({
    length: itemHeight,
    offset: itemHeight * index,
    index,
  });

  const renderPost = ({ item }: { item: any }) => (
    <View style={[
      styles.postContainer,
      { height: itemHeight },
      isTablet && { maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' }
    ]}>
      <PostCard
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onUserPress={handleUserPress}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top']}>
        <ActivityIndicator size="large" color="#FBBF24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        {posts.length > 0 && (
          <Text style={styles.postIndicator}>
            {currentIndex + 1} / {posts.length}
          </Text>
        )}
      </View>

      {/* Paging FlatList - one tap scroll */}
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item: any) => item.id}
        renderItem={renderPost}
        // Paging behavior
        pagingEnabled
        snapToInterval={itemHeight}
        snapToAlignment="start"
        disableIntervalMomentum
        // Smooth scrolling optimizations
        decelerationRate={0.99}
        scrollEventThrottle={16}
        // Performance optimizations
        removeClippedSubviews
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={2}
        getItemLayout={getItemLayout}
        // Visual
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        // Callbacks
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={[styles.empty, { height: itemHeight }]}>
            <Ionicons name="people-outline" size={64} color="#FBBF24" />
            <Text style={styles.emptyTitle}>Your Feed is Empty</Text>
            <Text style={styles.emptySubtext}>
              Follow friends to see their posts here
            </Text>
            <TouchableOpacity style={styles.findFriendsButton} onPress={navigateToFindFriends}>
              <Ionicons name="person-add-outline" size={20} color="#FFF" style={styles.findFriendsIcon} />
              <Text style={styles.findFriendsText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  postIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  postContainer: {
    justifyContent: 'center',
    paddingBottom: 90,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF24',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  findFriendsIcon: {
    marginRight: 8,
  },
  findFriendsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
