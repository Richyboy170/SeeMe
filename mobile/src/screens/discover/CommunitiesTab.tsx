import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, RefreshControl,
  ActivityIndicator, useWindowDimensions, Animated, Easing, Pressable, Modal, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import CapsuleCommunityCard from '../../components/CapsuleCommunityCard';

const PAGE_SIZE = 8;

const INTEREST_CATEGORIES = [
  { id: 'creative', name: 'Creative', icon: '🎨', description: 'Art, music, writing', activeColor: '#EC4899', activeBg: '#FCE7F3', darkActiveBg: '#4A1942' },
  { id: 'hobbies', name: 'Hobbies', icon: '🎯', description: 'Games, collecting, DIY', activeColor: '#F97316', activeBg: '#FFF7ED', darkActiveBg: '#431407' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🏠', description: 'Food, travel, fashion', activeColor: '#14B8A6', activeBg: '#F0FDFA', darkActiveBg: '#042F2E' },
  { id: 'fitness', name: 'Fitness', icon: '💪', description: 'Exercise, sports, health', activeColor: '#EF4444', activeBg: '#FEF2F2', darkActiveBg: '#450A0A' },
  { id: 'learning', name: 'Learning', icon: '📚', description: 'Languages, skills, education', activeColor: '#3B82F6', activeBg: '#EFF6FF', darkActiveBg: '#172554' },
  { id: 'tech', name: 'Tech', icon: '💻', description: 'Programming, gadgets, gaming', activeColor: '#8B5CF6', activeBg: '#F5F3FF', darkActiveBg: '#2E1065' },
];

interface PreviewPost { id: string; processedImageUrl: string | null; originalImageUrl: string | null; coinsReceived: number; }
interface Topic { id: string; name: string; slug: string; description: string | null; iconEmoji: string | null; iconImageUrl: string | null; category: string; type?: 'community' | 'private' | 'broadcast'; followerCount: number; postCount: number; weeklyPostCount: number; isFollowing: boolean; previewPosts?: PreviewPost[]; }

/* ── Filter chip – native driver, instant colors ── */
const FilterChip = React.memo(function FilterChip({ label, icon, isActive, onPress, colors, activeColor, activeBg }: {
  label: string; icon: string; isActive: boolean; onPress: () => void; colors: any; activeColor?: string; activeBg?: string;
}) {
  const ac = activeColor || '#7C3AED';
  const abg = activeBg || '#EDE9FE';
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = useCallback(() => Animated.spring(scale, { toValue: 0.92, friction: 8, tension: 300, useNativeDriver: true }).start(), [scale]);
  const pressOut = useCallback(() => Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start(), [scale]);

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[styles.chipBase, { backgroundColor: isActive ? abg : colors.background, borderColor: isActive ? ac : colors.border, transform: [{ scale }] }]}>
        <Ionicons name={icon as any} size={14} color={isActive ? ac : colors.text.secondary} style={chipIconStyle} />
        <Text style={[styles.chipText, { color: isActive ? ac : colors.text.secondary }, isActive && chipActiveWeight]}>{label}</Text>
        {isActive && <Ionicons name="checkmark-circle" size={14} color={ac} style={chipCheckStyle} />}
      </Animated.View>
    </Pressable>
  );
});
const chipIconStyle = { marginRight: 4 } as const;
const chipCheckStyle = { marginLeft: 4 } as const;
const chipActiveWeight = { fontWeight: '600' as const };

