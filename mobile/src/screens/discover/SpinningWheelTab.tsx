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
  Alert,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle as SvgCircle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(SCREEN_WIDTH - 64, 340);
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const CENTER = WHEEL_RADIUS;
const MAX_WHEEL_SLOTS = 8;

interface WheelActivity {
  id: string;
  title: string;
  description: string | null;
  researchBasis: string | null;
  isSelected?: boolean;
  onWheel?: boolean;
  topic: {
    id: string;
    name: string;
    slug: string;
    iconEmoji: string | null;
    category: string;
  } | null;
}

// Casino palette
const GOLD = '#D4A520';
const GOLD_LIGHT = '#F5DEB3';
const GOLD_DARK = '#B8860B';
const CASINO_RED = '#DC2626';
const CASINO_BLACK = '#1A1A1A';
const CASINO_GREEN = '#166534';
const CREAM = '#FFF8E7';

const SLICE_COLORS = [
  CASINO_BLACK, CASINO_RED, CASINO_BLACK, GOLD,
  CASINO_BLACK, CASINO_RED, CASINO_BLACK, CASINO_GREEN,
];

const QUEUE_ICONS: Array<{ name: keyof typeof Ionicons.glyphMap }> = [
  { name: 'flash' },
  { name: 'star' },
  { name: 'sparkles' },
  { name: 'rocket' },
  { name: 'diamond' },
  { name: 'bulb' },
  { name: 'heart' },
  { name: 'leaf' },
];

// ── Casino-styled icon badge ──
const IconBadge = React.memo(function IconBadge({
  name,
  size = 20,
  iconSize = 12,
  filled,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  iconSize?: number;
  filled?: boolean;
}) {
  return (
    <LinearGradient
      colors={filled ? [GOLD, GOLD_DARK] : [CREAM, '#FFF1D0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: filled ? 0 : 1,
        borderColor: GOLD_LIGHT,
      }}
    >
      <Ionicons name={name} size={iconSize} color={filled ? '#fff' : GOLD_DARK} />
    </LinearGradient>
  );
});

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
  return lines.slice(0, 2);
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

// ── Celebration sparkle (result modal) ──
function CelebrationSparkle({ index }: { index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const angle = (index / 12) * Math.PI * 2;
  const distance = 60 + Math.random() * 40;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 800 + Math.random() * 400,
      delay: index * 50,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: index % 3 === 0 ? GOLD : GOLD_LIGHT,
        opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] }),
        transform: [
          { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] }) },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] }) },
          { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1.5, 0] }) },
        ],
      }}
    />
  );
}

// ── Bouncing loading dots ──
const BouncingDots = React.memo(function BouncingDots() {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: -12, duration: 300, delay: i * 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: i === 0 ? GOLD : i === 1 ? GOLD_LIGHT : CASINO_RED,
            transform: [{ translateY: dot }],
          }}
        />
      ))}
    </View>
  );
});

// ── Animated queue row ──
const AnimatedQueueItem = React.memo(function AnimatedQueueItem({
  activity,
  index,
  isDark,
  colors,
}: {
  activity: WheelActivity;
  index: number;
  isDark: boolean;
  colors: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 100,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.queueItem,
        { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' },
        {
          opacity: anim,
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) },
            { scale: Animated.multiply(anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.7, 1.06, 1] }), pressScale) },
          ],
        },
      ]}
    >
      <View style={[styles.queueItemNumber, { backgroundColor: '#FFF8E7' }]}>
        <Text style={[styles.queueItemNumberText, { color: GOLD_DARK }]}>{index + 1}</Text>
      </View>
      <View style={styles.queueItemContent}>
        <Text style={[styles.queueItemTitle, { color: colors.text.primary }]} numberOfLines={1}>
          {activity.title}
        </Text>
        {activity.topic && (
          <View style={styles.communityTag}>
            <Text style={styles.communityTagEmoji}>{activity.topic.iconEmoji || ''}</Text>
            <Text style={[styles.communityTagText, { color: colors.text.secondary }]}>
              {activity.topic.name}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.queueItemBolt}>
        <IconBadge
          name={QUEUE_ICONS[index % QUEUE_ICONS.length].name}
          size={28}
          iconSize={13}
        />
      </View>
    </Animated.View>
  );
});

