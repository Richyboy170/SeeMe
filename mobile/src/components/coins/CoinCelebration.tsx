import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import KindnessCoin from './KindnessCoin';

// No module-level dimensions — use useWindowDimensions() for live updates on rotation

interface CoinCelebrationProps {
  visible: boolean;
  amount: number;
  source?: 'post' | 'comment' | 'ad' | 'claim' | 'gift' | 'received';
  recipientUsername?: string;
  onClose: () => void;
  asModal?: boolean;
}

// Get celebration text based on source
const getCelebrationText = (source?: string) => {
  switch (source) {
    case 'post':
      return { title: 'Post Bonus!', message: 'You earned coins for sharing!' };
    case 'comment':
      return { title: 'Comment Bonus!', message: 'Spreading kindness through words!' };
    case 'ad':
      return { title: 'Ad Reward!', message: 'Thanks for watching!' };
    case 'claim':
      return { title: 'Free Coins!', message: 'Come back for more!' };
    case 'gift':
      return { title: 'Positivity Sent!', message: "You're spreading positivity!" };
    case 'received':
      return { title: 'Coins Received!', message: 'Someone appreciated you!' };
    default:
      return { title: 'Coins Earned!', message: 'Keep being awesome!' };
  }
};

// Single flower — 5 petals + center
function SingleFlower({ petalColor, centerColor, size, x, y }: {
  petalColor: string; centerColor: string; size: number; x: number; y: number;
}) {
  const ps = size * 0.38;
  const cs = size * 0.28;
  const dist = size * 0.22;
  return (
    <View style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 72, 144, 216, 288].map((angle, idx) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <View key={idx} style={{
            position: 'absolute',
            width: ps, height: ps, borderRadius: ps / 2,
            backgroundColor: petalColor, opacity: 0.9,
            left: size / 2 - ps / 2 + Math.cos(rad) * dist,
            top: size / 2 - ps / 2 + Math.sin(rad) * dist,
          }} />
        );
      })}
      <View style={{ width: cs, height: cs, borderRadius: cs / 2, backgroundColor: centerColor }} />
    </View>
  );
}

// Build flower rows dynamically — adapts to screen size and orientation
const buildBushRows = (screenWidth: number, screenHeight: number) => {
  const bushWidth = screenWidth + 40;
  const isLandscape = screenWidth > screenHeight;

  // On large devices (>400px), compress flowers further toward the bottom
  const isLarge = screenWidth > 400;
  const rowDefs = [
    { y: isLarge ? 0.78 : 0.68, s: 0.14 },
    { y: isLarge ? 0.81 : 0.73, s: 0.17 },
    { y: isLarge ? 0.84 : 0.78, s: 0.20 },
    { y: isLarge ? 0.87 : 0.82, s: 0.22 },
    { y: isLarge ? 0.90 : 0.86, s: 0.24 },
    { y: isLarge ? 0.93 : 0.91, s: 0.26 },
    { y: isLarge ? 0.97 : 0.96, s: 0.28 },
    { y: 1.0, s: 0.30 },
  ];

  return rowDefs.map((row, ri) => {
    // In landscape, cap flower size so they don't become enormous
    const maxSizePx = isLandscape ? 90 : 140;
    const s = Math.min(row.s, maxSizePx / bushWidth);

    // Pixel-based step: wider screens (landscape/tablets) get more flowers
    const targetStepPx = isLandscape ? 45 : 60;
    const proportionalStep = s * 0.65;
    const pixelStep = targetStepPx / bushWidth;
    const stepFrac = Math.min(proportionalStep, pixelStep);
    const count = Math.max(5, Math.round(1.0 / stepFrac) + 1);

    const xs: number[] = [];
    for (let i = 0; i < count; i++) {
      xs.push(count === 1 ? 0.5 : i / (count - 1));
    }

    // Stagger alternate rows for natural look
    if (ri % 2 === 1) {
      const halfStep = 0.5 / (count - 1);
      return { ...row, s, xs: xs.map(x => Math.min(1.0, x + halfStep * 0.5)) };
    }

    return { ...row, s, xs };
  });
};

// 3 movement group types for flower animation variety
type FlowerGroup = {
  swayX: Animated.Value;
  swayY: Animated.Value;
  rotate: Animated.Value;
};

