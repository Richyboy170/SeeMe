import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  RefreshControl,
  Image,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_GOALS = 3;

type GoalRank = 'gold' | 'silver' | 'bronze';

const RANK_CONFIG: Record<GoalRank, {
  label: string; emoji: string; color: string;
  bgLight: string; bgDark: string;
  borderLight: string; borderDark: string;
  accentLight: string; accentDark: string;
  textColor: string;
  glowColor: string;
}> = {
  gold: {
    label: 'Gold', emoji: '\uD83E\uDD47', color: '#FFD700',
    bgLight: '#FFFDE6', bgDark: '#302B00',
    borderLight: '#FFD70080', borderDark: '#FFD70060',
    accentLight: '#FFD700', accentDark: '#FFE44D',
    textColor: '#B8960F',
    glowColor: '#FFD70050',
  },
  silver: {
    label: 'Silver', emoji: '\uD83E\uDD48', color: '#C0C0C0',
    bgLight: '#F7F7F7', bgDark: '#252525',
    borderLight: '#C0C0C080', borderDark: '#C0C0C060',
    accentLight: '#C0C0C0', accentDark: '#D8D8D8',
    textColor: '#808080',
    glowColor: '#C0C0C050',
  },
  bronze: {
    label: 'Bronze', emoji: '\uD83E\uDD49', color: '#CE8946',
    bgLight: '#FFF6ED', bgDark: '#2C1E0E',
    borderLight: '#CE894680', borderDark: '#CE894660',
    accentLight: '#CE8946', accentDark: '#E0A56A',
    textColor: '#9E6830',
    glowColor: '#CE894650',
  },
};

const RANK_ORDER: GoalRank[] = ['gold', 'silver', 'bronze'];

const RANK_DESCRIPTIONS: Record<GoalRank, { subtitle: string; hint: string }> = {
  gold:   { subtitle: 'Your #1 priority', hint: 'Your most important goal — the one you focus on every day' },
  silver: { subtitle: 'Secondary focus', hint: 'Important but not urgent — steady progress alongside your Gold' },
  bronze: { subtitle: 'Hobby & growth', hint: 'A fun side interest or skill you\'re training to explore' },
};

const SMART_TIPS = [
  { letter: 'S', word: 'Specific', tip: 'What exactly will you do?' },
  { letter: 'M', word: 'Measurable', tip: 'How will you track progress?' },
  { letter: 'A', word: 'Achievable', tip: 'Is it realistic for you?' },
  { letter: 'R', word: 'Relevant', tip: 'Does it matter to you now?' },
  { letter: 'T', word: 'Time-bound', tip: 'Set a deadline below!' },
];

interface Goal {
  id: string;
  title: string;
  rank: GoalRank;
  sortOrder: number;
  deadline: string | null;
  deadlineChangedAt: string | null;
  isActive: boolean;
  isCompleted: boolean;
  showOnProfile: boolean;
  completedAt: string | null;
  postsCount: number;
  createdAt: string;
}

interface GoalPost {
  id: string;
  originalImageUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string };
}

interface GoalsTabProps {
  navigation: any;
}

// ── Floating Particle ──
const FloatingParticle = ({ delay, color, size, left, duration }: {
  delay: number; color: string; size: number; left: number; duration: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []));
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 8, 0] });
  const opacity = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.3, 0.8, 0.8, 0.3] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1.2, 0.6] });
  return (
    <Animated.View style={{
      position: 'absolute', left: `${left}%` as any, bottom: 5,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity,
      transform: [{ translateY }, { translateX }, { scale }],
    }} />
  );
};

// ── Shimmer Effect ──
const ShimmerBadge = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []));
  const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-50, 60] });
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [0, 0.18, 0.18, 0.08, 0] });
  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {children}
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, width: 18,
        backgroundColor: 'rgba(255,255,255,1)',
        opacity: shimmerOpacity,
        transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }],
      }} />
    </View>
  );
};

// ── Metallic Accent Bar (slow, delicate shimmer) ──
const MetallicBar = ({ color }: { color: string }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(4000),
        Animated.timing(shimmer, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []));
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_WIDTH * 0.3, SCREEN_WIDTH * 1.2] });
  const opacity = shimmer.interpolate({ inputRange: [0, 0.2, 0.5, 0.8, 1], outputRange: [0, 0.3, 0.3, 0.15, 0] });
  return (
    <View style={[styles.accentBar, { backgroundColor: color, overflow: 'hidden' }]}>
      <Animated.View style={{
        position: 'absolute', top: -2, bottom: -2, width: 40,
        backgroundColor: 'rgba(255,255,255,1)',
        opacity,
        transform: [{ translateX }, { skewX: '-20deg' }],
      }} />
    </View>
  );
};

// ── Metallic Card Shine (slow, gentle diagonal sweep) ──
const MetallicCardShine = () => {
  const shine = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(5000),
        Animated.timing(shine, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []));
  const translateX = shine.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_WIDTH * 0.5, SCREEN_WIDTH * 1.5] });
  const opacity = shine.interpolate({ inputRange: [0, 0.15, 0.5, 0.85, 1], outputRange: [0, 0.06, 0.08, 0.04, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 0, bottom: 0, width: 50,
        backgroundColor: '#FFFFFF',
        opacity,
        transform: [{ translateX }, { skewX: '-18deg' }],
      }}
    />
  );
};

// ── Metallic Progress Fill (gentle glint) ──
const MetallicProgressFill = ({ color, widthPercent }: { color: string; widthPercent: number }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(4500),
        Animated.timing(shimmer, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []));
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-30, SCREEN_WIDTH * 0.6] });
  const opacity = shimmer.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, 0.35, 0.2, 0] });
  return (
    <View style={[styles.miniProgressFill, { backgroundColor: color, width: `${widthPercent}%`, overflow: 'hidden' }]}>
      <Animated.View style={{
        position: 'absolute', top: -1, bottom: -1, width: 14,
        backgroundColor: 'rgba(255,255,255,1)',
        opacity,
        transform: [{ translateX }, { skewX: '-20deg' }],
      }} />
    </View>
  );
};

// ── Animated Goal Card ──
const AnimatedGoalCard = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

