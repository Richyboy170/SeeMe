import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Dimensions,
  ScrollView,
  Platform,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../Avatar';
import KindnessCoin from './KindnessCoin';
import SkyCoinIcon, { SKY_COIN_COLORS } from './SkyCoinIcon';
import { AvatarCustomizations } from '../AvatarRenderer';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BG_PARTICLE_COUNT = 10;
const EFFECT_PARTICLE_COUNT = 6;

// ─── Haptic helpers ──────────────────────────────────────────────────

const hapticLight = () => {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => Vibration.vibrate(40));
};
const hapticMedium = () => {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => Vibration.vibrate(80));
};
const hapticHeavy = () => {
  if (Platform.OS === 'web') return;
  // Double-tap for stronger feel
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => Vibration.vibrate(120));
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 30);
};
const hapticSuccess = () => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => Vibration.vibrate(100));
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 50);
};

// Amount-scaled vibration with rhythm — capped at 30 actual taps to prevent freeze
// Rhythm: groups of 3 taps with pauses, intensity builds per group
const hapticBurst = (amount: number, style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (Platform.OS === 'web') return;
  // Scale: 1 coin = 1 tap, 10 = 10, 50 = 25, 100 = 30 (capped)
  const taps = Math.min(Math.max(2, Math.ceil(amount * 0.5)), 30);
  const groupSize = 3;
  const tapInterval = 40;
  const groupPause = 80;
  let t = 0;
  for (let i = 0; i < taps; i++) {
    const inGroup = i % groupSize;
    // Bias toward heavy taps for stronger feel
    const fn = inGroup === 0 ? hapticMedium
      : hapticHeavy;
    setTimeout(fn, t);
    t += tapInterval;
    if (inGroup === groupSize - 1 && i < taps - 1) {
      t += groupPause;
    }
  }
};

// Rumble: wave pattern vibration, capped at 20 taps
const hapticRumble = (amount: number, durationMs: number) => {
  if (Platform.OS === 'web') return;
  const taps = Math.min(Math.max(2, Math.ceil(amount * 0.4)), 20);
  const interval = Math.max(35, Math.floor(durationMs / taps));
  for (let i = 0; i < taps; i++) {
    // All heavy for a strong rumble
    const fn = hapticHeavy;
    setTimeout(fn, i * interval);
  }
};

// Smooth easing presets
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.4, 0, 0.2, 1);

// ─── Aura colors by coin amount ─────────────────────────────────────

interface AuraConfig {
  colors: [string, string, string]; // inner, mid, outer glow
  intensity: number; // 0.3–1.0
}

function getAuraConfig(amount: number): AuraConfig {
  if (amount >= 10) return { colors: ['#C084FC', '#A855F7', '#7C3AED'], intensity: 1.0 };
  if (amount >= 6) return { colors: ['#FB923C', '#F97316', '#EA580C'], intensity: 0.85 };
  if (amount >= 4) return { colors: ['#FCD34D', '#FBBF24', '#F59E0B'], intensity: 0.7 };
  if (amount >= 2) return { colors: ['#6EE7B7', '#34D399', '#10B981'], intensity: 0.55 };
  return { colors: ['#BAE6FD', '#7DD3FC', '#38BDF8'], intensity: 0.4 };
}

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
  rankGradient?: [string, string, string];
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

const FloatingParticle = React.memo(function FloatingParticle({ config, index }: { config: ReturnType<typeof createBgParticleConfig>; index: number }) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT + 40)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let stopped = false;
    const run = () => {
      if (stopped) return;
      translateY.setValue(SCREEN_HEIGHT + 40);
      translateX.setValue(0);
      opacity.setValue(0);
      rotation.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, { toValue: -60, duration: config.duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(translateX, { toValue: config.sway, duration: config.duration / 2, easing: easeInOut, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -config.sway * 0.5, duration: config.duration / 2, easing: easeInOut, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.6, duration: 700, easing: easeOut, useNativeDriver: true }),
          Animated.delay(config.duration - 1400),
          Animated.timing(opacity, { toValue: 0, duration: 700, easing: easeInOut, useNativeDriver: true }),
        ]),
        Animated.timing(rotation, { toValue: 1, duration: config.duration, easing: Easing.linear, useNativeDriver: true }),
      ]).start(() => run());
    };
    const t = setTimeout(run, config.delay);
    return () => { stopped = true; clearTimeout(t); translateY.stopAnimation(); translateX.stopAnimation(); opacity.stopAnimation(); rotation.stopAnimation(); };
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
});

