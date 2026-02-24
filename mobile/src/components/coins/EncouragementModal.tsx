import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../Avatar';
import KindnessCoin from './KindnessCoin';
import SkyCoinIcon, { SKY_COIN_COLORS } from './SkyCoinIcon';
import { AvatarCustomizations } from '../AvatarRenderer';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG_PARTICLE_COUNT = 18;
const EFFECT_PARTICLE_COUNT = 8;

// ─── Types ───────────────────────────────────────────────────────────

interface ReceivedCoinItem {
  id: string;
  fromUserId: string;
  fromUsername: string;
  amount: number;
  message: string | null;
  collected: boolean;
  createdAt: string;
  fromActiveAvatar?: {
    id: string;
    style: string;
    customizations: AvatarCustomizations;
  } | null;
}

interface EncouragementModalProps {
  visible: boolean;
  coins: ReceivedCoinItem[];
  onClose: () => void;
}

// ─── Background floating particles ──────────────────────────────────

function createBgParticleConfig(index: number) {
  const isCoin = index % 3 !== 0;
  const startX = Math.random() * SCREEN_WIDTH;
  const sway = (Math.random() - 0.5) * 60;
  const duration = 3000 + Math.random() * 3000;
  const delay = Math.random() * 3000;
  const size = 14 + Math.random() * 12;
  return { isCoin, startX, sway, duration, delay, size };
}

function FloatingParticle({ config, index }: { config: ReturnType<typeof createBgParticleConfig>; index: number }) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT + 40)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      translateY.setValue(SCREEN_HEIGHT + 40);
      translateX.setValue(0);
      opacity.setValue(0);
      rotation.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, { toValue: -60, duration: config.duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(translateX, { toValue: config.sway, duration: config.duration / 2, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -config.sway * 0.5, duration: config.duration / 2, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
          Animated.delay(config.duration - 1200),
          Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.timing(rotation, { toValue: 1, duration: config.duration, useNativeDriver: true }),
      ]).start(() => run());
    };
    const t = setTimeout(run, config.delay);
    return () => clearTimeout(t);
  }, []);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', config.isCoin ? '15deg' : '360deg'] });

  return (
    <Animated.View pointerEvents="none" style={[styles.bgParticle, { left: config.startX, transform: [{ translateY }, { translateX }, { rotate: spin }], opacity }]}>
      {config.isCoin ? (
        <KindnessCoin size={config.size + 2} />
      ) : (
        <SkyCoinIcon size={config.size + 4} />
      )}
    </Animated.View>
  );
}

// ─── Tutorial arrow hint ─────────────────────────────────────────────

function TutorialHint({ visible }: { visible: boolean }) {
  const bounce = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      opacity.setValue(1);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, { toValue: 6, duration: 450, useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 0, duration: 450, useNativeDriver: true }),
        ])
      );
      loopRef.current = loop;
      loop.start();
    } else {
      loopRef.current?.stop();
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    }
    return () => { loopRef.current?.stop(); };
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.tutorialArrow, { opacity, transform: [{ translateY: bounce }] }]}
    >
      <Ionicons name="chevron-down" size={16} color="#FBBF24" />
      <Text style={styles.tutorialText}>Tap!</Text>
      <Ionicons name="chevron-down" size={16} color="#FBBF24" />
    </Animated.View>
  );
}

// ─── Effect particle icon helpers ────────────────────────────────────