// ── Animated Post Thumbnail ──
const AnimatedPostThumb = ({ post, index, navigation, colors }: {
  post: GoalPost; index: number; navigation: any; colors: any;
}) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 250, delay: index * 40, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeIn }}>
      <TouchableOpacity
        style={styles.postThumb}
        onPress={() => navigation.dispatch({ type: 'NAVIGATE', payload: { name: 'Comments', params: { postId: post.id } } })}
        activeOpacity={0.7}
      >
        {(post.thumbnailUrl || post.originalImageUrl) ? (
          <Image source={{ uri: getImageUrl(post.thumbnailUrl || post.originalImageUrl)! }} style={styles.postThumbImg} resizeMode="cover" />
        ) : (
          <View style={[styles.postThumbPlaceholder, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Rank Button (create modal) ──
const RankButton = ({ rank, isSelected, onPress, isDark }: { rank: GoalRank; isSelected: boolean; onPress: () => void; isDark: boolean }) => {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1 : 0.9)).current;
  const config = RANK_CONFIG[rank];

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: isSelected ? 1 : 0.9, tension: 80, friction: 8, useNativeDriver: true }).start();
  }, [isSelected]);

  const bg = isSelected ? (isDark ? config.bgDark : config.bgLight) : 'transparent';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[
        styles.rankBtn,
        { backgroundColor: bg, borderColor: isSelected ? config.color : 'transparent', transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={styles.rankBtnEmoji}>{config.emoji}</Text>
        <Text style={[styles.rankBtnLabel, { color: isSelected ? config.color : '#999' }]}>{config.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Animated expand chevron (defined outside to avoid remount) ──
const AnimatedChevron = ({ isExpanded, color }: { isExpanded: boolean; color: string }) => {
  const rotation = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(rotation, { toValue: isExpanded ? 1 : 0, tension: 80, friction: 10, useNativeDriver: true }).start();
  }, [isExpanded]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="chevron-down" size={16} color={color} />
    </Animated.View>
  );
};

// ── Animated Flag Icon (defined outside to avoid remount) ──
const AnimatedFlag = ({ rank }: { rank: GoalRank }) => {
  const wave = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wave, { toValue: -1, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(3000),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []));
  const rotate = wave.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-8deg', '0deg', '8deg'] });
  const accentColor = RANK_CONFIG[rank]?.color || '#10B981';
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Ionicons name="flag" size={18} color={accentColor} />
    </Animated.View>
  );
};