// ── Animated pick item in modal ──
const AnimatedPickItem = React.memo(function AnimatedPickItem({
  activity,
  index,
  isDark,
  colors,
  onToggle,
  togglingId,
}: {
  activity: WheelActivity;
  index: number;
  isDark: boolean;
  colors: any;
  onToggle: (a: WheelActivity) => void;
  togglingId: string | null;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const togglePop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 60,
      useNativeDriver: true,
      tension: 55,
      friction: 8,
    }).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(togglePop, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(togglePop, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
    ]).start();
    onToggle(activity);
  };

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
          { scale: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.9, 1.02, 1] }) },
        ],
      }}
    >
      <TouchableOpacity
        style={[
          styles.pickItem,
          { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' },
          activity.onWheel && styles.pickItemSelected,
        ]}
        onPress={handlePress}
        disabled={togglingId === activity.id}
        activeOpacity={0.7}
      >
        <View style={styles.pickItemContent}>
          <Text style={[styles.pickItemTitle, { color: colors.text.primary }]} numberOfLines={2}>
            {activity.title}
          </Text>
          {activity.description && (
            <Text style={[styles.pickItemDesc, { color: colors.text.secondary }]} numberOfLines={2}>
              {activity.description}
            </Text>
          )}
        </View>
        <Animated.View style={[styles.pickItemToggle, { transform: [{ scale: togglePop }] }]}>
          {togglingId === activity.id ? (
            <ActivityIndicator size="small" color={GOLD} />
          ) : activity.onWheel ? (
            <View style={styles.toggleOn}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
          ) : (
            <View style={[styles.toggleOff, { borderColor: isDark ? '#374151' : '#D1D5DB' }]}>
              <Ionicons name="add" size={18} color={colors.text.secondary} />
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── Staggered how-it-works step ──
function AnimatedHowStep({
  icon,
  text,
  index,
  colors,
}: {
  icon: any;
  text: string;
  index: number;
  colors: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: index * 100,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    Animated.spring(iconBounce, {
      toValue: 1,
      delay: index * 100 + 200,
      useNativeDriver: true,
      tension: 120,
      friction: 5,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.howItWorksStep,
        {
          opacity: anim,
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
          ],
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [
            { scale: iconBounce.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.4, 1] }) },
          ],
        }}
      >
        <Ionicons name={icon} size={16} color={GOLD} />
      </Animated.View>
      <Text style={[styles.howItWorksStepText, { color: colors.text.secondary }]}>
        {text}
      </Text>
    </Animated.View>
  );
}

interface SpinningWheelTabProps {
  navigation: any;
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

