import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import { TrustConnectionItem } from '../../components/TrustConnectionItem';
import FriendshipGuide, { SpotlightRect } from '../../components/friendship/FriendshipGuide';
import PeopleTab from '../discover/PeopleTab';
import SpinningWheelTab from '../discover/SpinningWheelTab';
import GoalsTab from '../fillup/GoalsTab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 0.5;
const TAB_COUNT = 3;
const SEGMENT_H_PADDING = 16;
const SEGMENT_INNER_PADDING = 3;
const SEGMENT_TAB_WIDTH = (SCREEN_WIDTH - SEGMENT_H_PADDING * 2 - SEGMENT_INNER_PADDING * 2) / TAB_COUNT;

type FillupTab = 'meetup' | 'activities' | 'goals';

// Persists across navigations so the tab doesn't reset when returning
let lastActiveTab: FillupTab = 'meetup';

const GUIDE_SEEN_KEY = 'friendship_guide_seen';

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
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTabState] = useState<FillupTab>(lastActiveTab);
  const setActiveTab = useCallback((tab: FillupTab) => {
    lastActiveTab = tab;
    setActiveTabState(tab);
  }, []);
  const [history, setHistory] = useState<any[]>([]);
  const [trustConnections, setTrustConnections] = useState<TrustConnection[]>([]);
  const [showAllBonds, setShowAllBonds] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // People search
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');

  // Swipe animation
  const initialIndex = lastActiveTab === 'meetup' ? 0 : lastActiveTab === 'activities' ? 1 : 2;
  const slideAnim = useRef(new Animated.Value(initialIndex)).current;
  const currentIndexRef = useRef(initialIndex);
  const activeTabRef = useRef<FillupTab>(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const targetIndex = activeTab === 'meetup' ? 0 : activeTab === 'activities' ? 1 : 2;
    if (currentIndexRef.current !== targetIndex) {
      currentIndexRef.current = targetIndex;
      Animated.spring(slideAnim, {
        toValue: targetIndex,
        useNativeDriver: true,
        tension: 100,
        friction: 15,
      }).start();
    }
  }, [activeTab]);

  const tabPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
      onPanResponderMove: (_, { dx }) => {
        const normalized = currentIndexRef.current - dx / SCREEN_WIDTH;
        slideAnim.setValue(Math.max(0, Math.min(TAB_COUNT - 1, normalized)));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        let targetIndex = currentIndexRef.current;

        if (Math.abs(vx) > VELOCITY_THRESHOLD) {
          targetIndex = vx < 0
            ? Math.min(TAB_COUNT - 1, currentIndexRef.current + 1)
            : Math.max(0, currentIndexRef.current - 1);
        } else if (Math.abs(dx) > SWIPE_THRESHOLD) {
          targetIndex = dx < 0
            ? Math.min(TAB_COUNT - 1, currentIndexRef.current + 1)
            : Math.max(0, currentIndexRef.current - 1);
        }

        targetIndex = Math.max(0, Math.min(TAB_COUNT - 1, targetIndex));
        currentIndexRef.current = targetIndex;

        Animated.spring(slideAnim, {
          toValue: targetIndex,
          useNativeDriver: true,
          tension: 100,
          friction: 15,
        }).start();

        const tabs: FillupTab[] = ['meetup', 'activities', 'goals'];
        const newTab = tabs[targetIndex];
        if (newTab !== activeTabRef.current) {
          setActiveTab(newTab);
        }
      },
    })
  ).current;

  const contentTranslateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -SCREEN_WIDTH, -SCREEN_WIDTH * 2],
  });

  const segmentIndicatorX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, SEGMENT_TAB_WIDTH, SEGMENT_TAB_WIDTH * 2],
  });

  // Guide state
  const [guideVisible, setGuideVisible] = useState(false);
  const [spotlights, setSpotlights] = useState<Record<string, SpotlightRect>>({});
  const scrollOffsetRef = useRef(0);
  const flatListRef = useRef<FlatList>(null);
  const containerRef = useRef<View>(null);
  const containerInfoRef = useRef({ top: 0, height: 0 });

  // Target refs
  const heroRef = useRef<View>(null);
  const startBtnRef = useRef<View>(null);
  const joinBtnRef = useRef<View>(null);
  const bondsRef = useRef<View>(null);
  const recentRef = useRef<View>(null);

  // Measure all targets and open guide
  const measureAndShowGuide = useCallback(() => {
    const refs: Record<string, React.RefObject<View | null>> = {
      hero: heroRef,
      startButton: startBtnRef,
      joinButton: joinBtnRef,
      bonds: bondsRef,
      recentMeetups: recentRef,
    };

    const measured: Record<string, SpotlightRect> = {};
    let pending = Object.keys(refs).length;

    const onAllMeasured = () => {
      if (Object.keys(measured).length > 0) {
        setSpotlights(measured);
        setGuideVisible(true);
      }
    };

    for (const [key, ref] of Object.entries(refs)) {
      if (!ref.current) {
        pending--;
        if (pending === 0) onAllMeasured();
        continue;
      }
      ref.current.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          measured[key] = { x, y, width, height, borderRadius: key === 'hero' ? 12 : 14 };
        }
        pending--;
        if (pending === 0) onAllMeasured();
      });
    }
  }, []);

  // Check first visit
  useEffect(() => {
    AsyncStorage.getItem(GUIDE_SEEN_KEY).then((val) => {
      if (!val) {
        // Delay to let layout settle
        setTimeout(() => measureAndShowGuide(), 1000);
      }
    });
  }, []);

  // Header help button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            // Scroll to top first so all targets are measurable
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
            setTimeout(() => measureAndShowGuide(), 300);
          }}
          style={styles.helpBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="help-circle-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors, measureAndShowGuide]);

  const handleGuideDismiss = () => {
    setGuideVisible(false);
    AsyncStorage.setItem(GUIDE_SEEN_KEY, '1');
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  };

  const scrollToY = (y: number) => {
    flatListRef.current?.scrollToOffset({ offset: Math.max(0, y), animated: true });
  };

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

  const listHeader = (
    <>
      {/* Hero Section */}
      <View ref={heroRef} collapsable={false} style={styles.hero}>
        <Text style={styles.heroEmoji}>{'\uD83E\uDD1D'}</Text>
        <Text style={[styles.heroTitle, { color: colors.text.primary }]}>Friendship Meetup</Text>
        <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
          Meet a friend in person, strike fun poses, and earn 20 Positivity Coins!
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <View ref={startBtnRef} collapsable={false} style={styles.actionBtnWrap}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.text.link }]}
            onPress={() => navigation.navigate('CreateSession')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            <Text style={styles.primaryBtnText}>Start Meetup</Text>
          </TouchableOpacity>
        </View>

        <View ref={joinBtnRef} collapsable={false} style={styles.actionBtnWrap}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.text.link }]}
            onPress={() => navigation.navigate('JoinSession')}
          >
            <Ionicons name="scan-outline" size={24} color={colors.text.link} />
            <Text style={[styles.secondaryBtnText, { color: colors.text.link }]}>Join Meetup</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Your Friends Section (bonds) */}
      {trustConnections.length > 0 && (
        <View ref={bondsRef} collapsable={false} style={styles.bondsSection}>
          <View style={styles.bondsTitleRow}>
            <View style={styles.bondsAccent} />
            <Ionicons name="people" size={15} color="#8B5CF6" />
            <Text style={[styles.bondsTitleText, { color: colors.text.primary }]}>Your Friends</Text>
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
      <View ref={recentRef} collapsable={false} style={styles.historyHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Meetups</Text>
      </View>
    </>
  );

  const listFooter = (
    <View style={styles.peopleSection}>
      {/* Divider */}
      <View style={[styles.peopleDivider, { backgroundColor: colors.border }]} />

      {/* Find Friends Section Header */}
      <View style={styles.peopleSectionHeader}>
        <View style={styles.peopleTitleRow}>
          <Ionicons name="search" size={20} color="#833AB4" />
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Find Friends</Text>
        </View>
      </View>

      {/* People Search Bar */}
      <View style={styles.peopleSearchWrap}>
        <View style={[styles.peopleSearchBar, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={18} color={colors.text.secondary} />
          <TextInput
            style={[styles.peopleSearchInput, { color: colors.text.primary }]}
            placeholder="Search up friends..."
            placeholderTextColor={colors.text.secondary}
            value={peopleSearchQuery}
            onChangeText={setPeopleSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {peopleSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setPeopleSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* PeopleTab content (embedded mode) */}
      <PeopleTab
        searchQuery={peopleSearchQuery}
        navigation={navigation}
        embedded
      />
    </View>
  );

  return (
    <View ref={containerRef} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Segmented Tab Bar */}
      <View style={[styles.segmentedControlContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceVariant }]}>
          <Animated.View
            style={[
              styles.segmentedIndicator,
              {
                backgroundColor: colors.background,
                width: SEGMENT_TAB_WIDTH,
                transform: [{ translateX: segmentIndicatorX }],
              },
            ]}
          />
          <TouchableOpacity
            style={styles.segmentedTab}
            onPress={() => setActiveTab('meetup')}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={14} color={activeTab === 'meetup' ? '#8B5CF6' : colors.text.secondary} />
            <Text style={[
              styles.segmentedTabText,
              { color: activeTab === 'meetup' ? '#8B5CF6' : colors.text.secondary },
              activeTab === 'meetup' && styles.segmentedTabTextActive,
            ]}>Meetup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.segmentedTab}
            onPress={() => setActiveTab('activities')}
            activeOpacity={0.8}
          >
            <Ionicons name="color-wand" size={14} color={activeTab === 'activities' ? '#EC4899' : colors.text.secondary} />
            <Text style={[
              styles.segmentedTabText,
              { color: activeTab === 'activities' ? '#EC4899' : colors.text.secondary },
              activeTab === 'activities' && styles.segmentedTabTextActive,
            ]}>Activities</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.segmentedTab}
            onPress={() => setActiveTab('goals')}
            activeOpacity={0.8}
          >
            <Ionicons name="flag" size={14} color={activeTab === 'goals' ? '#10B981' : colors.text.secondary} />
            <Text style={[
              styles.segmentedTabText,
              { color: activeTab === 'goals' ? '#10B981' : colors.text.secondary },
              activeTab === 'goals' && styles.segmentedTabTextActive,
            ]}>Goals</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Swipeable Tab Content */}
      <View style={styles.tabContentContainer}>
        <Animated.View
          style={[styles.tabSlidingContainer, { transform: [{ translateX: contentTranslateX }] }]}
          {...tabPanResponder.panHandlers}
        >
          <View style={styles.tabPage}>
            <FlatList
              ref={flatListRef}
              data={history}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={listHeader}
              ListFooterComponent={listFooter}
              onScroll={handleScroll}
              scrollEventThrottle={16}
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
            <FriendshipGuide
              visible={guideVisible}
              onClose={handleGuideDismiss}
              spotlights={spotlights}
              isDark={isDark}
              scrollToY={scrollToY}
              scrollOffset={scrollOffsetRef.current}
              containerTop={containerInfoRef.current.top}
              containerHeight={containerInfoRef.current.height}
            />
          </View>
          <View style={styles.tabPage}>
            <SpinningWheelTab navigation={navigation} />
          </View>
          <View style={styles.tabPage}>
            <GoalsTab navigation={navigation} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentedControlContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    position: 'relative',
  },
  segmentedIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 17,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 17,
    gap: 5,
  },
  segmentedTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  segmentedTabTextActive: {
    fontWeight: '700',
  },
  tabContentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  tabSlidingContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * TAB_COUNT,
    height: '100%',
  },
  tabPage: {
    width: SCREEN_WIDTH,
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
  actionBtnWrap: {
    flex: 1,
  },
  primaryBtn: {
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
  helpBtn: {
    marginRight: 8,
  },

  // People section
  peopleSection: {
    marginTop: 8,
    paddingBottom: 24,
  },
  peopleDivider: {
    height: 1,
    marginVertical: 16,
  },
  peopleSectionHeader: {
    marginBottom: 10,
  },
  peopleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  peopleSearchWrap: {
    marginBottom: 8,
  },
  peopleSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  peopleSearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
