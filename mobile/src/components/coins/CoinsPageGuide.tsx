import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import { useTheme } from '../../theme';
import GuideArrow from '../guide/GuideArrow';

const { width: SW, height: SH } = Dimensions.get('window');

const OVERLAY_COLOR = 'rgba(0,0,0,0.72)';
const ACCENT = '#0095F6';
const PAD = 8;
const HL_RADIUS = 14;
const TIP_W = 280;
const TIP_PAD = 16;
const LINE_GAP = 20;

export interface GuideStep {
    key: string;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    scrollY?: number;
}

export const COINS_GUIDE_STEPS: GuideStep[] = [
    {
        key: 'balance',
        title: 'Your Balance',
        description: 'Your total Positivity Coins. Earn more by spreading kindness throughout the app!',
        icon: 'wallet',
    },
    {
        key: 'given',
        title: 'Coins Given',
        description: 'Track how many coins you\'ve given. Your rank shows your generosity level — tap the badge to see the leaderboard.',
        icon: 'heart',
    },
    {
        key: 'sky',
        title: 'Sky Coins',
        description: 'Earned when others send you coins. Tap this card to collect and read their kind messages.',
        icon: 'cloud',
    },
    {
        key: 'free',
        title: 'Free Coins',
        description: 'Claim free coins every 3 hours! Up to 3 can stack. Tap "Claim" when ready.',
        icon: 'gift',
        scrollY: 300,
    },
];

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    refs: Record<string, React.RefObject<View>>;
    scrollRef: React.RefObject<ScrollView>;
    rootRef: React.RefObject<View>;
}

