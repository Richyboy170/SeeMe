import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getPoseByName } from '../../data/friendshipPoses';
import { useTheme } from '../../theme';

interface PoseGuideCardProps {
  poseName: string;
  poseIndex: number;
  totalPoses: number;
  opacity?: Animated.Value;
}

export default function PoseGuideCard({ poseName, poseIndex, totalPoses, opacity }: PoseGuideCardProps) {
  const { colors } = useTheme();
  const pose = getPoseByName(poseName);

  const Container = opacity ? Animated.View : View;
  const animProps = opacity ? { style: [styles.container, { backgroundColor: colors.surface, opacity }] } : { style: [styles.container, { backgroundColor: colors.surface }] };

  return (
    <Container {...animProps}>
      <Text style={styles.poseNumber}>Pose {poseIndex + 1} of {totalPoses}</Text>
      <Text style={styles.emoji}>{pose?.emoji || '📸'}</Text>
      <Text style={[styles.poseName, { color: colors.text.primary }]}>{pose?.displayName || poseName}</Text>
      <Text style={[styles.description, { color: colors.text.secondary }]}>{pose?.description || 'Strike a pose!'}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    margin: 20,
  },
  poseNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  poseName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
  },
});
