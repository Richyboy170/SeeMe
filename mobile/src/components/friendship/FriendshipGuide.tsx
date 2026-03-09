import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import GuideArrow from '../guide/GuideArrow';

export interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

interface GuideStep {
  key: string;
  icon: string;
  title: string;
  description: string;
}

const ALL_STEPS: GuideStep[] = [
  {
    key: 'hero',
    icon: 'hand-right-outline',
    title: 'Welcome!',
    description:
      'This is your Friendship Meetup hub. Meet friends in person, strike poses together, and earn Positivity Coins!',
  },
  {
    key: 'startButton',
    icon: 'add-circle-outline',
    title: 'Start a Meetup',
    description:
      "Tap here to create a new meetup session. You'll get a QR code and invite code to share with your friend.",
  },
  {
    key: 'joinButton',
    icon: 'scan-outline',
    title: 'Join a Meetup',
    description:
      'Got an invite? Tap here to scan a QR code or enter an invite code to join your friend\'s session.',
  },
  {
    key: 'bonds',
    icon: 'people-outline',
    title: 'Friendship Bonds',
    description:
      'Track your trust scores and streaks with friends. The more you meet, the stronger your bond grows!',
  },
  {
    key: 'recentMeetups',
    icon: 'time-outline',
    title: 'Recent Meetups',
    description:
      'View your past meetups and photo strips here. Relive your favorite moments anytime!',
  },
];

