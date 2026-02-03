import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrustGaugeProps {
  trustScore: number;
  currentStreak: number;
  isMutualFollow: boolean;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

export const TrustGauge: React.FC<TrustGaugeProps> = ({
  trustScore,
  currentStreak,
  isMutualFollow,
  compact = false,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  // Determine color based on mutual follow status and score
  // Using a cohesive warm-to-cool gradient
  const getGaugeColor = () => {
    if (!isMutualFollow) {
      return '#94A3B8'; // Slate gray for non-mutual follows
    }

    // Colored gradient based on score for mutual follows
    if (trustScore >= 80) return '#8B5CF6'; // Violet - strong bond
    if (trustScore >= 60) return '#A855F7'; // Purple - great consistency
    if (trustScore >= 40) return '#EC4899'; // Pink - building friendship
    if (trustScore >= 20) return '#F97316'; // Orange - getting started
    return '#64748B'; // Slate - new connection
  };

  const gaugeColor = getGaugeColor();
  const percentage = Math.min(100, Math.max(0, trustScore));

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactGaugeBackground, { borderColor: gaugeColor }]}>
          <View
            style={[
              styles.compactGaugeFill,
              { width: `${percentage}%`, backgroundColor: gaugeColor },
            ]}
          />
        </View>
        <Text style={[styles.compactScore, { color: gaugeColor }]}>{trustScore}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isLight && styles.containerLight]}>
      <View style={styles.header}>
        <Ionicons
          name={isMutualFollow ? 'heart' : 'heart-outline'}
          size={18}
          color={gaugeColor}
        />
        <Text style={[styles.label, isLight && styles.labelLight]}>Trust Score</Text>
        {currentStreak > 0 && (
          <View style={[styles.streakBadge, isLight && styles.streakBadgeLight]}>
            <Ionicons name="flame" size={12} color="#F59E0B" />
            <Text style={styles.streakText}>{currentStreak}d</Text>
          </View>
        )}
      </View>

      <View style={styles.gaugeContainer}>
        <View style={[styles.gaugeBackground, isLight && styles.gaugeBackgroundLight]}>
          <View
            style={[
              styles.gaugeFill,
              { width: `${percentage}%`, backgroundColor: gaugeColor },
            ]}
          />
        </View>
        <Text style={[styles.scoreText, { color: gaugeColor }]}>{trustScore}</Text>
      </View>

      <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
        {!isMutualFollow
          ? 'Follow each other to activate'
          : trustScore >= 80
          ? 'Strong bond'
          : trustScore >= 60
          ? 'Growing trust'
          : trustScore >= 40
          ? 'Building connection'
          : trustScore >= 20
          ? 'Getting started'
          : 'New connection'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  containerLight: {
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E5E7EB',
    marginLeft: 8,
    flex: 1,
  },
  labelLight: {
    color: '#374151',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakBadgeLight: {
    backgroundColor: '#FEF3C7',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  gaugeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeBackgroundLight: {
    backgroundColor: '#E5E7EB',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  statusText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  statusTextLight: {
    color: '#6B7280',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactGaugeBackground: {
    width: 60,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
  },
  compactGaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  compactScore: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default TrustGauge;
