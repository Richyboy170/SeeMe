import React, { useEffect, useRef, useMemo, useState } from 'react';
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
import { Colors } from '../../theme/colors';
import { FEED_GUIDE_STEPS, LayoutInfo, SpotlightRect } from './FeedGuideData';
import GuideArrow from './GuideArrow';

interface FeedGuideOverlayProps {
  visible: boolean;
  onClose: () => void;
  insetTop: number;
  insetBottom: number;
  screenWidth: number;
  screenHeight: number;
  hasPostLoaded: boolean;
  firstPostHasImage: boolean;
  isDark: boolean;
}

const TOOLTIP_WIDTH = 280;
const TOOLTIP_PADDING = 16;
const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
const ACCENT = '#0095F6';

export default function FeedGuideOverlay({
  visible,
  onClose,
  insetTop,
  insetBottom,
  screenWidth,
  screenHeight,
  hasPostLoaded,
  firstPostHasImage,
  isDark,
}: FeedGuideOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const layout: LayoutInfo = useMemo(
    () => ({
      screenWidth,
      screenHeight,
      insetTop,
      insetBottom,
      hasPost: hasPostLoaded,
      firstPostHasImage,
    }),
    [screenWidth, screenHeight, insetTop, insetBottom, hasPostLoaded, firstPostHasImage],
  );

  // Filter steps that have valid spotlights
  const activeSteps = useMemo(() => {
    return FEED_GUIDE_STEPS.filter((s) => s.getSpotlight(layout) !== null);
  }, [layout]);

  const currentStep = activeSteps[stepIndex];
  const spotlight: SpotlightRect | null = currentStep?.getSpotlight(layout) ?? null;
  const totalSteps = activeSteps.length;

  // Fade in overlay on mount
  useEffect(() => {
    if (visible) {
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

  if (!visible || !currentStep || !spotlight) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Decide tooltip position: below spotlight if there's room, else above
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
  const rawTooltipY = tooltipBelow ? spotBottom + 20 : Math.max(spaceAbove - 200, insetTop + 8);
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
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setStepIndex((i) => i - 1);
  };

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
          width={screenWidth}
          height={screenHeight}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <Mask id="spotlightMask">
              {/* White = visible overlay (dark), Black = cutout (transparent) */}
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
            mask="url(#spotlightMask)"
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

        {/* Arrow SVG */}
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
              maxHeight: screenHeight - tooltipY - insetBottom - 16,
              backgroundColor: bgColor,
              transform: [
                { scale: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
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
