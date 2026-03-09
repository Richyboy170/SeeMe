import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import GuideArrow from '../guide/GuideArrow';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPOTLIGHT_PAD = 6;
const TOOLTIP_WIDTH = 280;
const TOOLTIP_PADDING = 16;
const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
const ACCENT = '#0095F6';

export interface GuideStep {
  targetRef: React.RefObject<View | null>;
  title: string;
  description: string;
  icon: string; // Ionicons name
  tooltipSide?: 'above' | 'below';
}

interface Props {
  steps: GuideStep[];
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

interface MeasuredRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function DiscoverGuide({ steps, visible, onClose, isDark }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<MeasuredRect | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const step = steps[stepIndex];
  const totalSteps = steps.length;
  const isLast = stepIndex >= totalSteps - 1;
  const isFirst = stepIndex === 0;

  const bgColor = isDark ? '#1A1A2E' : '#FFFFFF';
  const textColor = isDark ? '#E8E8E8' : '#1A1A2A';
  const subTextColor = isDark ? '#A0A0B0' : '#666680';

  // Fade in overlay on mount
  useEffect(() => {
    if (visible) {
      setStepIndex(0);
      setRect(null);
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

  // Measure the target component whenever step changes
  const measureTarget = useCallback(() => {
    if (!visible || !step?.targetRef?.current) return;
    const timer = setTimeout(() => {
      step.targetRef.current?.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          setRect({ x, y, w, h });
        } else {
          // Component not visible — auto-skip
          if (!isLast) {
            setStepIndex((s) => s + 1);
          } else {
            onClose();
          }
        }
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [stepIndex, visible, step]);

  useEffect(() => {
    setRect(null);
    const cleanup = measureTarget();
    return cleanup;
  }, [measureTarget]);

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setRect(null);
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setRect(null);
      setStepIndex((i) => i - 1);
    }
  };

  if (!visible || !step) return null;

  // While measuring, show dim overlay
  if (!rect) {
    return (
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.fullDim} />
      </Animated.View>
    );
  }

  // Spotlight rectangle (with padding)
  const sX = rect.x - SPOTLIGHT_PAD;
  const sY = rect.y - SPOTLIGHT_PAD;
  const sW = rect.w + SPOTLIGHT_PAD * 2;
  const sH = rect.h + SPOTLIGHT_PAD * 2;
  const spotBottom = sY + sH;
  const borderRadius = 12;

  // Decide tooltip position
  const spaceBelow = SCREEN_HEIGHT - spotBottom;
  const spaceAbove = sY;
  const tooltipBelow = step.tooltipSide
    ? step.tooltipSide === 'below'
    : spaceBelow > 220 || spaceBelow > spaceAbove;

  const tooltipX = Math.max(
    12,
    Math.min(
      sX + sW / 2 - TOOLTIP_WIDTH / 2,
      SCREEN_WIDTH - TOOLTIP_WIDTH - 12,
    ),
  );
  const rawTooltipY = tooltipBelow
    ? spotBottom + 20
    : Math.max(spaceAbove - 200, 8);
  const tooltipY = Math.max(8, Math.min(rawTooltipY, SCREEN_HEIGHT - 220));

  // Arrow from tooltip to spotlight
  const arrowFromX = tooltipX + TOOLTIP_WIDTH / 2;
  const arrowFromY = tooltipBelow ? tooltipY : tooltipY + 180;
  const arrowToX = sX + sW / 2;
  const arrowToY = tooltipBelow ? spotBottom + 4 : sY - 4;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Tap anywhere on dark area to advance */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleNext}
      />

      {/* Dark overlay with spotlight cutout using SVG Mask */}
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <Mask id="spotlightMask">
            {/* White = visible overlay (dark), Black = cutout (transparent) */}
            <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
            <Rect
              x={sX}
              y={sY}
              width={sW}
              height={sH}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
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
            top: sY - 3,
            left: sX - 3,
            width: sW + 6,
            height: sH + 6,
            borderRadius: borderRadius + 3,
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
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
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
            maxHeight: SCREEN_HEIGHT - tooltipY - 16,
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
            <Ionicons name={step.icon as any} size={20} color={ACCENT} />
            <Text style={[styles.tooltipTitle, { color: ACCENT }]}>{step.title}</Text>
          </View>

          {/* Description */}
          <Text style={[styles.tooltipDescription, { color: textColor }]}>
            {step.description}
          </Text>

          {/* Step counter */}
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
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  fullDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_COLOR,
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