/* ── Interest choice – native driver, instant colors ── */
const InterestChoice = React.memo(function InterestChoice({ item, isSelected, onToggle, colors, isDark, enterAnim, index }: {
  item: typeof INTEREST_CATEGORIES[number]; isSelected: boolean; onToggle: () => void; colors: any; isDark: boolean; enterAnim: Animated.Value; index: number;
}) {
  const ac = item.activeColor;
  const abg = isDark ? item.darkActiveBg : item.activeBg;
  const scale = useRef(new Animated.Value(1)).current;
  const iconPop = useRef(new Animated.Value(1)).current;
  const prev = useRef(isSelected);

  useEffect(() => {
    if (isSelected && !prev.current) {
      Animated.sequence([
        Animated.timing(iconPop, { toValue: 1.35, duration: 100, useNativeDriver: true }),
        Animated.spring(iconPop, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ]).start();
    }
    prev.current = isSelected;
  }, [isSelected]);

  const pressIn = () => Animated.spring(scale, { toValue: 0.97, friction: 8, tension: 300, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();

  const d = index * 0.12;
  const ty = enterAnim.interpolate({ inputRange: [0, Math.max(d, 0.01), Math.min(d + 0.4, 1), 1], outputRange: [24, 24, 0, 0] });
  const op = enterAnim.interpolate({ inputRange: [0, Math.max(d, 0.01), Math.min(d + 0.35, 1), 1], outputRange: [0, 0, 1, 1] });

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>
      <Pressable onPress={onToggle} onPressIn={pressIn} onPressOut={pressOut}>
        <Animated.View style={[styles.choiceCard, { backgroundColor: isSelected ? abg : (colors.card || colors.background), borderColor: isSelected ? ac : colors.border, transform: [{ scale }] }]}>
          <Animated.View style={{ transform: [{ scale: iconPop }] }}>
            <Text style={styles.choiceIcon}>{item.icon}</Text>
          </Animated.View>
          <View style={styles.choiceTextGroup}>
            <Text style={[styles.choiceName, { color: isSelected ? ac : colors.text.primary }]}>{item.name}</Text>
            <Text style={[styles.choiceDesc, { color: colors.text.secondary }]} numberOfLines={1}>{item.description}</Text>
          </View>
          <View style={[styles.choiceCheckbox, { backgroundColor: isSelected ? ac : 'transparent', borderColor: isSelected ? ac : colors.border }]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

/* ── Animated card wrapper – fade + spring-up on mount ── */
function AnimatedCard({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const spring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(spring, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{
      opacity,
      transform: [
        { translateY: spring.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
        { scale: spring.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] }) },
      ],
    }}>
      {children}
    </Animated.View>
  );
}

/* ── Floating empty state ── */
const AnimatedEmptyState = React.memo(function AnimatedEmptyState({ message, colors }: { message: string; colors: any }) {
  const float = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[styles.emptyState, { opacity: fadeIn }]}>
      <Animated.View style={[styles.emptyCircle, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] }]}>
        <Text style={styles.emptyEmoji}>🔭</Text>
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No communities found</Text>
      <Text style={[styles.emptySub, { color: colors.text.secondary }]}>{message}</Text>
    </Animated.View>
  );
});

interface GuideRefs { typeFiltersRef?: React.RefObject<View | null>; interestsButtonRef?: React.RefObject<View | null>; communityGridRef?: React.RefObject<View | null>; }
interface CommunitiesTabProps { searchQuery: string; navigation: any; guideRefs?: GuideRefs; }