export default function CoinsPageGuide({ visible, onClose, refs, scrollRef, rootRef }: Props) {
    const { isDark } = useTheme();
    const [step, setStep] = useState(0);
    const [target, setTarget] = useState<Rect | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [tipH, setTipH] = useState(200);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const tipAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const info = COINS_GUIDE_STEPS[step];
    const total = COINS_GUIDE_STEPS.length;
    const isFirst = step === 0;
    const isLast = step === total - 1;

    const bgColor = isDark ? '#1A1A2E' : '#FFFFFF';
    const textColor = isDark ? '#E8E8E8' : '#1A1A2A';
    const subTextColor = isDark ? '#A0A0B0' : '#666680';

    // Measure container offset on open
    useEffect(() => {
        if (visible) {
            setStep(0);
            setTarget(null);
            rootRef.current?.measureInWindow((x, y) => {
                setOffset({ x, y });
            });
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
            tipAnim.setValue(0);
            setTarget(null);
        }
    }, [visible]);

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

    // Scroll + measure when step changes
    useEffect(() => {
        if (!visible) return;

        setTarget(null);
        tipAnim.setValue(0);

        // Scroll to make component visible
        if (info.scrollY != null) {
            scrollRef.current?.scrollTo({ y: info.scrollY, animated: true });
        } else if (step <= 3) {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        }

        // Measure after scroll animation settles
        const timer = setTimeout(() => {
            const ref = refs[info.key];
            ref?.current?.measureInWindow((x: number, y: number, w: number, h: number) => {
                if (w > 0 && h > 0) {
                    setTarget({
                        x: x - offset.x,
                        y: y - offset.y,
                        width: w,
                        height: h,
                    });
                }
            });
            Animated.spring(tipAnim, {
                toValue: 1,
                friction: 7,
                tension: 80,
                useNativeDriver: true,
            }).start();
        }, 500);

        return () => clearTimeout(timer);
    }, [step, visible, offset]);

    const handleNext = () => (step < total - 1 ? setStep(s => s + 1) : onClose());
    const handleBack = () => step > 0 && setStep(s => s - 1);

    if (!visible) return null;

    // Spotlight rectangle (target + padding)
    const spot = target
        ? {
              x: target.x - PAD,
              y: target.y - PAD,
              w: target.width + PAD * 2,
              h: target.height + PAD * 2,
          }
        : null;

    // Tooltip position: below if target is in top portion, else above
    const spotBottom = target ? target.y + target.height + PAD : 0;
    const spaceBelow = SH - spotBottom;
    const spaceAbove = target ? target.y - PAD : SH;
    const tooltipBelow = target ? (spaceBelow > 220 || spaceBelow > spaceAbove) : true;

    const tipX = Math.max(
        12,
        Math.min(
            SW - TIP_W - 12,
            target ? target.x + target.width / 2 - TIP_W / 2 : (SW - TIP_W) / 2
        )
    );

    const rawTipY = target
        ? tooltipBelow
            ? spotBottom + LINE_GAP
            : Math.max(spaceAbove - tipH - LINE_GAP, 8)
        : SH / 2 - tipH / 2;
    const tipY = Math.max(8, Math.min(rawTipY, SH - tipH - 16));

    // Arrow endpoints (from tooltip to spotlight)
    const arrowFromX = tipX + TIP_W / 2;
    const arrowFromY = tooltipBelow ? tipY : tipY + tipH;
    const arrowToX = target ? target.x + target.width / 2 : arrowFromX;
    const arrowToY = target
        ? tooltipBelow
            ? target.y + target.height + PAD + 4
            : target.y - PAD - 4
        : arrowFromY;

    return (
        <Animated.View style={[st.container, { opacity: fadeAnim }]}>
            {/* Tap dark area to advance */}
            <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={handleNext}
            />

            {/* Dark overlay with spotlight cutout via SVG Mask */}
            <Svg
                width={SW}
                height={SH}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            >
                <Defs>
                    <Mask id="spotlightMask">
                        <Rect x="0" y="0" width={SW} height={SH} fill="white" />
                        {spot && (
                            <Rect
                                x={spot.x}
                                y={spot.y}
                                width={spot.w}
                                height={spot.h}
                                rx={HL_RADIUS}
                                ry={HL_RADIUS}
                                fill="black"
                            />
                        )}
                    </Mask>
                </Defs>
                <Rect
                    x="0"
                    y="0"
                    width={SW}
                    height={SH}
                    fill={OVERLAY_COLOR}
                    mask="url(#spotlightMask)"
                />
            </Svg>

            {/* Pulsing spotlight border */}
            {spot && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        st.spotlightBorder,
                        {
                            top: spot.y - 3,
                            left: spot.x - 3,
                            width: spot.w + 6,
                            height: spot.h + 6,
                            borderRadius: HL_RADIUS + 3,
                            opacity: pulseAnim,
                        },
                    ]}
                />
            )}

            {/* Arrow SVG (dashed line + arrowhead) */}
            {target && (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <GuideArrow
                        fromX={arrowFromX}
                        fromY={arrowFromY}
                        toX={arrowToX}
                        toY={arrowToY}
                        color={ACCENT}
                        width={SW}
                        height={SH}
                    />
                </View>
            )}

            {/* Tooltip Card */}
            <Animated.View
                onLayout={e => setTipH(e.nativeEvent.layout.height)}
                style={[
                    st.tip,
                    {
                        left: tipX,
                        top: tipY,
                        width: TIP_W,
                        maxHeight: SH - tipY - 16,
                        backgroundColor: bgColor,
                        transform: [
                            {
                                scale: tipAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.85, 1],
                                }),
                            },
                        ],
                        opacity: tipAnim,
                    },
                ]}
            >
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    {/* Title row */}
                    <View style={st.tipTitleRow}>
                        <Ionicons name={info.icon} size={20} color={ACCENT} />
                        <Text style={[st.tipTitle, { color: ACCENT }]}>{info.title}</Text>
                    </View>

                    {/* Description */}
                    <Text style={[st.tipDesc, { color: textColor }]}>
                        {info.description}
                    </Text>

                    {/* Step counter + dots */}
                    <View style={st.stepCounterRow}>
                        <Text style={[st.stepCounter, { color: subTextColor }]}>
                            {step + 1} / {total}
                        </Text>
                        <View style={st.dots}>
                            {COINS_GUIDE_STEPS.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        st.dot,
                                        {
                                            backgroundColor: i === step ? ACCENT : isDark ? '#333' : '#DDD',
                                            width: i === step ? 16 : 6,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Navigation buttons */}
                    <View style={st.buttonRow}>
                        {!isFirst ? (
                            <TouchableOpacity style={st.backButton} onPress={handleBack} activeOpacity={0.7}>
                                <Ionicons name="chevron-back" size={16} color={subTextColor} />
                                <Text style={[st.backButtonText, { color: subTextColor }]}>Back</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                                <Text style={[st.skipText, { color: subTextColor }]}>Skip</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
                            <LinearGradient
                                colors={[Colors.gradient.start, Colors.gradient.middle, Colors.gradient.end]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={st.nextButton}
                            >
                                <Text style={st.nextButtonText}>{isLast ? 'Done' : 'Next'}</Text>
                                {!isLast && <Ionicons name="chevron-forward" size={14} color="#FFF" />}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>
        </Animated.View>
    );
}

const st = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
    },
    spotlightBorder: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: ACCENT,
        borderStyle: 'solid',
    },
    tip: {
        position: 'absolute',
        padding: TIP_PAD,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 20,
        zIndex: 100,
    },
    tipTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    tipDesc: {
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