// Flower bush — 3 animated group sets, each containing static flowers
function FlowerBush({ colors, width, screenHeight, bloomProgress, groups, rows }: {
  colors: Array<{ petals: string; center: string }>;
  width: number;
  screenHeight: number;
  bloomProgress: Animated.Value;
  groups: FlowerGroup[];
  rows: ReturnType<typeof buildBushRows>;
}) {
  const isLandscape = (width - 40) > screenHeight;
  // Portrait: shorter bush (0.55) keeps flowers low
  // Landscape: cap height so bush doesn't dominate the limited vertical space
  const screenW = width - 40;
  const h = isLandscape
    ? Math.min(width * 0.35, screenHeight * 0.45)
    : width * (screenW > 400 ? 0.45 : 0.55);

  const getY = (baseY: number, xPos: number) => {
    const dx = (xPos - 0.5) * width;
    const R = Math.max(screenHeight * 0.55, width * 1.2);
    const arcLift = R - Math.sqrt(Math.max(0, R * R - dx * dx));
    return baseY - arcLift / h;
  };

  // Pre-sort flowers into 3 groups
  const groupedFlowers: Array<Array<{ ri: number; xi: number; xPos: number; row: typeof rows[0]; colorIdx: number }>> = [[], [], []];
  let flowerIdx = 0;
  rows.forEach((row, ri) => {
    row.xs.forEach((xPos, xi) => {
      const idx = flowerIdx++;
      const groupId = (idx * 7 + 3) % 3;
      groupedFlowers[groupId].push({ ri, xi, xPos, row, colorIdx: idx });
    });
  });

  const bloomOpacity = bloomProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const bloomScale = bloomProgress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.3, 1.05, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ width, height: h }}>
      {groupedFlowers.map((flowers, gi) => {
        const g = groups[gi];
        return (
          <Animated.View
            key={`group-${gi}`}
            style={{
              position: 'absolute',
              width, height: h,
              opacity: bloomOpacity,
              transform: [
                { scale: bloomScale },
                { translateX: g.swayX },
                { translateY: g.swayY },
                { rotate: g.rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] }) },
              ],
            }}
          >
            {flowers.map(({ ri, xi, xPos, row, colorIdx }) => {
              const c = colors[colorIdx % colors.length];
              const sz = width * row.s;
              const slopedY = getY(row.y, xPos);
              if (slopedY < -0.05 || slopedY > 1.05) return null;
              return (
                <SingleFlower
                  key={`f-${ri}-${xi}`}
                  petalColor={c.petals}
                  centerColor={c.center}
                  size={sz}
                  x={width * xPos}
                  y={h * slopedY}
                />
              );
            })}
          </Animated.View>
        );
      })}
    </View>
  );
}

