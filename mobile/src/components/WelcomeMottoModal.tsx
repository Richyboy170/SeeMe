import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive breakpoints
const isLarge = SCREEN_WIDTH >= 768;   // tablets / iPads
const isMedium = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768; // larger phones (Plus/Max/Pro Max)

interface WelcomeMottoModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WelcomeMottoModal({ visible, onClose }: WelcomeMottoModalProps) {
  // Phase 1: Background fade
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2: Heart seeds
  const heart1Y = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;
  const heart2Y = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;
  const heart3Y = useRef(new Animated.Value(SCREEN_HEIGHT * 0.4)).current;
  const heartSpread = isLarge ? 80 : isMedium ? 68 : 60;
  const heart1X = useRef(new Animated.Value(-heartSpread)).current;
  const heart2X = useRef(new Animated.Value(0)).current;
  const heart3X = useRef(new Animated.Value(heartSpread)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const soilOpacity = useRef(new Animated.Value(0)).current;

  // Phase 3: Growing tree
  const stemHeight = useRef(new Animated.Value(0)).current;
  const leaf1Opacity = useRef(new Animated.Value(0)).current;
  const leaf1Scale = useRef(new Animated.Value(0)).current;
  const leaf2Opacity = useRef(new Animated.Value(0)).current;
  const leaf2Scale = useRef(new Animated.Value(0)).current;
  const leaf3Opacity = useRef(new Animated.Value(0)).current;
  const leaf3Scale = useRef(new Animated.Value(0)).current;
  const topHeartOpacity = useRef(new Animated.Value(0)).current;
  const topHeartScale = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  // Phase 4: Text reveals
  const primaryTextOpacity = useRef(new Animated.Value(0)).current;
  const primaryTextY = useRef(new Animated.Value(20)).current;
  const secondaryTextOpacity = useRef(new Animated.Value(0)).current;
  const secondaryTextY = useRef(new Animated.Value(20)).current;
  const perk1Opacity = useRef(new Animated.Value(0)).current;
  const perk1Y = useRef(new Animated.Value(20)).current;
  const perk2Opacity = useRef(new Animated.Value(0)).current;
  const perk2Y = useRef(new Animated.Value(20)).current;
  const perk3Opacity = useRef(new Animated.Value(0)).current;
  const perk3Y = useRef(new Animated.Value(20)).current;

  // Phase 5: Button + particles
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  const particle1Opacity = useRef(new Animated.Value(0)).current;
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle2Opacity = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;

  // Dismiss animation
  const dismissOpacity = useRef(new Animated.Value(1)).current;

  // Sparkle pulse loop ref
  const sparkleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  // Particle loop ref
  const particleLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      resetAnimations();
      runAnimations();
    }
  }, [visible]);

  const resetAnimations = () => {
    bgOpacity.setValue(0);
    heart1Y.setValue(SCREEN_HEIGHT * 0.4);
    heart2Y.setValue(SCREEN_HEIGHT * 0.4);
    heart3Y.setValue(SCREEN_HEIGHT * 0.4);
    heart1X.setValue(-heartSpread);
    heart2X.setValue(0);
    heart3X.setValue(heartSpread);
    heartScale.setValue(1);
    heartOpacity.setValue(0);
    soilOpacity.setValue(0);
    stemHeight.setValue(0);
    leaf1Opacity.setValue(0);
    leaf1Scale.setValue(0);
    leaf2Opacity.setValue(0);
    leaf2Scale.setValue(0);
    leaf3Opacity.setValue(0);
    leaf3Scale.setValue(0);
    topHeartOpacity.setValue(0);
    topHeartScale.setValue(0);
    sparkleOpacity.setValue(0);
    primaryTextOpacity.setValue(0);
    primaryTextY.setValue(20);
    secondaryTextOpacity.setValue(0);
    secondaryTextY.setValue(20);
    perk1Opacity.setValue(0);
    perk1Y.setValue(20);
    perk2Opacity.setValue(0);
    perk2Y.setValue(20);
    perk3Opacity.setValue(0);
    perk3Y.setValue(20);
    buttonOpacity.setValue(0);
    buttonScale.setValue(0.8);
    particle1Opacity.setValue(0);
    particle1Y.setValue(0);
    particle2Opacity.setValue(0);
    particle2Y.setValue(0);
    dismissOpacity.setValue(1);
  };

  const runAnimations = () => {
    // Phase 1: Background fade in (0-500ms)
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Phase 2: Heart seeds (500-1500ms)
    setTimeout(() => {
      // Hearts appear
      Animated.timing(heartOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Hearts rise and converge to center
      Animated.parallel([
        Animated.timing(heart1Y, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(heart2Y, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(heart3Y, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(heart1X, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(heart3X, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();

      // Hearts shrink into soil
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(heartScale, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(soilOpacity, { toValue: 1, duration: 300, useNativeDriver: false }),
        ]).start();
      }, 600);
    }, 500);

    // Phase 3: Growing tree (1500-2800ms)
    setTimeout(() => {
      // Stem grows
      Animated.timing(stemHeight, {
        toValue: isLarge ? 160 : isMedium ? 148 : 140,
        duration: 600,
        useNativeDriver: false,
      }).start();

      // Leaves sprout (staggered)
      setTimeout(() => {
        Animated.spring(leaf1Scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
        Animated.timing(leaf1Opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }, 200);

      setTimeout(() => {
        Animated.spring(leaf2Scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
        Animated.timing(leaf2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }, 400);

      setTimeout(() => {
        Animated.spring(leaf3Scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
        Animated.timing(leaf3Opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }, 600);

      // Golden heart blooms at top
      setTimeout(() => {
        Animated.spring(topHeartScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
        Animated.timing(topHeartOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

        // Sparkle pulse loop
        const sparkleLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(sparkleOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          ])
        );
        sparkleLoopRef.current = sparkleLoop;
        sparkleLoop.start();
      }, 700);
    }, 1500);

    // Phase 4: Text reveals (2800-4500ms)
    setTimeout(() => {
      // Primary text
      Animated.parallel([
        Animated.spring(primaryTextY, { toValue: 0, friction: 6, useNativeDriver: true }),
        Animated.timing(primaryTextOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      // Secondary text (staggered)
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(secondaryTextY, { toValue: 0, friction: 6, useNativeDriver: true }),
          Animated.timing(secondaryTextOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 400);

      // Perk 1 (staggered)
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(perk1Y, { toValue: 0, friction: 6, useNativeDriver: true }),
          Animated.timing(perk1Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 700);

      // Perk 2
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(perk2Y, { toValue: 0, friction: 6, useNativeDriver: true }),
          Animated.timing(perk2Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 1000);

      // Perk 3
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(perk3Y, { toValue: 0, friction: 6, useNativeDriver: true }),
          Animated.timing(perk3Opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 1300);
    }, 2800);

    // Phase 5: Button + floating particles (5000ms+)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();

      // Floating particles loop
      const particleLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(particle1Opacity, { toValue: 0.7, duration: 1500, useNativeDriver: true }),
            Animated.timing(particle1Opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(particle1Y, { toValue: -80, duration: 3000, useNativeDriver: true }),
            Animated.timing(particle1Y, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(particle2Opacity, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
            Animated.timing(particle2Opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(particle2Y, { toValue: -60, duration: 3000, useNativeDriver: true }),
            Animated.timing(particle2Y, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      particleLoopRef.current = particleLoop;
      particleLoop.start();
    }, 5000);
  };

  const handleDismiss = () => {
    // Stop loops
    sparkleLoopRef.current?.stop();
    particleLoopRef.current?.stop();

    Animated.timing(dismissOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: dismissOpacity }]}>
        {/* Phase 1: Gradient background */}
        <Animated.View style={[styles.background, { opacity: bgOpacity }]}>
          <View style={styles.gradientTop} />
          <View style={styles.gradientMiddle} />
          <View style={styles.gradientBottom} />
        </Animated.View>

        {/* Floating particles (Phase 5) */}
        <Animated.View
          style={[
            styles.particle,
            { left: SCREEN_WIDTH * 0.2, top: SCREEN_HEIGHT * 0.3 },
            { opacity: particle1Opacity, transform: [{ translateY: particle1Y }] },
          ]}
        >
          <Ionicons name="leaf" size={16} color="#4ade80" />
        </Animated.View>
        <Animated.View
          style={[
            styles.particle,
            { right: SCREEN_WIDTH * 0.15, top: SCREEN_HEIGHT * 0.25 },
            { opacity: particle2Opacity, transform: [{ translateY: particle2Y }] },
          ]}
        >
          <Ionicons name="sparkles" size={14} color="#fbbf24" />
        </Animated.View>
        {/* Extra particles for large screens */}
        {isLarge && (
          <>
            <Animated.View
              style={[
                styles.particle,
                { left: SCREEN_WIDTH * 0.1, top: SCREEN_HEIGHT * 0.15 },
                { opacity: particle2Opacity, transform: [{ translateY: particle2Y }] },
              ]}
            >
              <Ionicons name="heart" size={18} color="#fbbf2480" />
            </Animated.View>
            <Animated.View
              style={[
                styles.particle,
                { right: SCREEN_WIDTH * 0.08, top: SCREEN_HEIGHT * 0.4 },
                { opacity: particle1Opacity, transform: [{ translateY: particle1Y }] },
              ]}
            >
              <Ionicons name="leaf" size={20} color="#4ade8060" />
            </Animated.View>
          </>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Tree area */}
          <View style={[styles.treeContainer, {
            height: isLarge ? 250 : isMedium ? 230 : 220,
            marginBottom: isLarge ? 36 : 30,
          }]}>
            {/* Phase 2: Heart seeds */}
            <Animated.View
              style={[
                styles.heartSeed,
                { bottom: 30 },
                {
                  opacity: heartOpacity,
                  transform: [
                    { translateX: heart1X },
                    { translateY: heart1Y },
                    { scale: heartScale },
                  ],
                },
              ]}
            >
              <Ionicons name="heart" size={isLarge ? 28 : 24} color="#fbbf24" />
            </Animated.View>
            <Animated.View
              style={[
                styles.heartSeed,
                { bottom: 30 },
                {
                  opacity: heartOpacity,
                  transform: [
                    { translateX: heart2X },
                    { translateY: heart2Y },
                    { scale: heartScale },
                  ],
                },
              ]}
            >
              <Ionicons name="heart" size={isLarge ? 28 : 24} color="#fbbf24" />
            </Animated.View>
            <Animated.View
              style={[
                styles.heartSeed,
                { bottom: 30 },
                {
                  opacity: heartOpacity,
                  transform: [
                    { translateX: heart3X },
                    { translateY: heart3Y },
                    { scale: heartScale },
                  ],
                },
              ]}
            >
              <Ionicons name="heart" size={isLarge ? 28 : 24} color="#fbbf24" />
            </Animated.View>

            {/* Soil band */}
            <Animated.View
              style={[
                styles.soil,
                { width: isLarge ? 140 : 120, height: 12, borderRadius: 6, bottom: 20 },
                { opacity: soilOpacity },
              ]}
            />

            {/* Phase 3: Stem */}
            <Animated.View
              style={[
                styles.stem,
                { width: isLarge ? 5 : 4, borderRadius: 2, bottom: 26 },
                { height: stemHeight },
              ]}
            />

            {/* Leaves */}
            <Animated.View
              style={[
                styles.leaf,
                { bottom: isLarge ? 100 : 90, left: SCREEN_WIDTH / 2 - 30 },
                { opacity: leaf1Opacity, transform: [{ scale: leaf1Scale }, { rotate: '-30deg' }] },
              ]}
            >
              <Ionicons name="leaf" size={isLarge ? 26 : 22} color="#4ade80" />
            </Animated.View>
            <Animated.View
              style={[
                styles.leaf,
                { bottom: isLarge ? 124 : 110, right: SCREEN_WIDTH / 2 - 30 },
                { opacity: leaf2Opacity, transform: [{ scale: leaf2Scale }, { rotate: '30deg' }] },
              ]}
            >
              <Ionicons name="leaf" size={isLarge ? 26 : 22} color="#22c55e" />
            </Animated.View>
            <Animated.View
              style={[
                styles.leaf,
                { bottom: isLarge ? 148 : 130, left: SCREEN_WIDTH / 2 - 25 },
                { opacity: leaf3Opacity, transform: [{ scale: leaf3Scale }, { rotate: '-20deg' }] },
              ]}
            >
              <Ionicons name="leaf" size={isLarge ? 22 : 18} color="#86efac" />
            </Animated.View>

            {/* Top golden heart */}
            <Animated.View
              style={[
                styles.topHeart,
                { bottom: isLarge ? 172 : 155 },
                { opacity: topHeartOpacity, transform: [{ scale: topHeartScale }] },
              ]}
            >
              <Ionicons name="heart" size={isLarge ? 42 : 36} color="#fbbf24" />
              {/* Sparkles */}
              <Animated.View style={[styles.sparkle, { left: -16, top: 2 }, { opacity: sparkleOpacity }]}>
                <Ionicons name="sparkles" size={14} color="#fde68a" />
              </Animated.View>
              <Animated.View style={[styles.sparkle, { right: -14, top: 6 }, { opacity: sparkleOpacity }]}>
                <Ionicons name="sparkles" size={12} color="#fde68a" />
              </Animated.View>
              <Animated.View style={[styles.sparkle, { top: -12, left: 10 }, { opacity: sparkleOpacity }]}>
                <Ionicons name="sparkles" size={10} color="#fde68a" />
              </Animated.View>
            </Animated.View>
          </View>

          {/* Phase 4: Text content */}
          <View style={styles.textContainer}>
            <Animated.Text
              style={[
                styles.primaryText,
                {
                  fontSize: isLarge ? 26 : isMedium ? 24 : 22,
                  lineHeight: isLarge ? 36 : isMedium ? 33 : 30,
                  marginBottom: isLarge ? 12 : 16,
                },
                { opacity: primaryTextOpacity, transform: [{ translateY: primaryTextY }] },
              ]}
            >
              It is more blessed to give{'\n'}than to receive
            </Animated.Text>
            <Animated.Text
              style={[
                styles.citationText,
                {
                  fontSize: isLarge ? 15 : 13,
                  marginBottom: isLarge ? 18 : 14,
                },
                { opacity: primaryTextOpacity, transform: [{ translateY: primaryTextY }] },
              ]}
            >
              — Acts 20:35
            </Animated.Text>

            <Animated.Text
              style={[
                styles.secondaryText,
                {
                  fontSize: isLarge ? 18 : isMedium ? 17 : 16,
                  lineHeight: isLarge ? 26 : isMedium ? 24 : 22,
                  marginBottom: isLarge ? 20 : 14,
                },
                { opacity: secondaryTextOpacity, transform: [{ translateY: secondaryTextY }] },
              ]}
            >
              Giving Positivity to your friends{'\n'}is our Mission
            </Animated.Text>

            {/* Perks — card grid on tablet, stacked rows on phones */}
            {isLarge ? (
              <View style={styles.perksGrid}>
                <Animated.View
                  style={[
                    styles.perkCard,
                    { opacity: perk1Opacity, transform: [{ translateY: perk1Y }] },
                  ]}
                >
                  <Ionicons name="battery-dead-outline" size={28} color="#c084fc" style={styles.perkCardIcon} />
                  <Text style={[styles.perkTitle, { fontSize: 16, marginBottom: 6 }]}>Detox</Text>
                  <Text style={[styles.perkDesc, { fontSize: 14, lineHeight: 20 }]}>No reels = No dopamine addiction</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.perkCard,
                    { opacity: perk2Opacity, transform: [{ translateY: perk2Y }] },
                  ]}
                >
                  <Ionicons name="people-outline" size={28} color="#fbbf24" style={styles.perkCardIcon} />
                  <Text style={[styles.perkTitle, { fontSize: 16, marginBottom: 6 }]}>Relationships</Text>
                  <Text style={[styles.perkDesc, { fontSize: 14, lineHeight: 20 }]}>Give and receive from friends to build your friendship bond</Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.perkCard,
                    { opacity: perk3Opacity, transform: [{ translateY: perk3Y }] },
                  ]}
                >
                  <Ionicons name="trending-up-outline" size={28} color="#4ade80" style={styles.perkCardIcon} />
                  <Text style={[styles.perkTitle, { fontSize: 16, marginBottom: 6 }]}>Grow Together</Text>
                  <Text style={[styles.perkDesc, { fontSize: 14, lineHeight: 20 }]}>Share your routine — let them encourage you!</Text>
                </Animated.View>
              </View>
            ) : (
              <>
                <Animated.View
                  style={[
                    styles.perkRow,
                    { marginBottom: isMedium ? 14 : 12 },
                    { opacity: perk1Opacity, transform: [{ translateY: perk1Y }] },
                  ]}
                >
                  <Ionicons name="battery-dead-outline" size={isMedium ? 20 : 18} color="#c084fc" style={[styles.perkIcon, { marginRight: 10 }]} />
                  <View style={styles.perkTextWrap}>
                    <Text style={[styles.perkTitle, { fontSize: isMedium ? 15 : 14 }]}>Detox</Text>
                    <Text style={[styles.perkDesc, { fontSize: isMedium ? 13 : 12, lineHeight: isMedium ? 18 : 17 }]}>No reels = No dopamine addiction</Text>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.perkRow,
                    { marginBottom: isMedium ? 14 : 12 },
                    { opacity: perk2Opacity, transform: [{ translateY: perk2Y }] },
                  ]}
                >
                  <Ionicons name="people-outline" size={isMedium ? 20 : 18} color="#fbbf24" style={[styles.perkIcon, { marginRight: 10 }]} />
                  <View style={styles.perkTextWrap}>
                    <Text style={[styles.perkTitle, { fontSize: isMedium ? 15 : 14 }]}>Relationships</Text>
                    <Text style={[styles.perkDesc, { fontSize: isMedium ? 13 : 12, lineHeight: isMedium ? 18 : 17 }]}>Give and receive from friends to build consistency in your friendship bond</Text>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.perkRow,
                    { marginBottom: isMedium ? 14 : 12 },
                    { opacity: perk3Opacity, transform: [{ translateY: perk3Y }] },
                  ]}
                >
                  <Ionicons name="trending-up-outline" size={isMedium ? 20 : 18} color="#4ade80" style={[styles.perkIcon, { marginRight: 10 }]} />
                  <View style={styles.perkTextWrap}>
                    <Text style={[styles.perkTitle, { fontSize: isMedium ? 15 : 14 }]}>Grow & Breakthrough Together</Text>
                    <Text style={[styles.perkDesc, { fontSize: isMedium ? 13 : 12, lineHeight: isMedium ? 18 : 17 }]}>Share your work and daily routine with your people — let them encourage you!</Text>
                  </View>
                </Animated.View>
              </>
            )}
          </View>

          {/* Phase 5: Start Giving button */}
          <Animated.View
            style={[
              styles.buttonContainer,
              { marginTop: isLarge ? 16 : 10, marginBottom: isLarge ? 50 : 40 },
              { opacity: buttonOpacity, transform: [{ scale: buttonScale }] },
            ]}
          >
            <TouchableOpacity style={styles.button} onPress={handleDismiss} activeOpacity={0.8}>
              <View style={[styles.buttonGradient, {
                paddingVertical: isLarge ? 16 : 14,
                paddingHorizontal: isLarge ? 48 : 40,
                borderRadius: 28,
              }]}>
                <Ionicons name="heart" size={isLarge ? 22 : 20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.buttonText, { fontSize: isLarge ? 20 : 18 }]}>Start Giving</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientTop: {
    flex: 1,
    backgroundColor: '#1a0a2e',
  },
  gradientMiddle: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  gradientBottom: {
    flex: 1,
    backgroundColor: '#0f3460',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isLarge ? 50 : 40,
    paddingHorizontal: isLarge ? 60 : isMedium ? 24 : 0,
    width: '100%',
  },
  particle: {
    position: 'absolute',
    zIndex: 10,
  },
  treeContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heartSeed: {
    position: 'absolute',
    zIndex: 5,
  },
  soil: {
    backgroundColor: '#92400e',
    position: 'absolute',
    zIndex: 3,
  },
  stem: {
    backgroundColor: '#22c55e',
    position: 'absolute',
    zIndex: 4,
  },
  leaf: {
    position: 'absolute',
    zIndex: 5,
  },
  topHeart: {
    position: 'absolute',
    zIndex: 6,
  },
  sparkle: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: isLarge ? 20 : 30,
    marginBottom: isLarge ? 36 : 30,
    alignSelf: 'stretch',
  },
  primaryText: {
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: '#fbbf24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  citationText: {
    fontStyle: 'italic',
    color: 'rgba(251, 191, 36, 0.7)',
    textAlign: 'center',
  },
  secondaryText: {
    fontWeight: '600',
    color: '#86efac',
    textAlign: 'center',
  },
  // Stacked perk rows (phone layout)
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
  },
  perkIcon: {
    marginTop: 2,
  },
  perkTextWrap: {
    flex: 1,
  },
  // Grid perk cards (tablet/large layout)
  perksGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: isLarge ? 20 : 14,
    marginTop: isLarge ? 16 : 10,
    alignSelf: 'stretch',
  },
  perkCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: isLarge ? 18 : 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: isLarge ? 22 : 14,
    alignItems: 'center',
  },
  perkCardIcon: {
    marginBottom: isLarge ? 12 : 8,
  },
  perkTitle: {
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
  },
  perkDesc: {
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
  },
  buttonContainer: {},
  button: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#833AB4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#833AB4',
    borderWidth: 2,
    borderColor: '#E1306C',
  },
  buttonIcon: {},
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
