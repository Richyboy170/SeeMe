import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/colors';
import { useTheme } from '../../theme';
import { PROFILE_GUIDE_STEPS } from '../../data/profileGuideSteps';
import GuideArrow from './GuideArrow';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TOOLTIP_WIDTH = 280;
const TOOLTIP_PADDING = 16;
const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
const ACCENT = '#0095F6';
const STORAGE_KEY = '@seeme_profile_guide_completed';

export interface TargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

interface ProfileGuideProps {
  visible: boolean;
  onClose: () => void;
  guideRefs: React.MutableRefObject<Record<string, View | null>>;
  scrollViewRef: React.RefObject<ScrollView | null>;
}

export default function ProfileGuide({
  visible,
  onClose,
  guideRefs,
  scrollViewRef,
}: ProfileGuideProps) {
  const { isDark } = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Filter steps to only those with mounted refs
  const activeSteps = useMemo(() => {
    if (!visible) return [];
    return PROFILE_GUIDE_STEPS.filter((s) => guideRefs.current[s.key] != null);
  }, [visible, guideRefs]);

  const currentStep = activeSteps[stepIndex];
  const totalSteps = activeSteps.length;

  // Measure a target ref's screen position
  const measureTarget = useCallback(
    (key: string): Promise<SpotlightRect | null> => {
      return new Promise((resolve) => {
        const ref = guideRefs.current[key];
        if (!ref) {
          resolve(null);
          return;
        }
        ref.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) {
            resolve({ x, y, width: w, height: h, borderRadius: 10 });
          } else {
            resolve(null);
          }
        });
      });
    },
    [guideRefs],
  );

  // Scroll to target, wait, then measure
  const scrollAndMeasure = useCallback(
    async (stepIdx: number) => {
      const step = activeSteps[stepIdx];
      if (!step) return;

      if (step.scrollToTarget) {
        // First measure to get approximate content position
        const preMeasure = await measureTarget(step.key);
        if (preMeasure) {
          // If target is off-screen (below visible area or above), scroll to it
          if (preMeasure.y + preMeasure.height > SCREEN_H || preMeasure.y < 0) {
            // We need to scroll. The ref position might be wrong if not visible,
            // so do a rough scroll based on step index
            const ref = guideRefs.current[step.key];
            if (ref) {
              // Scroll the ref into view by measuring its position relative to scroll content
              ref.measureLayout(
                scrollViewRef.current as any,
                (_x, y, _w, _h) => {
                  scrollViewRef.current?.scrollTo({
                    y: Math.max(0, y - SCREEN_H * 0.3),
                    animated: true,
                  });
                },
                () => {},
              );
            }
          }
        } else {
          // If we can't measure, try scrolling down roughly
          const ref = guideRefs.current[step.key];
          if (ref) {
            ref.measureLayout(
              scrollViewRef.current as any,
              (_x, y, _w, _h) => {
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, y - SCREEN_H * 0.3),
                  animated: true,
                });
              },
              () => {},
            );
          }
        }
        // Wait for scroll to settle, then measure
        await new Promise((r) => setTimeout(r, 450));
      } else {
        // Scroll to top for early steps
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        await new Promise((r) => setTimeout(r, 200));
      }

      // Now measure the actual screen position
      const rect = await measureTarget(step.key);
      setSpotlight(rect);
    },
    [activeSteps, measureTarget, guideRefs, scrollViewRef],
  );

  // Fade in overlay on mount
  useEffect(() => {
    if (visible && activeSteps.length > 0) {
      setStepIndex(0);
      setSpotlight(null);
      fadeAnim.setValue(0);

      // Scroll to top, then fade in
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Measure first step after overlay visible
        scrollAndMeasure(0);
      });
    }
  }, [visible]);

  // Animate tooltip on step change or spotlight change
  useEffect(() => {
    if (spotlight) {
      tooltipAnim.setValue(0);
      Animated.spring(tooltipAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [spotlight, stepIndex]);

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

  const handleClose = useCallback(() => {
    AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {});
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      handleClose();
    } else {
      const next = stepIndex + 1;
      setStepIndex(next);
      setSpotlight(null);
      scrollAndMeasure(next);
    }
  }, [stepIndex, totalSteps, handleClose, scrollAndMeasure]);

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      const prev = stepIndex - 1;
      setStepIndex(prev);
      setSpotlight(null);
      scrollAndMeasure(prev);
    }
  }, [stepIndex, scrollAndMeasure]);

  if (!visible || !currentStep) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Tooltip positioning
  let tooltipX = SCREEN_W / 2 - TOOLTIP_WIDTH / 2;
  let tooltipY = SCREEN_H / 2;
  let arrowFromX = SCREEN_W / 2;
  let arrowFromY = SCREEN_H / 2;
  let arrowToX = SCREEN_W / 2;
  let arrowToY = SCREEN_H / 2;

  if (spotlight) {
    const spotBottom = spotlight.y + spotlight.height;
    const spaceBelow = SCREEN_H - spotBottom;
    const spaceAbove = spotlight.y;
    const tooltipBelow = spaceBelow > 220 || spaceBelow > spaceAbove;

    tooltipX = Math.max(
      12,
      Math.min(
        spotlight.x + spotlight.width / 2 - TOOLTIP_WIDTH / 2,
        SCREEN_W - TOOLTIP_WIDTH - 12,
      ),
    );
    const rawTooltipY = tooltipBelow
      ? spotBottom + 20
      : Math.max(spaceAbove - 200, 40);
    tooltipY = Math.max(8, Math.min(rawTooltipY, SCREEN_H - 220));

    arrowFromX = tooltipX + TOOLTIP_WIDTH / 2;
    arrowFromY = tooltipBelow ? tooltipY : tooltipY + 180;
    arrowToX = spotlight.x + spotlight.width / 2;
    arrowToY = tooltipBelow ? spotlight.y + spotlight.height + 4 : spotlight.y - 4;
  }

  const bgColor = isDark ? '#1A1A2E' : '#FFFFFF';
  const textColor = isDark ? '#E8E8E8' : '#1A1A2A';
  const subTextColor = isDark ? '#A0A0B0' : '#666680';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Tap anywhere on dark area to advance */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleNext}
        />

        {/* Dark overlay with spotlight cutout using SVG Mask */}
        <Svg
          width={SCREEN_W}
          height={SCREEN_H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <Mask id="profileSpotlightMask">
              {/* White = visible overlay (dark), Black = cutout (transparent) */}
              <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="white" />
              {spotlight && (
                <Rect
                  x={spotlight.x}
                  y={spotlight.y}
                  width={spotlight.width}
                  height={spotlight.height}
                  rx={spotlight.borderRadius}
                  ry={spotlight.borderRadius}
                  fill="black"
                />
              )}
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={SCREEN_W}
            height={SCREEN_H}
            fill={OVERLAY_COLOR}
            mask="url(#profileSpotlightMask)"
          />
        </Svg>

        {spotlight && (
          <>
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

            {/* Arrow SVG */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <GuideArrow
                fromX={arrowFromX}
                fromY={arrowFromY}
                toX={arrowToX}
                toY={arrowToY}
                color={ACCENT}
                width={SCREEN_W}
                height={SCREEN_H}
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
                  maxHeight: SCREEN_H - tooltipY - 16,
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
                  <Text style={[styles.tooltipTitle, { color: ACCENT }]}>
                    {currentStep.title}
                  </Text>
                </View>

                {/* Description */}
                <Text style={[styles.tooltipDescription, { color: textColor }]}>
                  {currentStep.description}
                </Text>

                {/* Step counter */}
                <View style={styles.stepCounterRow}>
                  <Text style={[styles.stepCounter, { color: subTextColor }]}>
                    {stepIndex + 1} / {totalSteps}
                  </Text>
                  <View style={styles.dots}>
                    {activeSteps.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              i === stepIndex ? ACCENT : isDark ? '#333' : '#DDD',
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
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={handleBack}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={16} color={subTextColor} />
                      <Text style={[styles.backButtonText, { color: subTextColor }]}>Back</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
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
                      <Text style={styles.nextButtonText}>
                        {isLast ? 'Done' : 'Next'}
                      </Text>
                      {!isLast && (
                        <Ionicons name="chevron-forward" size={14} color="#FFF" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Animated.View>
          </>
        )}
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
    padding: TOOLTIP_PADDING,
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