const HEART_COLORS = ['#F91880', '#EC4899', '#F472B6', '#DB2777', '#F91880', '#EC4899', '#F472B6', '#DB2777'];
const CRUMB_COLORS = ['#FBBF24', '#F59E0B', '#FDE68A', '#D97706', '#FCD34D', '#EAB308', '#FBBF24', '#FDE68A'];
const SPARKLE_COLORS = ['#FBBF24', '#F59E0B', '#FDE68A', '#FBBF24', '#F59E0B', '#FDE68A', '#FBBF24', '#F59E0B'];
const CONFETTI_COLORS = ['#F91880', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FCD34D', '#6EE7B7'];
const STAR_COLORS = ['#FBBF24', '#F59E0B', SKY_COIN_COLORS.primary, '#FBBF24', '#F59E0B', SKY_COIN_COLORS.primary, '#FBBF24', '#F59E0B'];

function EffectIcon({ type, index }: { type: number; index: number }) {
  switch (type) {
    case 0: return <View style={[styles.crumb, { backgroundColor: CRUMB_COLORS[index] }]} />;
    case 1: return <KindnessCoin size={16} />;
    case 2: return <Ionicons name="sparkles" size={16} color={SPARKLE_COLORS[index]} />;
    case 3: return <View style={[styles.confetti, { backgroundColor: CONFETTI_COLORS[index] }]} />;
    case 4: return <Ionicons name="star" size={14} color={STAR_COLORS[index]} />;
    default: return null;
  }
}

// ─── EncouragementCard ───────────────────────────────────────────────

function EncouragementCard({
  item,
  index,
  formatTimeAgo,
  onCollected,
  showTutorial,
}: {
  item: ReceivedCoinItem;
  index: number;
  formatTimeAgo: (d: string) => string;
  onCollected: (amount: number, coinId: string) => void;
  showTutorial: boolean;
}) {
  // Entry animation
  const slideUp = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  // Tap state (ref for immediate check, state for re-render)
  const tappedRef = useRef(false);
  const [tapped, setTapped] = useState(false);
  const [animType, setAnimType] = useState(-1);

  // Heart animated values
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(1)).current;
  const heartRotation = useRef(new Animated.Value(0)).current;
  const heartTranslateY = useRef(new Animated.Value(0)).current;
  const heartTranslateX = useRef(new Animated.Value(0)).current;

  // Sky-coin replacement
  const skyScale = useRef(new Animated.Value(0)).current;
  const skyOpacity = useRef(new Animated.Value(0)).current;

  // Pulse on untapped heart
  const hintPulse = useRef(new Animated.Value(1)).current;

  // Effect particles (pre-allocated)
  const fx = useRef(
    Array.from({ length: EFFECT_PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotation: new Animated.Value(0),
    }))
  ).current;

  // ── Entry ──
  useEffect(() => {
    const d = index * 120;
    Animated.parallel([
      Animated.timing(slideUp, { toValue: 0, duration: 400, delay: d, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 400, delay: d, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Pulse loop on untapped heart ──
  useEffect(() => {
    if (tapped) { hintPulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintPulse, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(hintPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => { loop.stop(); hintPulse.setValue(1); };
  }, [tapped]);

  // ── Helpers ──
  const resetFx = () => {
    fx.forEach(e => {
      e.x.setValue(0); e.y.setValue(0); e.scale.setValue(0);
      e.opacity.setValue(0); e.rotation.setValue(0);
    });
  };

  const revealSky = () => {
    Animated.parallel([
      Animated.spring(skyScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.timing(skyOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => onCollected(item.amount, item.id));
  };

  // ─── 0 · Chomp ────────────────────────────────────────────────────
  const playChomp = () => {
    const bite = (toScale: number, pStart: number) => {
      const anims: Animated.CompositeAnimation[] = [
        Animated.sequence([
          Animated.timing(heartTranslateX, { toValue: 6, duration: 40, useNativeDriver: true }),
          Animated.timing(heartTranslateX, { toValue: -6, duration: 40, useNativeDriver: true }),
          Animated.timing(heartTranslateX, { toValue: 3, duration: 40, useNativeDriver: true }),
          Animated.timing(heartTranslateX, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]),
        Animated.timing(heartScale, { toValue: toScale, duration: 180, useNativeDriver: true }),
      ];
      for (let j = 0; j < 2; j++) {
        const idx = pStart + j;
        if (idx >= EFFECT_PARTICLE_COUNT) break;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const dist = 35 + Math.random() * 35;
        anims.push(
          Animated.parallel([
            Animated.timing(fx[idx].opacity, { toValue: 1, duration: 40, useNativeDriver: true }),
            Animated.timing(fx[idx].scale, { toValue: 0.8 + Math.random() * 0.5, duration: 40, useNativeDriver: true }),
            Animated.timing(fx[idx].x, { toValue: Math.cos(angle) * dist, duration: 380, useNativeDriver: true }),
            Animated.timing(fx[idx].y, { toValue: Math.sin(angle) * dist, duration: 380, useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(180),
              Animated.timing(fx[idx].opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
          ])
        );
      }
      return Animated.parallel(anims);
    };
    Animated.sequence([
      bite(0.7, 0), Animated.delay(120),
      bite(0.35, 2), Animated.delay(120),
      bite(0, 4),
      Animated.timing(heartOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start(() => revealSky());
  };

  // ─── 1 · Heart Burst ──────────────────────────────────────────────
  const playHeartBurst = () => {
    const dist = 65 + Math.random() * 25;
    Animated.parallel([
      Animated.timing(heartRotation, { toValue: 2, duration: 450, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 0.2, duration: 450, useNativeDriver: true }),
      Animated.timing(heartOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      ...fx.map((e, i) => {
        const angle = (i / EFFECT_PARTICLE_COUNT) * Math.PI * 2;
        return Animated.parallel([
          Animated.timing(e.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(e.scale, { toValue: 0.8 + Math.random() * 0.6, duration: 80, useNativeDriver: true }),
          Animated.timing(e.x, { toValue: Math.cos(angle) * dist, duration: 550, useNativeDriver: true }),
          Animated.timing(e.y, { toValue: Math.sin(angle) * dist, duration: 550, useNativeDriver: true }),
          Animated.timing(e.rotation, { toValue: Math.random() * 2, duration: 550, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(250),
            Animated.timing(e.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]);
      }),
    ]).start(() => revealSky());
  };

  // ─── 2 · Dissolve / Sparkle ───────────────────────────────────────
  const playDissolve = () => {
    Animated.parallel([
      Animated.timing(heartOpacity, { toValue: 0, duration: 750, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 0.5, duration: 750, useNativeDriver: true }),
      ...fx.map((e, i) => {
        const d = i * 70;
        const xOff = (Math.random() - 0.5) * 55;
        return Animated.parallel([
          Animated.sequence([Animated.delay(d), Animated.timing(e.opacity, { toValue: 1, duration: 120, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.y, { toValue: -50 - Math.random() * 40, duration: 600, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.x, { toValue: xOff, duration: 600, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.scale, { toValue: 0.5 + Math.random() * 0.8, duration: 180, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d + 350), Animated.timing(e.opacity, { toValue: 0, duration: 250, useNativeDriver: true })]),
        ]);
      }),
    ]).start(() => revealSky());
  };

  // ─── 3 · Bounce & Pop ─────────────────────────────────────────────
  const playBouncePop = () => {
    Animated.sequence([
      Animated.timing(heartTranslateY, { toValue: -10, duration: 120, useNativeDriver: true }),
      Animated.timing(heartTranslateY, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(heartTranslateY, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(heartTranslateY, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(heartTranslateY, { toValue: -28, duration: 120, useNativeDriver: true }),
      Animated.timing(heartTranslateY, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1.5, duration: 160, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(heartScale, { toValue: 2.5, duration: 80, useNativeDriver: true }),
        Animated.timing(heartOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
        ...fx.map((e) => {
          const angle = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * 40;
          return Animated.parallel([
            Animated.timing(e.opacity, { toValue: 1, duration: 40, useNativeDriver: true }),
            Animated.timing(e.scale, { toValue: 0.5 + Math.random() * 0.6, duration: 40, useNativeDriver: true }),
            Animated.timing(e.x, { toValue: Math.cos(angle) * dist, duration: 450, useNativeDriver: true }),
            Animated.timing(e.y, { toValue: Math.sin(angle) * dist, duration: 450, useNativeDriver: true }),
            Animated.timing(e.rotation, { toValue: Math.random() * 3, duration: 450, useNativeDriver: true }),
            Animated.sequence([Animated.delay(180), Animated.timing(e.opacity, { toValue: 0, duration: 270, useNativeDriver: true })]),
          ]);
        }),
      ]),
    ]).start(() => revealSky());
  };

  // ─── 4 · Spiral Away ──────────────────────────────────────────────
  const playSpiralAway = () => {
    Animated.parallel([
      Animated.timing(heartRotation, { toValue: 4, duration: 700, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.timing(heartTranslateY, { toValue: -60, duration: 700, useNativeDriver: true }),
      Animated.sequence([Animated.delay(350), Animated.timing(heartOpacity, { toValue: 0, duration: 350, useNativeDriver: true })]),
      ...fx.map((e, i) => {
        const d = i * 80;
        return Animated.parallel([
          Animated.sequence([Animated.delay(d), Animated.timing(e.opacity, { toValue: 0.85, duration: 80, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.scale, { toValue: 0.35 + Math.random() * 0.4, duration: 80, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.y, { toValue: -8 * i, duration: 280, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.x, { toValue: (Math.random() - 0.5) * 30, duration: 280, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d + 180), Animated.timing(e.opacity, { toValue: 0, duration: 180, useNativeDriver: true })]),
        ]);
      }),
    ]).start(() => revealSky());
  };

  // ── Tap handler (uses ref to prevent double-fire) ──
  const handleTap = useCallback(() => {
    if (tappedRef.current) return;
    tappedRef.current = true;
    setTapped(true);
    resetFx();

    const type = Math.floor(Math.random() * 5);
    setAnimType(type);

    switch (type) {
      case 0: playChomp(); break;
      case 1: playHeartBurst(); break;
      case 2: playDissolve(); break;
      case 3: playBouncePop(); break;
      case 4: playSpiralAway(); break;
    }
  }, []);

  // ── Interpolations ──
  const heartSpin = heartRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      {/* ── Sender row (compact, top) ── */}
      <View style={styles.senderRow}>
        <Avatar
          size={28}
          avatarUrl={!item.fromActiveAvatar ? (item as any).fromAvatarUrl : undefined}
          username={item.fromUsername}
          customizations={item.fromActiveAvatar?.customizations || null}
          avatarStyle={item.fromActiveAvatar?.style as any}
        />
        <Text style={styles.senderName} numberOfLines={1}>@{item.fromUsername}</Text>
        <Text style={styles.senderTime}>{formatTimeAgo(item.createdAt)}</Text>
      </View>

      {/* ── Heart interaction area (main focus) ── */}
      <View style={styles.heartArea}>
        {/* Tutorial arrow (above heart, for first 2 cards) */}
        {index < 2 && <TutorialHint visible={showTutorial} />}

        {/* Tappable heart */}
        <TouchableOpacity onPress={handleTap} activeOpacity={0.7} disabled={tapped}>
          <Animated.View
            style={{
              alignItems: 'center',
              opacity: heartOpacity,
              transform: [
                { scale: Animated.multiply(heartScale, hintPulse) },
                { translateY: heartTranslateY },
                { translateX: heartTranslateX },
                { rotate: heartSpin },
              ],
            }}
          >
            <KindnessCoin size={44} />
            <Text style={styles.heartAmount}>+{item.amount}</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Sky Coin (appears after animation) */}
        <Animated.View
          style={[styles.skyReplace, { opacity: skyOpacity, transform: [{ scale: skyScale }] }]}
          pointerEvents="none"
        >
          <SkyCoinIcon size={32} />
          <Text style={styles.skyAmount}>+{item.amount}</Text>
        </Animated.View>

        {/* Effect particles */}
        {fx.map((e, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.fxParticle,
              {
                opacity: e.opacity,
                transform: [
                  { translateX: e.x }, { translateY: e.y }, { scale: e.scale },
                  { rotate: e.rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                ],
              },
            ]}
          >
            <EffectIcon type={animType} index={i} />
          </Animated.View>
        ))}
      </View>

      {/* ── Encouragement message (prominent) ── */}
      {item.message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>"{item.message}"</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────

export default function EncouragementModal({ visible, coins, onClose }: EncouragementModalProps) {
  const insets = useSafeAreaInsets();
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.8)).current;

  // Session key – forces card remount so tapped state resets
  const [sessionKey, setSessionKey] = useState(0);

  // Tutorial arrows (auto-dismiss after 2s or on first collect)
  const [showTutorial, setShowTutorial] = useState(true);
  const tutorialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sky coins collected counter
  const [skyCollected, setSkyCollected] = useState(0);
  const skyCollectedRef = useRef(0);
  const skyCounterOpacity = useRef(new Animated.Value(0)).current;
  const skyCounterBounce = useRef(new Animated.Value(1)).current;

  const bgConfigs = useMemo(
    () => Array.from({ length: BG_PARTICLE_COUNT }, (_, i) => createBgParticleConfig(i)),
    []
  );

  const totalCoins = useMemo(() => coins.reduce((s, c) => s + c.amount, 0), [coins]);

  // Reset everything when modal opens
  useEffect(() => {
    if (visible) {
      setSessionKey(k => k + 1);
      setSkyCollected(0);
      skyCollectedRef.current = 0;
      setShowTutorial(true);
      skyCounterOpacity.setValue(0);
      skyCounterBounce.setValue(1);
      headerOpacity.setValue(0);
      headerScale.setValue(0.8);

      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
        Animated.spring(headerScale, { toValue: 1, friction: 6, tension: 80, delay: 200, useNativeDriver: true }),
      ]).start();

      // Auto-dismiss tutorial after 2s
      tutorialTimerRef.current = setTimeout(() => setShowTutorial(false), 2000);
    }
    return () => {
      if (tutorialTimerRef.current) clearTimeout(tutorialTimerRef.current);
    };
  }, [visible]);

  // Coin collected handler — fires API call per tap (fire-and-forget)
  const handleCoinCollected = useCallback((amount: number, coinId: string) => {
    // Dismiss tutorial on first interaction
    setShowTutorial(false);
    if (tutorialTimerRef.current) { clearTimeout(tutorialTimerRef.current); tutorialTimerRef.current = null; }

    const wasZero = skyCollectedRef.current === 0;
    skyCollectedRef.current += amount;
    setSkyCollected(skyCollectedRef.current);

    // Fire-and-forget API call to collect this coin
    api.collectCoins([coinId]).catch(() => {
      // Silently fail — coin stays uncollected in DB and reappears next time
    });

    // Reveal counter on first collection
    if (wasZero) {
      Animated.timing(skyCounterOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }

    // Bounce counter
    Animated.sequence([
      Animated.timing(skyCounterBounce, { toValue: 1.18, duration: 100, useNativeDriver: true }),
      Animated.spring(skyCounterBounce, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient colors={['#1a0a2e', '#16213e', '#0f3460']} style={StyleSheet.absoluteFill} />

        {/* Background floating particles */}
        {bgConfigs.map((c, i) => <FloatingParticle key={i} config={c} index={i} />)}

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={26} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* Header */}
        <Animated.View style={[styles.header, { paddingTop: insets.top + 56, opacity: headerOpacity, transform: [{ scale: headerScale }] }]}>
          <Ionicons name="sparkles" size={22} color="#FBBF24" />
          <Text style={styles.headerTitle}>You Are Loved</Text>
          <Ionicons name="sparkles" size={22} color="#FBBF24" />
        </Animated.View>

        <Animated.View style={[styles.subtitleRow, { opacity: headerOpacity }]}>
          <Text style={styles.subtitle}>
            {totalCoins} Positivity Coin{totalCoins !== 1 ? 's' : ''} from {coins.length} kind soul{coins.length !== 1 ? 's' : ''}
          </Text>
        </Animated.View>

        {/* Sky-coins collected counter (hidden until first collect) */}
        <Animated.View style={[styles.skyCounterRow, { opacity: skyCounterOpacity, transform: [{ scale: skyCounterBounce }] }]}>
          <SkyCoinIcon size={24} />
          <Text style={styles.skyCounterValue}>{skyCollected}</Text>
          <Text style={styles.skyCounterLabel}>Sky Coins collected</Text>
        </Animated.View>

        {/* Card list */}
        {coins.length > 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {coins.map((item, index) => (
              <EncouragementCard
                key={`${sessionKey}-${item.id}`}
                item={item}
                index={index}
                formatTimeAgo={formatTimeAgo}
                onCollected={handleCoinCollected}
                showTutorial={showTutorial}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <KindnessCoin size={48} />
            <Text style={styles.emptyText}>No encouragements yet</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  bgParticle: { position: 'absolute', zIndex: 1 },

  closeButton: {
    position: 'absolute', right: 16, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 2 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },

  subtitleRow: { alignItems: 'center', marginTop: 6, marginBottom: 8, zIndex: 2 },
  subtitle: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },

  skyCounterRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    marginBottom: 8, gap: 6, zIndex: 2,
  },
  skyCounterValue: { fontSize: 18, fontWeight: '800', color: SKY_COIN_COLORS.primary },
  skyCounterLabel: { fontSize: 12, fontWeight: '500', color: 'rgba(125,211,252,0.7)' },

  scrollView: { flex: 1, zIndex: 2 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

  // ── Card ──
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'visible',
  },

  // Sender row (compact top bar)
  senderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  senderName: {
    flex: 1, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.65)',
  },
  senderTime: {
    fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.35)',
  },

  // Heart area (centered, main focus)
  heartArea: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4, overflow: 'visible',
  },
  heartAmount: {
    fontSize: 15, fontWeight: '800', color: '#FBBF24', marginTop: 2,
  },

  // Sky coin replacement (centered over heart area)
  skyReplace: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
  },
  skyAmount: {
    fontSize: 15, fontWeight: '800', color: SKY_COIN_COLORS.primary, marginTop: 2,
  },

  // Tutorial arrow
  tutorialArrow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 4,
  },
  tutorialText: {
    fontSize: 12, fontWeight: '700', color: '#FBBF24',
  },

  // Effect particles
  fxParticle: { position: 'absolute', zIndex: 5 },
  crumb: { width: 8, height: 8, borderRadius: 4 },
  confetti: { width: 9, height: 9, borderRadius: 2 },

  // Encouragement message (prominent)
  messageBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 10,
  },
  messageText: {
    fontSize: 15, fontWeight: '500', fontStyle: 'italic',
    color: 'rgba(255,255,255,0.8)', lineHeight: 22, textAlign: 'center',
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 2 },
  emptyText: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
});
