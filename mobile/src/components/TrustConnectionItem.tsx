import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { getImageUrl } from '../services/api';
import { useTheme } from '../theme';

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

interface TrustConnectionItemProps {
  connection: TrustConnection;
  onPress?: (connection: TrustConnection) => void;
  onMessagePress?: (connection: TrustConnection) => void;
  onProfilePress?: (connection: TrustConnection) => void;
}

// --- Power Gauge ---
const GAUGE_SIZE = 44;
const GAUGE_STROKE = 4;
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function PowerGauge({ score, gradient, icon }: { score: number; gradient: [string, string]; icon: string }) {
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
          stroke="#E5E7EB"
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
      {/* Center icon */}
      <View style={gaugeStyles.iconWrap}>
        <Ionicons name={icon as any} size={16} color={gradient[0]} />
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
  iconWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
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
  const { otherUser, trustScore, currentStreak, isMutualFollow } = connection;

  const getRankInfo = () => {
    if (trustScore >= 80) return { label: 'Best Friend', color: '#8B5CF6', bgColor: '#EDE9FE', darkBgColor: '#2E1065', gradient: ['#8B5CF6', '#A855F7'] as [string, string], icon: 'heart' };
    if (trustScore >= 60) return { label: 'Close Friend', color: '#EC4899', bgColor: '#FCE7F3', darkBgColor: '#4A0E2B', gradient: ['#EC4899', '#F472B6'] as [string, string], icon: 'heart-half' };
    if (trustScore >= 40) return { label: 'Good Friend', color: '#F59E0B', bgColor: '#FEF3C7', darkBgColor: '#451A03', gradient: ['#F59E0B', '#FBBF24'] as [string, string], icon: 'sunny' };
    if (trustScore >= 20) return { label: 'Building', color: '#10B981', bgColor: '#D1FAE5', darkBgColor: '#064E3B', gradient: ['#10B981', '#34D399'] as [string, string], icon: 'leaf' };
    return { label: 'New', color: '#6B7280', bgColor: '#F3F4F6', darkBgColor: '#1F2937', gradient: ['#9CA3AF', '#D1D5DB'] as [string, string], icon: 'sparkles' };
  };

  const rankInfo = getRankInfo();
  const avatarUrl = getImageUrl(otherUser.avatarUrl);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onPress ? onPress(connection) : onProfilePress?.(connection)}
      activeOpacity={0.7}
    >
      {/* Avatar with ring */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatarRing, { borderColor: rankInfo.color }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="person" size={18} color={colors.icon.secondary} />
            </View>
          )}
        </View>
        {currentStreak > 0 && (
          <View style={[styles.streakBadge, { borderColor: colors.card }]}>
            <Ionicons name="flame" size={9} color="#FFF" />
            <Text style={styles.streakBadgeText}>{currentStreak}</Text>
          </View>
        )}
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
        <View style={[styles.rankBadge, { backgroundColor: isDark ? rankInfo.darkBgColor : rankInfo.bgColor }]}>
          <Ionicons name={rankInfo.icon as any} size={10} color={rankInfo.color} />
          <Text style={[styles.rankText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
        </View>
      </View>

      {/* Power Gauge + Message */}
      <View style={styles.rightSection}>
        <PowerGauge score={trustScore} gradient={rankInfo.gradient} icon={rankInfo.icon} />
        <TouchableOpacity
          style={[styles.messageIconBtn, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}
          onPress={() => onMessagePress?.(connection)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chatbubble" size={14} color="#3B82F6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Avatar Section
  avatarSection: {
    position: 'relative',
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFF',
    gap: 1,
  },
  streakBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
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
    color: '#111827',
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

  // Right Section (Gauge + Message)
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
});

export default TrustConnectionItem;
