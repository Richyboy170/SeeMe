import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import { CoinsStackParamList } from '../../navigation/types';
import AvatarComponent from '../../components/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 64) / 7);

// Ring gauge constants
const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type FriendshipDetailRouteProp = RouteProp<CoinsStackParamList, 'FriendshipDetail'>;

interface Props {
  route: FriendshipDetailRouteProp;
}

interface DailyLog {
  date: string;
  youGave: number;
  theyGave: number;
  isBidirectional: boolean;
}

interface FriendshipData {
  trust: {
    trustScore: number;
    currentStreak: number;
    longestStreak: number;
    totalExchangeDays: number;
    bidirectionalDays: number;
    totalCoinsYouGave: number;
    totalCoinsTheyGave: number;
    exchangeCountYouGave: number;
    exchangeCountTheyGave: number;
    isMutualFollow: boolean;
    isActive: boolean;
    friendsSince: string | null;
    lastExchangeDate: string | null;
  };
  dailyLogs: DailyLog[];
  insights: {
    consistency: { score: number; max: number; streakPart: number; engagementPart: number };
    bidirectionality: { score: number; max: number; ratioPart: number; balancePart: number };
    generosity: { score: number; max: number };
  };
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const RANKS = [
  { min: 0,  label: 'New',          color: '#6B7280', gradient: ['#9CA3AF', '#D1D5DB'] as [string, string], icon: 'sparkles' as const },
  { min: 20, label: 'Building',     color: '#10B981', gradient: ['#10B981', '#34D399'] as [string, string], icon: 'leaf' as const },
  { min: 40, label: 'Good Friend',  color: '#F59E0B', gradient: ['#F59E0B', '#FBBF24'] as [string, string], icon: 'sunny' as const },
  { min: 60, label: 'Close Friend', color: '#EC4899', gradient: ['#EC4899', '#F472B6'] as [string, string], icon: 'heart-half' as const },
  { min: 80, label: 'Best Friend',  color: '#8B5CF6', gradient: ['#8B5CF6', '#A855F7'] as [string, string], icon: 'heart' as const },
];

const getRankInfo = (score: number) => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].min) return RANKS[i];
  }
  return RANKS[0];
};

const getNextRank = (score: number) => {
  for (const rank of RANKS) {
    if (score < rank.min) return rank;
  }
  return null;
};

