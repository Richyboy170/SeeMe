import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import Avatar from '../../components/Avatar';
import { AvatarCustomizations } from '../../components/AvatarRenderer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRIEND_CARD_WIDTH = 140;

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

interface BondData {
  trustScore: number;
  currentStreak: number;
  longestStreak: number;
  isMutualFollow: boolean;
  totalExchangeDays: number;
}

interface PeopleTabProps {
  searchQuery: string;
  navigation: any;
}

const getRankInfo = (trustScore: number) => {
  if (trustScore >= 80) return { label: 'Best Friend', color: '#8B5CF6', bgColor: '#EDE9FE', darkBgColor: '#2E1065', gradient: ['#8B5CF6', '#A855F7'] as [string, string], icon: 'heart' as const };
  if (trustScore >= 60) return { label: 'Close Friend', color: '#EC4899', bgColor: '#FCE7F3', darkBgColor: '#4A0E2B', gradient: ['#EC4899', '#F472B6'] as [string, string], icon: 'heart-half' as const };
  if (trustScore >= 40) return { label: 'Good Friend', color: '#F59E0B', bgColor: '#FEF3C7', darkBgColor: '#451A03', gradient: ['#F59E0B', '#FBBF24'] as [string, string], icon: 'sunny' as const };
  if (trustScore >= 20) return { label: 'Building', color: '#10B981', bgColor: '#D1FAE5', darkBgColor: '#064E3B', gradient: ['#10B981', '#34D399'] as [string, string], icon: 'leaf' as const };
  return { label: 'New', color: '#6B7280', bgColor: '#F3F4F6', darkBgColor: '#1F2937', gradient: ['#9CA3AF', '#D1D5DB'] as [string, string], icon: 'sparkles' as const };
};