function CoinCelebration({
  visible,
  amount,
  source,
  recipientUsername,
  onClose,
  asModal = true,
}: CoinCelebrationProps) {
  const { colors, isDark } = useTheme();

  // Live dimensions — re-renders on orientation change
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const bushRows = useMemo(() => buildBushRows(screenWidth, screenHeight), [screenWidth, screenHeight]);
  const bushWidth = screenWidth + 40;

  // Count-up display for badge
  const [displayAmount, setDisplayAmount] = useState(0);
  const countUpAnim = useRef(new Animated.Value(0)).current;

  // Animation refs
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const mainCoinScale = useRef(new Animated.Value(0)).current;
  const mainCoinRotate = useRef(new Animated.Value(0)).current;
  const mainCoinBounce = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  // Shared bloom progress + 3 flower movement groups
  const bloomProgress = useRef(new Animated.Value(0)).current;
  const flowerGroups = useRef(
    Array.from({ length: 3 }, () => ({
      swayX: new Animated.Value(0),
      swayY: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  // Flower fireworks — 3 rockets launching up from flower bed
  const flowerFireworks = useRef(
    Array.from({ length: 3 }, () => ({
      rocketY: new Animated.Value(0),
      rocketX: new Animated.Value(0),
      rocketOpacity: new Animated.Value(0),
      sparks: Array.from({ length: 10 }, () => ({
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
      })),
    }))
  ).current;

  // Flying mini coins
  const flyingCoins = useRef(
    Array.from({ length: 12 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3),
      rotation: new Animated.Value(0),
    }))
  ).current;

  // Firework bursts — 4 rockets, each with 8 sparks
  const fireworks = useRef(
    Array.from({ length: 4 }, () => ({
      rocketY: new Animated.Value(0),
      rocketX: new Animated.Value(0),
      rocketOpacity: new Animated.Value(0),
      sparks: Array.from({ length: 8 }, () => ({
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
      })),
    }))
  ).current;

  const autoCloseTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      playAnimation();
    }
    return () => {
      if (autoCloseTimeout.current) {
        clearTimeout(autoCloseTimeout.current);
      }
      countUpAnim.removeAllListeners();
    };
  }, [visible]);

  const playAnimation = () => {
    // Reset all animations
    celebrationOpacity.setValue(0);
    mainCoinScale.setValue(0);
    mainCoinRotate.setValue(0);
    mainCoinBounce.setValue(0);
    textScale.setValue(0);
    textOpacity.setValue(0);
    sparkleOpacity.setValue(0);
    glowPulse.setValue(1);

    countUpAnim.setValue(0);
    setDisplayAmount(0);

    bloomProgress.setValue(0);
    flowerGroups.forEach(g => {
      g.swayX.setValue(0);
      g.swayY.setValue(0);
      g.rotate.setValue(0);
    });

    flyingCoins.forEach(anim => {
      anim.translateX.setValue(0);
      anim.translateY.setValue(0);
      anim.opacity.setValue(0);
      anim.scale.setValue(0.3);
      anim.rotation.setValue(0);
    });

    fireworks.forEach(fw => {
      fw.rocketY.setValue(0);
      fw.rocketX.setValue(0);
      fw.rocketOpacity.setValue(0);
      fw.sparks.forEach(s => {
        s.translateX.setValue(0);
        s.translateY.setValue(0);
        s.opacity.setValue(0);
        s.scale.setValue(0);
      });
    });

    flowerFireworks.forEach(fw => {
      fw.rocketY.setValue(0);
      fw.rocketX.setValue(0);
      fw.rocketOpacity.setValue(0);
      fw.sparks.forEach(s => {
        s.translateX.setValue(0);
        s.translateY.setValue(0);
        s.opacity.setValue(0);
        s.scale.setValue(0);
      });
    });

    // Fade in overlay
    Animated.timing(celebrationOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Main coin entrance - smooth scale in with spin
    Animated.sequence([
      Animated.parallel([
        Animated.spring(mainCoinScale, {
          toValue: 1.05,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(mainCoinRotate, {
          toValue: 2,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(mainCoinScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Coin float loop — smooth sine-like motion (infinite)
    Animated.loop(
      Animated.sequence([
        Animated.timing(mainCoinBounce, {
          toValue: -12,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(mainCoinBounce, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Glow pulse (infinite)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Text pop in
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(textScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Count-up number (JS-driven, separate from native animations)
    countUpAnim.addListener(({ value }) => {
      setDisplayAmount(Math.round(value));
    });
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(countUpAnim, {
        toValue: amount,
        duration: Math.min(400 + amount * 30, 900),
        useNativeDriver: false,
      }),
    ]).start();




    // Sparkle pulse (infinite)
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0.2,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Flying mini coins — sequential spiral burst
    // All timing-based (no springs) so loop durations stay deterministic and in sync
    const radius = 130;
    const coinStagger = 40;
    const maxStagger = (flyingCoins.length - 1) * coinStagger;
    const burstDuration = 700;
    const fadeDuration = 300;

    flyingCoins.forEach((anim, index) => {
      const angle = (index / flyingCoins.length) * Math.PI * 2;
      const targetX = Math.cos(angle) * radius;
      const targetY = Math.sin(angle) * radius;
      const stagger = index * coinStagger;

      Animated.sequence([
        Animated.delay(150),
        Animated.loop(
          Animated.sequence([
            // Per-coin stagger — fires coins sequentially around the circle
            Animated.delay(stagger),
            // Reset to center
            Animated.parallel([
              Animated.timing(anim.translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
              Animated.timing(anim.translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
              Animated.timing(anim.scale, { toValue: 0.3, duration: 0, useNativeDriver: true }),
              Animated.timing(anim.rotation, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
            // Burst outward on circle
            Animated.parallel([
              Animated.timing(anim.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
              Animated.timing(anim.scale, { toValue: 0.8, duration: 300, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
              Animated.timing(anim.translateX, { toValue: targetX, duration: burstDuration, useNativeDriver: true }),
              Animated.timing(anim.translateY, { toValue: targetY, duration: burstDuration, useNativeDriver: true }),
              Animated.timing(anim.rotation, { toValue: 4, duration: burstDuration, useNativeDriver: true }),
            ]),
            // Fade out
            Animated.timing(anim.opacity, { toValue: 0, duration: fadeDuration, useNativeDriver: true }),
            // Tail delay — compensates stagger so every coin's loop is the same total duration
            Animated.delay(maxStagger - stagger + 200),
          ]),
        ),
      ]).start();
    });

    // Fireworks — each rocket launches then bursts into sparks (looping)
    const rocketPositions = [
      { x: -screenWidth * 0.3, burstY: -screenHeight * 0.3 },
      { x: screenWidth * 0.3, burstY: -screenHeight * 0.25 },
      { x: -screenWidth * 0.15, burstY: -screenHeight * 0.35 },
      { x: screenWidth * 0.15, burstY: -screenHeight * 0.28 },
    ];
    fireworks.forEach((fw, fwIndex) => {
      const pos = rocketPositions[fwIndex];
      const sparkRadius = 40 + fwIndex * 8;

      Animated.sequence([
        Animated.delay(300 + fwIndex * 700),
        Animated.loop(
          Animated.sequence([
            // Reset rocket + sparks
            Animated.parallel([
              Animated.timing(fw.rocketY, { toValue: 0, duration: 0, useNativeDriver: true }),
              Animated.timing(fw.rocketX, { toValue: 0, duration: 0, useNativeDriver: true }),
              Animated.timing(fw.rocketOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
              ...fw.sparks.flatMap(s => [
                Animated.timing(s.translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(s.translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(s.opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(s.scale, { toValue: 0, duration: 0, useNativeDriver: true }),
              ]),
            ]),
            // Launch rocket upward
            Animated.parallel([
              Animated.timing(fw.rocketOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
              Animated.timing(fw.rocketY, { toValue: pos.burstY, duration: 500, useNativeDriver: true }),
              Animated.timing(fw.rocketX, { toValue: pos.x, duration: 500, useNativeDriver: true }),
            ]),
            // Hide rocket, burst sparks outward in a circle
            Animated.parallel([
              Animated.timing(fw.rocketOpacity, { toValue: 0, duration: 50, useNativeDriver: true }),
              ...fw.sparks.map((s, si) => {
                const a = (si / fw.sparks.length) * Math.PI * 2;
                return Animated.parallel([
                  Animated.timing(s.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
                  Animated.timing(s.scale, { toValue: 1, duration: 150, useNativeDriver: true }),
                  Animated.timing(s.translateX, { toValue: Math.cos(a) * sparkRadius, duration: 500, useNativeDriver: true }),
                  Animated.timing(s.translateY, { toValue: Math.sin(a) * sparkRadius, duration: 500, useNativeDriver: true }),
                ]);
              }),
            ]),
            // Sparks fade + fall
            Animated.parallel(
              fw.sparks.map(s =>
                Animated.parallel([
                  Animated.timing(s.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
                  Animated.timing(s.translateY, { toValue: 60, duration: 500, useNativeDriver: true }),
                  Animated.timing(s.scale, { toValue: 0.3, duration: 500, useNativeDriver: true }),
                ])
              )
            ),
            // Pause before next launch
            Animated.delay(800),
          ]),
        ),
      ]).start();
    });

    // Flower fireworks — flowers shoot up high, explode into a big burst of tiny flowers
    const flowerRocketPositions = [
      { x: -screenWidth * 0.3, burstY: -screenHeight * 0.45 },
      { x: screenWidth * 0.05, burstY: -screenHeight * 0.5 },
      { x: screenWidth * 0.32, burstY: -screenHeight * 0.42 },
    ];
    flowerFireworks.forEach((fw, fwIndex) => {
      const pos = flowerRocketPositions[fwIndex];
      const sparkRadius = 100 + fwIndex * 20;

      Animated.sequence([
        Animated.delay(1200 + fwIndex * 1100),
        Animated.loop(
          Animated.sequence([
            // Reset
            Animated.parallel([
              Animated.timing(fw.rocketY, { toValue: 0, duration: 0, useNativeDriver: true }),
              Animated.timing(fw.rocketX, { toValue: 0, duration: 0, useNativeDriver: true }),
              Animated.timing(fw.rocketOpacity, { toValue: 0, duration: 0, useNativeDriver: true }),
              ...fw.sparks.flatMap(s => [
                Animated.timing(s.translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(s.translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(s.opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(s.scale, { toValue: 0, duration: 0, useNativeDriver: true }),
              ]),
            ]),
            // Flower shoots upward fast
            Animated.parallel([
              Animated.timing(fw.rocketOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
              Animated.timing(fw.rocketY, { toValue: pos.burstY, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(fw.rocketX, { toValue: pos.x, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
            // Burst — flower disappears, shower of tiny flowers explode outward
            Animated.parallel([
              Animated.timing(fw.rocketOpacity, { toValue: 0, duration: 30, useNativeDriver: true }),
              ...fw.sparks.map((s, si) => {
                const a = (si / fw.sparks.length) * Math.PI * 2;
                // Randomize radius slightly per spark for organic look
                const r = sparkRadius * (0.7 + (((si * 7 + fwIndex * 3) % 10) / 10) * 0.6);
                return Animated.parallel([
                  Animated.timing(s.opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
                  Animated.spring(s.scale, { toValue: 1.2, friction: 4, tension: 80, useNativeDriver: true }),
                  Animated.timing(s.translateX, { toValue: Math.cos(a) * r, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                  Animated.timing(s.translateY, { toValue: Math.sin(a) * r, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                ]);
              }),
            ]),
            // Flowers drift down and fade like petals falling
            Animated.parallel(
              fw.sparks.map((s, si) =>
                Animated.parallel([
                  Animated.timing(s.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
                  Animated.timing(s.translateY, { toValue: 80 + (si % 3) * 20, duration: 800, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                  Animated.timing(s.scale, { toValue: 0.4, duration: 800, useNativeDriver: true }),
                ])
              )
            ),
            Animated.delay(600),
          ]),
        ),
      ]).start();
    });

    // Bloom flowers — all fade in together smoothly
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(bloomProgress, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Group 0 — slow horizontal sway + gentle rotation
    Animated.sequence([
      Animated.delay(1800),
      Animated.loop(
        Animated.sequence([
          Animated.timing(flowerGroups[0].swayX, { toValue: 5, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[0].swayX, { toValue: -5, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[0].swayX, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]).start();
    Animated.sequence([
      Animated.delay(2000),
      Animated.loop(
        Animated.sequence([
          Animated.timing(flowerGroups[0].rotate, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[0].rotate, { toValue: -1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[0].rotate, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]).start();

    // Group 1 — gentle vertical bob + opposite horizontal drift
    Animated.sequence([
      Animated.delay(2200),
      Animated.loop(
        Animated.sequence([
          Animated.timing(flowerGroups[1].swayY, { toValue: -4, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[1].swayY, { toValue: 4, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[1].swayY, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]).start();
    Animated.sequence([
      Animated.delay(2400),
      Animated.loop(
        Animated.sequence([
          Animated.timing(flowerGroups[1].swayX, { toValue: -3, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[1].swayX, { toValue: 3, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[1].swayX, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]).start();

    // Group 2 — rotation-heavy + subtle lift + slow drift
    Animated.sequence([
      Animated.delay(1600),
      Animated.loop(
        Animated.sequence([
          Animated.timing(flowerGroups[2].rotate, { toValue: -1, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[2].rotate, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[2].rotate, { toValue: 0, duration: 1250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]).start();
    Animated.sequence([
      Animated.delay(2600),
      Animated.loop(
        Animated.sequence([
          Animated.timing(flowerGroups[2].swayY, { toValue: 3, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[2].swayY, { toValue: -3, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[2].swayY, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]).start();
    Animated.sequence([
      Animated.delay(2000),
      Animated.loop(
        Animated.sequence([
          Animated.timing(flowerGroups[2].swayX, { toValue: 4, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[2].swayX, { toValue: -4, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(flowerGroups[2].swayX, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]).start();

    // No auto close — user must tap to dismiss
  };

  const handleClose = () => {
    if (autoCloseTimeout.current) {
      clearTimeout(autoCloseTimeout.current);
      autoCloseTimeout.current = null;
    }
    countUpAnim.removeAllListeners();

    Animated.timing(celebrationOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const celebrationText = getCelebrationText(source);
  const fireworkColors = ['#FBBF24', '#EC4899', '#3B82F6', '#10B981'];

  const renderContent = () => (
    <Animated.View style={[
      asModal ? styles.modalOverlay : styles.inlineOverlay,
      { opacity: celebrationOpacity }
    ]}>
      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={1}
        onPress={handleClose}
      >
        {/* Coin group — everything moves together with the bounce */}
        <Animated.View style={[styles.coinGroup, { transform: [{ translateY: mainCoinBounce }] }]}>
          {/* Fireworks */}
          {fireworks.map((fw, fwIndex) => (
            <View key={`fw-${fwIndex}`} style={styles.fireworkOrigin}>
              {/* Rocket trail */}
              <Animated.View style={[
                styles.rocket,
                {
                  backgroundColor: fireworkColors[fwIndex],
                  transform: [
                    { translateX: fw.rocketX },
                    { translateY: fw.rocketY },
                  ],
                  opacity: fw.rocketOpacity,
                },
              ]} />
              {/* Sparks */}
              {fw.sparks.map((s, si) => (
                <Animated.View
                  key={`spark-${fwIndex}-${si}`}
                  style={[
                    styles.spark,
                    {
                      backgroundColor: fireworkColors[fwIndex],
                      transform: [
                        { translateX: Animated.add(fw.rocketX, s.translateX) },
                        { translateY: Animated.add(fw.rocketY, s.translateY) },
                        { scale: s.scale },
                      ],
                      opacity: s.opacity,
                    },
                  ]}
                />
              ))}
            </View>
          ))}

          {/* Sparkles around main coin */}
          <Animated.View style={[styles.sparkleContainer, { opacity: sparkleOpacity }]}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
              <Ionicons
                key={index}
                name="sparkles"
                size={asModal ? 28 : 22}
                color="#FBBF24"
                style={[
                  styles.sparkle,
                  { transform: [{ rotate: `${angle}deg` }, { translateY: asModal ? -110 : -80 }] },
                ]}
              />
            ))}
          </Animated.View>

          {/* Glow ring */}
          <Animated.View style={[
            styles.glowRing,
            {
              transform: [{ scale: glowPulse }],
              opacity: sparkleOpacity,
            }
          ]} />

          {/* Flying mini coins */}
          {flyingCoins.map((anim, index) => (
            <Animated.View
              key={`coin-${index}`}
              style={{
                position: 'absolute',
                transform: [
                  { translateX: anim.translateX },
                  { translateY: anim.translateY },
                  { scale: anim.scale },
                  { rotate: anim.rotation.interpolate({
                    inputRange: [0, 5],
                    outputRange: ['0deg', '1800deg'],
                  })},
                ],
                opacity: anim.opacity,
              }}
            >
              <KindnessCoin size={32} />
            </Animated.View>
          ))}

          {/* Main Kindness Coin */}
          <Animated.View
            style={{
              transform: [
                { scale: mainCoinScale },
                { rotate: mainCoinRotate.interpolate({
                  inputRange: [0, 2],
                  outputRange: ['0deg', '720deg'],
                })},
              ],
            }}
          >
            <KindnessCoin size={asModal ? 140 : 100} showGlow />
          </Animated.View>
        </Animated.View>

        {/* Text */}
        <Animated.View style={[
          styles.textBox,
          {
            transform: [{ scale: textScale }],
            opacity: textOpacity,
          }
        ]}>
          <Text style={asModal ? styles.titleLarge : styles.titleSmall}>
            {celebrationText.title}
          </Text>
          {recipientUsername ? (
            <Text style={styles.recipientText}>to @{recipientUsername}</Text>
          ) : null}
          <Text style={[styles.message, { color: colors.text.secondary }]}>{celebrationText.message}</Text>
        </Animated.View>

        {/* Amount text */}
        <Animated.View style={[
          styles.amountContainer,
          {
            transform: [{ scale: textScale }],
            opacity: textOpacity,
          }
        ]}>
          <Text style={styles.amountText}>+{displayAmount}</Text>
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={[styles.hint, { color: colors.text.secondary }]}>Tap to continue</Text>
        </Animated.View>

        {/* Bloom bush — full width with 3 independent movement groups */}
        <View style={styles.flowerBed}>
          <FlowerBush
            width={bushWidth}
            screenHeight={screenHeight}
            bloomProgress={bloomProgress}
            groups={flowerGroups}
            rows={bushRows}
            colors={[
              { petals: '#FBBF24', center: '#F59E0B' },
              { petals: '#10B981', center: '#FCD34D' },
              { petals: '#FCD34D', center: '#D97706' },
              { petals: '#059669', center: '#FBBF24' },
              { petals: '#F59E0B', center: '#92400E' },
              { petals: '#34D399', center: '#F59E0B' },
              { petals: '#FDE68A', center: '#B45309' },
            ]}
          />
        </View>

        {/* Flower fireworks — flowers shoot up from bottom and explode */}
        {flowerFireworks.map((fw, fwIndex) => {
          const petalColors = [
            { petals: '#FBBF24', center: '#F59E0B' },
            { petals: '#10B981', center: '#FCD34D' },
            { petals: '#FCD34D', center: '#D97706' },
            { petals: '#059669', center: '#FBBF24' },
            { petals: '#34D399', center: '#F59E0B' },
          ];
          const mainFlower = petalColors[fwIndex];
          return (
            <View key={`ffw-${fwIndex}`} style={{
              position: 'absolute',
              bottom: 80,
              left: screenWidth / 2,
            }}>
              {/* Rising flower */}
              <Animated.View style={{
                position: 'absolute',
                transform: [
                  { translateX: fw.rocketX },
                  { translateY: fw.rocketY },
                ],
                opacity: fw.rocketOpacity,
              }}>
                <SingleFlower petalColor={mainFlower.petals} centerColor={mainFlower.center} size={36} x={0} y={0} />
              </Animated.View>
              {/* Explosion — flowers burst outward */}
              {fw.sparks.map((s, si) => {
                const sparkFlower = petalColors[(fwIndex + si) % petalColors.length];
                return (
                  <Animated.View
                    key={`ffs-${fwIndex}-${si}`}
                    style={{
                      position: 'absolute',
                      transform: [
                        { translateX: Animated.add(fw.rocketX, s.translateX) },
                        { translateY: Animated.add(fw.rocketY, s.translateY) },
                        { scale: s.scale },
                      ],
                      opacity: s.opacity,
                    }}
                  >
                    <SingleFlower petalColor={sparkFlower.petals} centerColor={sparkFlower.center} size={24} x={0} y={0} />
                  </Animated.View>
                );
              })}
            </View>
          );
        })}
      </TouchableOpacity>
    </Animated.View>
  );

  if (!visible) return null;

  if (asModal) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        {renderContent()}
      </Modal>
    );
  }

  return renderContent();
}

export default React.memo(CoinCelebration);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineOverlay: {
    position: 'absolute',
    top: -200,
    left: -80,
    right: -20,
    bottom: -200,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderRadius: 20,
  },
  touchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinGroup: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  fireworkOrigin: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  rocket: {
    position: 'absolute',
    width: 4,
    height: 12,
    borderRadius: 2,
  },
  spark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  amountContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  amountText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#10B981',
    textShadowColor: 'rgba(16, 185, 129, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  textBox: {
    marginTop: 30,
    alignItems: 'center',
  },
  titleLarge: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 8,
    textShadowColor: 'rgba(251, 191, 36, 0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  titleSmall: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  recipientText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBBF24',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    marginTop: 24,
  },
  flowerBed: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    right: -20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});
