import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { api, getImageUrl } from '../../services/api';

interface SearchUser {
  id: string;
  username: string;
  activeAvatarId?: string;
  avatarUrl?: string;
  positivityGiveCounter?: number;
  positivityRank?: string;
  isFollowing: boolean;
}

interface SearchUsersScreenProps {
  navigation: any;
}

export default function SearchUsersScreen({ navigation }: SearchUsersScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [followingUsers, setFollowingUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [followingLoading, setFollowingLoading] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [messageLoading, setMessageLoading] = useState<string | null>(null);

  // Load following users when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadFollowingUsers();
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

      // Map to SearchUser format
      const mappedUsers: SearchUser[] = following.map((f: any) => ({
        id: f.id,
        username: f.username,
        activeAvatarId: f.activeAvatarId,
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
        // Navigate to Messages tab and then to Chat screen
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Messages',
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

  const renderUserItem = ({ item, showMessage = false }: { item: SearchUser; showMessage?: boolean }) => {
    const avatarUri = item.avatarUrl ? getImageUrl(item.avatarUrl) : null;
    const isLoadingFollow = followingLoading === item.id;
    const isLoadingMessage = messageLoading === item.id;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#C7C7CC" />
          </View>
        )}

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          {item.positivityRank && (
            <Text style={styles.rank}>{item.positivityRank}</Text>
          )}
        </View>

        {/* Message Button (for following users) */}
        {(showMessage || item.isFollowing) && (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => handleMessage(item)}
            disabled={isLoadingMessage}
          >
            {isLoadingMessage ? (
              <ActivityIndicator size="small" color="#3897F0" />
            ) : (
              <Ionicons name="chatbubble-outline" size={20} color="#3897F0" />
            )}
          </TouchableOpacity>
        )}

        {/* Follow Button */}
        <TouchableOpacity
          style={[
            styles.followButton,
            item.isFollowing && styles.followingButton
          ]}
          onPress={() => handleFollow(item)}
          disabled={isLoadingFollow}
        >
          {isLoadingFollow ? (
            <ActivityIndicator size="small" color={item.isFollowing ? '#000' : '#FFF'} />
          ) : (
            <Text style={[
              styles.followButtonText,
              item.isFollowing && styles.followingButtonText
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

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#8E8E93"
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
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
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
            (!searchQuery.trim() || loading) && styles.searchButtonTextDisabled
          ]}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3897F0" />
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
          <Ionicons name="person-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptySubtitle}>
            Try searching with a different username
          </Text>
        </View>
      ) : loadingFollowing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3897F0" />
        </View>
      ) : followingUsers.length > 0 ? (
        // Show following users by default
        <View style={styles.container}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Friends</Text>
            <Text style={styles.sectionSubtitle}>People you follow</Text>
          </View>
          <FlatList
            data={followingUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderFollowingItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.centerContent}>
          <Ionicons name="people-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>Find Friends</Text>
          <Text style={styles.emptySubtitle}>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFF',
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
