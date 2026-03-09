import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

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
  theme: themeProp = 'dark',
}) => {
  const { colors, isDark } = useTheme();
  const isLight = !isDark;
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
        <View style={[styles.compactGaugeBackground, { borderColor: gaugeColor, backgroundColor: isLight ? colors.border : '#374151' }]}>
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
    <View style={[styles.container, { backgroundColor: isLight ? colors.surface : '#1E1B4B', borderColor: isLight ? colors.border : undefined, borderWidth: isLight ? 1 : 0 }]}>
      <View style={styles.header}>
        <Ionicons
          name={isMutualFollow ? 'sparkles' : 'sparkles-outline'}
          size={18}
          color={gaugeColor}
        />
        <Text style={[styles.label, { color: isLight ? colors.text.primary : '#E0E7FF' }]}>Friendship Score</Text>
        {currentStreak > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: isLight ? '#FFF7ED' : '#312E81' }]}>
            <Ionicons name="flame" size={12} color="#F97316" />
            <Text style={styles.streakText}>{currentStreak}d</Text>
          </View>
        )}
      </View>

      <View style={styles.gaugeContainer}>
        <View style={[styles.gaugeBackground, { backgroundColor: isLight ? colors.border : '#312E81' }]}>
          <View
            style={[
              styles.gaugeFill,
              { width: `${percentage}%`, backgroundColor: gaugeColor },
            ]}
          />
        </View>
        <Text style={[styles.scoreText, { color: gaugeColor }]}>{trustScore}</Text>
      </View>

      <Text style={[styles.statusText, { color: isLight ? colors.text.secondary : '#A5B4FC' }]}>
        {!isMutualFollow
          ? 'Become friends to unlock colors!'
          : trustScore >= 80
          ? 'Best friends forever!'
          : trustScore >= 60
          ? 'You two are really close!'
          : trustScore >= 40
          ? 'Your friendship is growing!'
          : trustScore >= 20
          ? 'Getting to know each other'
          : 'A new friendship begins!'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  containerLight: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E7FF',
    marginLeft: 8,
    flex: 1,
  },
  labelLight: {
    color: '#1E293B',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312E81',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakBadgeLight: {
    backgroundColor: '#FFF7ED',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
    marginLeft: 4,
  },
  gaugeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#312E81',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeBackgroundLight: {
    backgroundColor: '#E2E8F0',
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
    color: '#A5B4FC',
    marginTop: 8,
    textAlign: 'center',
  },
  statusTextLight: {
    color: '#64748B',
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
