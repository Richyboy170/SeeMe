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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
      return { title: 'Kindness Sent!', message: "You're spreading positivity!" };
    case 'received':
      return { title: 'Coins Received!', message: 'Someone appreciated you!' };
    default:
      return { title: 'Coins Earned!', message: 'Keep being awesome!' };
  }
};

// Custom Kindness Coin Component
const KindnessCoin = ({ size, style }: { size: number; style?: any }) => {
  const innerSize = size * 0.85;
  const faceSize = size * 0.75;
  const heartSize = size * 0.35;
  const leafSize = size * 0.17;

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      {/* Outer glow */}
      <View style={[coinStyles.coinGlow, { width: size, height: size, borderRadius: size / 2 }]} />

      {/* Coin rim */}
      <LinearGradient
        colors={['#FDE68A', '#FBBF24', '#F59E0B']}
        style={[coinStyles.coinRim, { width: size, height: size, borderRadius: size / 2 }]}
      >
        {/* Inner circle */}
        <View style={[coinStyles.coinInner, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
          {/* Coin face */}
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A', '#FBBF24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[coinStyles.coinFace, { width: faceSize, height: faceSize, borderRadius: faceSize / 2 }]}
          >
            {/* Heart with leaves - Kindness symbol */}
            <View style={coinStyles.symbolContainer}>
              <Ionicons
                name="leaf"
                size={leafSize}
                color="rgba(255, 255, 255, 0.9)"
                style={[coinStyles.leafLeft, { marginRight: -leafSize * 0.3, marginTop: -leafSize * 0.5 }]}
              />
              <Ionicons name="heart" size={heartSize} color="#FFF" />
              <Ionicons
                name="leaf"
                size={leafSize}
                color="rgba(255, 255, 255, 0.9)"
                style={[coinStyles.leafRight, { marginLeft: -leafSize * 0.3, marginTop: -leafSize * 0.5 }]}
              />
            </View>

            {/* Shine effect */}
            <View style={[coinStyles.shine, { width: faceSize * 0.35, height: faceSize * 0.6 }]} />
          </LinearGradient>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const coinStyles = StyleSheet.create({
  coinGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
  },
  coinRim: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  coinInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  coinFace: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafLeft: {
    transform: [{ rotate: '-45deg' }],
  },
  leafRight: {
    transform: [{ rotate: '45deg' }, { scaleX: -1 }],
  },
  shine: {
    position: 'absolute',
    top: -10,
    left: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ rotate: '35deg' }],
  },
});

