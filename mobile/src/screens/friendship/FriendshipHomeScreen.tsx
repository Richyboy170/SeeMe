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
  Easing,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import { TrustConnectionItem } from '../../components/TrustConnectionItem';
import Avatar from '../../components/Avatar';
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
let lastActiveTab: FillupTab = 'goals';

const GUIDE_SEEN_KEY = 'friendship_guide_seen';

interface TrustConnection {
  id: string;
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string;
    activeAvatar?: {
      id: string;
      style: 'cartoon' | 'anime' | 'minimalist';
      customizations: any;
    } | null;
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
  const [showBondTips, setShowBondTips] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // People search
  const [peopleSearchQuery, setPeopleSearchQuery] = useState('');

  // === MEETUP TAB ANIMATIONS ===

  // Hero entrance animations (staggered fade + slide up)
  const heroEmojiAnim = useRef(new Animated.Value(0)).current;
  const heroTitleAnim = useRef(new Animated.Value(0)).current;
  const heroSubtitleAnim = useRef(new Animated.Value(0)).current;

  // Continuous emoji bounce
  const emojiBounce = useRef(new Animated.Value(0)).current;

  // Action buttons entrance (slide in from sides)
  const startBtnAnim = useRef(new Animated.Value(0)).current;
  const joinBtnAnim = useRef(new Animated.Value(0)).current;

  // Pulse ring on Start Meetup button
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  // Bonds section entrance
  const bondsAnim = useRef(new Animated.Value(0)).current;

  // Recent meetups section entrance
  const recentHeaderAnim = useRef(new Animated.Value(0)).current;

  // Floating particles around hero
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle1X = useRef(new Animated.Value(0)).current;
  const particle1Opacity = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;
  const particle2X = useRef(new Animated.Value(0)).current;
  const particle2Opacity = useRef(new Animated.Value(0)).current;
  const particle3Y = useRef(new Animated.Value(0)).current;
  const particle3X = useRef(new Animated.Value(0)).current;
  const particle3Opacity = useRef(new Animated.Value(0)).current;
  const particle4Y = useRef(new Animated.Value(0)).current;
  const particle4X = useRef(new Animated.Value(0)).current;
  const particle4Opacity = useRef(new Animated.Value(0)).current;
  const particle5Y = useRef(new Animated.Value(0)).current;
  const particle5X = useRef(new Animated.Value(0)).current;
  const particle5Opacity = useRef(new Animated.Value(0)).current;

  // Button press scale animations
  const startBtnScale = useRef(new Animated.Value(1)).current;
  const joinBtnScale = useRef(new Animated.Value(1)).current;

  // History items stagger
  const historyItemAnims = useRef<Animated.Value[]>([]).current;

  // Empty state floating
  const emptyFloatAnim = useRef(new Animated.Value(0)).current;

  // Sparkle rotation for coin amounts
  const sparkleRotation = useRef(new Animated.Value(0)).current;

  // Icon animations on buttons
  const startIconRotate = useRef(new Animated.Value(0)).current;
  const joinIconPulse = useRef(new Animated.Value(1)).current;

  // Coin reward banner glow/breathing
  const bannerGlow = useRef(new Animated.Value(0)).current;

  // How-it-works steps entrance
  const step1Anim = useRef(new Animated.Value(0)).current;
  const step2Anim = useRef(new Animated.Value(0)).current;
  const step3Anim = useRef(new Animated.Value(0)).current;
  const step4Anim = useRef(new Animated.Value(0)).current;

  // Step icon bounce
  const stepBounce1 = useRef(new Animated.Value(0)).current;
  const stepBounce2 = useRef(new Animated.Value(0)).current;
  const stepBounce3 = useRef(new Animated.Value(0)).current;
  const stepBounce4 = useRef(new Animated.Value(0)).current;

  // Find friends section entrance
  const findFriendsAnim = useRef(new Animated.Value(0)).current;

  // All continuously-looping animated values — stopped on blur to save CPU
  const loopAnimValues = useRef([
    emojiBounce, pulseScale, pulseOpacity,
    particle1Y, particle1X, particle1Opacity,
    particle2Y, particle2X, particle2Opacity,
    particle3Y, particle3X, particle3Opacity,
    particle4Y, particle4X, particle4Opacity,
    particle5Y, particle5X, particle5Opacity,
    emptyFloatAnim, sparkleRotation, startIconRotate, joinIconPulse,
    bannerGlow, stepBounce1, stepBounce2, stepBounce3, stepBounce4,
  ]).current;