interface FriendshipGuideProps {
  visible: boolean;
  onClose: () => void;
  spotlights: Record<string, SpotlightRect>;
  isDark: boolean;
  scrollToY: (y: number) => void;
  scrollOffset: number;
  containerTop: number;
  containerHeight: number;
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
const ACCENT = '#0095F6';
const TOOLTIP_WIDTH = 280;

export default function FriendshipGuide({
  visible,
  onClose,
  spotlights,
  isDark,
  scrollToY,
  scrollOffset,
  containerTop,
  containerHeight,
}: FriendshipGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Filter steps whose spotlights exist
  const steps = useMemo(
    () => ALL_STEPS.filter((s) => spotlights[s.key] != null),
    [spotlights],
  );

  const currentStep = steps[stepIndex];
  const spotlight: SpotlightRect | null = currentStep ? spotlights[currentStep.key] ?? null : null;
  const totalSteps = steps.length;

  // Fade in overlay
  useEffect(() => {
    if (visible && steps.length > 0) {
      setStepIndex(0);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Animate tooltip on step change
  useEffect(() => {
    tooltipAnim.setValue(0);
    Animated.spring(tooltipAnim, {
      toValue: 1,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [stepIndex]);

  // Pulse spotlight border
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  if (!visible || !currentStep || !spotlight || steps.length === 0) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Tooltip positioning: below spotlight if room, else above
  const spotBottom = spotlight.y + spotlight.height;
  const spaceBelow = screenHeight - spotBottom;
  const spaceAbove = spotlight.y;
  const tooltipBelow = spaceBelow > 220 || spaceBelow > spaceAbove;

  const tooltipX = Math.max(
    12,
    Math.min(
      spotlight.x + spotlight.width / 2 - TOOLTIP_WIDTH / 2,
      screenWidth - TOOLTIP_WIDTH - 12,
    ),
  );
  const rawTooltipY = tooltipBelow ? spotBottom + 20 : Math.max(spaceAbove - 200, 40);
  const tooltipY = Math.max(8, Math.min(rawTooltipY, screenHeight - 220));

  // Arrow from tooltip to spotlight
  const arrowFromX = tooltipX + TOOLTIP_WIDTH / 2;
  const arrowFromY = tooltipBelow ? tooltipY : tooltipY + 180;
  const arrowToX = spotlight.x + spotlight.width / 2;
  const arrowToY = tooltipBelow ? spotlight.y + spotlight.height + 4 : spotlight.y - 4;

  const bgColor = isDark ? '#1A1A2E' : '#FFFFFF';
  const textColor = isDark ? '#E8E8E8' : '#1A1A2A';
  const subTextColor = isDark ? '#A0A0B0' : '#666680';

  const handleNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    const nextIdx = stepIndex + 1;
    const nextStep = steps[nextIdx];
    if (nextStep) {
      const nextSpot = spotlights[nextStep.key];
      if (nextSpot) {
        // Check if target is outside the visible container and scroll if needed
        const relativeY = nextSpot.y - containerTop;
        if (relativeY < 0 || relativeY + nextSpot.height > containerHeight) {
          scrollToY(scrollOffset + relativeY - 60);
        }
      }
    }
    setStepIndex(nextIdx);
  };

  const handleBack = () => {
    if (!isFirst) {
      const prevIdx = stepIndex - 1;
      const prevStep = steps[prevIdx];
      if (prevStep) {
        const prevSpot = spotlights[prevStep.key];
        if (prevSpot) {
          const relativeY = prevSpot.y - containerTop;
          if (relativeY < 0 || relativeY + prevSpot.height > containerHeight) {
            scrollToY(scrollOffset + relativeY - 60);
          }
        }
      }
      setStepIndex(prevIdx);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Tap dark area to advance */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleNext}
        />

        {/* Dark overlay with spotlight cutout */}
        <Svg
          width={screenWidth}
          height={screenHeight}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <Mask id="friendshipSpotlightMask">
              <Rect x="0" y="0" width={screenWidth} height={screenHeight} fill="white" />
              <Rect
                x={spotlight.x}
                y={spotlight.y}
                width={spotlight.width}
                height={spotlight.height}
                rx={spotlight.borderRadius}
                ry={spotlight.borderRadius}
                fill="black"
              />
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={screenWidth}
            height={screenHeight}
            fill={OVERLAY_COLOR}
            mask="url(#friendshipSpotlightMask)"
          />
        </Svg>

        {/* Pulsing spotlight border */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.spotlightBorder,
            {
              top: spotlight.y - 3,
              left: spotlight.x - 3,
              width: spotlight.width + 6,
              height: spotlight.height + 6,
              borderRadius: spotlight.borderRadius + 3,
              opacity: pulseAnim,
            },
          ]}
        />

        {/* Arrow */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <GuideArrow
            fromX={arrowFromX}
            fromY={arrowFromY}
            toX={arrowToX}
            toY={arrowToY}
            color={ACCENT}
            width={screenWidth}
            height={screenHeight}
          />
        </View>

        {/* Tooltip Card */}
        <Animated.View
          style={[
            styles.tooltip,
            {
              left: tooltipX,
              top: tooltipY,
              width: TOOLTIP_WIDTH,
              maxHeight: screenHeight - tooltipY - 16,
              backgroundColor: bgColor,
              transform: [
                {
                  scale: tooltipAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
              opacity: tooltipAnim,
            },
          ]}
        >
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {/* Title row */}
            <View style={styles.tooltipTitleRow}>
              <Ionicons name={currentStep.icon as any} size={20} color={ACCENT} />
              <Text style={[styles.tooltipTitle, { color: ACCENT }]}>{currentStep.title}</Text>
            </View>

            {/* Description */}
            <Text style={[styles.tooltipDescription, { color: textColor }]}>
              {currentStep.description}
            </Text>

            {/* Step counter + dots */}
            <View style={styles.stepCounterRow}>
              <Text style={[styles.stepCounter, { color: subTextColor }]}>
                {stepIndex + 1} / {totalSteps}
              </Text>
              <View style={styles.dots}>
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: i === stepIndex ? ACCENT : isDark ? '#333' : '#DDD',
                        width: i === stepIndex ? 16 : 6,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Navigation buttons */}
            <View style={styles.buttonRow}>
              {!isFirst ? (
                <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={16} color={subTextColor} />
                  <Text style={[styles.backButtonText, { color: subTextColor }]}>Back</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                  <Text style={[styles.skipText, { color: subTextColor }]}>Skip</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
                <LinearGradient
                  colors={[Colors.gradient.start, Colors.gradient.middle, Colors.gradient.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButton}
                >
                  <Text style={styles.nextButtonText}>{isLast ? 'Done' : 'Next'}</Text>
                  {!isLast && <Ionicons name="chevron-forward" size={14} color="#FFF" />}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  spotlightBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: ACCENT,
    borderStyle: 'solid',
  },
  tooltip: {
    position: 'absolute',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 100,
  },
  tooltipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tooltipDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  stepCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 6,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
