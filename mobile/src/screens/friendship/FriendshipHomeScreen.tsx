import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import { TrustConnectionItem } from '../../components/TrustConnectionItem';

interface TrustConnection {
  id: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  trustScore: number;
  currentStreak: number;
  longestStreak: number;
  isMutualFollow: boolean;
  totalExchangeDays: number;
  lastExchangeDate: string;
}

export default function FriendshipHomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<any[]>([]);
  const [trustConnections, setTrustConnections] = useState<TrustConnection[]>([]);
  const [showAllBonds, setShowAllBonds] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [historyResult, trustResult] = await Promise.all([
        api.getFriendshipMeetupHistory(1, 20),
        api.getTrustConnections(1, 10, 'score').catch(() => ({ connections: [] })),
      ]);
      if (historyResult.success) {
        setHistory(historyResult.meetups || []);
      }
      setTrustConnections(trustResult.connections || []);
    } catch (error) {
      console.error('Error loading friendship data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTrustConnectionPress = (connection: TrustConnection) => {
    navigation.navigate('FriendshipDetail', {
      otherUserId: connection.otherUser.id,
      otherUsername: connection.otherUser.username,
      otherAvatarUrl: connection.otherUser.avatarUrl,
    });
  };

  const handleProfilePress = (connection: TrustConnection) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Feed',
        params: {
          screen: 'UserProfile',
          params: {
            userId: connection.otherUser.id,
            username: connection.otherUser.username,
          },
        },
      })
    );
  };

  const handleMessagePress = (connection: TrustConnection) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Messages',
        params: {
          screen: 'Chat',
          params: {
            recipientId: connection.otherUser.id,
            recipientUsername: connection.otherUser.username,
            recipientAvatarUrl: connection.otherUser.avatarUrl,
          },
        },
      })
    );
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const partnerA = item.userA;
    const partnerB = item.userB;
    const date = new Date(item.completedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return (
      <TouchableOpacity
        style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('MeetupDetail', { meetup: item })}
        activeOpacity={0.7}
      >
        <View style={styles.historyAvatars}>
          <View style={[styles.avatar, { backgroundColor: colors.border }]}>
            {partnerA?.avatarUrl ? (
              <Image source={{ uri: getImageUrl(partnerA.avatarUrl)! }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={20} color={colors.text.tertiary} />
            )}
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.border, marginLeft: -8 }]}>
            {partnerB?.avatarUrl ? (
              <Image source={{ uri: getImageUrl(partnerB.avatarUrl)! }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={20} color={colors.text.tertiary} />
            )}
          </View>
        </View>
        <View style={styles.historyInfo}>
          <Text style={[styles.historyNames, { color: colors.text.primary }]}>
            @{partnerA?.username} & @{partnerB?.username}
          </Text>
          <Text style={[styles.historyDate, { color: colors.text.secondary }]}>{date}</Text>
        </View>
        <View style={styles.historyRight}>
          <Text style={[styles.coinAmount, { color: colors.text.link }]}>+{item.coinsAwarded}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const displayedConnections = showAllBonds ? trustConnections : trustConnections.slice(0, 3);

  const ListHeader = () => (
    <>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>{'\uD83E\uDD1D'}</Text>
        <Text style={[styles.heroTitle, { color: colors.text.primary }]}>Friendship Meetup</Text>
        <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
          Meet a friend in person, strike fun poses, and earn 20 Positivity Coins!
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.text.link }]}
          onPress={() => navigation.navigate('CreateSession')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#FFF" />
          <Text style={styles.primaryBtnText}>Start Meetup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.text.link }]}
          onPress={() => navigation.navigate('JoinSession')}
        >
          <Ionicons name="scan-outline" size={24} color={colors.text.link} />
          <Text style={[styles.secondaryBtnText, { color: colors.text.link }]}>Join Meetup</Text>
        </TouchableOpacity>
      </View>

      {/* Bonds Section */}
      {trustConnections.length > 0 && (
        <View style={styles.bondsSection}>
          <View style={styles.bondsTitleRow}>
            <View style={styles.bondsAccent} />
            <Ionicons name="people" size={15} color="#8B5CF6" />
            <Text style={[styles.bondsTitleText, { color: colors.text.primary }]}>Friendship Bonds</Text>
            {trustConnections.length > 3 && (
              <TouchableOpacity
                style={[styles.seeAllBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setShowAllBonds(!showAllBonds)}
              >
                <Text style={styles.seeAllText}>
                  {showAllBonds ? 'Less' : `All (${trustConnections.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {displayedConnections.map((connection) => (
            <TrustConnectionItem
              key={connection.id}
              connection={connection}
              onPress={handleTrustConnectionPress}
              onMessagePress={handleMessagePress}
              onProfilePress={handleProfilePress}
            />
          ))}
        </View>
      )}

      {/* Recent Meetups Header */}
      <View style={styles.historyHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Meetups</Text>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
              {loading ? 'Loading...' : 'No meetups yet. Start one with a friend!'}
            </Text>
          </View>
        }
        contentContainerStyle={history.length === 0 ? styles.emptyContainer : styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Bonds section
  bondsSection: {
    marginBottom: 20,
  },
  bondsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  bondsAccent: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: '#8B5CF6',
  },
  bondsTitleText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  seeAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },

  // History section
  historyHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyAvatars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  historyInfo: {
    flex: 1,
  },
  historyNames: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  coinAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