export default function PeopleTab({ searchQuery, navigation }: PeopleTabProps) {
  const { colors, isDark } = useTheme();
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [followingUsers, setFollowingUsers] = useState<SearchUser[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [followingLoading, setFollowingLoading] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [messageLoading, setMessageLoading] = useState<string | null>(null);
  const [bondDataMap, setBondDataMap] = useState<{ [userId: string]: BondData }>({});

  useFocusEffect(
    useCallback(() => {
      loadFollowingUsers();
      loadRecommendations();
    }, [])
  );

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      setUsers([]);
      setHasSearched(false);
    }
  }, [searchQuery]);

  // Load bond data for following users
  useEffect(() => {
    if (followingUsers.length > 0) {
      loadBondData(followingUsers);
    }
  }, [followingUsers]);

  const loadBondData = async (users: SearchUser[]) => {
    try {
      const bondPromises = users.map(async (user) => {
        try {
          const response = await api.getTrustScore(user.id);
          return {
            userId: user.id,
            data: {
              trustScore: response.trustScore || 0,
              currentStreak: response.currentStreak || 0,
              longestStreak: response.longestStreak || 0,
              isMutualFollow: response.isMutualFollow || false,
              totalExchangeDays: response.totalExchangeDays || 0,
            },
          };
        } catch {
          return { userId: user.id, data: { trustScore: 0, currentStreak: 0, longestStreak: 0, isMutualFollow: false, totalExchangeDays: 0 } };
        }
      });

      const results = await Promise.all(bondPromises);
      const newMap: { [userId: string]: BondData } = {};
      results.forEach((r) => {
        newMap[r.userId] = r.data;
      });
      setBondDataMap(newMap);
    } catch (error) {
      console.error('Load bond data error:', error);
    }
  };

  const loadFollowingUsers = async () => {
    setLoadingFollowing(true);
    try {
      const profileResponse = await api.getProfile();
      const currentUser = profileResponse.user || profileResponse;
      const followingResponse = await api.getFollowing(currentUser.username);
      const following = followingResponse.following || [];

      const filteredFollowing = following.filter(
        (f: any) => f.id !== currentUser.id && f.username !== currentUser.username
      );

      const mappedUsers: SearchUser[] = filteredFollowing.map((f: any) => ({
        id: f.id,
        username: f.username,
        activeAvatarId: f.activeAvatarId,
        activeAvatar: f.activeAvatar || null,
        avatarUrl: f.avatarUrl,
        positivityGiveCounter: f.positivityGiveCounter,
        positivityRank: f.positivityRank,
        isFollowing: true,
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
      const profileResponse = await api.getProfile();
      const currentUserId = (profileResponse.user || profileResponse).id;
      const currentUsername = (profileResponse.user || profileResponse).username;

      const response = await api.getRecommendedUsers(20);
      const recommendations = response.recommendations || [];

      const filteredRecommendations = recommendations.filter(
        (r: any) => r.id !== currentUserId && r.username !== currentUsername
      );

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

      setUsers(prev =>
        prev.map(u => u.id === user.id ? { ...u, isFollowing: !u.isFollowing } : u)
      );

      if (user.isFollowing) {
        setFollowingUsers(prev => prev.filter(u => u.id !== user.id));
      } else {
        setFollowingUsers(prev => [...prev, { ...user, isFollowing: true }]);
      }

      setRecommendedUsers(prev =>
        prev.map(u => u.id === user.id ? { ...u, isFollowing: !u.isFollowing } : u)
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
      const response = await api.createConversation(user.id);
      const conversation = response.conversation;
      if (conversation) {
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Feed',
            params: {
              screen: 'Chat',
              params: {
                conversationId: conversation.id,
                otherUser: { id: user.id, username: user.username, avatarUrl: user.avatarUrl },
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

  // --- Friend Card (horizontal scroll) ---
  const renderFriendCard = (item: SearchUser) => {
    const bond = bondDataMap[item.id];
    const trustScore = bond?.trustScore || 0;
    const streak = bond?.currentStreak || 0;
    const rank = getRankInfo(trustScore);
    const isLoadingMessage = messageLoading === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.friendCard, { backgroundColor: isDark ? colors.surface : colors.card }]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.8}
      >
        {/* Score ring around avatar */}
        <View style={styles.friendAvatarWrap}>
          <View style={[styles.friendAvatarRing, { borderColor: rank.color }]}>
            <Avatar
              size={56}
              avatarUrl={!item.activeAvatar ? item.avatarUrl : undefined}
              username={item.username}
              customizations={item.activeAvatar?.customizations}
              avatarStyle={item.activeAvatar?.style}
            />
          </View>
          {/* Score badge — tappable to friendship detail */}
          {bond && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation?.();
                navigation.dispatch(
                  CommonActions.navigate({
                    name: 'Coins',
                    params: {
                      screen: 'FriendshipDetail',
                      params: {
                        otherUserId: item.id,
                        otherUsername: item.username,
                        otherAvatarUrl: item.avatarUrl,
                      },
                    },
                  })
                );
              }}
            >
              <LinearGradient
                colors={rank.gradient}
                style={styles.friendScoreBadge}
              >
                <Text style={styles.friendScoreText}>{trustScore}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {/* Streak flame */}
          {streak > 0 && (
            <View style={styles.friendStreakBadge}>
              <Ionicons name="flame" size={8} color="#FFF" />
              <Text style={styles.friendStreakText}>{streak}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.friendUsername, { color: colors.text.primary }]} numberOfLines={1}>
          {item.username}
        </Text>

        {/* Rank label */}
        {bond && trustScore > 0 && (
          <View style={[styles.friendRankBadge, { backgroundColor: isDark ? rank.darkBgColor : rank.bgColor }]}>
            <Ionicons name={rank.icon} size={9} color={rank.color} />
            <Text style={[styles.friendRankText, { color: rank.color }]}>{rank.label}</Text>
          </View>
        )}

        {/* Message button */}
        <TouchableOpacity
          style={[styles.friendMsgBtn, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}
          onPress={() => handleMessage(item)}
          disabled={isLoadingMessage}
        >
          {isLoadingMessage ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <>
              <Ionicons name="chatbubble" size={12} color="#3B82F6" />
              <Text style={styles.friendMsgText}>Message</Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // --- Suggested User Card ---
  const renderSuggestedItem = ({ item }: { item: SearchUser }) => {
    const isLoadingFollow = followingLoading === item.id;
    const reasonIcon = item.recommendationReason === 'Popular' ? 'star' :
      item.recommendationReason === 'Active' ? 'flash' :
      item.recommendationReason === 'New' ? 'sparkles' : 'person';

    return (
      <TouchableOpacity
        style={[styles.suggestedCard, { backgroundColor: isDark ? colors.surface : colors.card }]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.suggestedLeft}>
          <View style={styles.suggestedAvatarWrap}>
            <Avatar
              size={50}
              avatarUrl={!item.activeAvatar ? item.avatarUrl : undefined}
              username={item.username}
              customizations={item.activeAvatar?.customizations}
              avatarStyle={item.activeAvatar?.style}
            />
          </View>

          <View style={styles.suggestedInfo}>
            <Text style={[styles.suggestedUsername, { color: colors.text.primary }]} numberOfLines={1}>
              {item.username}
            </Text>
            <View style={styles.suggestedMeta}>
              {item.recommendationReason && (
                <View style={[styles.reasonPill, { backgroundColor: isDark ? '#422006' : '#FEF3C7' }]}>
                  <Ionicons name={reasonIcon} size={10} color="#F59E0B" />
                  <Text style={[styles.reasonPillText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
                    {item.recommendationReason}
                  </Text>
                </View>
              )}
              {item.positivityRank && (
                <Text style={[styles.suggestedRank, { color: colors.text.secondary }]}>
                  {item.positivityRank}
                </Text>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.suggestedFollowBtn,
            item.isFollowing && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
          ]}
          onPress={() => handleFollow(item)}
          disabled={isLoadingFollow}
        >
          {isLoadingFollow ? (
            <ActivityIndicator size="small" color={item.isFollowing ? colors.text.primary : '#FFF'} />
          ) : (
            <Text style={[
              styles.suggestedFollowText,
              item.isFollowing && { color: colors.text.primary },
            ]}>
              {item.isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // --- Search Result Item ---
  const renderSearchItem = ({ item }: { item: SearchUser }) => {
    const isLoadingFollow = followingLoading === item.id;
    const isLoadingMessage = messageLoading === item.id;

    return (
      <TouchableOpacity
        style={[styles.searchCard, { backgroundColor: isDark ? colors.surface : colors.card }]}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.8}
      >
        <Avatar
          size={48}
          avatarUrl={!item.activeAvatar ? item.avatarUrl : undefined}
          username={item.username}
          customizations={item.activeAvatar?.customizations}
          avatarStyle={item.activeAvatar?.style}
        />

        <View style={styles.searchInfo}>
          <Text style={[styles.searchUsername, { color: colors.text.primary }]} numberOfLines={1}>
            {item.username}
          </Text>
          {item.positivityRank && (
            <Text style={[styles.searchRank, { color: colors.text.secondary }]}>
              {item.positivityRank}
            </Text>
          )}
        </View>

        {item.isFollowing && (
          <TouchableOpacity
            style={[styles.searchMsgBtn, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}
            onPress={() => handleMessage(item)}
            disabled={isLoadingMessage}
          >
            {isLoadingMessage ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Ionicons name="chatbubble-outline" size={18} color="#3B82F6" />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.searchFollowBtn,
            item.isFollowing && { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
          ]}
          onPress={() => handleFollow(item)}
          disabled={isLoadingFollow}
        >
          {isLoadingFollow ? (
            <ActivityIndicator size="small" color={item.isFollowing ? colors.text.primary : '#FFF'} />
          ) : (
            <Text style={[
              styles.searchFollowText,
              item.isFollowing && { color: colors.text.primary },
            ]}>
              {item.isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // --- Loading ---
  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#833AB4" />
      </View>
    );
  }

  // --- Search Results ---
  if (hasSearched && users.length > 0) {
    return (
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderSearchItem}
        contentContainerStyle={styles.searchListContent}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  if (hasSearched && users.length === 0) {
    return (
      <View style={styles.centerContent}>
        <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
          <Ionicons name="search-outline" size={40} color={colors.text.tertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No users found</Text>
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
          Try searching with a different username
        </Text>
      </View>
    );
  }

  // --- Initial Loading ---
  if (loadingFollowing) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#833AB4" />
      </View>
    );
  }

  // --- Main Content: Friends + Suggestions ---
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Your Friends Section */}
      {followingUsers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people" size={20} color="#833AB4" />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Your Friends</Text>
              <View style={[styles.countBadge, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
                <Text style={styles.countText}>{followingUsers.length}</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
              Tap to view profile
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendsScroll}
          >
            {followingUsers.map(renderFriendCard)}
          </ScrollView>
        </View>
      )}

      {/* Suggested For You Section */}
      {loadingRecommendations ? (
        <View style={styles.suggestedLoading}>
          <ActivityIndicator size="small" color="#833AB4" />
          <Text style={[styles.suggestedLoadingText, { color: colors.text.secondary }]}>
            Finding people for you...
          </Text>
        </View>
      ) : recommendedUsers.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles" size={20} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Suggested for You</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
              People you might want to follow
            </Text>
          </View>

          {recommendedUsers.map((user) => (
            <View key={user.id}>
              {renderSuggestedItem({ item: user })}
            </View>
          ))}
        </View>
      ) : null}

      {/* Empty state when no friends and no suggestions */}
      {followingUsers.length === 0 && recommendedUsers.length === 0 && !loadingRecommendations && (
        <View style={styles.centerContent}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
            <Ionicons name="people-outline" size={40} color={colors.text.tertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Find Friends</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
            Search for users by their username to connect
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  // --- Section ---
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginLeft: 28,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#833AB4',
  },

  // --- Friend Card (horizontal) ---
  friendsScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  friendCard: {
    width: FRIEND_CARD_WIDTH,
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  friendAvatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  friendAvatarRing: {
    borderWidth: 2.5,
    borderRadius: 34,
    padding: 2,
  },
  friendScoreBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  friendScoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  friendStreakBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    gap: 1,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  friendStreakText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFF',
  },
  friendUsername: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
  },
  friendRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  friendRankText: {
    fontSize: 10,
    fontWeight: '600',
  },
  friendMsgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  friendMsgText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // --- Suggested Card ---
  suggestedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  suggestedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestedAvatarWrap: {
    marginRight: 12,
  },
  suggestedInfo: {
    flex: 1,
  },
  suggestedUsername: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  suggestedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reasonPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  suggestedRank: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  suggestedFollowBtn: {
    backgroundColor: '#833AB4',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
    marginLeft: 8,
  },
  suggestedFollowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },

  // --- Search Result ---
  searchListContent: {
    padding: 16,
    gap: 8,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchUsername: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchRank: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  searchMsgBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchFollowBtn: {
    backgroundColor: '#833AB4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  searchFollowText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },

  // --- Suggested Loading ---
  suggestedLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  suggestedLoadingText: {
    fontSize: 13,
  },

  // --- Empty State ---
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