  useFocusEffect(useCallback(() => {
    // 1. Hero entrance sequence (staggered)
    Animated.stagger(150, [
      Animated.spring(heroEmojiAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(heroTitleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(heroSubtitleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();

    // 2. Action buttons slide in (after hero)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(startBtnAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(joinBtnAnim, { toValue: 1, tension: 60, friction: 8, delay: 100, useNativeDriver: true }),
      ]).start();
    }, 400);

    // 3. Bonds and recent sections
    setTimeout(() => {
      Animated.stagger(120, [
        Animated.spring(bondsAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.spring(recentHeaderAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 700);

    // 4. Continuous emoji bounce loop
    const bounceLoop = () => {
      Animated.sequence([
        Animated.timing(emojiBounce, { toValue: -12, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(emojiBounce, { toValue: 0, duration: 800, easing: Easing.bounce, useNativeDriver: true }),
        Animated.delay(2000),
      ]).start(() => bounceLoop());
    };
    bounceLoop();

    // 5. Pulse ring on Start button (looping)
    const pulseLoop = () => {
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.5);
      Animated.parallel([
        Animated.timing(pulseScale, { toValue: 1.35, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        setTimeout(pulseLoop, 800);
      });
    };
    setTimeout(pulseLoop, 1200);

    // 6. Floating particles
    const animateParticle = (yAnim: Animated.Value, xAnim: Animated.Value, opacityAnim: Animated.Value, delay: number, xRange: number, duration: number) => {
      const run = () => {
        yAnim.setValue(0);
        xAnim.setValue(0);
        opacityAnim.setValue(0);
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(yAnim, { toValue: -60, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(xAnim, { toValue: xRange, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacityAnim, { toValue: 0.8, duration: duration * 0.3, useNativeDriver: true }),
              Animated.timing(opacityAnim, { toValue: 0, duration: duration * 0.7, useNativeDriver: true }),
            ]),
          ]),
        ]).start(() => run());
      };
      run();
    };
    animateParticle(particle1Y, particle1X, particle1Opacity, 0, -30, 2500);
    animateParticle(particle2Y, particle2X, particle2Opacity, 500, 25, 2800);
    animateParticle(particle3Y, particle3X, particle3Opacity, 1000, -20, 2200);
    animateParticle(particle4Y, particle4X, particle4Opacity, 1500, 35, 3000);
    animateParticle(particle5Y, particle5X, particle5Opacity, 800, -15, 2600);

    // 7. Empty state float
    const floatLoop = () => {
      Animated.sequence([
        Animated.timing(emptyFloatAnim, { toValue: -8, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(emptyFloatAnim, { toValue: 8, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(() => floatLoop());
    };
    floatLoop();

    // 8. Sparkle rotation for coin badges
    Animated.loop(
      Animated.timing(sparkleRotation, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // 9. Start button icon wiggle (periodic rotation)
    const iconWiggle = () => {
      Animated.sequence([
        Animated.timing(startIconRotate, { toValue: 1, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(startIconRotate, { toValue: -1, duration: 150, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(startIconRotate, { toValue: 0.5, duration: 100, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(startIconRotate, { toValue: -0.5, duration: 100, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(startIconRotate, { toValue: 0, duration: 80, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(4000),
      ]).start(() => iconWiggle());
    };
    setTimeout(iconWiggle, 2000);

    // 10. Join button icon pulse (breathing)
    const joinPulse = () => {
      Animated.sequence([
        Animated.timing(joinIconPulse, { toValue: 1.3, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(joinIconPulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(3000),
      ]).start(() => joinPulse());
    };
    setTimeout(joinPulse, 2500);

    // 11. Coin reward banner breathing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerGlow, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bannerGlow, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // 12. How-it-works steps stagger entrance
    setTimeout(() => {
      Animated.stagger(200, [
        Animated.spring(step1Anim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.spring(step2Anim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.spring(step3Anim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.spring(step4Anim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
    }, 900);

    // 13. Step icon continuous gentle bounce (staggered)
    const stepBounceLoop = (anim: Animated.Value, delay: number) => {
      const run = () => {
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -6, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 500, easing: Easing.bounce, useNativeDriver: true }),
          Animated.delay(3000),
        ]).start(() => run());
      };
      run();
    };
    stepBounceLoop(stepBounce1, 0);
    stepBounceLoop(stepBounce2, 800);
    stepBounceLoop(stepBounce3, 1600);
    stepBounceLoop(stepBounce4, 2400);

    // 14. Find friends section entrance
    setTimeout(() => {
      Animated.spring(findFriendsAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }, 1100);

    return () => {
      loopAnimValues.forEach(v => v.stopAnimation());
    };
  }, []));

  // Animate history items when data loads
  useEffect(() => {
    if (history.length > 0) {
      // Create anim values for new items
      while (historyItemAnims.length < history.length) {
        historyItemAnims.push(new Animated.Value(0));
      }
      // Stagger entrance
      Animated.stagger(80,
        historyItemAnims.slice(0, history.length).map(anim =>
          Animated.spring(anim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true })
        )
      ).start();
    }
  }, [history]);

  const handleBtnPressIn = (scaleAnim: Animated.Value) => {
    Animated.spring(scaleAnim, { toValue: 0.92, tension: 300, friction: 10, useNativeDriver: true }).start();
  };
  const handleBtnPressOut = (scaleAnim: Animated.Value) => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  };

  const sparkleRotate = sparkleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const startIconRotation = startIconRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const bannerGlowScale = bannerGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  // Swipe animation
  const initialIndex = lastActiveTab === 'goals' ? 0 : lastActiveTab === 'activities' ? 1 : 2;
  const slideAnim = useRef(new Animated.Value(initialIndex)).current;
  const currentIndexRef = useRef(initialIndex);
  const activeTabRef = useRef<FillupTab>(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const targetIndex = activeTab === 'goals' ? 0 : activeTab === 'activities' ? 1 : 2;
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

        const tabs: FillupTab[] = ['goals', 'activities', 'meetup'];
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
      // Filter out connections with null/missing otherUser (deleted users)
      const validConnections = (trustResult.connections || []).filter(
        (c: any) => c.otherUser && c.otherUser.username
      );
      setTrustConnections(validConnections);
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
      otherActiveAvatar: connection.otherUser.activeAvatar || null,
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

  const renderHistoryItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const partnerA = item.userA;
    const partnerB = item.userB;
    const date = new Date(item.completedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const itemAnim = historyItemAnims[index];
    const animStyle = itemAnim
      ? {
          opacity: itemAnim,
          transform: [
            { translateX: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
            { scale: itemAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.9, 1.02, 1] }) },
          ],
        }
      : {};

    return (
      <Animated.View style={animStyle}>
        <TouchableOpacity
          style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate('MeetupDetail', { meetup: item })}
          activeOpacity={0.7}
        >
          <View style={styles.historyAvatars}>
            <View style={[styles.avatar, { backgroundColor: colors.border }]}>
              <Avatar
                size={36}
                avatarUrl={!partnerA?.activeAvatar ? partnerA?.avatarUrl : undefined}
                username={partnerA?.username}
                customizations={partnerA?.activeAvatar?.customizations}
                avatarStyle={partnerA?.activeAvatar?.style}
              />
            </View>
            <View style={[styles.avatar, { backgroundColor: colors.border, marginLeft: -8 }]}>
              <Avatar
                size={36}
                avatarUrl={!partnerB?.activeAvatar ? partnerB?.avatarUrl : undefined}
                username={partnerB?.username}
                customizations={partnerB?.activeAvatar?.customizations}
                avatarStyle={partnerB?.activeAvatar?.style}
              />
            </View>
          </View>
          <View style={styles.historyInfo}>
            <Text style={[styles.historyNames, { color: colors.text.primary }]}>
              @{partnerA?.username} & @{partnerB?.username}
            </Text>
            <Text style={[styles.historyDate, { color: colors.text.secondary }]}>{date}</Text>
          </View>
          <View style={styles.historyRight}>
            <View style={styles.coinBadge}>
              <Text style={styles.coinBadgeText}>+{item.coinsAwarded}</Text>
              <Text style={{ fontSize: 12 }}>🪙</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [colors, navigation, historyItemAnims]);

  const historyKeyExtractor = useCallback((item: any) => item.id, []);

  const displayedConnections = showAllBonds ? trustConnections : trustConnections.slice(0, 3);

  const listHeader = (
    <>
      {/* Hero Section with floating particles */}
      <View ref={heroRef} collapsable={false} style={styles.hero}>
        {/* Floating sparkle particles */}
        {[
          { y: particle1Y, x: particle1X, o: particle1Opacity, emoji: '✨', left: '20%', top: 10 },
          { y: particle2Y, x: particle2X, o: particle2Opacity, emoji: '💜', left: '75%', top: 5 },
          { y: particle3Y, x: particle3X, o: particle3Opacity, emoji: '⭐', left: '10%', top: 30 },
          { y: particle4Y, x: particle4X, o: particle4Opacity, emoji: '🌟', left: '85%', top: 25 },
          { y: particle5Y, x: particle5X, o: particle5Opacity, emoji: '💫', left: '50%', top: 0 },
        ].map((p, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.floatingParticle,
              { left: p.left as any, top: p.top, opacity: p.o, transform: [{ translateY: p.y }, { translateX: p.x }] },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        ))}

        {/* Animated emoji with bounce */}
        <Animated.Text
          style={[
            styles.heroEmoji,
            {
              opacity: heroEmojiAnim,
              transform: [
                { translateY: Animated.add(heroEmojiAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }), emojiBounce) },
                { scale: heroEmojiAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.15, 1] }) },
              ],
            },
          ]}
        >
          {'\uD83E\uDD1D'}
        </Animated.Text>

        {/* Animated title */}
        <Animated.Text
          style={[
            styles.heroTitle,
            {
              color: colors.text.primary,
              opacity: heroTitleAnim,
              transform: [
                { translateY: heroTitleAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              ],
            },
          ]}
        >
          Friendship Meetup
        </Animated.Text>

        {/* Animated subtitle */}
        <Animated.Text
          style={[
            styles.heroSubtitle,
            {
              color: colors.text.secondary,
              opacity: heroSubtitleAnim,
              transform: [
                { translateY: heroSubtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 0] }) },
              ],
            },
          ]}
        >
          Meet a friend in person, strike fun poses, and earn 20 Positivity Coins!
        </Animated.Text>
      </View>

      {/* Animated Action Buttons */}
      <View style={styles.actions}>
        <Animated.View
          ref={startBtnRef}
          collapsable={false}
          style={[
            styles.actionBtnWrap,
            {
              opacity: startBtnAnim,
              transform: [
                { translateX: startBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
                { scale: startBtnScale },
              ],
            },
          ]}
        >
          {/* Pulse ring behind button */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: colors.text.link,
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.text.link, borderColor: colors.text.link }]}
            onPress={() => navigation.navigate('CreateSession')}
            onPressIn={() => handleBtnPressIn(startBtnScale)}
            onPressOut={() => handleBtnPressOut(startBtnScale)}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ rotate: startIconRotation }] }}>
              <Ionicons name="add-circle-outline" size={24} color="#FFF" />
            </Animated.View>
            <Text style={styles.primaryBtnText}>Start Meetup</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          ref={joinBtnRef}
          collapsable={false}
          style={[
            styles.actionBtnWrap,
            {
              opacity: joinBtnAnim,
              transform: [
                { translateX: joinBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                { scale: joinBtnScale },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: colors.surface, borderColor: colors.text.link }]}
            onPress={() => navigation.navigate('JoinSession')}
            onPressIn={() => handleBtnPressIn(joinBtnScale)}
            onPressOut={() => handleBtnPressOut(joinBtnScale)}
            activeOpacity={1}
          >
            <Animated.View style={{ transform: [{ scale: joinIconPulse }] }}>
              <Ionicons name="scan-outline" size={24} color={colors.text.link} />
            </Animated.View>
            <Text style={[styles.secondaryBtnText, { color: colors.text.link }]}>Join Meetup</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* How It Works - animated steps */}
      <View style={styles.stepsSection}>
        <Animated.Text
          style={[
            styles.stepsTitle,
            {
              color: colors.text.primary,
              opacity: step1Anim,
              transform: [{ translateY: step1Anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          How It Works
        </Animated.Text>
        <View style={styles.stepsRow}>
          {[
            { anim: step1Anim, bounce: stepBounce1, emoji: '📱', label: 'Start or Join', color: '#8B5CF6' },
            { anim: step2Anim, bounce: stepBounce2, emoji: '🤳', label: 'Strike Poses', color: '#EC4899' },
            { anim: step3Anim, bounce: stepBounce3, emoji: '🪙', label: 'Earn Coins!', color: '#F59E0B' },
          ].map((step, i) => (
            <Animated.View
              key={i}
              style={[
                styles.stepItem,
                {
                  backgroundColor: isDark ? `${step.color}15` : `${step.color}10`,
                  borderColor: isDark ? `${step.color}30` : `${step.color}20`,
                  opacity: step.anim,
                  transform: [
                    { translateY: Animated.add(step.anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }), step.bounce) },
                    { scale: step.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.08, 1] }) },
                  ],
                },
              ]}
            >
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepEmoji}>{step.emoji}</Text>
              <Text style={[styles.stepLabel, { color: colors.text.primary }]}>{step.label}</Text>
            </Animated.View>
          ))}
        </View>
        {/* Animated connector dots between steps */}
        <View style={styles.stepsConnector}>
          <Animated.View
            style={[
              styles.connectorDot,
              { backgroundColor: '#8B5CF6', opacity: step1Anim },
            ]}
          />
          <Animated.View
            style={[
              styles.connectorLine,
              { backgroundColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.15)', opacity: step2Anim },
            ]}
          />
          <Animated.View
            style={[
              styles.connectorDot,
              { backgroundColor: '#EC4899', opacity: step2Anim },
            ]}
          />
          <Animated.View
            style={[
              styles.connectorLine,
              { backgroundColor: isDark ? 'rgba(236,72,153,0.3)' : 'rgba(236,72,153,0.15)', opacity: step3Anim },
            ]}
          />
          <Animated.View
            style={[
              styles.connectorDot,
              { backgroundColor: '#F59E0B', opacity: step3Anim },
            ]}
          />
        </View>
      </View>

      {/* Friendship Bonds Section - animated */}
      <Animated.View
        ref={bondsRef}
        collapsable={false}
        style={[
          styles.bondsSection,
          {
            opacity: bondsAnim,
            transform: [
              { translateY: bondsAnim.interpolate({ inputRange: [0, 1], outputRange: [25, 0] }) },
            ],
          },
        ]}
      >
        {/* Section header */}
        <View style={styles.bondsTitleRow}>
          <View style={styles.bondsAccent} />
          <Ionicons name="heart-circle" size={17} color="#8B5CF6" />
          <Text style={[styles.bondsTitleText, { color: colors.text.primary }]}>Friendship Bonds</Text>
          <TouchableOpacity
            onPress={() => setShowBondTips(!showBondTips)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
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

        {/* Bond tips (toggleable) */}
        {showBondTips && (
          <View style={[styles.rankLegend, { backgroundColor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)', borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.1)' }]}>
            <View style={styles.rankTierBar}>
              {[
                { label: 'New', color: '#9CA3AF', flex: 20 },
                { label: 'Building', color: '#10B981', flex: 20 },
                { label: 'Good', color: '#F59E0B', flex: 20 },
                { label: 'Close', color: '#EC4899', flex: 20 },
                { label: 'Best', color: '#8B5CF6', flex: 20 },
              ].map((tier, i) => (
                <View key={i} style={[styles.rankTierSegment, { flex: tier.flex }]}>
                  <View style={[styles.rankTierColor, { backgroundColor: tier.color }]} />
                  <Text style={[styles.rankTierLabel, { color: colors.text.tertiary }]}>{tier.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.growTipsRow}>
              <View style={styles.growTip}>
                <Ionicons name="repeat" size={11} color="#8B5CF6" />
                <Text style={[styles.growTipText, { color: colors.text.secondary }]}>Daily exchanges</Text>
              </View>
              <View style={styles.growTip}>
                <Ionicons name="swap-horizontal" size={11} color="#EC4899" />
                <Text style={[styles.growTipText, { color: colors.text.secondary }]}>Mutual giving</Text>
              </View>
              <View style={styles.growTip}>
                <Ionicons name="flame" size={11} color="#F97316" />
                <Text style={[styles.growTipText, { color: colors.text.secondary }]}>Keep streaks</Text>
              </View>
            </View>
          </View>
        )}

        {/* Friend list */}
        {trustConnections.length > 0 ? (
          displayedConnections.map((connection) => (
            <TrustConnectionItem
              key={connection.id}
              connection={connection}
              onPress={handleTrustConnectionPress}
              onMessagePress={handleMessagePress}
              onProfilePress={handleProfilePress}
            />
          ))
        ) : (
          <View style={[styles.noBondsCard, { backgroundColor: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.03)', borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)' }]}>
            <Ionicons name="people-outline" size={28} color={colors.text.tertiary} />
            <Text style={[styles.noBondsText, { color: colors.text.secondary }]}>
              Send coins to friends to start building bonds!
            </Text>
            <Text style={[styles.noBondsHint, { color: colors.text.tertiary }]}>
              Give coins on their posts or directly from their profile
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Recent Meetups Header - animated */}
      <Animated.View
        ref={recentRef}
        collapsable={false}
        style={[
          styles.historyHeader,
          {
            opacity: recentHeaderAnim,
            transform: [
              { translateX: recentHeaderAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.historyTitleRow}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Recent Meetups</Text>
          <Animated.View style={{ transform: [{ rotate: sparkleRotate }] }}>
            <Text style={{ fontSize: 16 }}>🤝</Text>
          </Animated.View>
        </View>
      </Animated.View>
    </>
  );

  const listFooter = (
    <Animated.View
      style={[
        styles.peopleSection,
        {
          opacity: findFriendsAnim,
          transform: [
            { translateY: findFriendsAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
          ],
        },
      ]}
    >
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
    </Animated.View>
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
            onPress={() => setActiveTab('goals')}
            activeOpacity={0.8}
          >
            <Ionicons name="flag" size={14} color={activeTab === 'goals' ? '#10B981' : colors.text.secondary} />
            <Text style={[
              styles.segmentedTabText,
              { color: activeTab === 'goals' ? '#10B981' : colors.text.secondary },
              activeTab === 'goals' && styles.segmentedTabTextActive,
            ]}>My Goals</Text>
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
        </View>
      </View>

      {/* Swipeable Tab Content */}
      <View style={styles.tabContentContainer}>
        <Animated.View
          style={[styles.tabSlidingContainer, { transform: [{ translateX: contentTranslateX }] }]}
          {...tabPanResponder.panHandlers}
        >
          <View style={styles.tabPage}>
            <GoalsTab navigation={navigation} />
          </View>
          <View style={styles.tabPage}>
            <SpinningWheelTab navigation={navigation} />
          </View>
          <View style={styles.tabPage}>
            <FlatList
              ref={flatListRef}
              data={history}
              renderItem={renderHistoryItem}
              keyExtractor={historyKeyExtractor}
              ListHeaderComponent={listHeader}
              ListFooterComponent={listFooter}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              removeClippedSubviews
              maxToRenderPerBatch={8}
              windowSize={5}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Animated.View style={{ transform: [{ translateY: emptyFloatAnim }] }}>
                    <Text style={styles.emptyEmoji}>{loading ? '⏳' : '👋'}</Text>
                  </Animated.View>
                  <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                    {loading ? 'Loading...' : 'No meetups yet. Start one with a friend!'}
                  </Text>
                  {!loading && (
                    <Text style={[styles.emptyHint, { color: colors.text.secondary }]}>
                      Tap "Start Meetup" above to begin
                    </Text>
                  )}
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
    borderWidth: 2,
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

  // === Animation styles ===

  floatingParticle: {
    position: 'absolute',
    fontSize: 14,
    zIndex: 1,
  },
  pulseRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(139,92,246,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  coinBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },

  rankLegend: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  rankTierBar: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 10,
  },
  rankTierSegment: {
    alignItems: 'center',
    gap: 3,
  },
  rankTierColor: {
    height: 6,
    width: '100%',
    borderRadius: 3,
  },
  rankTierLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  growTipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  growTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  growTipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  noBondsCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  noBondsText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  noBondsHint: {
    fontSize: 11,
    textAlign: 'center',
  },

  // Steps section
  stepsSection: {
    marginBottom: 24,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    opacity: 0.5,
  },
  stepEmoji: {
    fontSize: 28,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepsConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 0,
  },
  connectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectorLine: {
    flex: 1,
    height: 2,
    maxWidth: 60,
    borderRadius: 1,
  },
});
