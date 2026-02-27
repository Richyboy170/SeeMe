import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import { useTheme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

interface Props {
  onClaimed: () => void;
}

const MISSION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  customize_avatar: 'person-circle-outline',
  first_post: 'camera-outline',
  first_give: 'heart-outline',
  join_community: 'people-outline',
};

const MISSION_COLORS: Record<string, { bg: string; accent: string }> = {
  customize_avatar: { bg: '#EDE9FE', accent: '#8B5CF6' },
  first_post: { bg: '#DBEAFE', accent: '#3B82F6' },
  first_give: { bg: '#FCE7F3', accent: '#EC4899' },
  join_community: { bg: '#D1FAE5', accent: '#10B981' },
};

export default function OnboardingMissions({ onClaimed }: Props) {
  const { colors, isDark } = useTheme();
  const { showCelebration } = useCoinCelebration();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const claimPulse = useRef(new Animated.Value(1)).current;

  // Decorative animations
  const sparkle1 = useRef(new Animated.Value(0.2)).current;
  const sparkle2 = useRef(new Animated.Value(0.6)).current;
  const rocketBounce = useRef(new Animated.Value(0)).current;
  const starRotate = useRef(new Animated.Value(0)).current;
  const progressGlow = useRef(new Animated.Value(1)).current;

  const loadMissions = useCallback(async () => {
    try {
      const res = await api.getMissions();
      const list: Mission[] = res.missions || [];
      setMissions(list);
      // Hide entirely if every mission is claimed
      if (list.length > 0 && list.every(m => m.claimed)) {
        setHidden(true);
      }
    } catch (e) {
      console.error('Error loading missions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  // Gentle pulse on claimable buttons
  useEffect(() => {
    const hasClaimable = missions.some(m => m.completed && !m.claimed);
    if (hasClaimable) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(claimPulse, { toValue: 1.06, duration: 800, useNativeDriver: true }),
          Animated.timing(claimPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [missions, claimPulse]);

  // Decorative animations
  useEffect(() => {
    // Sparkle twinkle
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle1, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
        Animated.timing(sparkle1, { toValue: 0.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(sparkle1, { toValue: 0.15, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkle2, { toValue: 0.9, duration: 1500, useNativeDriver: true }),
        Animated.timing(sparkle2, { toValue: 0.2, duration: 1500, useNativeDriver: true }),
        Animated.timing(sparkle2, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Rocket bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(rocketBounce, { toValue: -4, duration: 400, useNativeDriver: true }),
        Animated.timing(rocketBounce, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(rocketBounce, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    // Star rotation
    Animated.loop(
      Animated.timing(starRotate, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    // Progress glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressGlow, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(progressGlow, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleClaim = async (missionId: string) => {
    if (claiming) return;
    setClaiming(missionId);
    try {
      const res = await api.claimMission(missionId);
      if (res.success) {
        showCelebration(res.reward, 'claim');
        onClaimed();
        await loadMissions();
      }
    } catch (e: any) {
      console.error('Error claiming mission:', e);
    } finally {
      setClaiming(null);
    }
  };

  if (hidden || loading || missions.length === 0) return null;

  const completedCount = missions.filter(m => m.claimed).length;
  const totalCount = missions.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const starSpin = starRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.outerWrap}>
      <View style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
          shadowColor: '#8B5CF6',
        }
      ]}>
        {/* Decorative sparkles */}
        <Animated.View style={[styles.decoSparkle1, { opacity: sparkle1 }]} pointerEvents="none">
          <Ionicons name="sparkles" size={12} color={isDark ? '#A78BFA' : '#C4B5FD'} />
        </Animated.View>
        <Animated.View style={[styles.decoSparkle2, { opacity: sparkle2 }]} pointerEvents="none">
          <Ionicons name="star" size={10} color={isDark ? '#818CF8' : '#A5B4FC'} />
        </Animated.View>
        <Animated.View style={[styles.decoStar, { transform: [{ rotate: starSpin }] }]} pointerEvents="none">
          <Ionicons name="star-outline" size={16} color={isDark ? 'rgba(167,139,250,0.15)' : 'rgba(139,92,246,0.08)'} />
        </Animated.View>

        {/* Gradient Header */}
        <LinearGradient
          colors={isDark ? ['#4C1D95', '#6D28D9', '#7C3AED'] : ['#8B5CF6', '#7C3AED', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          {/* Header decorative bg icon */}
          <Ionicons name="rocket" size={40} color="rgba(255,255,255,0.06)" style={styles.headerBgIcon} />

          <View style={styles.headerLeft}>
            <Animated.View style={[styles.rocketCircle, { transform: [{ translateY: rocketBounce }] }]}>
              <Ionicons name="rocket" size={16} color="#FFF" />
            </Animated.View>
            <View>
              <Text style={styles.headerTitle}>Getting Started</Text>
              <Text style={styles.headerSubtitle}>Complete missions to earn coins</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{completedCount}/{totalCount}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Progress bar */}
        <View style={[styles.progressContainer, { backgroundColor: isDark ? '#1E1B2E' : '#F5F3FF' }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: `${Math.max(progressPercent, 4)}%`, transform: [{ scaleY: progressGlow }] }]}>
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={[styles.progressLabel, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
            {progressPercent === 100 ? 'All done!' : `${Math.round(progressPercent)}% complete`}
          </Text>
        </View>

        {/* Mission rows */}
        {missions.map((mission, index) => {
          const icon = MISSION_ICONS[mission.id] || 'star-outline';
          const missionColor = MISSION_COLORS[mission.id] || { bg: '#F5F5F5', accent: '#6B7280' };
          const isClaimable = mission.completed && !mission.claimed;
          const isDone = mission.claimed;

          return (
            <View
              key={mission.id}
              style={[
                styles.missionRow,
                {
                  borderTopColor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)',
                  backgroundColor: isDone
                    ? (isDark ? 'rgba(76,175,80,0.04)' : 'rgba(76,175,80,0.02)')
                    : isClaimable
                      ? (isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.02)')
                      : 'transparent',
                },
                isDone && styles.missionDone,
              ]}
            >
              {/* Step number / icon */}
              <View style={[
                styles.missionIcon,
                {
                  backgroundColor: isDone
                    ? (isDark ? '#1A3A1A' : '#E8F5E9')
                    : isClaimable
                      ? (isDark ? missionColor.accent + '30' : missionColor.bg)
                      : (isDark ? '#2A2A2A' : missionColor.bg),
                  borderColor: isDone ? '#4CAF50' : missionColor.accent,
                  borderWidth: isClaimable ? 1.5 : 0,
                },
              ]}>
                {isDone ? (
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                ) : (
                  <Ionicons
                    name={icon}
                    size={18}
                    color={isClaimable ? missionColor.accent : (isDark ? colors.text.secondary : missionColor.accent)}
                  />
                )}
              </View>

              {/* Text */}
              <View style={styles.missionText}>
                <Text style={[
                  styles.missionTitle,
                  { color: isDone ? colors.text.secondary : colors.text.primary },
                  isDone && styles.missionTitleDone,
                ]}>
                  {mission.title}
                </Text>
                <Text style={[styles.missionDesc, { color: colors.text.secondary }]}>
                  {mission.description}
                </Text>
              </View>

              {/* Right side: reward badge or claim button */}
              {isDone ? (
                <View style={[styles.doneBadge, { backgroundColor: isDark ? '#1A3A1A' : '#E8F5E9' }]}>
                  <Ionicons name="checkmark" size={12} color="#4CAF50" />
                </View>
              ) : isClaimable ? (
                <Animated.View style={{ transform: [{ scale: claimPulse }] }}>
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => handleClaim(mission.id)}
                    disabled={claiming === mission.id}
                    activeOpacity={0.7}
                  >
                    {claiming === mission.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={11} color="#FFF" style={{ marginRight: 2 }} />
                        <Text style={styles.claimButtonText}>+{mission.reward}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <View style={[styles.rewardBadge, { backgroundColor: isDark ? '#2A2A2A' : missionColor.bg }]}>
                  <Ionicons name="gift-outline" size={10} color={missionColor.accent} style={{ marginRight: 2 }} />
                  <Text style={[styles.rewardText, { color: isDark ? colors.text.secondary : missionColor.accent }]}>+{mission.reward}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    width: '100%',
  },
  container: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Decorative elements
  decoSparkle1: {
    position: 'absolute',
    top: 52,
    right: 14,
    zIndex: 5,
  },
  decoSparkle2: {
    position: 'absolute',
    bottom: 18,
    left: 10,
    zIndex: 5,
  },
  decoStar: {
    position: 'absolute',
    bottom: 30,
    right: 28,
    zIndex: 5,
  },

  // Gradient header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  headerBgIcon: {
    position: 'absolute',
    right: -4,
    top: -4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rocketCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },

  // Progress bar
  progressContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(139,92,246,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Mission rows
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    gap: 10,
  },
  missionDone: {
    opacity: 0.7,
  },
  missionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionText: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  missionTitleDone: {
    textDecorationLine: 'line-through',
  },
  missionDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  claimButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 52,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  claimButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rewardBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  doneBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
