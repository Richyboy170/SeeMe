import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { api } from '../../services/api';
import Avatar from '../../components/Avatar';
import { AvatarCustomizations } from '../../components/AvatarRenderer';
import { useTheme } from '../../theme';

interface ActiveAvatar {
  id: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  customizations: AvatarCustomizations;
}

interface SearchUser {
  id: string;
  username: string;
  activeAvatarId?: string;
  activeAvatar?: ActiveAvatar | null;
  avatarUrl?: string;
  positivityGiveCounter?: number;
  positivityRank?: string;
  isFollowing: boolean;
  followRequestStatus?: 'pending' | 'approved' | 'rejected' | null;
  recommendationReason?: string;
}

interface SearchUsersScreenProps {
  navigation: any;
}

export default function SearchUsersScreen({ navigation }: SearchUsersScreenProps) {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [followingUsers, setFollowingUsers] = useState<SearchUser[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [followingLoading, setFollowingLoading] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [messageLoading, setMessageLoading] = useState<string | null>(null);

  // Load following users and recommendations when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadFollowingUsers();
      loadRecommendations();
    }, [])
  );

  const loadFollowingUsers = async () => {
    setLoadingFollowing(true);
    try {
      // Get current user's profile first
      const profileResponse = await api.getProfile();
      const currentUser = profileResponse.user || profileResponse;

      // Get users the current user is following
      const followingResponse = await api.getFollowing(currentUser.username);
      const following = followingResponse.following || [];

      // Filter out current user (should never be in following list, but defensive check)
      const filteredFollowing = following.filter(
        (f: any) => f.id !== currentUser.id && f.username !== currentUser.username
      );

      // Map to SearchUser format
      const mappedUsers: SearchUser[] = filteredFollowing.map((f: any) => ({
        id: f.id,
        username: f.username,
        activeAvatarId: f.activeAvatarId,
        activeAvatar: f.activeAvatar || null,
        avatarUrl: f.avatarUrl,
        positivityGiveCounter: f.positivityGiveCounter,
        positivityRank: f.positivityRank,
        isFollowing: true, // They're in the following list
      }));

      setFollowingUsers(mappedUsers);
    } catch (error) {
      console.error('Error loading following users:', error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      // Get current user ID to filter out self from recommendations
      const profileResponse = await api.getProfile();
      const currentUserId = (profileResponse.user || profileResponse).id;
      const currentUsername = (profileResponse.user || profileResponse).username;

      const response = await api.getRecommendedUsers(20);
      const recommendations = response.recommendations || [];

      // Filter out current user (defensive check - backend should already exclude)
      // Use both ID and username comparison for safety
      const filteredRecommendations = recommendations.filter(
        (r: any) => r.id !== currentUserId && r.username !== currentUsername
      );

      // Map to SearchUser format
      const mappedUsers: SearchUser[] = filteredRecommendations.map((r: any) => ({
        id: r.id,
        username: r.username,
        activeAvatarId: r.activeAvatarId,
        activeAvatar: r.activeAvatar || null,
        avatarUrl: r.avatarUrl,
        positivityGiveCounter: r.positivityGiveCounter,
        positivityRank: r.positivityRank,
        isFollowing: false,
        recommendationReason: r.recommendationReason,
      }));

      setRecommendedUsers(mappedUsers);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await api.searchUsers(searchQuery.trim());
      setUsers(response.users || []);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (user: SearchUser) => {
    if (followingLoading) return;

    setFollowingLoading(user.id);
    try {
      if (user.isFollowing) {
        await api.unfollowUser(user.username);
      } else {
        await api.followUser(user.username);
      }

      // Update local state for search results
      setUsers(prev =>
        prev.map(u =>
          u.id === user.id ? { ...u, isFollowing: !u.isFollowing } : u
        )
      );

      // Update following users list
      if (user.isFollowing) {
        // Was following, now unfollowing - remove from followingUsers
        setFollowingUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        // Was not following, now following - add to followingUsers
        setFollowingUsers(prev => [...prev, { ...user, isFollowing: true }]);
      }

      // Update recommended users list
      setRecommendedUsers(prev =>
        prev.map(u =>
          u.id === user.id ? { ...u, isFollowing: !u.isFollowing } : u
        )
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update follow status';
      Alert.alert('Error', errorMessage);
    } finally {
      setFollowingLoading(null);
    }
  };

  const handleMessage = async (user: SearchUser) => {
    if (messageLoading) return;

    setMessageLoading(user.id);
    try {
      // Create or get existing conversation
      const response = await api.createConversation(user.id);
      const conversation = response.conversation;

      if (conversation) {
        // Navigate to Feed tab and then to Chat screen
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Feed',
            params: {
              screen: 'Chat',
              params: {
                conversationId: conversation.id,
                otherUser: {
                  id: user.id,
                  username: user.username,
                  avatarUrl: user.avatarUrl,
                },
              },
            },
          })
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to start conversation';
      Alert.alert('Error', errorMessage);
    } finally {
      setMessageLoading(null);
    }
  };

  const handleUserPress = (user: SearchUser) => {
    navigation.navigate('UserProfile', { userId: user.id, username: user.username });
  };

  const renderUserItem = ({ item, showMessage = false, showReason = false }: { item: SearchUser; showMessage?: boolean; showReason?: boolean }) => {
    const isLoadingFollow = followingLoading === item.id;
    const isLoadingMessage = messageLoading === item.id;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <Avatar
          size={50}
          avatarUrl={!item.activeAvatar ? item.avatarUrl : undefined}
          username={item.username}
          style={styles.avatar}
          customizations={item.activeAvatar?.customizations}
          avatarStyle={item.activeAvatar?.style}
        />

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={[styles.username, { color: colors.text.primary }]}>{item.username}</Text>
          {showReason && item.recommendationReason ? (
            <View style={styles.reasonBadge}>
              <Ionicons
                name={
                  item.recommendationReason === 'Popular' ? 'star' :
                  item.recommendationReason === 'Active' ? 'flash' :
                  item.recommendationReason === 'New' ? 'sparkles' : 'person'
                }
                size={12}
                color="#FBBF24"
              />
              <Text style={styles.reasonText}>{item.recommendationReason}</Text>
            </View>
          ) : item.positivityRank ? (
            <Text style={[styles.rank, { color: colors.text.tertiary }]}>{item.positivityRank}</Text>
          ) : null}
        </View>

        {/* Message Button (for following users) */}
        {(showMessage || item.isFollowing) && (
          <TouchableOpacity
            style={[styles.messageButton, { backgroundColor: colors.inputBackground }]}
            onPress={() => handleMessage(item)}
            disabled={isLoadingMessage}
          >
            {isLoadingMessage ? (
              <ActivityIndicator size="small" color={colors.text.link} />
            ) : (
              <Ionicons name="chatbubble-outline" size={20} color={colors.text.link} />
            )}
          </TouchableOpacity>
        )}

        {/* Follow Button */}
        <TouchableOpacity
          style={[
            styles.followButton,
            { backgroundColor: colors.text.link },
            item.isFollowing && [styles.followingButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]
          ]}
          onPress={() => handleFollow(item)}
          disabled={isLoadingFollow}
        >
          {isLoadingFollow ? (
            <ActivityIndicator size="small" color={item.isFollowing ? colors.text.primary : '#FFF'} />
          ) : (
            <Text style={[
              styles.followButtonText,
              item.isFollowing && [styles.followingButtonText, { color: colors.text.primary }]
            ]}>
              {item.isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderFollowingItem = ({ item }: { item: SearchUser }) => {
    return renderUserItem({ item, showMessage: true });
  };

  const renderRecommendedItem = ({ item }: { item: SearchUser }) => {
    return renderUserItem({ item, showReason: true });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={20} color={colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text.primary }]}
            placeholder="Search users..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setUsers([]);
                setHasSearched(false);
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading || !searchQuery.trim()}
        >
          <Text style={[
            styles.searchButtonText,
            { color: colors.text.link },
            (!searchQuery.trim() || loading) && [styles.searchButtonTextDisabled, { color: colors.disabled }]
          ]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.text.link} />
        </View>
      ) : hasSearched && users.length > 0 ? (
        // Search results
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderUserItem({ item })}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : hasSearched && users.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="person-outline" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No users found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.tertiary }]}>
            Try searching with a different username
          </Text>
        </View>
      ) : loadingFollowing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.text.link} />
        </View>
      ) : followingUsers.length > 0 ? (
        // Show following users by default
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.sectionHeader, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Your Friends</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text.tertiary }]}>People you follow</Text>
          </View>
          <FlatList
            data={followingUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderFollowingItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : loadingRecommendations ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.text.link} />
        </View>
      ) : recommendedUsers.length > 0 ? (
        // Show recommended users when user has no following
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.sectionHeader, { backgroundColor: colors.card }]}>
            <Ionicons name="sparkles" size={20} color="#FBBF24" style={styles.sectionIcon} />
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Suggested for You</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.text.tertiary }]}>People you might want to follow</Text>
            </View>
          </View>
          <FlatList
            data={recommendedUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderRecommendedItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Ionicons name="people-outline" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Find Friends</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.tertiary }]}>
            Search for users by their username to follow them
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  searchButton: {
    paddingVertical: 8,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3897F0',
  },
  searchButtonTextDisabled: {
    color: '#C7C7CC',
  },

  // List
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  rank: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  followButton: {
    backgroundColor: '#3897F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  followingButtonText: {
    color: '#000',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFF',
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 4,
  },

  // Empty State
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