// ── Rank Chip (on card header, with metallic shimmer) ──
const RankChip = ({ rank, onPress, isDark }: { rank: GoalRank; onPress: () => void; isDark: boolean }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const config = RANK_CONFIG[rank];

  useFocusEffect(useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(5500),
        Animated.timing(shimmer, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []));

  const shimmerTranslate = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-40, 50] });

  const triggerBounce = () => {
    bounceAnim.setValue(0);
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -6, duration: 120, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 0, tension: 120, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  return (
    <TouchableOpacity
      onPress={() => { triggerBounce(); onPress(); }}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Animated.View style={[styles.rankChip, {
        backgroundColor: isDark ? config.bgDark : config.bgLight,
        borderColor: config.color + '60',
        transform: [{ translateY: bounceAnim }],
        overflow: 'hidden',
      }]}>
        <Text style={styles.rankChipEmoji}>{config.emoji}</Text>
        <Text style={[styles.rankChipLabel, { color: config.color }]}>{config.label}</Text>
        <Animated.View style={{
          position: 'absolute', top: -2, bottom: -2, width: 10,
          backgroundColor: 'rgba(255,255,255,0.22)',
          transform: [{ translateX: shimmerTranslate }, { skewX: '-15deg' }],
        }} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function GoalsTab({ navigation }: GoalsTabProps) {
  const { colors, isDark } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalRank, setNewGoalRank] = useState<GoalRank>('gold');
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [goalPosts, setGoalPosts] = useState<Record<string, GoalPost[]>>({});
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDeadline, setEditDeadline] = useState<Date | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishingGoal, setFinishingGoal] = useState<Goal | null>(null);
  const [finishShowOnProfile, setFinishShowOnProfile] = useState(false);
  const [showRankPicker, setShowRankPicker] = useState<string | null>(null); // goalId
  const [isArranging, setIsArranging] = useState(false);
  const [newGoalDeadline, setNewGoalDeadline] = useState<Date | null>(null);
  const [showSmartTips, setShowSmartTips] = useState(false);

  // ── Hero Animations ──
  const heroEmojiScale = useRef(new Animated.Value(0)).current;
  const heroEmojiRotate = useRef(new Animated.Value(0)).current;
  const heroTitleFade = useRef(new Animated.Value(0)).current;
  const heroTitleSlide = useRef(new Animated.Value(20)).current;
  const heroSubFade = useRef(new Animated.Value(0)).current;
  const countPop = useRef(new Animated.Value(0)).current;
  const emptyFloat = useRef(new Animated.Value(0)).current;
  const emptyFade = useRef(new Animated.Value(0)).current;
  const trophyBounce = useRef(new Animated.Value(0)).current;
  const trophyScale = useRef(new Animated.Value(0)).current;
  const modalCardScale = useRef(new Animated.Value(0.8)).current;
  const modalCardOpacity = useRef(new Animated.Value(0)).current;
  const completedHeaderFade = useRef(new Animated.Value(0)).current;
  const arrangeBtnAnim = useRef(new Animated.Value(0)).current;

  const wobbleLoop = useRef(Animated.loop(
    Animated.sequence([
      Animated.timing(heroEmojiRotate, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(heroEmojiRotate, { toValue: 0.95, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])
  )).current;
  const emptyFloatLoop = useRef(Animated.loop(
    Animated.sequence([
      Animated.timing(emptyFloat, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(emptyFloat, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])
  )).current;

  useFocusEffect(useCallback(() => {
    // Hero entrance - fast parallel instead of sequential
    Animated.parallel([
      Animated.spring(heroEmojiScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(heroEmojiRotate, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.timing(heroTitleFade, { toValue: 1, duration: 400, delay: 150, useNativeDriver: true }),
      Animated.timing(heroTitleSlide, { toValue: 0, duration: 400, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroSubFade, { toValue: 1, duration: 300, delay: 250, useNativeDriver: true }),
    ]).start();

    // Continuous emoji wobble (fewer steps)
    const wobbleTimer = setTimeout(() => {
      wobbleLoop.start();
    }, 800);

    // Empty state floating
    emptyFloatLoop.start();
    Animated.timing(emptyFade, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }).start();

    return () => {
      clearTimeout(wobbleTimer);
      wobbleLoop.stop();
      emptyFloatLoop.stop();
    };
  }, []));

  useEffect(() => {
    countPop.setValue(0);
    Animated.spring(countPop, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }).start();
  }, [goals.length]);

  useEffect(() => {
    if (completedGoals.length > 0) {
      Animated.timing(completedHeaderFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [completedGoals.length]);

  useEffect(() => {
    if (showFinishModal) {
      trophyScale.setValue(0);
      trophyBounce.setValue(0);
      modalCardScale.setValue(0.8);
      modalCardOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(modalCardScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(modalCardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(trophyScale, { toValue: 1, tension: 40, friction: 4, useNativeDriver: true }).start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(trophyBounce, { toValue: -10, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(trophyBounce, { toValue: 0, duration: 600, easing: Easing.in(Easing.bounce), useNativeDriver: true }),
          ])
        ).start();
      });
    }
  }, [showFinishModal]);

  // Arrange mode animation
  useEffect(() => {
    Animated.timing(arrangeBtnAnim, { toValue: isArranging ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [isArranging]);

  const loadGoals = async () => {
    try {
      const result = await api.getMyGoals();
      const activeGoals = (result.goals || []).map((g: any) => ({
        ...g,
        rank: g.rank || 'gold',
        sortOrder: g.sortOrder ?? 0,
      }));
      setGoals(activeGoals);
      setCompletedGoals(result.completedGoals || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadGoals(); }, []));

  const handleRefresh = useCallback(() => { setRefreshing(true); loadGoals(); }, []);

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;
    try {
      Keyboard.dismiss();
      const deadlineStr = newGoalDeadline ? newGoalDeadline.toISOString() : null;
      const result = await api.createGoal(newGoalTitle.trim(), newGoalRank, deadlineStr);
      if (result.success) {
        const newGoal = { ...result.goal, rank: result.goal.rank || newGoalRank, sortOrder: result.goal.sortOrder ?? goals.length };
        setGoals(prev => [...prev, newGoal]);
        setShowCreateModal(false);
        setNewGoalTitle('');
        setNewGoalRank('gold');
        setNewGoalDeadline(null);
        setShowSmartTips(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create goal');
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert('Remove Goal', `Remove "${goal.title}"? Posts tagged with this goal will keep their tag.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await api.deleteGoal(goal.id); setGoals(prev => prev.filter(g => g.id !== goal.id)); }
        catch { Alert.alert('Error', 'Failed to remove goal'); }
      }},
    ]);
  };

  const handleSaveEdit = async () => {
    if (!editingGoal || !editTitle.trim()) return;
    try {
      Keyboard.dismiss();
      const currentDeadline = editingGoal.deadline ? new Date(editingGoal.deadline).getTime() : null;
      const newDeadline = editDeadline ? editDeadline.getTime() : null;
      const deadlineChanged = currentDeadline !== newDeadline;
      const updateData: { title?: string; deadline?: string | null } = { title: editTitle.trim() };
      if (deadlineChanged) {
        updateData.deadline = editDeadline ? editDeadline.toISOString() : null;
      }
      const result = await api.updateGoal(editingGoal.id, updateData);
      if (result.success) {
        setGoals(prev => prev.map(g => (g.id === editingGoal.id ? {
          ...g,
          title: editTitle.trim(),
          ...(deadlineChanged ? {
            deadline: editDeadline ? editDeadline.toISOString() : null,
            deadlineChangedAt: result.goal?.deadlineChangedAt || new Date().toISOString(),
          } : {}),
        } : g)));
        setEditingGoal(null);
      }
    } catch (error: any) { Alert.alert('Error', error.response?.data?.error || 'Failed to update goal'); }
  };

  const handleExpandGoal = async (goalId: string) => {
    if (expandedGoalId === goalId) { setExpandedGoalId(null); return; }
    setExpandedGoalId(goalId);
    if (!goalPosts[goalId]) {
      try {
        const result = await api.getGoalPosts(goalId);
        setGoalPosts(prev => ({ ...prev, [goalId]: result.posts || [] }));
      } catch (error) { console.error('Error loading goal posts:', error); }
    }
  };

  const handleOpenFinishModal = (goal: Goal) => {
    setFinishingGoal(goal);
    setFinishShowOnProfile(false);
    setShowFinishModal(true);
  };

  const handleFinishGoal = async () => {
    if (!finishingGoal) return;
    try {
      const result = await api.finishGoal(finishingGoal.id, finishShowOnProfile);
      if (result.success) {
        const finished: Goal = { ...finishingGoal, isCompleted: true, showOnProfile: finishShowOnProfile, completedAt: result.goal?.completedAt || new Date().toISOString() };
        setGoals(prev => prev.filter(g => g.id !== finishingGoal.id));
        setCompletedGoals(prev => [finished, ...prev]);
        setShowFinishModal(false);
        setFinishingGoal(null);
      }
    } catch (error: any) { Alert.alert('Error', error.response?.data?.error || 'Failed to finish goal'); }
  };

  const handleDeleteCollection = (goal: Goal) => {
    Alert.alert('Delete Collection', `Delete "${goal.title}" collection? Your tagged posts will still exist but will no longer be grouped under this goal.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteGoalCollection(goal.id); setCompletedGoals(prev => prev.filter(g => g.id !== goal.id)); }
        catch { Alert.alert('Error', 'Failed to delete collection'); }
      }},
    ]);
  };

  const handleChangeRank = async (goalId: string, newRank: GoalRank) => {
    try {
      await api.updateGoal(goalId, { rank: newRank });
      setGoals(prev => prev.map(g => (g.id === goalId ? { ...g, rank: newRank } : g)));
      setShowRankPicker(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update rank');
    }
  };

  const handleMoveGoal = async (goalId: string, direction: 'up' | 'down') => {
    const idx = goals.findIndex(g => g.id === goalId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= goals.length) return;

    const newGoals = [...goals];
    [newGoals[idx], newGoals[newIdx]] = [newGoals[newIdx], newGoals[idx]];
    setGoals(newGoals);

    try {
      await api.reorderGoals(newGoals.map(g => g.id));
    } catch (error) {
      // Revert on failure
      setGoals(goals);
    }
  };

  const formatCompletedDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDeadline = (dateStr: string | null) => {
    if (!dateStr) return null;
    const deadline = new Date(dateStr);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const dateLabel = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: '#EF4444', dateLabel };
    if (diffDays === 0) return { text: 'Due today!', color: '#F59E0B', dateLabel };
    if (diffDays === 1) return { text: 'Due tomorrow', color: '#F59E0B', dateLabel };
    if (diffDays <= 7) return { text: `${diffDays}d left`, color: '#F59E0B', dateLabel };
    if (diffDays <= 30) return { text: `${diffDays}d left`, color: '#10B981', dateLabel };
    return { text: `${diffDays}d left`, color: '#10B981', dateLabel };
  };

  const getDeadlinePreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 0);
    return d;
  };

  const formatPresetDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const renderGoalCard = (goal: Goal, index: number) => {
    const isExpanded = expandedGoalId === goal.id;
    const posts = goalPosts[goal.id] || [];
    const rc = RANK_CONFIG[goal.rank || 'gold'];
    const cardBg = isDark ? rc.bgDark : rc.bgLight;
    const cardBorder = isDark ? rc.borderDark : rc.borderLight;
    const accentColor = isDark ? rc.accentDark : rc.accentLight;

    return (
      <AnimatedGoalCard key={goal.id} index={index}>
        <View style={[styles.goalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Metallic accent bar */}
          <MetallicBar color={accentColor} />
          {/* Metallic shine sweep across card */}
          <MetallicCardShine />

          {/* Goal Header */}
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleRow}>
              <AnimatedFlag rank={goal.rank || 'gold'} />
              <Text style={[styles.goalTitle, { color: colors.text.primary }]} numberOfLines={2}>
                {goal.title}
              </Text>
            </View>
            <View style={styles.goalHeaderRight}>
              {/* Rank chip - tap to change rank */}
              <RankChip rank={goal.rank || 'gold'} isDark={isDark} onPress={() => setShowRankPicker(showRankPicker === goal.id ? null : goal.id)} />
              {isArranging ? (
                <View style={styles.reorderBtns}>
                  <TouchableOpacity
                    onPress={() => handleMoveGoal(goal.id, 'up')}
                    style={[styles.reorderBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                    disabled={index === 0}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-up" size={20} color={accentColor} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMoveGoal(goal.id, 'down')}
                    style={[styles.reorderBtn, { opacity: index === goals.length - 1 ? 0.3 : 1 }]}
                    disabled={index === goals.length - 1}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-down" size={20} color={accentColor} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.goalActions}>
                  <TouchableOpacity
                    onPress={() => { setEditingGoal(goal); setEditTitle(goal.title); setEditDeadline(goal.deadline ? new Date(goal.deadline) : null); }}
                    style={styles.goalActionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="pencil" size={16} color={colors.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteGoal(goal)}
                    style={styles.goalActionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Inline Rank Picker */}
          {showRankPicker === goal.id && (
            <View style={[styles.rankPickerInline, { backgroundColor: isDark ? '#00000030' : '#ffffff80', borderColor: accentColor + '30' }]}>
              <Text style={[styles.rankPickerLabel, { color: colors.text.secondary }]}>Set rank:</Text>
              <View style={styles.rankPickerRow}>
                {RANK_ORDER.map(r => {
                  const rCfg = RANK_CONFIG[r];
                  const isActive = goal.rank === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => handleChangeRank(goal.id, r)}
                      style={[styles.rankPickerOption, {
                        backgroundColor: isActive ? (isDark ? rCfg.bgDark : rCfg.bgLight) : 'transparent',
                        borderColor: isActive ? rCfg.color : 'transparent',
                      }]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rankPickerEmoji}>{rCfg.emoji}</Text>
                      <Text style={[styles.rankPickerOptionLabel, { color: isActive ? rCfg.color : colors.text.secondary }]}>
                        {rCfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Post count with mini progress */}
          <View style={styles.goalMeta}>
            <Text style={[styles.postCount, { color: colors.text.secondary }]}>
              {goal.postsCount} post{goal.postsCount !== 1 ? 's' : ''} tagged
            </Text>
            {goal.postsCount > 0 && (
              <View style={[styles.miniProgressTrack, { backgroundColor: accentColor + '20' }]}>
                <MetallicProgressFill color={accentColor} widthPercent={Math.min(goal.postsCount * 10, 100)} />
              </View>
            )}
          </View>

          {/* Deadline display */}
          {goal.deadline && (() => {
            const dl = formatDeadline(goal.deadline);
            if (!dl) return null;
            return (
              <View style={styles.deadlineRow}>
                <Ionicons name="time-outline" size={14} color={dl.color} />
                <Text style={[styles.deadlineDateText, { color: colors.text.secondary }]}>{dl.dateLabel}</Text>
                <View style={[styles.deadlinePill, { backgroundColor: dl.color + '18' }]}>
                  <Text style={[styles.deadlinePillText, { color: dl.color }]}>{dl.text}</Text>
                </View>
              </View>
            );
          })()}

          {/* Expand/Collapse Posts */}
          {!isArranging && (
            <TouchableOpacity
              style={[styles.expandBtn, { borderTopColor: accentColor + '25' }]}
              onPress={() => handleExpandGoal(goal.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={16} color={accentColor} />
              <Text style={[styles.expandBtnText, { color: accentColor }]}>
                {isExpanded ? 'Hide Posts' : 'Show Posts'}
              </Text>
              <AnimatedChevron isExpanded={isExpanded} color={accentColor} />
            </TouchableOpacity>
          )}

          {/* Posts Grid */}
          {isExpanded && !isArranging && (
            <View style={styles.postsGrid}>
              {posts.length > 0 ? (
                posts.map((post, i) => (
                  <AnimatedPostThumb key={post.id} post={post} index={i} navigation={navigation} colors={colors} />
                ))
              ) : (
                <Text style={[styles.noPostsText, { color: colors.text.tertiary }]}>
                  No posts tagged with this goal yet
                </Text>
              )}
            </View>
          )}

          {/* Complete Goal Button */}
          {!isArranging && (
            <TouchableOpacity
              style={[styles.completeGoalBtn, { borderTopColor: accentColor + '25' }]}
              onPress={() => handleOpenFinishModal(goal)}
              activeOpacity={0.7}
            >
              <Ionicons name="trophy-outline" size={16} color={accentColor} />
              <Text style={[styles.completeGoalBtnText, { color: accentColor }]}>Complete Goal</Text>
            </TouchableOpacity>
          )}
        </View>
      </AnimatedGoalCard>
    );
  };

  const renderCompletedGoalCard = (goal: Goal, index: number) => {
    const isExpanded = expandedGoalId === goal.id;
    const posts = goalPosts[goal.id] || [];
    const rc = RANK_CONFIG[goal.rank || 'gold'];
    const cardBg = isDark ? rc.bgDark : rc.bgLight;
    const cardBorder = isDark ? rc.borderDark : rc.borderLight;
    const accentColor = isDark ? rc.accentDark : rc.accentLight;

    return (
      <AnimatedGoalCard key={goal.id} index={index}>
        <View style={[styles.goalCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <MetallicBar color={accentColor} />
          <MetallicCardShine />

          <View style={styles.goalHeader}>
            <View style={styles.goalTitleRow}>
              <Text style={{ fontSize: 16 }}>{rc.emoji}</Text>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={[styles.goalTitle, { color: colors.text.primary }]} numberOfLines={2}>
                {goal.title}
              </Text>
            </View>
            <ShimmerBadge style={[styles.completedBadge, { backgroundColor: '#10B98120' }]}>
              <Text style={styles.completedBadgeText}>Completed</Text>
            </ShimmerBadge>
          </View>

          <View style={styles.goalMeta}>
            {goal.completedAt && (
              <Text style={[styles.postCount, { color: colors.text.secondary }]}>
                Finished {formatCompletedDate(goal.completedAt)}
              </Text>
            )}
            {goal.deadline && (
              <Text style={[styles.postCount, { color: colors.text.tertiary }]}>
                Deadline: {formatCompletedDate(goal.deadline)}
              </Text>
            )}
            {goal.postsCount > 0 && (
              <Text style={[styles.postCount, { color: colors.text.secondary }]}>
                {goal.postsCount} post{goal.postsCount !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.expandBtn, { borderTopColor: colors.border }]}
            onPress={() => handleExpandGoal(goal.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={16} color={colors.text.secondary} />
            <Text style={[styles.expandBtnText, { color: colors.text.secondary }]}>
              {isExpanded ? 'Hide Posts' : 'Show Posts'}
            </Text>
            <AnimatedChevron isExpanded={isExpanded} color={colors.text.secondary} />
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.postsGrid}>
              {posts.length > 0 ? (
                posts.map((post, i) => (
                  <AnimatedPostThumb key={post.id} post={post} index={i} navigation={navigation} colors={colors} />
                ))
              ) : (
                <Text style={[styles.noPostsText, { color: colors.text.tertiary }]}>
                  No posts tagged with this goal
                </Text>
              )}
            </View>
          )}

          {isExpanded && (
            <TouchableOpacity
              style={[styles.deleteCollectionBtn, { borderTopColor: colors.border }]}
              onPress={() => handleDeleteCollection(goal)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={styles.deleteCollectionText}>Delete Collection</Text>
            </TouchableOpacity>
          )}
        </View>
      </AnimatedGoalCard>
    );
  };

  const emojiRotate = heroEmojiRotate.interpolate({ inputRange: [0, 0.95, 1, 1.05], outputRange: ['-15deg', '-5deg', '0deg', '5deg'] });
  const emptyTranslateY = emptyFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const arrangeRotate = arrangeBtnAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[1]}
        keyExtractor={() => 'goals-content'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={() => (
          <View style={styles.content}>
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.particlesContainer}>
                <FloatingParticle delay={0} color="#FFD700" size={7} left={15} duration={3000} />
                <FloatingParticle delay={300} color="#C0C0C0" size={6} left={50} duration={3200} />
                <FloatingParticle delay={600} color="#CE8946" size={7} left={80} duration={2800} />
              </View>

              <Animated.Text style={[styles.heroEmoji, {
                transform: [{ scale: heroEmojiScale }, { rotate: emojiRotate }],
              }]}>
                {'\uD83C\uDFAF'}
              </Animated.Text>
              <Animated.Text style={[styles.heroTitle, { color: colors.text.primary, opacity: heroTitleFade, transform: [{ translateY: heroTitleSlide }] }]}>
                My Goals
              </Animated.Text>
              <Animated.Text style={[styles.heroSubtitle, { color: colors.text.secondary, opacity: heroSubFade }]}>
                Rank your priorities with Gold, Silver & Bronze. Set SMART goals with deadlines!
              </Animated.Text>
            </View>

            {/* Rank Guide (when no goals yet) */}
            {goals.length === 0 && !loading && (
              <Animated.View style={[styles.rankGuide, { opacity: heroSubFade }]}>
                {RANK_ORDER.map(r => {
                  const cfg = RANK_CONFIG[r];
                  const desc = RANK_DESCRIPTIONS[r];
                  return (
                    <View key={r} style={[styles.rankGuideItem, { backgroundColor: isDark ? cfg.bgDark : cfg.bgLight, borderColor: cfg.color + '30' }]}>
                      <Text style={{ fontSize: 20 }}>{cfg.emoji}</Text>
                      <View style={styles.rankGuideText}>
                        <Text style={[styles.rankGuideName, { color: cfg.color }]}>{cfg.label} — {desc.subtitle}</Text>
                        <Text style={[styles.rankGuideHint, { color: colors.text.tertiary }]}>{desc.hint}</Text>
                      </View>
                    </View>
                  );
                })}
              </Animated.View>
            )}

            {/* Count Badge + Arrange Button */}
            <View style={styles.countRow}>
              <Animated.View style={[styles.countBadge, { backgroundColor: colors.surfaceVariant, transform: [{ scale: countPop }] }]}>
                <Text style={[styles.countText, { color: colors.text.primary }]}>
                  {goals.length}/{MAX_GOALS}
                </Text>
                <View style={styles.slotDots}>
                  {Array.from({ length: MAX_GOALS }).map((_, i) => {
                    const goalAtSlot = goals[i];
                    const dotColor = goalAtSlot ? RANK_CONFIG[goalAtSlot.rank || 'gold'].color : (isDark ? '#ffffff20' : '#00000015');
                    return <View key={i} style={[styles.slotDot, { backgroundColor: dotColor }]} />;
                  })}
                </View>
              </Animated.View>

              {goals.length > 1 && (
                <TouchableOpacity
                  onPress={() => { setIsArranging(!isArranging); setShowRankPicker(null); setExpandedGoalId(null); }}
                  style={[styles.arrangeBtn, {
                    backgroundColor: isArranging ? '#10B981' : (isDark ? '#ffffff10' : '#00000008'),
                    borderColor: isArranging ? '#10B981' : colors.border,
                  }]}
                  activeOpacity={0.7}
                >
                  <Animated.View style={{ transform: [{ rotate: arrangeRotate }] }}>
                    <Ionicons name={isArranging ? 'checkmark' : 'swap-vertical'} size={18} color={isArranging ? '#FFF' : colors.text.secondary} />
                  </Animated.View>
                  <Text style={[styles.arrangeBtnText, { color: isArranging ? '#FFF' : colors.text.secondary }]}>
                    {isArranging ? 'Done' : 'Arrange'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Active Goal Cards */}
            {goals.map((goal, i) => renderGoalCard(goal, i))}

            {/* Empty State */}
            {!loading && goals.length === 0 && completedGoals.length === 0 && (
              <Animated.View style={[styles.emptyState, { opacity: emptyFade }]}>
                <Animated.View style={{ transform: [{ translateY: emptyTranslateY }] }}>
                  <Text style={{ fontSize: 48 }}>{'\uD83E\uDD47'}</Text>
                </Animated.View>
                <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                  No goals set yet. Add your first goal and assign it a medal!
                </Text>
              </Animated.View>
            )}

            {/* Add Goal Button */}
            {goals.length < MAX_GOALS && !isArranging && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#10B981' }]}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={22} color="#FFF" />
                <Text style={styles.addBtnText}>Add Goal</Text>
              </TouchableOpacity>
            )}

            {/* Completed Goals Section */}
            {completedGoals.length > 0 && !isArranging && (
              <Animated.View style={{ opacity: completedHeaderFade }}>
                <View style={styles.completedSectionHeader}>
                  <Ionicons name="trophy" size={20} color="#FFD700" />
                  <Text style={[styles.completedSectionTitle, { color: colors.text.primary }]}>
                    Completed Goals
                  </Text>
                  <ShimmerBadge style={[styles.completedCountBadge, { backgroundColor: '#FFD70020' }]}>
                    <Text style={styles.completedCountText}>{completedGoals.length}</Text>
                  </ShimmerBadge>
                </View>
                {completedGoals.map((goal, i) => renderCompletedGoalCard(goal, i))}
              </Animated.View>
            )}
          </View>
        )}
      />

      {/* Create Goal Modal */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoid}>
          <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); setShowCreateModal(false); }}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: isDark ? '#1e1e30' : '#ffffff', maxHeight: '85%' }]}
              onPress={() => Keyboard.dismiss()}
            >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.modalEmoji}>{'\u2728'}</Text>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>New Goal</Text>

              {/* Medal Picker */}
              <Text style={[styles.medalPickerTitle, { color: colors.text.secondary }]}>Choose a rank</Text>
              <View style={styles.medalPickerRow}>
                {RANK_ORDER.map(r => (
                  <RankButton key={r} rank={r} isSelected={newGoalRank === r} isDark={isDark} onPress={() => setNewGoalRank(r)} />
                ))}
              </View>

              {/* Rank Description */}
              <View style={[styles.rankDescBox, { backgroundColor: RANK_CONFIG[newGoalRank].color + '12', borderColor: RANK_CONFIG[newGoalRank].color + '30' }]}>
                <Text style={[styles.rankDescSubtitle, { color: RANK_CONFIG[newGoalRank].color }]}>
                  {RANK_CONFIG[newGoalRank].emoji} {RANK_DESCRIPTIONS[newGoalRank].subtitle}
                </Text>
                <Text style={[styles.rankDescHint, { color: colors.text.secondary }]}>
                  {RANK_DESCRIPTIONS[newGoalRank].hint}
                </Text>
              </View>

              <TextInput
                style={[styles.modalInput, { color: colors.text.primary, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                placeholder="What do you want to achieve?"
                placeholderTextColor={colors.text.tertiary}
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
                maxLength={200}
                multiline
                autoFocus
              />
              <Text style={[styles.charCount, { color: colors.text.tertiary }]}>{newGoalTitle.length}/200</Text>

              {/* SMART Tips Toggle */}
              <TouchableOpacity
                style={[styles.smartToggle, { backgroundColor: isDark ? '#ffffff08' : '#00000005', borderColor: colors.border }]}
                onPress={() => setShowSmartTips(!showSmartTips)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14 }}>{'\uD83C\uDFAF'}</Text>
                <Text style={[styles.smartToggleText, { color: colors.text.secondary }]}>SMART Goal Tips</Text>
                <Ionicons name={showSmartTips ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.tertiary} />
              </TouchableOpacity>

              {showSmartTips && (
                <View style={[styles.smartTipsBox, { backgroundColor: isDark ? '#ffffff06' : '#F8F9FA', borderColor: colors.border }]}>
                  {SMART_TIPS.map((tip, i) => (
                    <View key={tip.letter} style={[styles.smartTipRow, i < SMART_TIPS.length - 1 && { marginBottom: 8 }]}>
                      <View style={[styles.smartLetter, { backgroundColor: RANK_CONFIG[newGoalRank].color + '20' }]}>
                        <Text style={[styles.smartLetterText, { color: RANK_CONFIG[newGoalRank].color }]}>{tip.letter}</Text>
                      </View>
                      <View style={styles.smartTipContent}>
                        <Text style={[styles.smartWord, { color: colors.text.primary }]}>{tip.word}</Text>
                        <Text style={[styles.smartTipText, { color: colors.text.tertiary }]}>{tip.tip}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Deadline Picker */}
              <View style={[styles.deadlineSection, { borderColor: colors.border }]}>
                <View style={styles.deadlineSectionHeader}>
                  <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                  <Text style={[styles.deadlineSectionTitle, { color: colors.text.secondary }]}>Set a deadline</Text>
                  {newGoalDeadline && (
                    <TouchableOpacity onPress={() => setNewGoalDeadline(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.deadlineClearText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.deadlinePresets}>
                  {[
                    { label: '1 week', days: 7 },
                    { label: '2 weeks', days: 14 },
                    { label: '1 month', days: 30 },
                    { label: '3 months', days: 90 },
                    { label: '6 months', days: 180 },
                    { label: '1 year', days: 365 },
                  ].map(preset => {
                    const presetDate = getDeadlinePreset(preset.days);
                    const isSelected = newGoalDeadline && Math.abs(newGoalDeadline.getTime() - presetDate.getTime()) < 86400000;
                    return (
                      <TouchableOpacity
                        key={preset.days}
                        onPress={() => setNewGoalDeadline(presetDate)}
                        style={[styles.deadlinePresetBtn, {
                          backgroundColor: isSelected ? RANK_CONFIG[newGoalRank].color + '20' : (isDark ? '#ffffff08' : '#00000005'),
                          borderColor: isSelected ? RANK_CONFIG[newGoalRank].color + '60' : 'transparent',
                        }]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.deadlinePresetLabel, { color: isSelected ? RANK_CONFIG[newGoalRank].color : colors.text.secondary }]}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {newGoalDeadline && (
                  <View style={[styles.deadlineSelectedRow, { backgroundColor: RANK_CONFIG[newGoalRank].color + '10' }]}>
                    <Ionicons name="calendar-outline" size={14} color={RANK_CONFIG[newGoalRank].color} />
                    <Text style={[styles.deadlineSelectedText, { color: RANK_CONFIG[newGoalRank].color }]}>
                      Due {formatPresetDate(newGoalDeadline)}, {newGoalDeadline.getFullYear()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setShowCreateModal(false); setNewGoalTitle(''); setNewGoalRank('gold'); setNewGoalDeadline(null); setShowSmartTips(false); }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCreateBtn, { backgroundColor: newGoalTitle.trim() ? RANK_CONFIG[newGoalRank].color : RANK_CONFIG[newGoalRank].color + '40' }]}
                  onPress={handleCreateGoal}
                  disabled={!newGoalTitle.trim()}
                >
                  <Text style={styles.modalCreateText}>{RANK_CONFIG[newGoalRank].emoji} Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal visible={!!editingGoal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoid}>
          <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); setEditingGoal(null); }}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: isDark ? '#1e1e30' : '#ffffff' }]}
              onPress={() => Keyboard.dismiss()}
            >
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Edit Goal</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text.primary, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                value={editTitle}
                onChangeText={setEditTitle}
                maxLength={200}
                multiline
                autoFocus
              />

              {/* Deadline Picker — only if not already changed once */}
              {editingGoal && !editingGoal.deadlineChangedAt && (
                <View style={[styles.deadlineSection, { borderColor: colors.border }]}>
                  <View style={styles.deadlineSectionHeader}>
                    <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
                    <Text style={[styles.deadlineSectionTitle, { color: colors.text.secondary }]}>Adjust deadline</Text>
                    {editDeadline && (
                      <TouchableOpacity onPress={() => setEditDeadline(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.deadlineClearText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.deadlineOnceNote, { color: colors.text.tertiary }]}>
                    You can only adjust the deadline once
                  </Text>
                  <View style={styles.deadlinePresets}>
                    {[
                      { label: '1 week', days: 7 },
                      { label: '2 weeks', days: 14 },
                      { label: '1 month', days: 30 },
                      { label: '3 months', days: 90 },
                      { label: '6 months', days: 180 },
                      { label: '1 year', days: 365 },
                    ].map(preset => {
                      const presetDate = getDeadlinePreset(preset.days);
                      const isSelected = editDeadline && Math.abs(editDeadline.getTime() - presetDate.getTime()) < 86400000;
                      const rc = RANK_CONFIG[editingGoal.rank || 'gold'];
                      return (
                        <TouchableOpacity
                          key={preset.days}
                          onPress={() => setEditDeadline(presetDate)}
                          style={[styles.deadlinePresetBtn, {
                            backgroundColor: isSelected ? rc.color + '20' : (isDark ? '#ffffff08' : '#00000005'),
                            borderColor: isSelected ? rc.color + '60' : 'transparent',
                          }]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.deadlinePresetLabel, { color: isSelected ? rc.color : colors.text.secondary }]}>
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {editDeadline && (
                    <View style={[styles.deadlineSelectedRow, { backgroundColor: RANK_CONFIG[editingGoal.rank || 'gold'].color + '10' }]}>
                      <Ionicons name="calendar-outline" size={14} color={RANK_CONFIG[editingGoal.rank || 'gold'].color} />
                      <Text style={[styles.deadlineSelectedText, { color: RANK_CONFIG[editingGoal.rank || 'gold'].color }]}>
                        Due {formatPresetDate(editDeadline)}, {editDeadline.getFullYear()}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Show locked message if deadline was already changed */}
              {editingGoal && editingGoal.deadlineChangedAt && editingGoal.deadline && (
                <View style={[styles.deadlineSection, { borderColor: colors.border }]}>
                  <View style={styles.deadlineSectionHeader}>
                    <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} />
                    <Text style={[styles.deadlineSectionTitle, { color: colors.text.tertiary }]}>Deadline locked</Text>
                  </View>
                  <Text style={[styles.deadlineOnceNote, { color: colors.text.tertiary }]}>
                    Deadline was already adjusted and cannot be changed again
                  </Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                  onPress={() => { Keyboard.dismiss(); setEditingGoal(null); }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCreateBtn, { backgroundColor: editTitle.trim() ? '#10B981' : '#10B98140' }]}
                  onPress={handleSaveEdit}
                  disabled={!editTitle.trim()}
                >
                  <Text style={styles.modalCreateText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Finish Goal Modal */}
      <Modal visible={showFinishModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setShowFinishModal(false); setFinishingGoal(null); }}>
          <Animated.View style={{ transform: [{ scale: modalCardScale }], opacity: modalCardOpacity }}>
            <Pressable
              style={[styles.finishModalCard, { backgroundColor: isDark ? '#1e1e30' : '#ffffff' }]}
              onPress={() => {}}
            >
              <View style={styles.trophyParticles}>
                <FloatingParticle delay={0} color="#FFD700" size={6} left={25} duration={2500} />
                <FloatingParticle delay={300} color="#C0C0C0" size={6} left={50} duration={2800} />
                <FloatingParticle delay={600} color="#CE8946" size={6} left={75} duration={2600} />
              </View>

              <Animated.Text style={[styles.finishEmoji, {
                transform: [{ scale: trophyScale }, { translateY: trophyBounce }],
              }]}>
                {finishingGoal ? RANK_CONFIG[finishingGoal.rank || 'gold'].emoji : '\uD83C\uDFC6'}
              </Animated.Text>

              <Text style={[styles.finishTitle, { color: colors.text.primary }]}>Mark as complete?</Text>
              <Text style={styles.finishUndoWarning}>This action cannot be undone</Text>

              {finishingGoal && (
                <View style={styles.finishGoalRow}>
                  <Text style={{ fontSize: 18 }}>{RANK_CONFIG[finishingGoal.rank || 'gold'].emoji}</Text>
                  <Text style={[styles.finishGoalName, { color: colors.text.primary }]} numberOfLines={2}>
                    "{finishingGoal.title}"
                  </Text>
                </View>
              )}

              <Text style={[styles.finishNote, { color: colors.text.tertiary }]}>
                This can't be undone. Your posts stay.
              </Text>

              <TouchableOpacity
                style={[styles.profileToggleRow, {
                  backgroundColor: finishShowOnProfile ? '#10B98115' : (isDark ? '#ffffff08' : '#00000005'),
                  borderColor: finishShowOnProfile ? '#10B98150' : colors.border,
                }]}
                onPress={() => setFinishShowOnProfile(prev => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons name={finishShowOnProfile ? 'eye' : 'eye-off-outline'} size={20} color={finishShowOnProfile ? '#10B981' : colors.text.tertiary} />
                <Text style={[styles.profileToggleText, { color: colors.text.primary }]}>Show on my profile</Text>
                <View style={[styles.toggleTrack, { backgroundColor: finishShowOnProfile ? '#10B981' : (isDark ? '#555' : '#ccc') }]}>
                  <View style={[styles.toggleThumb, { transform: [{ translateX: finishShowOnProfile ? 18 : 2 }] }]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.finishBtn, { backgroundColor: finishingGoal ? RANK_CONFIG[finishingGoal.rank || 'gold'].color : '#10B981' }]} onPress={handleFinishGoal} activeOpacity={0.8}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.finishBtnText}>Complete Goal</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.finishCancelBtn} onPress={() => { setShowFinishModal(false); setFinishingGoal(null); }} activeOpacity={0.7}>
                <Text style={[styles.finishCancelText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const THUMB_SIZE = (SCREEN_WIDTH - 48 - 16) / 3;

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoid: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 24, position: 'relative' },
  particlesContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroEmoji: { fontSize: 52, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },

  // Count Badge + Arrange
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 },
  countBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  countText: { fontSize: 15, fontWeight: '700' },
  slotDots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  slotDot: { width: 8, height: 8, borderRadius: 4 },
  arrangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  arrangeBtnText: { fontSize: 13, fontWeight: '600' },

  // Goal Card
  goalCard: { borderRadius: 16, borderWidth: 1.5, marginBottom: 12, overflow: 'hidden' },
  accentBar: { height: 4, width: '100%' },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 14, paddingBottom: 8 },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8, marginRight: 8 },
  goalTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  goalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalActions: { flexDirection: 'row', gap: 6 },
  goalActionBtn: { padding: 4 },
  goalMeta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 10, gap: 10 },
  postCount: { fontSize: 12, fontWeight: '500' },
  miniProgressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 2 },

  // Rank Chip (on card)
  rankChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  rankChipEmoji: { fontSize: 14 },
  rankChipLabel: { fontSize: 11, fontWeight: '700' },

  // Rank Picker Inline
  rankPickerInline: { marginHorizontal: 14, marginBottom: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  rankPickerLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  rankPickerRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  rankPickerOption: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  rankPickerEmoji: { fontSize: 24 },
  rankPickerOptionLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // Reorder buttons
  reorderBtns: { flexDirection: 'column', gap: 2 },
  reorderBtn: { padding: 2, borderRadius: 6, alignItems: 'center' },

  // Expand/Collapse
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1 },
  expandBtnText: { fontSize: 13, fontWeight: '500' },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 4 },
  postThumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 10, overflow: 'hidden' },
  postThumbImg: { width: '100%', height: '100%' },
  postThumbPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  noPostsText: { fontSize: 13, textAlign: 'center', paddingVertical: 16, width: '100%' },
  completeGoalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderTopWidth: 1 },
  completeGoalBtnText: { fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },

  // Add button
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 400, borderRadius: 22, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  modalEmoji: { fontSize: 36, textAlign: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
  modalCreateBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalCreateText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Rank Picker (create modal)
  medalPickerTitle: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  medalPickerRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 18 },
  rankBtn: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 2, minWidth: 80 },
  rankBtnEmoji: { fontSize: 28 },
  rankBtnLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Completed Goals
  completedSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 14 },
  completedSectionTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  completedCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  completedCountText: { fontSize: 13, fontWeight: '700', color: '#FFD700' },
  completedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  completedBadgeText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  deleteCollectionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1 },
  deleteCollectionText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

  // Finish Modal
  finishModalCard: { width: '100%', maxWidth: 340, borderRadius: 24, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
  trophyParticles: { position: 'absolute', top: 10, left: 0, right: 0, height: 60 },
  finishEmoji: { fontSize: 52, marginBottom: 12 },
  finishTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  finishUndoWarning: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginBottom: 10 },
  finishGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  finishGoalName: { fontSize: 15, fontWeight: '600', fontStyle: 'italic', textAlign: 'center', flex: 1 },
  finishNote: { fontSize: 13, marginBottom: 20 },
  profileToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, width: '100%', marginBottom: 20 },
  profileToggleText: { fontSize: 15, fontWeight: '600', flex: 1 },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  finishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, width: '100%', marginBottom: 10 },
  finishBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  finishCancelBtn: { paddingVertical: 10 },
  finishCancelText: { fontSize: 15, fontWeight: '600' },

  // Rank Guide (hero)
  rankGuide: { marginBottom: 12, gap: 8 },
  rankGuideItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  rankGuideText: { flex: 1 },
  rankGuideName: { fontSize: 13, fontWeight: '700' },
  rankGuideHint: { fontSize: 11, marginTop: 2, lineHeight: 15 },

  // Rank Description (in create modal)
  rankDescBox: { marginBottom: 14, padding: 12, borderRadius: 12, borderWidth: 1 },
  rankDescSubtitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  rankDescHint: { fontSize: 12, lineHeight: 17 },

  // SMART Tips
  smartToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  smartToggleText: { fontSize: 13, fontWeight: '600', flex: 1 },
  smartTipsBox: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  smartTipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  smartLetter: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  smartLetterText: { fontSize: 14, fontWeight: '800' },
  smartTipContent: { flex: 1 },
  smartWord: { fontSize: 13, fontWeight: '700' },
  smartTipText: { fontSize: 11, marginTop: 1 },

  // Deadline Picker
  deadlineSection: { marginBottom: 16, paddingTop: 12, borderTopWidth: 1 },
  deadlineSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  deadlineSectionTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  deadlineClearText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  deadlineOnceNote: { fontSize: 11, marginBottom: 8, marginLeft: 22 },
  deadlinePresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deadlinePresetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  deadlinePresetLabel: { fontSize: 12, fontWeight: '600' },
  deadlineSelectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginTop: 10 },
  deadlineSelectedText: { fontSize: 13, fontWeight: '600' },

  // Deadline on card
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 8 },
  deadlineDateText: { fontSize: 12, fontWeight: '500' },
  deadlinePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  deadlinePillText: { fontSize: 11, fontWeight: '700' },
});
