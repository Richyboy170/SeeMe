import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';
import Avatar from './Avatar';

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

interface TrustConnectionItemProps {
  connection: TrustConnection;
  onPress?: (connection: TrustConnection) => void;
  onMessagePress?: (connection: TrustConnection) => void;
  onProfilePress?: (connection: TrustConnection) => void;
}

// Rank tiers with thresholds
const RANKS = [
  { min: 0,  label: 'New',          color: '#6B7280', bgColor: '#F3F4F6', darkBgColor: '#1F2937', gradient: ['#9CA3AF', '#D1D5DB'] as [string, string], icon: 'sparkles' },
  { min: 20, label: 'Building',     color: '#10B981', bgColor: '#D1FAE5', darkBgColor: '#064E3B', gradient: ['#10B981', '#34D399'] as [string, string], icon: 'leaf' },
  { min: 40, label: 'Good Friend',  color: '#F59E0B', bgColor: '#FEF3C7', darkBgColor: '#451A03', gradient: ['#F59E0B', '#FBBF24'] as [string, string], icon: 'sunny' },
  { min: 60, label: 'Close Friend', color: '#EC4899', bgColor: '#FCE7F3', darkBgColor: '#4A0E2B', gradient: ['#EC4899', '#F472B6'] as [string, string], icon: 'heart-half' },
  { min: 80, label: 'Best Friend',  color: '#8B5CF6', bgColor: '#EDE9FE', darkBgColor: '#2E1065', gradient: ['#8B5CF6', '#A855F7'] as [string, string], icon: 'heart' },
];

function getRankInfo(score: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].min) return { ...RANKS[i], index: i };
  }
  return { ...RANKS[0], index: 0 };
}

function getNextRank(score: number) {
  for (const rank of RANKS) {
    if (score < rank.min) return rank;
  }
  return null; // already max
}

// --- Score Gauge (shows number in center) ---
const GAUGE_SIZE = 48;
const GAUGE_STROKE = 4;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function ScoreGauge({ score, gradient, isDark }: { score: number; gradient: [string, string]; isDark: boolean }) {
  const progress = Math.min(score, 100) / 100;
  const strokeDashoffset = GAUGE_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={gaugeStyles.container}>
      <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
        <Defs>
          <SvgGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient[0]} />
            <Stop offset="1" stopColor={gradient[1]} />
          </SvgGradient>
        </Defs>
        {/* Background track */}
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          stroke={isDark ? '#374151' : '#E5E7EB'}
          strokeWidth={GAUGE_STROKE}
          fill="none"
        />
        {/* Filled arc */}
        <Circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          stroke="url(#gaugeGrad)"
          strokeWidth={GAUGE_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${GAUGE_CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2}`}
        />
      </Svg>
      {/* Score number in center */}
      <View style={gaugeStyles.scoreWrap}>
        <Text style={[gaugeStyles.scoreText, { color: gradient[0] }]}>{Math.round(score)}</Text>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
  },
});

// --- Next Rank Progress Bar ---
function NextRankProgress({ score, currentRank, nextRank, isDark }: {
  score: number;
  currentRank: typeof RANKS[0];
  nextRank: typeof RANKS[0] | null;
  isDark: boolean;
}) {
  if (!nextRank) {
    // Max rank reached
    return (
      <View style={progressStyles.container}>
        <View style={[progressStyles.maxBadge, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
          <Ionicons name="star" size={9} color="#8B5CF6" />
          <Text style={progressStyles.maxText}>Max rank!</Text>
        </View>
      </View>
    );
  }

  const rangeTotal = nextRank.min - currentRank.min;
  const progress = Math.min((score - currentRank.min) / rangeTotal, 1);
  const remaining = nextRank.min - score;

  return (
    <View style={progressStyles.container}>
      {/* Progress bar */}
      <View style={[progressStyles.track, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
        <View
          style={[
            progressStyles.fill,
            {
              width: `${Math.max(progress * 100, 4)}%`,
              backgroundColor: nextRank.color,
            },
          ]}
        />
      </View>
      {/* Label */}
      <Text style={[progressStyles.label, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        <Text style={{ color: nextRank.color, fontWeight: '700' }}>{remaining}</Text>
        {' pts to '}
        <Ionicons name={nextRank.icon as any} size={9} color={nextRank.color} />
        {' '}
        <Text style={{ color: nextRank.color, fontWeight: '600' }}>{nextRank.label}</Text>
      </Text>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '500',
  },
  maxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  maxText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5CF6',
  },
});

// --- Main Component ---
export const TrustConnectionItem: React.FC<TrustConnectionItemProps> = ({
  connection,
  onPress,
  onMessagePress,
  onProfilePress,
}) => {
  const { colors, isDark } = useTheme();
  const { otherUser, trustScore, currentStreak, longestStreak, isMutualFollow, totalExchangeDays } = connection;

  const rankInfo = getRankInfo(trustScore);
  const nextRank = getNextRank(trustScore);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress ? onPress(connection) : onProfilePress?.(connection)}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        {/* Avatar with ring */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: rankInfo.color }]}>
            <Avatar
              size={34}
              avatarUrl={!otherUser.activeAvatar ? otherUser.avatarUrl : undefined}
              username={otherUser.username}
              customizations={otherUser.activeAvatar?.customizations}
              avatarStyle={otherUser.activeAvatar?.style}
            />
          </View>
        </View>

        {/* User Info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.username, { color: colors.text.primary }]} numberOfLines={1}>@{otherUser.username}</Text>
            {isMutualFollow && (
              <View style={[styles.mutualIcon, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}>
                <Ionicons name="people" size={10} color="#8B5CF6" />
              </View>
            )}
          </View>
          {/* Rank badge */}
          <View style={[styles.rankBadge, { backgroundColor: isDark ? rankInfo.darkBgColor : rankInfo.bgColor }]}>
            <Ionicons name={rankInfo.icon as any} size={10} color={rankInfo.color} />
            <Text style={[styles.rankText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
          </View>
        </View>

        {/* Score Gauge + Message */}
        <View style={styles.rightSection}>
          <ScoreGauge score={trustScore} gradient={rankInfo.gradient} isDark={isDark} />
          <TouchableOpacity
            style={[styles.messageIconBtn, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}
            onPress={() => onMessagePress?.(connection)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chatbubble" size={14} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats row: streak, exchanges, longest */}
      <View style={[styles.statsRow, { borderTopColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
        {currentStreak > 0 ? (
          <View style={styles.statItem}>
            <Ionicons name="flame" size={12} color="#F97316" />
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{currentStreak}d</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>streak</Text>
          </View>
        ) : (
          <View style={styles.statItem}>
            <Ionicons name="flame-outline" size={12} color={colors.text.tertiary} />
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>no streak</Text>
          </View>
        )}
        <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
        <View style={styles.statItem}>
          <Ionicons name="swap-horizontal" size={12} color="#3B82F6" />
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{totalExchangeDays}</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>exchanges</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={12} color="#F59E0B" />
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{longestStreak}d</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>best</Text>
        </View>
      </View>

      {/* Progress to next rank */}
      <NextRankProgress
        score={trustScore}
        currentRank={rankInfo}
        nextRank={nextRank}
        isDark={isDark}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Avatar Section
  avatarSection: {
    position: 'relative',
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  // Info Section
  infoSection: {
    flex: 1,
    marginLeft: 10,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  mutualIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Right Section
  rightSection: {
    alignItems: 'center',
    marginLeft: 8,
    gap: 4,
  },
  messageIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 14,
  },
});

export default React.memo(TrustConnectionItem);