export default function FriendshipDetailScreen({ route }: Props) {
  const { colors, isDark } = useTheme();
  const { otherUserId, otherUsername, otherAvatarUrl, otherActiveAvatar } = route.params;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FriendshipData | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDay, setSelectedDay] = useState<DailyLog | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const scorePopAnim = useRef(new Animated.Value(0)).current;
  const sectionAnim1 = useRef(new Animated.Value(0)).current;
  const sectionAnim2 = useRef(new Animated.Value(0)).current;
  const sectionAnim3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async (month?: string) => {
    try {
      const response = await api.getFriendshipDetail(otherUserId, month);
      setData(response);
    } catch (error) {
      console.error('Error loading friendship detail:', error);
    } finally {
      setLoading(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    loadData(calendarMonth);
  }, [calendarMonth, loadData]);

  // Entrance animations
  useEffect(() => {
    if (!loading && data) {
      Animated.stagger(120, [
        Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.spring(scorePopAnim, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }),
        Animated.spring(sectionAnim1, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.spring(sectionAnim2, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.spring(sectionAnim3, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();

      // Continuous pulse on score
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [loading, data]);

  const navigateMonth = useCallback((direction: -1 | 1) => {
    setCalendarMonth(prev => {
      const [year, month] = prev.split('-').map(Number);
      const d = new Date(year, month - 1 + direction, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    setSelectedDay(null);
  }, []);

  const formatMonthLabel = useCallback((ym: string) => {
    const [year, month] = ym.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text.secondary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text.secondary }}>No friendship data</Text>
      </View>
    );
  }

  const { trust, dailyLogs, insights } = data;
  const rankInfo = getRankInfo(trust.trustScore);
  const nextRank = getNextRank(trust.trustScore);

  // Build calendar grid
  const [calYear, calMonth] = calendarMonth.split('-').map(Number);
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();

  const logMap: { [date: string]: DailyLog } = {};
  dailyLogs.forEach(log => { logMap[log.date] = log; });

  const calendarCells: Array<{ day: number; log: DailyLog | null } | null> = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, log: logMap[dateStr] || null });
  }

  // Giving balance calculations
  const totalGiven = trust.totalCoinsYouGave + trust.totalCoinsTheyGave;
  const youPct = totalGiven > 0 ? (trust.totalCoinsYouGave / totalGiven) * 100 : 50;
  const theyPct = totalGiven > 0 ? (trust.totalCoinsTheyGave / totalGiven) * 100 : 50;

  // Next rank progress
  const nextRankProgress = nextRank
    ? (trust.trustScore - rankInfo.min) / (nextRank.min - rankInfo.min)
    : 1;
  const ptsToNext = nextRank ? nextRank.min - trust.trustScore : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ============ FRIEND HEADER ============ */}
      <Animated.View
        style={[
          styles.headerCard,
          { backgroundColor: isDark ? colors.surface : colors.card },
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <View style={[styles.avatarRing, { borderColor: rankInfo.color }]}>
          <AvatarComponent
            size={60}
            avatarUrl={!otherActiveAvatar ? otherAvatarUrl : undefined}
            username={otherUsername}
            customizations={otherActiveAvatar?.customizations}
            avatarStyle={otherActiveAvatar?.style}
          />
        </View>

        <Text style={[styles.headerUsername, { color: colors.text.primary }]}>@{otherUsername}</Text>

        {/* Animated score circle */}
        <Animated.View style={{ transform: [{ scale: Animated.multiply(scorePopAnim, pulseAnim) }] }}>
          <LinearGradient colors={rankInfo.gradient} style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{trust.trustScore}</Text>
            <Text style={styles.scoreLabel}>pts</Text>
          </LinearGradient>
        </Animated.View>

        <View style={[styles.rankBadge, { backgroundColor: isDark ? '#1F2937' : rankInfo.color + '20' }]}>
          <Ionicons name={rankInfo.icon} size={12} color={rankInfo.color} />
          <Text style={[styles.rankText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
        </View>

        {/* Progress to next rank */}
        {nextRank ? (
          <View style={styles.nextRankWrap}>
            <View style={[styles.nextRankTrack, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <View style={[styles.nextRankFill, { width: `${Math.max(nextRankProgress * 100, 3)}%`, backgroundColor: nextRank.color }]} />
            </View>
            <Text style={[styles.nextRankText, { color: colors.text.secondary }]}>
              <Text style={{ color: nextRank.color, fontWeight: '700' }}>{ptsToNext} pts</Text> to{' '}
              <Text style={{ color: nextRank.color, fontWeight: '600' }}>{nextRank.label}</Text>
            </Text>
          </View>
        ) : (
          <View style={[styles.maxRankBadge, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
            <Ionicons name="star" size={12} color="#8B5CF6" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#8B5CF6' }}>Highest rank reached!</Text>
          </View>
        )}

        {trust.currentStreak > 0 && (
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={14} color="#F97316" />
            <Text style={styles.streakText}>{trust.currentStreak} day streak</Text>
          </View>
        )}
      </Animated.View>

      {/* ============ HOW SCORING WORKS (expandable) ============ */}
      <Animated.View
        style={[
          styles.howItWorksCard,
          { backgroundColor: isDark ? colors.surface : colors.card },
          {
            opacity: sectionAnim1,
            transform: [{ translateY: sectionAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.howItWorksHeader}
          onPress={() => setShowHowItWorks(!showHowItWorks)}
          activeOpacity={0.7}
        >
          <View style={[styles.howItWorksIconBg, { backgroundColor: isDark ? '#1E1B4B' : '#EDE9FE' }]}>
            <Ionicons name="bulb" size={18} color="#8B5CF6" />
          </View>
          <View style={styles.howItWorksHeaderText}>
            <Text style={[styles.howItWorksTitle, { color: colors.text.primary }]}>How does the score work?</Text>
            <Text style={[styles.howItWorksSubtitle, { color: colors.text.tertiary }]}>
              {showHowItWorks ? 'Tap to collapse' : 'Tap to learn how to grow your bond'}
            </Text>
          </View>
          <Ionicons name={showHowItWorks ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        {showHowItWorks && (
          <View style={styles.howItWorksContent}>
            {/* What is a streak */}
            <View style={[styles.explainerBox, { backgroundColor: isDark ? '#1C1917' : '#FFF7ED', borderColor: isDark ? '#431407' : '#FFEDD5' }]}>
              <View style={styles.explainerHeader}>
                <Ionicons name="flame" size={16} color="#F97316" />
                <Text style={[styles.explainerTitle, { color: '#F97316' }]}>What is a Streak?</Text>
              </View>
              <Text style={[styles.explainerBody, { color: colors.text.secondary }]}>
                A streak counts <Text style={{ fontWeight: '700', color: colors.text.primary }}>consecutive days</Text> where either you or your friend exchanged coins. Give coins to their posts, or send coins directly. If a day passes with no exchange between you two, the streak resets to 0.
              </Text>
              <View style={styles.explainerExample}>
                <Text style={[styles.explainerExampleText, { color: colors.text.tertiary }]}>
                  Mon: you give 2 coins  ·  Tue: they give 1  ·  Wed: you give 3  =  3 day streak
                </Text>
              </View>
            </View>

            {/* Score formula */}
            <Text style={[styles.formulaTitle, { color: colors.text.primary }]}>Your bond score (0-100) is built from 3 parts:</Text>

            {/* Consistency */}
            <View style={[styles.formulaCard, { borderColor: isDark ? '#312E81' : '#C4B5FD' }]}>
              <View style={styles.formulaCardHeader}>
                <View style={[styles.formulaIconBg, { backgroundColor: '#8B5CF620' }]}>
                  <Ionicons name="repeat" size={14} color="#8B5CF6" />
                </View>
                <Text style={[styles.formulaCardTitle, { color: '#8B5CF6' }]}>Consistency</Text>
                <Text style={[styles.formulaCardPts, { color: colors.text.tertiary }]}>up to 60 pts</Text>
              </View>
              <Text style={[styles.formulaCardDesc, { color: colors.text.secondary }]}>
                <Text style={{ fontWeight: '700', color: colors.text.primary }}>Streak</Text> (up to 30 pts): Your current streak × 2, maxes at 15 days.{'\n'}
                <Text style={{ fontWeight: '700', color: colors.text.primary }}>Total engagement</Text> (up to 30 pts): Total days you've ever exchanged. Maxes around 60 days.
              </Text>
              <View style={[styles.formulaTip, { backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF' }]}>
                <Ionicons name="arrow-up-circle" size={12} color="#8B5CF6" />
                <Text style={[styles.formulaTipText, { color: isDark ? '#A78BFA' : '#6D28D9' }]}>
                  Tip: Exchange coins every day to build and maintain your streak
                </Text>
              </View>
            </View>

            {/* Balance / Bidirectionality */}
            <View style={[styles.formulaCard, { borderColor: isDark ? '#4A0E2B' : '#F9A8D4' }]}>
              <View style={styles.formulaCardHeader}>
                <View style={[styles.formulaIconBg, { backgroundColor: '#EC489920' }]}>
                  <Ionicons name="swap-horizontal" size={14} color="#EC4899" />
                </View>
                <Text style={[styles.formulaCardTitle, { color: '#EC4899' }]}>Balance</Text>
                <Text style={[styles.formulaCardPts, { color: colors.text.tertiary }]}>up to 30 pts</Text>
              </View>
              <Text style={[styles.formulaCardDesc, { color: colors.text.secondary }]}>
                <Text style={{ fontWeight: '700', color: colors.text.primary }}>Mutual days</Text> (up to 20 pts): Days where <Text style={{ fontWeight: '600' }}>both</Text> of you gave coins on the same day.{'\n'}
                <Text style={{ fontWeight: '700', color: colors.text.primary }}>Give/receive ratio</Text> (up to 10 pts): More balanced = higher score. If one person gives 90% and the other 10%, this stays low.
              </Text>
              <View style={[styles.formulaTip, { backgroundColor: isDark ? '#2D0A1E' : '#FDF2F8' }]}>
                <Ionicons name="arrow-up-circle" size={12} color="#EC4899" />
                <Text style={[styles.formulaTipText, { color: isDark ? '#F472B6' : '#BE185D' }]}>
                  Tip: Coordinate with your friend — both give on the same day for mutual bonus
                </Text>
              </View>
            </View>

            {/* Generosity */}
            <View style={[styles.formulaCard, { borderColor: isDark ? '#451A03' : '#FDE68A' }]}>
              <View style={styles.formulaCardHeader}>
                <View style={[styles.formulaIconBg, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="gift" size={14} color="#F59E0B" />
                </View>
                <Text style={[styles.formulaCardTitle, { color: '#F59E0B' }]}>Generosity</Text>
                <Text style={[styles.formulaCardPts, { color: colors.text.tertiary }]}>up to 10 pts</Text>
              </View>
              <Text style={[styles.formulaCardDesc, { color: colors.text.secondary }]}>
                Based on <Text style={{ fontWeight: '700', color: colors.text.primary }}>total coins shared</Text> between you and your friend combined. Grows slowly — it takes around 300+ coins total to max this out.
              </Text>
              <View style={[styles.formulaTip, { backgroundColor: isDark ? '#1C1407' : '#FFFBEB' }]}>
                <Ionicons name="arrow-up-circle" size={12} color="#F59E0B" />
                <Text style={[styles.formulaTipText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                  Tip: This grows naturally over time as you keep exchanging
                </Text>
              </View>
            </View>

            {/* Rank tiers */}
            <View style={styles.formulaRanks}>
              <Text style={[styles.formulaRanksTitle, { color: colors.text.primary }]}>Rank thresholds</Text>
              <View style={styles.rankTierBar}>
                {RANKS.map((tier, i) => (
                  <View key={i} style={styles.rankTierItem}>
                    <View style={[styles.rankTierColor, { backgroundColor: tier.color }]} />
                    <Text style={[styles.rankTierLabel, { color: colors.text.tertiary }]}>
                      {tier.min}+ {tier.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </Animated.View>

      {/* ============ BOND BREAKDOWN (Ring Gauges) ============ */}
      <Animated.View
        style={[
          styles.breakdownCard,
          { backgroundColor: isDark ? colors.surface : colors.card },
          {
            opacity: sectionAnim1,
            transform: [{ translateY: sectionAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Score Breakdown</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.text.tertiary }]}>
          Each part adds to your total bond score of {trust.trustScore}
        </Text>

        <View style={styles.ringsRow}>
          <BreakdownRing
            score={insights.consistency.score}
            max={insights.consistency.max}
            color="#8B5CF6"
            icon="repeat"
            label="Consistency"
            detail={`Streak: ${insights.consistency.streakPart}/${30}  ·  Days: ${insights.consistency.engagementPart}/${30}`}
            colors={colors}
            isDark={isDark}
          />
          <BreakdownRing
            score={insights.bidirectionality.score}
            max={insights.bidirectionality.max}
            color="#EC4899"
            icon="swap-horizontal"
            label="Balance"
            detail={`Mutual: ${insights.bidirectionality.ratioPart}/${20}  ·  Ratio: ${insights.bidirectionality.balancePart}/${10}`}
            colors={colors}
            isDark={isDark}
          />
          <BreakdownRing
            score={insights.generosity.score}
            max={insights.generosity.max}
            color="#F59E0B"
            icon="gift"
            label="Generosity"
            detail={`${totalGiven} coins shared`}
            colors={colors}
            isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* ============ STREAKS & STATS ============ */}
      <Animated.View
        style={[
          styles.insightsCard,
          { backgroundColor: isDark ? colors.surface : colors.card },
          {
            opacity: sectionAnim2,
            transform: [{ translateY: sectionAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Streak & Activity</Text>

        {/* Streak explanation */}
        <View style={[styles.streakExplainerMini, { backgroundColor: isDark ? '#1C1917' : '#FFFBEB', borderColor: isDark ? '#451A03' : '#FEF3C7' }]}>
          <Ionicons name="information-circle" size={14} color="#F59E0B" />
          <Text style={[styles.streakExplainerText, { color: colors.text.secondary }]}>
            Streaks count consecutive days with coin exchanges between you two. Miss a day and it resets!
          </Text>
        </View>

        {/* Streak highlight cards */}
        <View style={styles.streakCards}>
          <View style={[styles.streakCard, { backgroundColor: isDark ? '#1C1917' : '#FFF7ED' }]}>
            <View style={[styles.streakCardIconBg, { backgroundColor: isDark ? '#431407' : '#FFEDD5' }]}>
              <Ionicons name="flame" size={20} color="#F97316" />
            </View>
            <Text style={[styles.streakCardNumber, { color: colors.text.primary }]}>{trust.currentStreak}</Text>
            <Text style={[styles.streakCardUnit, { color: colors.text.secondary }]}>days</Text>
            <Text style={[styles.streakCardLabel, { color: colors.text.tertiary }]}>Current Streak</Text>
            <Text style={[styles.streakCardScore, { color: '#F97316' }]}>
              +{Math.min(30, trust.currentStreak * 2)} pts
            </Text>
          </View>

          <View style={[styles.streakCard, { backgroundColor: isDark ? '#1A1423' : '#FEFCE8' }]}>
            <View style={[styles.streakCardIconBg, { backgroundColor: isDark ? '#2E1A00' : '#FEF9C3' }]}>
              <Ionicons name="trophy" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.streakCardNumber, { color: colors.text.primary }]}>{trust.longestStreak}</Text>
            <Text style={[styles.streakCardUnit, { color: colors.text.secondary }]}>days</Text>
            <Text style={[styles.streakCardLabel, { color: colors.text.tertiary }]}>Best Streak</Text>
            <Text style={[styles.streakCardScore, { color: '#F59E0B' }]}>personal record</Text>
          </View>
        </View>

        {/* Giving Balance */}
        <View style={[styles.balanceSection, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
          <Text style={[styles.balanceTitle, { color: colors.text.primary }]}>Giving Balance</Text>
          <Text style={[styles.balanceHint, { color: colors.text.tertiary }]}>
            A balanced give-and-take scores higher for the Balance component
          </Text>
          <View style={styles.balanceBar}>
            <View style={[styles.balanceFillYou, { width: `${youPct}%` }]} />
            <View style={[styles.balanceFillThem, { width: `${theyPct}%` }]} />
          </View>
          <View style={styles.balanceLabels}>
            <View style={styles.balanceLabelItem}>
              <View style={[styles.balanceLabelDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={[styles.balanceLabelText, { color: colors.text.secondary }]}>You</Text>
              <Text style={[styles.balanceLabelValue, { color: colors.text.primary }]}>{trust.totalCoinsYouGave}</Text>
            </View>
            <View style={styles.balanceLabelItem}>
              <Text style={[styles.balanceLabelValue, { color: colors.text.primary }]}>{trust.totalCoinsTheyGave}</Text>
              <Text style={[styles.balanceLabelText, { color: colors.text.secondary }]}>Them</Text>
              <View style={[styles.balanceLabelDot, { backgroundColor: '#EC4899' }]} />
            </View>
          </View>
        </View>

        {/* Activity & Connection info rows */}
        <View style={styles.infoRows}>
          <InfoRow
            icon="calendar"
            iconColor="#3B82F6"
            label="Exchange Days"
            value={`${trust.totalExchangeDays}`}
            description="Total days with any coin exchange — adds up to 30 pts to Consistency"
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.infoRowDivider, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]} />
          <InfoRow
            icon="swap-horizontal"
            iconColor="#10B981"
            label="Mutual Days"
            value={`${trust.bidirectionalDays}`}
            description="Days where BOTH of you gave — adds up to 20 pts to Balance"
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.infoRowDivider, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]} />
          <InfoRow
            icon="time"
            iconColor="#6366F1"
            label="Friends Since"
            value={trust.friendsSince ? new Date(trust.friendsSince).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
            description="When you first exchanged coins"
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.infoRowDivider, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]} />
          <InfoRow
            icon="people"
            iconColor="#8B5CF6"
            label="Mutual Follow"
            value={trust.isMutualFollow ? 'Yes' : 'No'}
            description={trust.isMutualFollow ? 'You follow each other' : 'Follow each other to unlock bond colors'}
            colors={colors}
            isDark={isDark}
          />
        </View>
      </Animated.View>

      {/* ============ CALENDAR ============ */}
      <Animated.View
        style={[
          styles.calendarCard,
          { backgroundColor: isDark ? colors.surface : colors.card },
          {
            opacity: sectionAnim3,
            transform: [{ translateY: sectionAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Exchange Calendar</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.text.tertiary }]}>
          Tap any day to see exchange details
        </Text>

        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[styles.calendarTitle, { color: colors.text.primary }]}>{formatMonthLabel(calendarMonth)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map(label => (
            <View key={label} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, { color: colors.text.tertiary }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.dayGrid}>
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <View key={`empty-${idx}`} style={styles.dayCell} />;
            }

            const hasYouGave = cell.log && cell.log.youGave > 0;
            const hasTheyGave = cell.log && cell.log.theyGave > 0;
            const isSelected = selectedDay?.date === cell.log?.date && cell.log;

            return (
              <TouchableOpacity
                key={cell.day}
                style={[
                  styles.dayCell,
                  isSelected && [styles.dayCellSelected, { borderColor: rankInfo.color }],
                ]}
                onPress={() => cell.log ? setSelectedDay(cell.log) : setSelectedDay(null)}
                activeOpacity={cell.log ? 0.7 : 1}
              >
                <Text style={[
                  styles.dayNumber,
                  { color: cell.log ? colors.text.primary : colors.text.tertiary },
                ]}>
                  {cell.day}
                </Text>
                {(hasYouGave || hasTheyGave) && (
                  <View style={styles.dotRow}>
                    {hasYouGave && <View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} />}
                    {hasTheyGave && <View style={[styles.dot, { backgroundColor: '#EC4899' }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>You gave</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EC4899' }]} />
            <Text style={[styles.legendText, { color: colors.text.secondary }]}>They gave</Text>
          </View>
        </View>

        {/* Selected day detail */}
        {selectedDay && (
          <View style={[styles.dayDetail, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: colors.border }]}>
            <Text style={[styles.dayDetailDate, { color: colors.text.primary }]}>
              {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.dayDetailRow}>
              <View style={styles.dayDetailItem}>
                <View style={[styles.dayDetailDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={[styles.dayDetailLabel, { color: colors.text.secondary }]}>You gave:</Text>
                <Text style={[styles.dayDetailValue, { color: colors.text.primary }]}>{selectedDay.youGave}</Text>
              </View>
              <View style={styles.dayDetailItem}>
                <View style={[styles.dayDetailDot, { backgroundColor: '#EC4899' }]} />
                <Text style={[styles.dayDetailLabel, { color: colors.text.secondary }]}>They gave:</Text>
                <Text style={[styles.dayDetailValue, { color: colors.text.primary }]}>{selectedDay.theyGave}</Text>
              </View>
            </View>
            {selectedDay.isBidirectional && (
              <View style={[styles.bidirectionalTag, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                <Ionicons name="swap-horizontal" size={12} color="#10B981" />
                <Text style={[styles.bidirectionalText, { color: isDark ? '#34D399' : '#059669' }]}>Mutual exchange day — bonus Balance points!</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// --- Breakdown Ring Gauge ---
function BreakdownRing({ score, max, color, icon, label, detail, colors, isDark }: {
  score: number;
  max: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  colors: any;
  isDark: boolean;
}) {
  const pct = max > 0 ? Math.min(1, score / max) : 0;
  const offset = RING_CIRCUMFERENCE * (1 - pct);

  return (
    <View style={styles.ringItem}>
      <View style={styles.ringContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={isDark ? '#1F2937' : '#F3F4F6'}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={color}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUMFERENCE}`}
            strokeDashoffset={offset}
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={[styles.ringScore, { color }]}>{Math.round(score)}</Text>
          <Text style={[styles.ringMax, { color: colors.text.tertiary }]}>/{max}</Text>
        </View>
      </View>
      <View style={[styles.ringIconBadge, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={12} color={color} />
      </View>
      <Text style={[styles.ringLabel, { color: colors.text.primary }]}>{label}</Text>
      <Text style={[styles.ringDetail, { color: colors.text.tertiary }]}>{detail}</Text>
    </View>
  );
}

// --- Info Row Component ---
function InfoRow({ icon, iconColor, label, value, description, colors, isDark }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  description: string;
  colors: any;
  isDark: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoRowIconBg, { backgroundColor: iconColor + (isDark ? '20' : '15') }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.infoRowText}>
        <Text style={[styles.infoRowLabel, { color: colors.text.primary }]}>{label}</Text>
        <Text style={[styles.infoRowDesc, { color: colors.text.tertiary }]}>{description}</Text>
      </View>
      <Text style={[styles.infoRowValue, { color: colors.text.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerUsername: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreValue: { fontSize: 22, fontWeight: '800', color: '#FFF', lineHeight: 24 },
  scoreLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: -2 },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
    gap: 5,
  },
  rankText: { fontSize: 13, fontWeight: '600' },
  nextRankWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  nextRankTrack: {
    width: '60%',
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5,
  },
  nextRankFill: {
    height: '100%',
    borderRadius: 3,
  },
  nextRankText: {
    fontSize: 11,
    fontWeight: '500',
  },
  maxRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 6,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  streakText: { fontSize: 13, fontWeight: '600', color: '#F97316' },

  // How It Works (expandable)
  howItWorksCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  howItWorksIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howItWorksHeaderText: {
    flex: 1,
  },
  howItWorksTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  howItWorksSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  howItWorksContent: {
    marginTop: 16,
    gap: 12,
  },
  explainerBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  explainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  explainerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  explainerBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  explainerExample: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  explainerExampleText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  formulaTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  formulaCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  formulaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  formulaIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formulaCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  formulaCardPts: {
    fontSize: 11,
    fontWeight: '600',
  },
  formulaCardDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  formulaTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
  },
  formulaTipText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  formulaRanks: {
    marginTop: 4,
  },
  formulaRanksTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  rankTierBar: {
    flexDirection: 'row',
    gap: 6,
  },
  rankTierItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  rankTierColor: {
    height: 6,
    width: '100%',
    borderRadius: 3,
  },
  rankTierLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Calendar
  calendarCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  calendarTitle: { fontSize: 16, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayCell: { width: DAY_SIZE, alignItems: 'center', paddingVertical: 4 },
  weekdayText: { fontSize: 11, fontWeight: '600' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayCellSelected: { borderWidth: 1.5 },
  dayNumber: { fontSize: 13, fontWeight: '600' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '500' },

  // Day detail tooltip
  dayDetail: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayDetailDate: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  dayDetailRow: { flexDirection: 'row', gap: 16 },
  dayDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dayDetailDot: { width: 8, height: 8, borderRadius: 4 },
  dayDetailLabel: { fontSize: 13 },
  dayDetailValue: { fontSize: 14, fontWeight: '700' },
  bidirectionalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  bidirectionalText: { fontSize: 12, fontWeight: '600' },

  // Bond Breakdown
  breakdownCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, marginBottom: 14 },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  ringItem: {
    alignItems: 'center',
    flex: 1,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  ringScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  ringMax: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  ringIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  ringLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  ringDetail: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
  },

  // Insights
  insightsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Streak explainer mini
  streakExplainerMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 14,
  },
  streakExplainerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },

  // Streak Cards
  streakCards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  streakCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  streakCardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakCardNumber: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  streakCardUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -2,
  },
  streakCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  streakCardScore: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  // Giving Balance
  balanceSection: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  balanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceHint: {
    fontSize: 11,
    marginBottom: 10,
  },
  balanceBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  balanceFillYou: {
    backgroundColor: '#8B5CF6',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  balanceFillThem: {
    backgroundColor: '#EC4899',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  balanceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  balanceLabelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  balanceLabelValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Info Rows
  infoRows: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoRowIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoRowText: {
    flex: 1,
  },
  infoRowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRowDesc: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  infoRowValue: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  infoRowDivider: {
    height: 1,
    marginLeft: 48,
  },
});