export default function CoinCelebration({
  visible,
  amount,
  source,
  recipientUsername,
  onClose,
  asModal = true,
}: CoinCelebrationProps) {
  // Animation refs
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const mainCoinScale = useRef(new Animated.Value(0)).current;
  const mainCoinRotate = useRef(new Animated.Value(0)).current;
  const mainCoinBounce = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

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

  // Confetti particles
  const confetti = useRef(
    Array.from({ length: 20 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotation: new Animated.Value(0),
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

    flyingCoins.forEach(anim => {
      anim.translateX.setValue(0);
      anim.translateY.setValue(0);
      anim.opacity.setValue(0);
      anim.scale.setValue(0.3);
      anim.rotation.setValue(0);
    });

    confetti.forEach(anim => {
      anim.translateX.setValue(0);
      anim.translateY.setValue(0);
      anim.opacity.setValue(0);
      anim.rotation.setValue(0);
    });

    // Fade in overlay
    Animated.timing(celebrationOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Main coin entrance - bounce in with spin
    Animated.sequence([
      Animated.parallel([
        Animated.spring(mainCoinScale, {
          toValue: 1.2,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(mainCoinRotate, {
          toValue: 2,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(mainCoinScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    // Coin bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(mainCoinBounce, {
          toValue: -15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(mainCoinBounce, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 4 }
    ).start();

    // Glow pulse
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
      { iterations: 4 }
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

    // Sparkle pulse
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
      { iterations: 6 }
    ).start();

    // Flying mini coins bursting out
    flyingCoins.forEach((anim, index) => {
      const angle = (index / flyingCoins.length) * Math.PI * 2;
      const distance = 100 + Math.random() * 60;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance - 50;

      Animated.sequence([
        Animated.delay(150 + index * 40),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 0.8 + Math.random() * 0.4,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: targetX,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(anim.translateY, {
              toValue: targetY - 30,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: targetY + 100,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim.rotation, {
            toValue: 3 + Math.random() * 2,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Confetti burst
    confetti.forEach((anim, index) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 150 + Math.random() * 100;
      const targetX = Math.cos(angle) * distance;

      Animated.sequence([
        Animated.delay(200 + index * 20),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: targetX,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 300 + Math.random() * 100,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotation, {
            toValue: 5 + Math.random() * 5,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Auto close after 3 seconds
    autoCloseTimeout.current = setTimeout(() => {
      handleClose();
    }, 3000);
  };

  const handleClose = () => {
    if (autoCloseTimeout.current) {
      clearTimeout(autoCloseTimeout.current);
      autoCloseTimeout.current = null;
    }

    Animated.timing(celebrationOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const celebrationText = getCelebrationText(source);
  const confettiColors = ['#FBBF24', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#3B82F6'];

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
        {/* Confetti particles */}
        {confetti.map((anim, index) => (
          <Animated.View
            key={`confetti-${index}`}
            style={[
              styles.confetti,
              {
                backgroundColor: confettiColors[index % confettiColors.length],
                transform: [
                  { translateX: anim.translateX },
                  { translateY: anim.translateY },
                  { rotate: anim.rotation.interpolate({
                    inputRange: [0, 10],
                    outputRange: ['0deg', '3600deg'],
                  })},
                ],
                opacity: anim.opacity,
              },
            ]}
          />
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

        {/* Flying mini coins with Kindness design */}
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
            <View style={styles.miniCoin}>
              <LinearGradient
                colors={['#FDE68A', '#FBBF24']}
                style={styles.miniCoinGradient}
              >
                <View style={styles.miniCoinSymbol}>
                  <Ionicons name="leaf" size={5} color="rgba(255,255,255,0.9)" style={styles.miniLeafLeft} />
                  <Ionicons name="heart" size={12} color="#FFF" />
                  <Ionicons name="leaf" size={5} color="rgba(255,255,255,0.9)" style={styles.miniLeafRight} />
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        ))}

        {/* Main Kindness Coin */}
        <Animated.View
          style={{
            transform: [
              { scale: mainCoinScale },
              { translateY: mainCoinBounce },
              { rotate: mainCoinRotate.interpolate({
                inputRange: [0, 2],
                outputRange: ['0deg', '720deg'],
              })},
            ],
          }}
        >
          <KindnessCoin size={asModal ? 140 : 100} />
        </Animated.View>

        {/* Amount badge */}
        <Animated.View style={[
          styles.amountBadge,
          {
            transform: [{ scale: textScale }],
            opacity: textOpacity,
          }
        ]}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.amountBadgeGradient}
          >
            <Text style={styles.amountBadgeText}>+{amount}</Text>
          </LinearGradient>
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
          <Text style={styles.message}>{celebrationText.message}</Text>
          <Text style={styles.hint}>Tap to continue</Text>
        </Animated.View>
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
  confetti: {
    position: 'absolute',
    width: 8,
    height: 16,
    borderRadius: 2,
  },
  miniCoin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  miniCoinGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  miniCoinSymbol: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLeafLeft: {
    transform: [{ rotate: '-45deg' }],
    marginRight: -2,
    marginTop: -3,
  },
  miniLeafRight: {
    transform: [{ rotate: '45deg' }, { scaleX: -1 }],
    marginLeft: -2,
    marginTop: -3,
  },
  amountBadge: {
    position: 'absolute',
    top: '35%',
    right: '25%',
  },
  amountBadgeGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  amountBadgeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
  },
  textBox: {
    marginTop: 40,
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
    color: '#9CA3AF',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 20,
  },
});