// ─── Tutorial arrow hint ─────────────────────────────────────────────

const TutorialHint = React.memo(function TutorialHint({ visible }: { visible: boolean }) {
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
});

// ─── Effect particle icon helpers ────────────────────────────────────

const HEART_COLORS = ['#F91880', '#EC4899', '#F472B6', '#DB2777', '#F91880', '#EC4899'];
const CRUMB_COLORS = ['#FBBF24', '#F59E0B', '#FDE68A', '#D97706', '#FCD34D', '#EAB308'];
const SPARKLE_COLORS = ['#FBBF24', '#F59E0B', '#FDE68A', '#FBBF24', '#F59E0B', '#FDE68A'];
const CONFETTI_COLORS = ['#F91880', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];
const STAR_COLORS = ['#FBBF24', '#F59E0B', SKY_COIN_COLORS.primary, '#FBBF24', '#F59E0B', SKY_COIN_COLORS.primary];

const EffectIcon = React.memo(function EffectIcon({ type, index }: { type: number; index: number }) {
  switch (type) {
    case 0: return <View style={[styles.crumb, { backgroundColor: CRUMB_COLORS[index] }]} />;
    case 1: return <KindnessCoin size={16} />;
    case 2: return <Ionicons name="sparkles" size={16} color={SPARKLE_COLORS[index]} />;
    case 3: return <View style={[styles.confetti, { backgroundColor: CONFETTI_COLORS[index] }]} />;
    case 4: return <Ionicons name="star" size={14} color={STAR_COLORS[index]} />;
    default: return null;
  }
});

// ─── CoinAura (glowing aura behind coin based on amount) ────────────

