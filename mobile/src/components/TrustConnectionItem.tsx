import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

export const TrustConnectionItem: React.FC<TrustConnectionItemProps> = ({
  connection,
  onPress,
  onMessagePress,
  onProfilePress,
}) => {
  const { colors } = useTheme();
  const { otherUser, trustScore, currentStreak, longestStreak, isMutualFollow, totalExchangeDays, lastExchangeDate } = connection;

  // Get rank info based on trust score
  const getRankInfo = () => {
    if (trustScore >= 80) return { label: 'Best Friend', color: '#8B5CF6', bgColor: '#EDE9FE', gradient: ['#8B5CF6', '#A855F7'] as [string, string], icon: 'heart' as const };
    if (trustScore >= 60) return { label: 'Close Friend', color: '#EC4899', bgColor: '#FCE7F3', gradient: ['#EC4899', '#F472B6'] as [string, string], icon: 'heart-half' as const };
    if (trustScore >= 40) return { label: 'Good Friend', color: '#F59E0B', bgColor: '#FEF3C7', gradient: ['#F59E0B', '#FBBF24'] as [string, string], icon: 'sunny' as const };
    if (trustScore >= 20) return { label: 'Building', color: '#10B981', bgColor: '#D1FAE5', gradient: ['#10B981', '#34D399'] as [string, string], icon: 'leaf' as const };
    return { label: 'New', color: '#6B7280', bgColor: '#F3F4F6', gradient: ['#9CA3AF', '#D1D5DB'] as [string, string], icon: 'sparkles' as const };
  };

  const rankInfo = getRankInfo();

  // Format the last exchange date
  const formatLastExchange = () => {
    if (!lastExchangeDate) return 'Never';
    const date = new Date(lastExchangeDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const avatarUrl = getImageUrl(otherUser.avatarUrl);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={() => onProfilePress?.(connection) || onPress?.(connection)}
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
            <View style={styles.mutualIcon}>
              <Ionicons name="people" size={10} color="#8B5CF6" />
            </View>
          )}
          <View style={[styles.rankBadge, { backgroundColor: rankInfo.bgColor }]}>
            <Ionicons name={rankInfo.icon} size={10} color={rankInfo.color} />
            <Text style={[styles.rankText, { color: rankInfo.color }]}>{rankInfo.label}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={10} color={colors.icon.secondary} />
            <Text style={[styles.statText, { color: colors.text.tertiary }]}>{totalExchangeDays}d</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.disabled }]} />
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={10} color={colors.icon.secondary} />
            <Text style={[styles.statText, { color: colors.text.tertiary }]}>{formatLastExchange()}</Text>
          </View>
          {longestStreak > 0 && (
            <>
              <View style={[styles.statDivider, { backgroundColor: colors.disabled }]} />
              <View style={styles.statItem}>
                <Ionicons name="trophy-outline" size={10} color="#F59E0B" />
                <Text style={[styles.statText, { color: '#F59E0B' }]}>{longestStreak}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Score + Message */}
      <View style={styles.rightSection}>
        <LinearGradient
          colors={rankInfo.gradient}
          style={styles.scoreCircle}
        >
          <Text style={styles.scoreValue}>{trustScore}</Text>
        </LinearGradient>
        <TouchableOpacity
          style={styles.messageIconBtn}
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
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
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
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  statDivider: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 5,
  },

  // Right Section (Score + Message)
  rightSection: {
    alignItems: 'center',
    marginLeft: 8,
    gap: 6,
  },
  scoreCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  messageIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TrustConnectionItem;
