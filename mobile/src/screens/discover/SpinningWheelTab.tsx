import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SCREEN_WIDTH - 64, 340);
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const CENTER = WHEEL_RADIUS;

interface WheelActivity {
  id: string;
  title: string;
  description: string | null;
  researchBasis: string | null;
  topic: {
    id: string;
    name: string;
    slug: string;
    iconEmoji: string | null;
    category: string;
  } | null;
}

// Colors for wheel slices
const SLICE_COLORS = [
  '#7C3AED', '#EC4899', '#F97316', '#14B8A6',
  '#3B82F6', '#EF4444', '#8B5CF6', '#10B981',
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// Wrap long text to multiple lines for SVG
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 2); // Max 2 lines
}

interface SpinningWheelTabProps {
  navigation: any;
}

function getTimeUntilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function SpinningWheelTab({ navigation }: SpinningWheelTabProps) {
  const { colors, isDark } = useTheme();
  const [activities, setActivities] = useState<WheelActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<WheelActivity | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(getTimeUntilMidnight());
  const spinAnim = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  // Update countdown every minute
  useEffect(() => {
    const timer = setInterval(() => setResetCountdown(getTimeUntilMidnight()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getWheelActivities();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Failed to fetch wheel activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActivities();
    }, [fetchActivities])
  );

  const spin = useCallback(() => {
    if (spinning || activities.length === 0) return;
    setSpinning(true);

    const sliceAngle = 360 / activities.length;
    // Pick a random winning index
    const winIndex = Math.floor(Math.random() * activities.length);
    // Calculate where the pointer (top) should land — middle of the winning slice
    const targetSliceMiddle = winIndex * sliceAngle + sliceAngle / 2;
    // We need the wheel to rotate so that this slice is at the top (0 degrees)
    // Total rotation = multiple full spins + offset to land on target
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    const targetRotation = fullSpins * 360 + (360 - targetSliceMiddle);

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: targetRotation,
      duration: 4000 + Math.random() * 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      currentRotation.current = targetRotation % 360;
      setSelectedActivity(activities[winIndex]);
      setSpinning(false);
      // Slight delay before showing result
      setTimeout(() => setResultVisible(true), 300);
    });
  }, [spinning, activities, spinAnim]);

  const handleDoItAndPost = useCallback(() => {
    if (!selectedActivity) return;
    setResultVisible(false);
    // Navigate to CreatePost with activity info
    navigation.navigate('CreatePost', {
      screen: 'CreatePostHome',
      params: {
        activityId: selectedActivity.id,
        activityTitle: selectedActivity.title,
        activityDescription: selectedActivity.description,
        activityResearch: selectedActivity.researchBasis,
        activityTopicId: selectedActivity.topic?.id,
        activityTopicName: selectedActivity.topic?.name,
      },
    });
  }, [selectedActivity, navigation]);

  const interpolatedRotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const sliceAngle = activities.length > 0 ? 360 / activities.length : 360;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading activities...
        </Text>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="compass-outline" size={64} color={colors.text.secondary} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
          No Activities Yet
        </Text>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          Join some communities first, then come back to spin the wheel and discover fun activities!
        </Text>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => {
            const parent = navigation.getParent();
            if (parent) parent.navigate('Discover');
          }}
        >
          <Text style={styles.joinButtonText}>Browse Communities</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Activity Wheel</Text>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          Spin to discover a fun activity from your communities!
        </Text>
        <View style={styles.resetBadge}>
          <Ionicons name="time-outline" size={13} color="#7C3AED" />
          <Text style={styles.resetText}>
            New activities in {resetCountdown}
          </Text>
        </View>
      </View>

      {/* Wheel */}
      <View style={styles.wheelContainer}>
        {/* Pointer */}
        <View style={styles.pointer}>
          <Ionicons name="caret-down" size={32} color="#7C3AED" />
        </View>

        <Animated.View
          style={[
            styles.wheel,
            {
              transform: [{ rotate: interpolatedRotation }],
            },
          ]}
        >
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
            {activities.map((activity, index) => {
              const startAngle = index * sliceAngle;
              const endAngle = startAngle + sliceAngle;
              const color = SLICE_COLORS[index % SLICE_COLORS.length];
              const midAngle = startAngle + sliceAngle / 2;

              // Calculate text position (60% of radius from center for better placement)
              const textRadius = WHEEL_RADIUS * 0.6;
              const textPos = polarToCartesian(CENTER, CENTER, textRadius, midAngle);
              const lines = wrapText(activity.title, 12);

              return (
                <G key={activity.id}>
                  <Path
                    d={describeArc(CENTER, CENTER, WHEEL_RADIUS - 2, startAngle, endAngle)}
                    fill={color}
                    stroke={isDark ? '#1a1a2e' : '#ffffff'}
                    strokeWidth={2}
                  />
                  {/* Activity title */}
                  {lines.map((line, li) => (
                    <SvgText
                      key={li}
                      x={textPos.x}
                      y={textPos.y + (li - (lines.length - 1) / 2) * 12}
                      fill="#ffffff"
                      fontSize={9}
                      fontWeight="bold"
                      textAnchor="middle"
                      rotation={midAngle}
                      origin={`${textPos.x}, ${textPos.y}`}
                    >
                      {line}
                    </SvgText>
                  ))}
                  {/* Community emoji */}
                  {activity.topic?.iconEmoji && (
                    <SvgText
                      x={polarToCartesian(CENTER, CENTER, WHEEL_RADIUS * 0.85, midAngle).x}
                      y={polarToCartesian(CENTER, CENTER, WHEEL_RADIUS * 0.85, midAngle).y}
                      fontSize={14}
                      textAnchor="middle"
                      rotation={midAngle}
                      origin={`${polarToCartesian(CENTER, CENTER, WHEEL_RADIUS * 0.85, midAngle).x}, ${polarToCartesian(CENTER, CENTER, WHEEL_RADIUS * 0.85, midAngle).y}`}
                    >
                      {activity.topic.iconEmoji}
                    </SvgText>
                  )}
                </G>
              );
            })}
            {/* Center circle */}
            <Path
              d={describeArc(CENTER, CENTER, 24, 0, 359.99)}
              fill={isDark ? '#1a1a2e' : '#ffffff'}
              stroke="#7C3AED"
              strokeWidth={3}
            />
          </Svg>
        </Animated.View>
      </View>

      {/* Spin Button */}
      <TouchableOpacity
        style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
        onPress={spin}
        disabled={spinning}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={spinning ? ['#9CA3AF', '#6B7280'] : ['#7C3AED', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.spinButtonGradient}
        >
          <Ionicons name={spinning ? 'sync' : 'play'} size={22} color="#fff" />
          <Text style={styles.spinButtonText}>
            {spinning ? 'Spinning...' : 'SPIN THE WHEEL'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Activity list preview */}
      <View style={styles.activityList}>
        <Text style={[styles.listTitle, { color: colors.text.primary }]}>
          Activities on the Wheel
        </Text>
        {activities.map((activity, index) => (
          <View
            key={activity.id}
            style={[styles.activityItem, { backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa' }]}
          >
            <View style={[styles.activityDot, { backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }]} />
            <View style={styles.activityItemContent}>
              <Text style={[styles.activityItemTitle, { color: colors.text.primary }]} numberOfLines={1}>
                {activity.title}
              </Text>
              {activity.topic && (
                <View style={styles.communityTag}>
                  <Text style={styles.communityTagEmoji}>{activity.topic.iconEmoji || '🏷️'}</Text>
                  <Text style={[styles.communityTagText, { color: colors.text.secondary }]}>
                    {activity.topic.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* How this works */}
      <TouchableOpacity
        style={[styles.howItWorksToggle, { backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa' }]}
        onPress={() => setShowHowItWorks(!showHowItWorks)}
        activeOpacity={0.7}
      >
        <View style={styles.howItWorksToggleRow}>
          <Ionicons name="help-circle-outline" size={18} color="#7C3AED" />
          <Text style={[styles.howItWorksToggleText, { color: colors.text.primary }]}>
            How does this work?
          </Text>
        </View>
        <Ionicons
          name={showHowItWorks ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.text.secondary}
        />
      </TouchableOpacity>
      {showHowItWorks && (
        <View style={[styles.howItWorksContent, { backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa' }]}>
          {[
            { icon: 'sync-outline' as const, text: 'You get 8 fresh activities every day from your communities' },
            { icon: 'checkmark-circle-outline' as const, text: 'Complete an activity by spinning, doing it, and posting about it' },
            { icon: 'remove-circle-outline' as const, text: 'Completed activities disappear from the wheel until tomorrow' },
            { icon: 'moon-outline' as const, text: 'At midnight, the wheel resets with a new set of 8 activities' },
            { icon: 'flask-outline' as const, text: 'Every activity is backed by real research on why it helps you' },
          ].map((item, i) => (
            <View key={i} style={styles.howItWorksStep}>
              <Ionicons name={item.icon} size={16} color="#7C3AED" />
              <Text style={[styles.howItWorksStepText, { color: colors.text.secondary }]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Result Modal */}
      <Modal
        visible={resultVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResultVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.resultCard, { backgroundColor: isDark ? '#1e1e30' : '#ffffff' }]}>
            {/* Close */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setResultVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            {/* Confetti-style header */}
            <LinearGradient
              colors={['#7C3AED', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resultHeader}
            >
              <Ionicons name="trophy" size={32} color="#fff" />
              <Text style={styles.resultHeaderText}>Your Activity!</Text>
            </LinearGradient>

            <ScrollView style={styles.resultBody} contentContainerStyle={styles.resultBodyContent}>
              {/* Activity title */}
              <Text style={[styles.resultTitle, { color: colors.text.primary }]}>
                {selectedActivity?.title}
              </Text>

              {/* Community tag */}
              {selectedActivity?.topic && (
                <View style={styles.resultCommunityTag}>
                  <Text style={styles.resultCommunityEmoji}>
                    {selectedActivity.topic.iconEmoji || '🏷️'}
                  </Text>
                  <Text style={styles.resultCommunityName}>
                    {selectedActivity.topic.name}
                  </Text>
                </View>
              )}

              {/* Description */}
              {selectedActivity?.description && (
                <Text style={[styles.resultDescription, { color: colors.text.secondary }]}>
                  {selectedActivity.description}
                </Text>
              )}

              {/* Research basis */}
              {selectedActivity?.researchBasis && (
                <View style={[styles.researchBox, { backgroundColor: isDark ? '#252540' : '#f0f4ff' }]}>
                  <View style={styles.researchHeader}>
                    <Ionicons name="flask" size={16} color="#3B82F6" />
                    <Text style={[styles.researchLabel, { color: '#3B82F6' }]}>
                      Why This Helps
                    </Text>
                  </View>
                  <Text style={[styles.researchText, { color: colors.text.secondary }]}>
                    {selectedActivity.researchBasis}
                  </Text>
                </View>
              )}

            </ScrollView>

            {/* Action button */}
            <TouchableOpacity
              style={styles.doItButton}
              onPress={handleDoItAndPost}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doItButtonGradient}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.doItButtonText}>Do it & Post</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.spinAgainButton}
              onPress={() => {
                setResultVisible(false);
                setTimeout(spin, 300);
              }}
            >
              <Text style={[styles.spinAgainText, { color: '#7C3AED' }]}>
                Spin Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  joinButton: {
    marginTop: 20,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  joinButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  header: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  resetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  resetText: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  pointer: {
    position: 'absolute',
    top: -8,
    zIndex: 10,
    alignItems: 'center',
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  spinButton: { marginHorizontal: 48, marginTop: 16, borderRadius: 28, overflow: 'hidden' },
  spinButtonDisabled: { opacity: 0.7 },
  spinButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  spinButtonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  activityList: { marginTop: 28, paddingHorizontal: 16 },
  listTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  activityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  activityItemContent: { flex: 1 },
  activityItemTitle: { fontSize: 14, fontWeight: '600' },
  communityTag: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  communityTagEmoji: { fontSize: 12 },
  communityTagText: { fontSize: 11 },

  // How it works
  howItWorksToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
  },
  howItWorksToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  howItWorksToggleText: { fontSize: 14, fontWeight: '600' },
  howItWorksContent: {
    marginHorizontal: 16,
    marginTop: 1,
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    gap: 12,
  },
  howItWorksStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howItWorksStepText: { fontSize: 13, lineHeight: 18, flex: 1 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  closeButton: { position: 'absolute', top: 12, right: 12, zIndex: 10, padding: 4 },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  resultHeaderText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  resultBody: { maxHeight: 320 },
  resultBodyContent: { padding: 20 },
  resultTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  resultCommunityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  resultCommunityEmoji: { fontSize: 16 },
  resultCommunityName: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
  resultDescription: { fontSize: 14, marginTop: 14, textAlign: 'center', lineHeight: 20 },
  researchBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
  },
  researchHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  researchLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  researchText: { fontSize: 13, lineHeight: 19 },
  doItButton: { marginHorizontal: 20, marginTop: 16, borderRadius: 24, overflow: 'hidden' },
  doItButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  doItButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  spinAgainButton: { alignItems: 'center', paddingVertical: 14 },
  spinAgainText: { fontSize: 14, fontWeight: '600' },
});