const CoinAura = React.memo(function CoinAura({ amount, tapped, coinSize }: { amount: number; tapped: boolean; coinSize: number }) {
  const aura = getAuraConfig(amount);
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Stop previous loop
    loopRef.current?.stop();

    if (tapped) {
      // Burst outward then settle into gentle collected glow
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, { toValue: 1.6, duration: 120, easing: easeOut, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(pulseScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.5, duration: 250, easing: easeInOut, useNativeDriver: true }),
        ]),
      ]).start(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseScale, { toValue: 1.08, duration: 1500, easing: easeInOut, useNativeDriver: true }),
            Animated.timing(pulseScale, { toValue: 1, duration: 1500, easing: easeInOut, useNativeDriver: true }),
          ])
        );
        loopRef.current = loop;
        loop.start();
      });
    } else {
      // Pre-tap: pulsing glow — intensity drives amplitude & speed
      const peakScale = 1.15 + aura.intensity * 0.2;
      const speed = 1400 - aura.intensity * 300; // faster for intense
      const loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseScale, { toValue: peakScale, duration: speed, easing: easeInOut, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.5 + aura.intensity * 0.3, duration: speed, easing: easeInOut, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseScale, { toValue: 1, duration: speed, easing: easeInOut, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.3 + aura.intensity * 0.15, duration: speed, easing: easeInOut, useNativeDriver: true }),
          ]),
        ])
      );
      loopRef.current = loop;
      loop.start();
    }
    return () => { loopRef.current?.stop(); };
  }, [tapped]);

  // Aura is larger than the coin, centered on it
  const auraSize = coinSize + 34 + aura.intensity * 34;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          width: auraSize,
          height: auraSize,
          borderRadius: auraSize / 2,
          transform: [{ scale: pulseScale }],
          opacity: pulseOpacity,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer glow */}
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: auraSize / 2,
            backgroundColor: aura.colors[2],
            opacity: 0.3 * aura.intensity,
          }}
        />
        {/* Mid glow */}
        <View
          style={{
            position: 'absolute',
            width: '65%',
            height: '65%',
            borderRadius: auraSize / 2,
            backgroundColor: aura.colors[1],
            opacity: 0.5 * aura.intensity,
          }}
        />
        {/* Inner glow */}
        <View
          style={{
            position: 'absolute',
            width: '35%',
            height: '35%',
            borderRadius: auraSize / 2,
            backgroundColor: aura.colors[0],
            opacity: 0.7 * aura.intensity,
          }}
        />
      </Animated.View>
    </Animated.View>
  );
});

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
  const aura = getAuraConfig(item.amount);

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

  // ── Entry (smooth spring slide-in with tap) ──
  useEffect(() => {
    const d = index * 60;
    setTimeout(() => hapticLight(), d + 40);
    Animated.parallel([
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 100, delay: d, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 200, delay: d, easing: easeOut, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Pulse loop on untapped heart (smooth eased breathing) ──
  useEffect(() => {
    if (tapped) { hintPulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(hintPulse, { toValue: 1.15, duration: 800, easing: easeInOut, useNativeDriver: true }),
        Animated.timing(hintPulse, { toValue: 1, duration: 800, easing: easeInOut, useNativeDriver: true }),
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
    // Strong success punch on reveal
    hapticSuccess();
    hapticBurst(item.amount, 'heavy');
    setTimeout(() => hapticRumble(item.amount, 300), 100);
    Animated.parallel([
      Animated.spring(skyScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.timing(skyOpacity, { toValue: 1, duration: 200, easing: easeOut, useNativeDriver: true }),
    ]).start(() => onCollected(item.amount, item.id));
  };

  // ─── 0 · Chomp (smooth crunchy bites — more coins = harder crunch) ──
  const playChomp = () => {
    const shakeIntensity = 4 + item.amount * 0.8;
    const bite = (toScale: number, pStart: number) => {
      const anims: Animated.CompositeAnimation[] = [
        Animated.sequence([
          Animated.timing(heartTranslateX, { toValue: shakeIntensity, duration: 25, easing: easeOut, useNativeDriver: true }),
          Animated.timing(heartTranslateX, { toValue: -shakeIntensity, duration: 25, easing: easeOut, useNativeDriver: true }),
          Animated.spring(heartTranslateX, { toValue: 0, friction: 8, tension: 300, useNativeDriver: true }),
        ]),
        Animated.spring(heartScale, { toValue: toScale, friction: 6, tension: 180, useNativeDriver: true }),
      ];
      for (let j = 0; j < 2; j++) {
        const idx = pStart + j;
        if (idx >= EFFECT_PARTICLE_COUNT) break;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const dist = 30 + item.amount * 4 + Math.random() * 30;
        anims.push(
          Animated.parallel([
            Animated.timing(fx[idx].opacity, { toValue: 1, duration: 30, useNativeDriver: true }),
            Animated.spring(fx[idx].scale, { toValue: 0.8 + Math.random() * 0.5, friction: 5, tension: 150, useNativeDriver: true }),
            Animated.timing(fx[idx].x, { toValue: Math.cos(angle) * dist, duration: 250, easing: easeOut, useNativeDriver: true }),
            Animated.timing(fx[idx].y, { toValue: Math.sin(angle) * dist, duration: 250, easing: easeOut, useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(120),
              Animated.timing(fx[idx].opacity, { toValue: 0, duration: 130, easing: easeInOut, useNativeDriver: true }),
            ]),
          ])
        );
      }
      return Animated.parallel(anims);
    };

    hapticBurst(Math.ceil(item.amount * 0.4), 'light');
    Animated.sequence([
      bite(0.7, 0), Animated.delay(40),
    ]).start(() => {
      hapticBurst(Math.ceil(item.amount * 0.7), 'medium');
      Animated.sequence([
        bite(0.3, 2), Animated.delay(40),
      ]).start(() => {
        hapticBurst(item.amount, 'heavy');
        Animated.sequence([
          bite(0, 4),
          Animated.timing(heartOpacity, { toValue: 0, duration: 60, easing: easeOut, useNativeDriver: true }),
        ]).start(() => revealSky());
      });
    });
  };

  // ─── 1 · Heart Burst (smooth explosion — big coins = massive blast) ─
  const playHeartBurst = () => {
    hapticBurst(item.amount, 'heavy');
    hapticRumble(item.amount, 250);
    const dist = 55 + item.amount * 6 + Math.random() * 20;
    Animated.parallel([
      Animated.timing(heartRotation, { toValue: 2, duration: 300, easing: easeOut, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 0.15, duration: 300, easing: easeOut, useNativeDriver: true }),
      Animated.timing(heartOpacity, { toValue: 0, duration: 300, easing: easeOut, useNativeDriver: true }),
      ...fx.map((e, i) => {
        const angle = (i / EFFECT_PARTICLE_COUNT) * Math.PI * 2;
        return Animated.parallel([
          Animated.timing(e.opacity, { toValue: 1, duration: 40, useNativeDriver: true }),
          Animated.spring(e.scale, { toValue: 0.8 + Math.random() * 0.6, friction: 5, tension: 150, useNativeDriver: true }),
          Animated.timing(e.x, { toValue: Math.cos(angle) * dist, duration: 350, easing: easeOut, useNativeDriver: true }),
          Animated.timing(e.y, { toValue: Math.sin(angle) * dist, duration: 350, easing: easeOut, useNativeDriver: true }),
          Animated.timing(e.rotation, { toValue: Math.random() * 2, duration: 350, easing: easeOut, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(150),
            Animated.timing(e.opacity, { toValue: 0, duration: 200, easing: easeInOut, useNativeDriver: true }),
          ]),
        ]);
      }),
    ]).start(() => revealSky());
  };

  // ─── 2 · Dissolve / Sparkle (shimmer cascade — dense taps for big gifts) ─
  const playDissolve = () => {
    const tapCount = EFFECT_PARTICLE_COUNT + Math.min(item.amount, 10);
    const tapSpacing = Math.max(20, 50 - item.amount * 3);
    for (let i = 0; i < tapCount; i++) {
      const fn = i % 3 === 0 ? hapticHeavy : hapticMedium;
      setTimeout(fn, i * tapSpacing);
    }
    setTimeout(() => hapticBurst(item.amount, 'heavy'), tapCount * tapSpacing);

    Animated.parallel([
      Animated.timing(heartOpacity, { toValue: 0, duration: 450, easing: easeInOut, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 0.4, duration: 450, easing: easeInOut, useNativeDriver: true }),
      ...fx.map((e, i) => {
        const d = i * 40;
        const xOff = (Math.random() - 0.5) * (45 + item.amount * 3);
        return Animated.parallel([
          Animated.sequence([Animated.delay(d), Animated.timing(e.opacity, { toValue: 1, duration: 60, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.y, { toValue: -45 - Math.random() * 45, duration: 380, easing: easeOut, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.x, { toValue: xOff, duration: 380, easing: easeOut, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.spring(e.scale, { toValue: 0.5 + Math.random() * 0.8, friction: 5, tension: 150, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d + 200), Animated.timing(e.opacity, { toValue: 0, duration: 180, easing: easeInOut, useNativeDriver: true })]),
        ]);
      }),
    ]).start(() => revealSky());
  };

  // ─── 3 · Bounce & Pop (smooth springs — bigger coins bounce harder & pop louder) ─
  const playBouncePop = () => {
    const bounceH1 = -8 - item.amount;
    const bounceH2 = -16 - item.amount * 2;
    const bounceH3 = -24 - item.amount * 3;
    const popScale = 2 + item.amount * 0.15;

    hapticBurst(Math.ceil(item.amount * 0.3), 'light');
    Animated.sequence([
      Animated.timing(heartTranslateY, { toValue: bounceH1, duration: 80, easing: easeOut, useNativeDriver: true }),
      Animated.spring(heartTranslateY, { toValue: 0, friction: 6, tension: 280, useNativeDriver: true }),
    ]).start(() => {
      hapticBurst(Math.ceil(item.amount * 0.5), 'medium');
      Animated.sequence([
        Animated.timing(heartTranslateY, { toValue: bounceH2, duration: 80, easing: easeOut, useNativeDriver: true }),
        Animated.spring(heartTranslateY, { toValue: 0, friction: 6, tension: 280, useNativeDriver: true }),
      ]).start(() => {
        hapticBurst(Math.ceil(item.amount * 0.7), 'medium');
        Animated.sequence([
          Animated.timing(heartTranslateY, { toValue: bounceH3, duration: 80, easing: easeOut, useNativeDriver: true }),
          Animated.spring(heartTranslateY, { toValue: 0, friction: 6, tension: 280, useNativeDriver: true }),
          Animated.spring(heartScale, { toValue: 1.5, friction: 5, tension: 150, useNativeDriver: true }),
        ]).start(() => {
          hapticBurst(item.amount, 'heavy');
          hapticRumble(item.amount, 250);
          Animated.parallel([
            Animated.timing(heartScale, { toValue: popScale, duration: 70, easing: easeOut, useNativeDriver: true }),
            Animated.timing(heartOpacity, { toValue: 0, duration: 70, easing: easeOut, useNativeDriver: true }),
            ...fx.map((e) => {
              const angle = Math.random() * Math.PI * 2;
              const dist = 35 + item.amount * 5 + Math.random() * 35;
              return Animated.parallel([
                Animated.timing(e.opacity, { toValue: 1, duration: 30, useNativeDriver: true }),
                Animated.spring(e.scale, { toValue: 0.5 + Math.random() * 0.6, friction: 5, tension: 150, useNativeDriver: true }),
                Animated.timing(e.x, { toValue: Math.cos(angle) * dist, duration: 300, easing: easeOut, useNativeDriver: true }),
                Animated.timing(e.y, { toValue: Math.sin(angle) * dist, duration: 300, easing: easeOut, useNativeDriver: true }),
                Animated.timing(e.rotation, { toValue: Math.random() * 3, duration: 300, easing: easeOut, useNativeDriver: true }),
                Animated.sequence([Animated.delay(120), Animated.timing(e.opacity, { toValue: 0, duration: 180, easing: easeInOut, useNativeDriver: true })]),
              ]);
            }),
          ]).start(() => revealSky());
        });
      });
    });
  };

  // ─── 4 · Spiral Away (accelerating whirl — more coins = faster & more taps) ─
  const playSpiralAway = () => {
    const spins = 3 + item.amount * 0.5;
    const spiralDuration = 400 + Math.min(item.amount * 20, 200);
    const tapCount = 4 + Math.min(item.amount * 2, 16);
    for (let i = 0; i < tapCount; i++) {
      const t = (i / tapCount) * spiralDuration;
      const fn = i < tapCount * 0.5 ? hapticLight : i < tapCount * 0.8 ? hapticMedium : hapticHeavy;
      setTimeout(fn, t);
    }

    Animated.parallel([
      Animated.timing(heartRotation, { toValue: spins, duration: spiralDuration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 0, duration: spiralDuration, easing: easeInOut, useNativeDriver: true }),
      Animated.timing(heartTranslateY, { toValue: -50 - item.amount * 3, duration: spiralDuration, easing: easeOut, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(spiralDuration * 0.3),
        Animated.timing(heartOpacity, { toValue: 0, duration: spiralDuration * 0.5, easing: easeInOut, useNativeDriver: true }),
      ]),
      ...fx.map((e, i) => {
        const d = i * 40;
        return Animated.parallel([
          Animated.sequence([Animated.delay(d), Animated.timing(e.opacity, { toValue: 0.9, duration: 40, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.spring(e.scale, { toValue: 0.35 + Math.random() * 0.4, friction: 5, tension: 150, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.y, { toValue: -10 * i, duration: 200, easing: easeOut, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d), Animated.timing(e.x, { toValue: (Math.random() - 0.5) * 35, duration: 200, easing: easeOut, useNativeDriver: true })]),
          Animated.sequence([Animated.delay(d + 120), Animated.timing(e.opacity, { toValue: 0, duration: 130, easing: easeInOut, useNativeDriver: true })]),
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

    // Initial tap — strong punch so user feels it immediately
    hapticHeavy();
    setTimeout(hapticHeavy, 40);
    hapticBurst(item.amount, 'heavy');

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
    <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }], borderColor: `${aura.colors[2]}22` }]}>
      <View style={styles.cardColumns}>
        {/* ── Left column: profile info + message ── */}
        <View style={styles.leftColumn}>
          <View style={styles.senderRow}>
            <Avatar
              size={32}
              avatarUrl={!item.fromActiveAvatar ? (item as any).fromAvatarUrl : undefined}
              username={item.fromUsername}
              customizations={item.fromActiveAvatar?.customizations || null}
              avatarStyle={item.fromActiveAvatar?.style as any}
            />
            <View style={styles.senderInfo}>
              <Text style={styles.senderName} numberOfLines={1}>@{item.fromUsername}</Text>
              <Text style={styles.senderTime}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {/* Message */}
          {item.message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>"{item.message}"</Text>
            </View>
          ) : null}
        </View>

        {/* ── Right column: coin with aura ── */}
        <View style={styles.rightColumn}>
          {/* Tutorial arrow (above heart, for first 2 cards) */}
          {index < 2 && <TutorialHint visible={showTutorial} />}

          {/* Coin interaction zone — everything centered on this */}
          <View style={styles.coinZone}>
            {/* Aura glow — absoluteFill centers it on coinZone */}
            <CoinAura amount={item.amount} tapped={tapped} coinSize={44} />

            {/* Tappable coin */}
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
              </Animated.View>
            </TouchableOpacity>

            {/* Sky Coin (appears after animation — same position as kindness coin) */}
            <Animated.View
              style={[styles.skyReplace, { opacity: skyOpacity, transform: [{ scale: skyScale }] }]}
              pointerEvents="none"
            >
              <SkyCoinIcon size={32} />
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

          {/* Amount label below coin zone */}
          <Text style={[styles.coinAmount, { color: tapped ? SKY_COIN_COLORS.primary : aura.colors[0] }]}>+{item.amount}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────

function EncouragementModal({ visible, coins, onClose, rankGradient }: EncouragementModalProps) {
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

      // Welcome vibration on modal open — strong so user knows it's here
      setTimeout(hapticHeavy, 100);
      setTimeout(hapticMedium, 180);

      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 300, delay: 100, easing: easeOut, useNativeDriver: true }),
        Animated.spring(headerScale, { toValue: 1, friction: 7, tension: 100, delay: 100, useNativeDriver: true }),
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

    // Bounce counter — strong tap on each collection
    hapticBurst(amount, 'heavy');
    Animated.sequence([
      Animated.timing(skyCounterBounce, { toValue: 1.15 + amount * 0.02, duration: 80, easing: easeOut, useNativeDriver: true }),
      Animated.spring(skyCounterBounce, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
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
        <LinearGradient colors={rankGradient || ['#2D1B69', '#1E3A5F', '#1A4B6E']} style={StyleSheet.absoluteFill} />

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

export default React.memo(EncouragementModal);

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

  // Two-column layout
  cardColumns: {
    flexDirection: 'row', alignItems: 'center',
  },
  leftColumn: {
    flex: 1, marginRight: 12,
  },
  rightColumn: {
    width: 110, alignItems: 'center', justifyContent: 'center',
    overflow: 'visible', paddingVertical: 10,
  },
  coinZone: {
    width: 80, height: 80,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'visible',
  },

  // Sender row (left column)
  senderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)',
  },
  senderTime: {
    fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 1,
  },

  // Coin amount (right column)
  coinAmount: {
    fontSize: 16, fontWeight: '800', marginTop: 3,
  },

  // Sky coin replacement (centered over coin zone via absoluteFill)
  skyReplace: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
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

  // Encouragement message (left column)
  messageBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    marginTop: 6,
  },
  messageText: {
    fontSize: 13, fontWeight: '500', fontStyle: 'italic',
    color: 'rgba(255,255,255,0.75)', lineHeight: 19,
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 2 },
  emptyText: { fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.4)' },
});