  // Pick modal state
  const [pickModalVisible, setPickModalVisible] = useState(false);
  const [availableActivities, setAvailableActivities] = useState<WheelActivity[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [hasCustomWheel, setHasCustomWheel] = useState(false);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  // ── Entrance animations ──
  const headerAnim = useRef(new Animated.Value(0)).current;
  const wheelScaleAnim = useRef(new Animated.Value(0)).current;
  const spinBtnAnim = useRef(new Animated.Value(0)).current;
  const queueSectionAnim = useRef(new Animated.Value(0)).current;
  const titleWiggle = useRef(new Animated.Value(0)).current;

  // ── Looping animations ──
  const pointerBounce = useRef(new Animated.Value(0)).current;
  const spinBtnPulse = useRef(new Animated.Value(1)).current;
  const buildQueuePulse = useRef(new Animated.Value(1)).current;
  const wheelGlow = useRef(new Animated.Value(0.4)).current;
  const doItWiggle = useRef(new Animated.Value(0)).current;

  // ── Result modal ──
  const resultScale = useRef(new Animated.Value(0)).current;
  const resultTrophyBounce = useRef(new Animated.Value(0)).current;
  const resultEmojiRain = useRef(new Animated.Value(0)).current;
  const doItBtnPulse = useRef(new Animated.Value(1)).current;

  // ── Spinning icon rotation ──
  const spinIconRotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spinning) { spinIconRotate.setValue(0); return; }
    Animated.loop(
      Animated.timing(spinIconRotate, { toValue: 1, duration: 600, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [spinning]);

  // Pointer bounce loop — stop on blur
  useFocusEffect(
    useCallback(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pointerBounce, { toValue: 10, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pointerBounce, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [])
  );

  // Spin button idle pulse — stop on blur
  useFocusEffect(
    useCallback(() => {
      if (spinning) return;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(spinBtnPulse, { toValue: 1.06, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(spinBtnPulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [spinning])
  );

  // Build queue card breathing — stop on blur
  useFocusEffect(
    useCallback(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(buildQueuePulse, { toValue: 1.04, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(buildQueuePulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [])
  );

  // Wheel aura – gentle breath — stop on blur
  useFocusEffect(
    useCallback(() => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(wheelGlow, { toValue: 0.8, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(wheelGlow, { toValue: 0.4, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }, [])
  );

  // Title wiggle on entrance
  const playTitleWiggle = useCallback(() => {
    titleWiggle.setValue(0);
    Animated.sequence([
      Animated.timing(titleWiggle, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.timing(titleWiggle, { toValue: -1, duration: 80, useNativeDriver: true }),
      Animated.timing(titleWiggle, { toValue: 0.5, duration: 60, useNativeDriver: true }),
      Animated.timing(titleWiggle, { toValue: -0.5, duration: 60, useNativeDriver: true }),
      Animated.timing(titleWiggle, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  // Entrance sequence
  const playEntrance = useCallback(() => {
    headerAnim.setValue(0);
    wheelScaleAnim.setValue(0);
    spinBtnAnim.setValue(0);
    queueSectionAnim.setValue(0);

    Animated.stagger(140, [
      Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.spring(wheelScaleAnim, { toValue: 1, useNativeDriver: true, tension: 35, friction: 5 }),
      Animated.spring(spinBtnAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.spring(queueSectionAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
    ]).start(() => playTitleWiggle());
  }, []);

  // Result modal animations
  useEffect(() => {
    if (resultVisible) {
      resultScale.setValue(0);
      resultTrophyBounce.setValue(0);
      resultEmojiRain.setValue(0);
      doItBtnPulse.setValue(1);
      setShowCelebration(true);

      Animated.sequence([
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
        Animated.parallel([
          Animated.spring(resultTrophyBounce, { toValue: 1, useNativeDriver: true, tension: 100, friction: 4 }),
          Animated.timing(resultEmojiRain, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ]).start();

      // Pulse the "Do it" button
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(doItBtnPulse, { toValue: 1.05, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(doItBtnPulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      setShowCelebration(false);
    }
  }, [resultVisible]);

  // Do it button wiggle
  useEffect(() => {
    if (!resultVisible) return;
    const wiggleLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(3000),
        Animated.timing(doItWiggle, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(doItWiggle, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(doItWiggle, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(doItWiggle, { toValue: 0, duration: 60, useNativeDriver: true }),
      ])
    );
    wiggleLoop.start();
    return () => { wiggleLoop.stop(); doItWiggle.setValue(0); };
  }, [resultVisible]);

  useEffect(() => {
    const timer = setInterval(() => setResetCountdown(getTimeUntilMidnight()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const [wheelData, selectionsData] = await Promise.all([
        api.getWheelActivities().catch(() => ({ activities: [] })),
        api.getWheelSelections().catch(() => ({ count: 0 })),
      ]);
      setActivities(wheelData.activities || []);
      setSelectionCount(selectionsData.count || 0);
      setHasCustomWheel((selectionsData.count || 0) > 0);
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

  useEffect(() => {
    if (!loading && activities.length > 0) {
      playEntrance();
    }
  }, [loading, activities.length]);

  const fetchAvailable = useCallback(async () => {
    try {
      setLoadingAvailable(true);
      const data = await api.getAvailableActivities();
      setAvailableActivities(data.activities || []);
    } catch (error) {
      console.error('Failed to fetch available activities:', error);
    } finally {
      setLoadingAvailable(false);
    }
  }, []);

  const openPickModal = useCallback(() => {
    setPickModalVisible(true);
    fetchAvailable();
  }, [fetchAvailable]);

  const handleToggleActivity = useCallback(async (activity: WheelActivity) => {
    if (togglingId) return;
    setTogglingId(activity.id);
    try {
      if (activity.onWheel) {
        await api.removeFromWheel(activity.id);
        setAvailableActivities(prev =>
          prev.map(a => a.id === activity.id ? { ...a, onWheel: false } : a)
        );
        setSelectionCount(prev => prev - 1);
      } else {
        if (selectionCount >= MAX_WHEEL_SLOTS) {
          Alert.alert('Queue Full', `Your queue can hold ${MAX_WHEEL_SLOTS} activities. Remove one first.`);
          return;
        }
        await api.addToWheel(activity.id);
        setAvailableActivities(prev =>
          prev.map(a => a.id === activity.id ? { ...a, onWheel: true } : a)
        );
        setSelectionCount(prev => prev + 1);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to update wheel';
      Alert.alert('Error', msg);
    } finally {
      setTogglingId(null);
    }
  }, [togglingId, selectionCount]);

  const handleResetWheel = useCallback(() => {
    Alert.alert(
      'Clear Queue',
      'Remove all queued activities and let the wheel choose for you each day?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await api.clearWheelSelections();
              setSelectionCount(0);
              setHasCustomWheel(false);
              setAvailableActivities(prev => prev.map(a => ({ ...a, onWheel: false })));
              fetchActivities();
            } catch (error) {
              Alert.alert('Error', 'Failed to reset wheel');
            }
          },
        },
      ]
    );
  }, [fetchActivities]);

  const closePickModalAndRefresh = useCallback(() => {
    setPickModalVisible(false);
    fetchActivities();
  }, [fetchActivities]);

  const spin = useCallback(() => {
    if (spinning || activities.length === 0) return;
    setSpinning(true);
    pointerBounce.setValue(0);

    const sliceAngle = 360 / activities.length;
    const winIndex = Math.floor(Math.random() * activities.length);
    const targetSliceMiddle = winIndex * sliceAngle + sliceAngle / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 3);
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
      setTimeout(() => setResultVisible(true), 300);
    });
  }, [spinning, activities, spinAnim]);

  const handleDoItAndPost = useCallback(() => {
    if (!selectedActivity) return;
    setResultVisible(false);
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

  const groupedActivities = availableActivities.reduce<Record<string, { topic: WheelActivity['topic']; items: WheelActivity[] }>>((acc, a) => {
    const key = a.topic?.id || 'other';
    if (!acc[key]) acc[key] = { topic: a.topic, items: [] };
    acc[key].items.push(a);
    return acc;
  }, {});

  // How it works chevron rotation
  const howItWorksChevron = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(howItWorksChevron, {
      toValue: showHowItWorks ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [showHowItWorks]);

  const chevronRotation = howItWorksChevron.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // ── Loading state ──
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Animated.View style={{ transform: [{ scale: wheelScaleAnim }] }}>
          <Ionicons name="color-palette-outline" size={48} color={GOLD} />
        </Animated.View>
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Getting your activities...
        </Text>
        <BouncingDots />
      </View>
    );
  }

  // ── Empty state ──
  if (activities.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <IconBadge name="color-palette-outline" size={72} iconSize={36} />
        <View style={{ height: 16 }} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
          No Activities Yet
        </Text>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          {hasCustomWheel
            ? "You've completed all your queued activities! Add more or reset to auto."
            : 'Join some communities first, then come spin the wheel!'}
        </Text>
        <View style={styles.emptyActions}>
          <TouchableOpacity style={styles.pickButtonEmpty} onPress={openPickModal}>
            <Ionicons name="add-circle" size={20} color={GOLD} />
            <Text style={styles.pickButtonEmptyText}>Build Your Queue</Text>
          </TouchableOpacity>
          {!hasCustomWheel && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) parent.navigate('Discover');
              }}
            >
              <Text style={styles.joinButtonText}>Browse Communities</Text>
            </TouchableOpacity>
          )}
        </View>
        {renderPickModal()}
      </View>
    );
  }

  function renderPickModal() {
    return (
      <Modal
        visible={pickModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closePickModalAndRefresh}
      >
        <View style={[styles.pickModalContainer, { backgroundColor: isDark ? '#0D0D0D' : '#FFFDF5' }]}>
          <View style={[styles.pickModalHeader, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
            <TouchableOpacity onPress={closePickModalAndRefresh} style={styles.pickModalBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.pickModalTitleArea}>
              <Text style={[styles.pickModalTitle, { color: colors.text.primary }]}>
                Build Your Queue
              </Text>
              <View style={styles.slotsBadge}>
                <Text style={styles.slotsBadgeText}>
                  {selectionCount}/{MAX_WHEEL_SLOTS}
                </Text>
              </View>
            </View>
            {selectionCount > 0 && (
              <TouchableOpacity onPress={handleResetWheel} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.pickModalSubtitle, { color: colors.text.secondary }]}>
            Pick instant actions from your communities
          </Text>

          {loadingAvailable ? (
            <View style={styles.pickModalLoading}>
              <BouncingDots />
            </View>
          ) : availableActivities.length === 0 ? (
            <View style={styles.pickModalEmpty}>
              <IconBadge name="leaf-outline" size={56} iconSize={28} filled />
              <Text style={[styles.pickModalEmptyText, { color: colors.text.secondary }]}>
                Join some communities to see activities here
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.pickModalScroll} contentContainerStyle={styles.pickModalScrollContent}>
              {Object.values(groupedActivities).map(group => (
                <View key={group.topic?.id || 'other'} style={styles.communityGroup}>
                  <View style={styles.communityGroupHeader}>
                    <Text style={styles.communityGroupEmoji}>{group.topic?.iconEmoji || ''}</Text>
                    <Text style={[styles.communityGroupName, { color: colors.text.primary }]}>
                      {group.topic?.name || 'Other'}
                    </Text>
                    <View style={styles.communityGroupCount}>
                      <Text style={styles.communityGroupCountText}>{group.items.length}</Text>
                    </View>
                  </View>
                  {group.items.map((activity, idx) => (
                    <AnimatedPickItem
                      key={activity.id}
                      activity={activity}
                      index={idx}
                      isDark={isDark}
                      colors={colors}
                      onToggle={handleToggleActivity}
                      togglingId={togglingId}
                    />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          {selectionCount > 0 && (
            <View style={[styles.pickModalFooter, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={closePickModalAndRefresh}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[GOLD, GOLD_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.doneButtonGradient}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.doneButtonText}>
                    Done ({selectionCount} queued)
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Animated Header ── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
            ],
          },
        ]}
      >
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, transform: [{ rotate: titleWiggle.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-2deg', '0deg', '2deg'] }) }] }}>
          <IconBadge name="color-palette" size={36} iconSize={18} />
          <Text style={[styles.title, { color: colors.text.primary }]}>Activity Wheel</Text>
        </Animated.View>
        <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
          {hasCustomWheel
            ? 'Spin your curated activities!'
            : 'Spin to discover a fun instant action!'}
        </Text>
        {!hasCustomWheel && (
          <View style={styles.resetBadge}>
            <Ionicons name="time-outline" size={13} color={GOLD} />
            <Text style={styles.resetText}>
              New activities in {resetCountdown}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* ── Animated Wheel with particles ── */}
      <Animated.View
        style={[
          styles.wheelContainer,
          {
            opacity: wheelScaleAnim,
            transform: [
              { scale: wheelScaleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1.1, 1] }) },
            ],
          },
        ]}
      >
        {/* Soft aura */}
        <Animated.View
          style={[
            styles.wheelGlow,
            {
              opacity: wheelGlow,
              transform: [{ scale: wheelGlow.interpolate({ inputRange: [0.4, 0.8], outputRange: [1, 1.02] }) }],
            },
          ]}
        />

        {/* Bouncing pointer */}
        <Animated.View style={[styles.pointer, { transform: [{ translateY: spinning ? 0 : pointerBounce }] }]}>
          <View style={styles.pointerTriangle}>
            <Ionicons name="caret-down" size={36} color={GOLD} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.wheel,
            { transform: [{ rotate: interpolatedRotation }] },
          ]}
        >
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
            {activities.map((activity, index) => {
              const startAngle = index * sliceAngle;
              const endAngle = startAngle + sliceAngle;
              const color = SLICE_COLORS[index % SLICE_COLORS.length];
              const textColor = color === GOLD ? '#1A1A1A' : '#FFFFFF';
              const midAngle = startAngle + sliceAngle / 2;
              const textRadius = WHEEL_RADIUS * 0.6;
              const textPos = polarToCartesian(CENTER, CENTER, textRadius, midAngle);
              const lines = wrapText(activity.title, 12);

              return (
                <G key={activity.id}>
                  <Path
                    d={describeArc(CENTER, CENTER, WHEEL_RADIUS - 2, startAngle, endAngle)}
                    fill={color}
                    stroke={GOLD_DARK}
                    strokeWidth={1.5}
                  />
                  {lines.map((line, li) => (
                    <SvgText
                      key={li}
                      x={textPos.x}
                      y={textPos.y + (li - (lines.length - 1) / 2) * 12}
                      fill={textColor}
                      fontSize={9}
                      fontWeight="bold"
                      textAnchor="middle"
                      rotation={midAngle}
                      origin={`${textPos.x}, ${textPos.y}`}
                    >
                      {line}
                    </SvgText>
                  ))}
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
            <SvgCircle cx={CENTER} cy={CENTER} r={26} fill={GOLD} stroke={GOLD_DARK} strokeWidth={2} />
            <SvgText x={CENTER} y={CENTER + 5} fontSize={14} textAnchor="middle" fontWeight="bold" fill="#fff">
              GO
            </SvgText>
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* ── Animated Spin Button ── */}
      <Animated.View
        style={{
          opacity: spinBtnAnim,
          transform: [
            { translateY: spinBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            { scale: spinning ? 1 : spinBtnPulse },
          ],
        }}
      >
        <TouchableOpacity
          style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
          onPress={spin}
          disabled={spinning}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={spinning ? ['#9CA3AF', '#6B7280'] : [GOLD, GOLD_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.spinButtonInner}
          >
            <Animated.View
              style={{
                transform: [{ rotate: spinIconRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
              }}
            >
              <Ionicons name={spinning ? 'sync' : 'play'} size={20} color="#fff" />
            </Animated.View>
            <Text style={styles.spinButtonText}>
              {spinning ? 'Spinning...' : 'SPIN THE WHEEL'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Animated Queue Section ── */}
      <Animated.View
        style={[
          styles.queueSection,
          {
            opacity: queueSectionAnim,
            transform: [
              { translateY: queueSectionAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.queueHeader}>
          <View style={styles.queueTitleRow}>
            <IconBadge name="flash" size={28} iconSize={14} />
            <Text style={[styles.queueTitle, { color: colors.text.primary }]}>
              My Queue
            </Text>
            {selectionCount > 0 && (
              <View style={styles.queueCountBadge}>
                <Text style={styles.queueCountText}>{selectionCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={openPickModal}
            activeOpacity={0.7}
            style={styles.queueEditBtn}
          >
            <Ionicons name={hasCustomWheel ? 'pencil' : 'add-circle'} size={16} color={GOLD} />
            <Text style={styles.queueEditText}>
              {hasCustomWheel ? 'Edit' : 'Build'}
            </Text>
          </TouchableOpacity>
        </View>

        {hasCustomWheel ? (
          <>
            {activities.map((activity, index) => (
              <AnimatedQueueItem
                key={activity.id}
                activity={activity}
                index={index}
                isDark={isDark}
                colors={colors}
              />
            ))}
          </>
        ) : (
          <Animated.View style={{ transform: [{ scale: buildQueuePulse }] }}>
            <TouchableOpacity
              style={[styles.buildQueueCard, { backgroundColor: isDark ? '#1a1a1a' : CREAM }]}
              onPress={openPickModal}
              activeOpacity={0.7}
            >
              <View style={styles.buildQueueGradient}>
                <IconBadge name="add-circle" size={44} iconSize={22} filled />
                <Text style={[styles.buildQueueTitle, { color: colors.text.primary }]}>
                  Build Your Queue
                </Text>
                <Text style={[styles.buildQueueDesc, { color: colors.text.secondary }]}>
                  Pick instant actions from your communities
                </Text>
                <Ionicons name="arrow-forward-circle-outline" size={24} color="#DAA520" style={{ marginTop: 4 }} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>

      {/* ── How it works (animated) ── */}
      <TouchableOpacity
        style={[styles.howItWorksToggle, { backgroundColor: isDark ? '#1a1a1a' : CREAM }]}
        onPress={() => setShowHowItWorks(!showHowItWorks)}
        activeOpacity={0.7}
      >
        <View style={styles.howItWorksToggleRow}>
          <IconBadge name="help-circle" size={24} iconSize={13} />
          <Text style={[styles.howItWorksToggleText, { color: colors.text.primary }]}>
            How does this work?
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
        </Animated.View>
      </TouchableOpacity>
      {showHowItWorks && (
        <View style={[styles.howItWorksContent, { backgroundColor: isDark ? '#1a1a1a' : CREAM }]}>
          {[
            { icon: 'add-circle-outline' as const, text: 'Build your queue by picking instant actions from your communities' },
            { icon: 'shuffle-outline' as const, text: "No queue? You'll get 8 random activities daily" },
            { icon: 'play-circle-outline' as const, text: 'Spin the wheel, do the action, and post about it!' },
            { icon: 'sparkles-outline' as const, text: 'Completed activities disappear — keep spinning for new ones' },
            { icon: 'flask-outline' as const, text: 'Every activity is backed by real research' },
          ].map((item, i) => (
            <AnimatedHowStep key={i} icon={item.icon} text={item.text} index={i} colors={colors} />
          ))}
        </View>
      )}

      {/* ── Result Modal (celebration) ── */}
      <Modal
        visible={resultVisible}
        transparent
        animationType="none"
        onRequestClose={() => setResultVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.resultCard,
              { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' },
              {
                transform: [
                  { scale: resultScale.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.1, 1] }) },
                ],
                opacity: resultScale,
              },
            ]}
          >
            {/* Celebration sparkles */}
            {showCelebration && (
              <View style={styles.celebrationContainer}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <CelebrationSparkle key={i} index={i} />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setResultVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <View style={[styles.resultHeader, { backgroundColor: isDark ? '#252520' : CREAM }]}>
              <Animated.View
                style={{
                  transform: [
                    { scale: resultTrophyBounce.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.3, 1.5, 1] }) },
                    { rotate: resultTrophyBounce.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: ['0deg', '-15deg', '15deg', '-5deg', '0deg'] }) },
                  ],
                }}
              >
                <IconBadge name="trophy" size={48} iconSize={24} filled />
              </Animated.View>
              <Animated.Text
                style={[
                  styles.resultHeaderText,
                  {
                    opacity: resultTrophyBounce,
                    transform: [
                      { translateY: resultTrophyBounce.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                    ],
                  },
                ]}
              >
                Your Activity!
              </Animated.Text>
            </View>

            <ScrollView style={styles.resultBody} contentContainerStyle={styles.resultBodyContent}>
              <Text style={[styles.resultTitle, { color: colors.text.primary }]}>
                {selectedActivity?.title}
              </Text>

              {selectedActivity?.topic && (
                <View style={styles.resultCommunityTag}>
                  <Text style={styles.resultCommunityEmoji}>
                    {selectedActivity.topic.iconEmoji || ''}
                  </Text>
                  <Text style={styles.resultCommunityName}>
                    {selectedActivity.topic.name}
                  </Text>
                </View>
              )}

              {selectedActivity?.description && (
                <View style={[styles.descriptionBox, { backgroundColor: isDark ? '#252520' : '#FFF8E7' }]}>
                  <Ionicons name="document-text" size={18} color={GOLD} style={{ marginBottom: 6 }} />
                  <Text style={[styles.resultDescription, { color: colors.text.secondary }]}>
                    {selectedActivity.description}
                  </Text>
                </View>
              )}
            </ScrollView>

            <Animated.View
              style={{
                transform: [
                  { scale: doItBtnPulse },
                  { rotate: doItWiggle.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-1.5deg', '0deg', '1.5deg'] }) },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.doItButton}
                onPress={handleDoItAndPost}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[CASINO_GREEN, '#14532D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.doItButtonGradient}
                >
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={styles.doItButtonText}>Do it Now & Post!</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.spinAgainButton}
              onPress={() => {
                setResultVisible(false);
                setTimeout(spin, 300);
              }}
            >
              <Ionicons name="refresh" size={16} color={GOLD} />
              <Text style={[styles.spinAgainText, { color: GOLD }]}>
                Spin Again
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {renderPickModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 15, fontWeight: '600' },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginTop: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyActions: { marginTop: 20, gap: 12, alignItems: 'center' },
  pickButtonEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CREAM,
    borderWidth: 1.5,
    borderColor: GOLD_LIGHT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  pickButtonEmptyText: { color: GOLD, fontSize: 15, fontWeight: '600' },
  joinButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  joinButtonText: { color: GOLD, fontSize: 14, fontWeight: '600' },
  header: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  resetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: 'rgba(212, 165, 32, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  resetText: { fontSize: 12, fontWeight: '600', color: GOLD },

  // Wheel
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  wheelGlow: {
    position: 'absolute',
    width: WHEEL_SIZE + 20,
    height: WHEEL_SIZE + 20,
    borderRadius: (WHEEL_SIZE + 20) / 2,
    backgroundColor: '#F0E6CC',
  },
  pointer: {
    position: 'absolute',
    top: -12,
    zIndex: 10,
    alignItems: 'center',
  },
  pointerTriangle: {
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  wheel: { width: WHEEL_SIZE, height: WHEEL_SIZE },

  // Spin button
  spinButton: { marginHorizontal: 40, marginTop: 16, borderRadius: 28, overflow: 'hidden' },
  spinButtonDisabled: { opacity: 0.7 },
  spinButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
    borderRadius: 28,
  },
  spinButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },

  // Queue section
  queueSection: { marginTop: 28, paddingHorizontal: 16 },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  queueTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  queueTitle: { fontSize: 18, fontWeight: '900' },
  queueCountBadge: {
    backgroundColor: 'rgba(212, 165, 32, 0.15)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  queueCountText: { fontSize: 12, fontWeight: '700', color: GOLD },
  queueEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 165, 32, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  queueEditText: { fontSize: 13, fontWeight: '700', color: GOLD },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F5E6C8',
  },
  queueItemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  queueItemNumberText: { fontSize: 12, fontWeight: '800' },
  queueItemContent: { flex: 1 },
  queueItemTitle: { fontSize: 14, fontWeight: '700' },
  communityTag: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  communityTagEmoji: { fontSize: 12 },
  communityTagText: { fontSize: 11 },
  queueItemBolt: {
    marginLeft: 8,
  },

  // Build queue card
  buildQueueCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F5E6C8',
    borderStyle: 'dashed',
  },
  buildQueueGradient: {
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  buildQueueTitle: { fontSize: 17, fontWeight: '800' },
  buildQueueDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },

  // How it works
  howItWorksToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 14,
    borderRadius: 14,
  },
  howItWorksToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  howItWorksToggleText: { fontSize: 14, fontWeight: '600' },
  howItWorksContent: {
    marginHorizontal: 16,
    marginTop: 1,
    padding: 16,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    gap: 14,
  },
  howItWorksStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howItWorksStepText: { fontSize: 13, lineHeight: 18, flex: 1 },

  // Result Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '75%',
  },
  celebrationContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    zIndex: 20,
  },
  closeButton: { position: 'absolute', top: 12, right: 12, zIndex: 10, padding: 4 },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    gap: 12,
  },
  resultHeaderText: { color: GOLD, fontSize: 20, fontWeight: '800' },
  resultBody: { maxHeight: 280 },
  resultBodyContent: { padding: 20 },
  resultTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  resultCommunityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
    backgroundColor: 'rgba(212, 165, 32, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  resultCommunityEmoji: { fontSize: 16 },
  resultCommunityName: { fontSize: 13, fontWeight: '600', color: GOLD },
  descriptionBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  resultDescription: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  doItButton: { marginHorizontal: 20, marginTop: 12, borderRadius: 24, overflow: 'hidden' },
  doItButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  doItButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  spinAgainButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  spinAgainText: { fontSize: 14, fontWeight: '600' },

  // Pick Modal
  pickModalContainer: { flex: 1, paddingTop: 48 },
  pickModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickModalBack: { padding: 4 },
  pickModalTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
  },
  pickModalTitle: { fontSize: 18, fontWeight: '800' },
  slotsBadge: {
    backgroundColor: 'rgba(212, 165, 32, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  slotsBadgeText: { fontSize: 13, fontWeight: '700', color: GOLD },
  resetButton: { paddingHorizontal: 12, paddingVertical: 6 },
  resetButtonText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  pickModalSubtitle: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  pickModalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pickModalEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  pickModalEmptyText: { fontSize: 14, textAlign: 'center' },
  pickModalScroll: { flex: 1 },
  pickModalScrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  pickModalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  doneButton: { borderRadius: 24, overflow: 'hidden' },
  doneButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Community groups
  communityGroup: { marginBottom: 20 },
  communityGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  communityGroupEmoji: { fontSize: 20 },
  communityGroupName: { fontSize: 15, fontWeight: '700', flex: 1 },
  communityGroupCount: {
    backgroundColor: 'rgba(212, 165, 32, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  communityGroupCountText: { fontSize: 11, fontWeight: '700', color: GOLD },

  // Pick items
  pickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  pickItemSelected: {
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  pickItemContent: { flex: 1, marginRight: 12 },
  pickItemTitle: { fontSize: 14, fontWeight: '600' },
  pickItemDesc: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  pickItemToggle: { width: 32, alignItems: 'center' },
  toggleOn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOff: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
