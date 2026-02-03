import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../services/api';

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
}

export const TrustConnectionItem: React.FC<TrustConnectionItemProps> = ({
  connection,
  onPress,
}) => {
  const { otherUser, trustScore, currentStreak, isMutualFollow, totalExchangeDays, lastExchangeDate } = connection;

  // Determine color based on mutual follow status and score
  // Using a warm-to-cool gradient for better visual hierarchy
  const getGaugeColor = () => {
    if (!isMutualFollow) {
      return '#94A3B8'; // Slate gray for non-mutual follows
    }

    if (trustScore >= 80) return '#8B5CF6'; // Violet - strong bond
    if (trustScore >= 60) return '#A855F7'; // Purple - great consistency
    if (trustScore >= 40) return '#EC4899'; // Pink - building friendship
    if (trustScore >= 20) return '#F97316'; // Orange - getting started
    return '#64748B'; // Slate - new connection
  };

  const gaugeColor = getGaugeColor();
  const percentage = Math.min(100, Math.max(0, trustScore));

  // Format the last exchange date
  const formatLastExchange = () => {
    if (!lastExchangeDate) return 'Never';
    const date = new Date(lastExchangeDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const avatarUrl = getImageUrl(otherUser.avatarUrl);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(connection)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color="#9CA3AF" />
          </View>
        )}
        {isMutualFollow && (
          <View style={[styles.mutualBadge, { backgroundColor: gaugeColor }]}>
            <Ionicons name="heart" size={10} color="#FFF" />
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.username}>@{otherUser.username}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>{totalExchangeDays} days exchanged</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.statsText}>{formatLastExchange()}</Text>
        </View>
      </View>

      {/* Trust Score Gauge */}
      <View style={styles.gaugeContainer}>
        {currentStreak > 0 && (
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={12} color="#F59E0B" />
            <Text style={styles.streakText}>{currentStreak}</Text>
          </View>
        )}
        <View style={styles.gaugeWrapper}>
          <View style={styles.gaugeBackground}>
            <View
              style={[
                styles.gaugeFill,
                { width: `${percentage}%`, backgroundColor: gaugeColor },
              ]}
            />
          </View>
          <Text style={[styles.scoreText, { color: gaugeColor }]}>{trustScore}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutualBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#64748B',
  },
  dot: {
    color: '#94A3B8',
    marginHorizontal: 4,
  },
  gaugeContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 2,
  },
  gaugeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeBackground: {
    width: 50,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    minWidth: 24,
    textAlign: 'right',
  },
});

export default TrustConnectionItem;