export default function CommunitiesTab({ searchQuery, navigation, guideRefs }: CommunitiesTabProps) {
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth >= 768 ? 4 : 2;
  const cardWidth = (screenWidth - 32 - (numColumns - 1) * 12) / numColumns;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [draftInterests, setDraftInterests] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interestsLoaded, setInterestsLoaded] = useState(false);
  const cancelRef = useRef(0);
  const initialLoadDone = useRef(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(600)).current;
  const enterAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { loadInitial(); }, []));
  useEffect(() => {
    if (!interestsLoaded) return;
    // Skip the first trigger since loadInitial already loaded topics
    if (!initialLoadDone.current) { initialLoadDone.current = true; return; }
    loadTopics();
  }, [searchQuery, selectedType, interests, interestsLoaded]);

  const loadInitial = async () => {
    try {
      // Load interests + first topics batch in parallel
      const [interestsRes, topicsRes] = await Promise.all([
        api.getInterests().catch(() => ({ interests: [] })),
        api.get(`/topics?${buildParams(0)}`).catch(() => ({ data: { topics: [] } })),
      ]);
      const loadedInterests = interestsRes.interests || [];
      setInterests(loadedInterests);
      const first: Topic[] = topicsRes.data.topics || [];
      setTopics(first);
      setLoading(false);
      setRefreshing(false);
      setInterestsLoaded(true);
      // Background-load remaining batches
      const token = cancelRef.current;
      let off = first.length, more = first.length >= PAGE_SIZE;
      while (more && cancelRef.current === token) {
        const r2 = await api.get(`/topics?${buildParams(off)}`);
        if (cancelRef.current !== token) return;
        const b: Topic[] = r2.data.topics || [];
        if (!b.length) break;
        setTopics(prev => [...prev, ...b]); off += b.length; more = b.length >= PAGE_SIZE;
      }
    } catch (e) { console.error('Error loading initial:', e); setLoading(false); setRefreshing(false); setInterestsLoaded(true); }
  };

  const openModal = () => {
    setDraftInterests([...interests]);
    overlayOpacity.setValue(0); sheetTranslate.setValue(600); enterAnim.setValue(0);
    setShowModal(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(sheetTranslate, { toValue: 0, friction: 10, tension: 60, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(enterAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    });
  };

  const closeModal = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetTranslate, { toValue: 600, duration: 220, useNativeDriver: true }),
    ]).start(() => { setShowModal(false); cb?.(); });
  };

  const toggleDraft = (id: string) => setDraftInterests(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const saveAndClose = () => {
    closeModal(async () => {
      setInterests(draftInterests);
      try { await api.updateInterests(draftInterests); } catch (e) { console.error('Error saving interests:', e); }
    });
  };

  const buildParams = (offset: number) => {
    const p = new URLSearchParams();
    p.append('limit', String(PAGE_SIZE)); p.append('offset', String(offset));
    if (interests.length > 0) p.append('category', interests.join(','));
    if (searchQuery) p.append('search', searchQuery);
    if (selectedType) p.append('type', selectedType);
    return p.toString();
  };

  const loadTopics = async () => {
    const token = ++cancelRef.current;
    try {
      setLoading(true);
      const r = await api.get(`/topics?${buildParams(0)}`);
      if (cancelRef.current !== token) return;
      const first: Topic[] = r.data.topics || [];
      setTopics(first); setLoading(false); setRefreshing(false);
      let off = first.length, more = r.data.hasMore ?? first.length >= PAGE_SIZE;
      while (more && cancelRef.current === token) {
        const r2 = await api.get(`/topics?${buildParams(off)}`);
        if (cancelRef.current !== token) return;
        const b: Topic[] = r2.data.topics || [];
        if (!b.length) break;
        setTopics(prev => [...prev, ...b]); off += b.length; more = r2.data.hasMore ?? b.length >= PAGE_SIZE;
      }
    } catch (e) { console.error('Error loading topics:', e); setLoading(false); setRefreshing(false); }
  };

  const handleFollowTopic = useCallback(async (topicId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) await api.delete(`/topics/${topicId}/follow`); else await api.post(`/topics/${topicId}/follow`);
      setTopics(prev => prev.map(t => t.id === topicId ? { ...t, isFollowing: !isFollowing } : t));
    } catch (e) { console.error('Error toggling follow:', e); }
  }, []);

  const interestsSummary = useMemo(() => interests.length === 0 ? 'Choose your interests'
    : interests.map(id => INTEREST_CATEGORIES.find(c => c.id === id)).filter(Boolean).map(c => `${c!.icon} ${c!.name}`).join(', '), [interests]);

  const TYPE_FILTERS = [
    { key: null, label: 'All', icon: 'apps-outline', activeColor: '#7C3AED', activeBg: '#EDE9FE', darkActiveBg: '#2E1065' },
    { key: 'community', label: 'Communities', icon: 'people-outline', activeColor: '#3B82F6', activeBg: '#DBEAFE', darkActiveBg: '#172554' },
    { key: 'private', label: 'Private', icon: 'lock-closed-outline', activeColor: '#EF4444', activeBg: '#FEE2E2', darkActiveBg: '#450A0A' },
    { key: 'broadcast', label: 'Channels', icon: 'megaphone-outline', activeColor: '#F59E0B', activeBg: '#FEF3C7', darkActiveBg: '#422006' },
  ] as const;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View ref={guideRefs?.typeFiltersRef} collapsable={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {TYPE_FILTERS.map(tf => (
            <FilterChip key={tf.label} label={tf.label} icon={tf.icon}
              isActive={selectedType === tf.key || (!tf.key && !selectedType)}
              onPress={() => setSelectedType(selectedType === tf.key ? null : tf.key)}
              colors={colors} activeColor={tf.activeColor} activeBg={isDark ? tf.darkActiveBg : tf.activeBg} />
          ))}
        </ScrollView>
      </View>
      <View ref={guideRefs?.interestsButtonRef} collapsable={false} style={styles.btnRow}>
        <TouchableOpacity style={[styles.intBtn, { backgroundColor: interests.length > 0 ? (isDark ? '#2E1065' : '#EDE9FE') : colors.background, borderColor: interests.length > 0 ? '#7C3AED' : colors.border }]} onPress={openModal} activeOpacity={0.7}>
          <Ionicons name={interests.length > 0 ? 'heart' : 'heart-outline'} size={18} color={interests.length > 0 ? '#7C3AED' : colors.text.secondary} />
          <Text style={[styles.intBtnText, { color: interests.length > 0 ? '#7C3AED' : colors.text.secondary }, interests.length > 0 && { fontWeight: '600' }]} numberOfLines={1}>{interestsSummary}</Text>
          {interests.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{interests.length}</Text></View>}
          <Ionicons name="chevron-down" size={16} color={interests.length > 0 ? '#7C3AED' : colors.text.tertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Topic }) => (
    <AnimatedCard><CapsuleCommunityCard topic={item} onPress={() => navigation.navigate('TopicPage', { topicSlug: item.slug })} onToggleFollow={handleFollowTopic} cardWidth={cardWidth} /></AnimatedCard>
  );

  const keyExtractor = useCallback((item: Topic) => item.id, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadTopics(); }, []);
  const columnGap = useMemo(() => ({ gap: 12, marginBottom: 12 }), []);

  const emptyComponent = useMemo(() => (
    <AnimatedEmptyState
      message={searchQuery ? 'Try a different search term' : interests.length > 0 ? 'Try selecting different interests' : 'Be the first to create one!'}
      colors={colors}
    />
  ), [searchQuery, interests.length, colors]);

  if (loading) return (
    <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color="#7C3AED" />
      <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading communities...</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }} ref={guideRefs?.communityGridRef} collapsable={false}>
      <FlatList key={`cols-${numColumns}`} data={topics}
        renderItem={renderItem}
        keyExtractor={keyExtractor} numColumns={numColumns}
        columnWrapperStyle={columnGap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.topicsList} ListHeaderComponent={renderHeader}
        ListEmptyComponent={emptyComponent}
        maxToRenderPerBatch={6}
        windowSize={5}
        initialNumToRender={6}
      />

      <Modal visible={showModal} animationType="none" transparent statusBarTranslucent onRequestClose={() => closeModal()}>
        <View style={styles.modalWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: overlayOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => closeModal()} />
          </Animated.View>
          <Animated.View style={[styles.sheet, { backgroundColor: colors.background, transform: [{ translateY: sheetTranslate }] }]}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>What are you interested in?</Text>
            <Text style={[styles.sheetSub, { color: colors.text.secondary }]}>Tap to select — we'll show communities that match</Text>
            <ScrollView style={styles.choiceScroll} contentContainerStyle={styles.choiceList} showsVerticalScrollIndicator={false}>
              {INTEREST_CATEGORIES.map((item, i) => (
                <InterestChoice key={item.id} item={item} isSelected={draftInterests.includes(item.id)}
                  onToggle={() => toggleDraft(item.id)} colors={colors} isDark={isDark} enterAnim={enterAnim} index={i} />
              ))}
            </ScrollView>
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              {draftInterests.length > 0 && <TouchableOpacity onPress={() => setDraftInterests([])} style={styles.clearBtn}><Text style={[styles.clearText, { color: colors.text.secondary }]}>Clear all</Text></TouchableOpacity>}
              <TouchableOpacity style={styles.doneBtn} onPress={saveAndClose} activeOpacity={0.8}>
                <Text style={styles.doneText}>{draftInterests.length === 0 ? 'Show All' : `Done (${draftInterests.length} selected)`}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  headerContainer: { marginBottom: 8 },
  filterRow: { maxHeight: 50, marginTop: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  chipBase: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 14 },
  btnRow: { paddingHorizontal: 16, marginTop: 10 },
  intBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  intBtnText: { fontSize: 14, flex: 1 },
  badge: { backgroundColor: '#7C3AED', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 34, maxHeight: '80%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '700', paddingHorizontal: 20 },
  sheetSub: { fontSize: 14, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  choiceScroll: { flexGrow: 0 },
  choiceList: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  choiceCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  choiceIcon: { fontSize: 28 },
  choiceTextGroup: { flex: 1 },
  choiceName: { fontSize: 16, fontWeight: '600' },
  choiceDesc: { fontSize: 13, marginTop: 2 },
  choiceCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: 1, marginTop: 8, paddingTop: 16, paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14 },
  doneBtn: { backgroundColor: '#7C3AED', borderRadius: 24, paddingVertical: 14, width: '100%', alignItems: 'center' },
  doneText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  topicsList: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(124,58,237,0.1)', justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 4, textAlign: 'center' },
});
