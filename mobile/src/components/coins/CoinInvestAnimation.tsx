import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import KindnessCoin from './KindnessCoin';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoinInvestAnimationProps {
  visible: boolean;
  amount: number;
  onComplete: () => void;
}


export default function CoinInvestAnimation({
  visible,
  amount,
  onComplete,
}: CoinInvestAnimationProps) {
  const { colors, isDark } = useTheme();
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // 3 coins rising from bottom
  const coins = useRef(
    Array.from({ length: 3 }, () => ({
      translateY: new Animated.Value(SCREEN_HEIGHT * 0.5),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(1),
    }))
  ).current;

  // Soil band
  const soilOpacity = useRef(new Animated.Value(0)).current;

  // Impact pulses
  const impactPulses = useRef(
    Array.from({ length: 3 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // Sprout growth
  const sproutScale = useRef(new Animated.Value(0)).current;
  const sproutOpacity = useRef(new Animated.Value(0)).current;
  const sproutTranslateY = useRef(new Animated.Value(20)).current;

  // Sparkles around sprout
  const sparkles = useRef(
    Array.from({ length: 6 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      translateY: new Animated.Value(0),
    }))
  ).current;

  // Text
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.8)).current;

  const autoCloseTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      playAnimation();
    }
    return () => {
      if (autoCloseTimeout.current) clearTimeout(autoCloseTimeout.current);
    };
  }, [visible]);

  const playAnimation = () => {
    // Reset
    overlayOpacity.setValue(0);
    soilOpacity.setValue(0);
    sproutScale.setValue(0);
    sproutOpacity.setValue(0);
    sproutTranslateY.setValue(20);
    textOpacity.setValue(0);
    textScale.setValue(0.8);

    coins.forEach(c => {
      c.translateY.setValue(SCREEN_HEIGHT * 0.5);
      c.translateX.setValue(0);
      c.opacity.setValue(0);
      c.scale.setValue(1);
    });

    impactPulses.forEach(p => {
      p.scale.setValue(0);
      p.opacity.setValue(0);
    });

    sparkles.forEach(s => {
      s.opacity.setValue(0);
      s.scale.setValue(0);
      s.translateY.setValue(0);
    });

    // Fade in overlay
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Phase 1 (0-600ms): Coins rise from bottom with stagger
    coins.forEach((coin, i) => {
      const xOffset = (i - 1) * 40; // -40, 0, 40

      Animated.sequence([
        Animated.delay(i * 120),
        Animated.parallel([
          Animated.timing(coin.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(coin.translateY, {
            toValue: -40,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(coin.translateX, {
            toValue: xOffset,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Show soil band at 400ms
    Animated.sequence([
      Animated.delay(400),
      Animated.timing(soilOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2 (600-1200ms): Coins arc down into soil and disappear
    coins.forEach((coin, i) => {
      Animated.sequence([
        Animated.delay(600 + i * 80),
        Animated.parallel([
          Animated.timing(coin.translateY, {
            toValue: 60,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(coin.scale, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(coin.opacity, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();

      // Impact pulse when coin hits soil
      Animated.sequence([
        Animated.delay(900 + i * 80),
        Animated.parallel([
          Animated.timing(impactPulses[i].scale, {
            toValue: 1.5,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(impactPulses[i].opacity, {
              toValue: 0.8,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(impactPulses[i].opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    });

    // Phase 3 (1200-2200ms): Sprout grows from soil
    Animated.sequence([
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(sproutOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sproutScale, {
          toValue: 1,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(sproutTranslateY, {
          toValue: -30,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Sparkles around the growing sprout
    sparkles.forEach((sparkle, i) => {
      Animated.sequence([
        Animated.delay(1400 + i * 100),
        Animated.parallel([
          Animated.timing(sparkle.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(sparkle.scale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle.translateY, {
            toValue: -20 - Math.random() * 30,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(sparkle.opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Phase 4 (2200-3000ms): Text fades in, then everything fades out
    Animated.sequence([
      Animated.delay(2200),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(textScale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Auto-close and fade out
    autoCloseTimeout.current = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, 3000);
  };

  const handleSkip = () => {
    if (autoCloseTimeout.current) {
      clearTimeout(autoCloseTimeout.current);
      autoCloseTimeout.current = null;
    }
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  if (!visible) return null;

  const soilY = SCREEN_HEIGHT * 0.52;
  const sparkleColors = ['#10B981', '#34D399', '#6EE7B7', '#FBBF24', '#A7F3D0', '#059669'];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleSkip}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={handleSkip}>
          {/* Soil band */}
          <Animated.View style={[styles.soilContainer, { top: soilY, opacity: soilOpacity }]}>
            <LinearGradient
              colors={['#92400E', '#78350F', '#451A03']}
              style={styles.soilGradient}
            />
          </Animated.View>

          {/* Rising coins */}
          {coins.map((coin, i) => (
            <Animated.View
              key={`invest-coin-${i}`}
              style={[
                styles.coinPosition,
                {
                  top: soilY - 60,
                  transform: [
                    { translateX: coin.translateX },
                    { translateY: coin.translateY },
                    { scale: coin.scale },
                  ],
                  opacity: coin.opacity,
                },
              ]}
            >
              <KindnessCoin size={50} />
            </Animated.View>
          ))}

          {/* Impact pulses at soil level */}
          {impactPulses.map((pulse, i) => (
            <Animated.View
              key={`pulse-${i}`}
              style={[
                styles.impactPulse,
                {
                  top: soilY - 5,
                  left: SCREEN_WIDTH / 2 - 20 + (i - 1) * 40,
                  transform: [{ scale: pulse.scale }],
                  opacity: pulse.opacity,
                },
              ]}
            />
          ))}

          {/* Growing sprout */}
          <Animated.View
            style={[
              styles.sproutContainer,
              {
                top: soilY - 60,
                transform: [
                  { scale: sproutScale },
                  { translateY: sproutTranslateY },
                ],
                opacity: sproutOpacity,
              },
            ]}
          >
            <Ionicons name="leaf" size={48} color="#10B981" />
            <View style={styles.stem} />
          </Animated.View>

          {/* Sparkles around sprout */}
          {sparkles.map((sparkle, i) => {
            const angle = (i / sparkles.length) * Math.PI * 2;
            const radius = 50;
            const x = Math.cos(angle) * radius;
            return (
              <Animated.View
                key={`sparkle-${i}`}
                style={{
                  position: 'absolute',
                  top: soilY - 80,
                  left: SCREEN_WIDTH / 2 + x - 8,
                  transform: [
                    { scale: sparkle.scale },
                    { translateY: sparkle.translateY },
                  ],
                  opacity: sparkle.opacity,
                }}
              >
                <Ionicons name="sparkles" size={16} color={sparkleColors[i % sparkleColors.length]} />
              </Animated.View>
            );
          })}

          {/* Text */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                top: soilY + 80,
                opacity: textOpacity,
                transform: [{ scale: textScale }],
              },
            ]}
          >
            <Text style={styles.investText}>Planting kindness</Text>
            <Text style={styles.subtitleText}>Growing friendships, one post at a time</Text>
          </Animated.View>

          {/* Skip hint */}
          <View style={styles.skipHint}>
            <Text style={[styles.skipText, { color: colors.text.secondary }]}>Tap to skip</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  touchArea: {
    flex: 1,
    width: '100%',
  },
  soilContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 40,
  },
  soilGradient: {
    flex: 1,
    borderRadius: 4,
    marginHorizontal: 40,
  },
  coinPosition: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 25,
    alignItems: 'center',
  },
  impactPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.4)',
  },
  sproutContainer: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 24,
    alignItems: 'center',
  },
  stem: {
    width: 4,
    height: 20,
    backgroundColor: '#059669',
    borderRadius: 2,
    marginTop: -8,
  },
  textContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  investText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(16, 185, 129, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#A7F3D0',
    marginTop: 8,
    textAlign: 'center',
  },
  skipHint: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
  },
});
