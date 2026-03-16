import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';
import { api } from '../../services/api';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import KindnessCoin from './KindnessCoin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GiveCoinsModalProps {
    visible: boolean;
    recipientId: string;
    recipientUsername: string;
    contextType?: string;
    contextId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

// Encouraging — hope, strength, keep going
const ENCOURAGING_POOL = [
    "Better days are coming.",
    "Don't give up!",
    "Good things are ahead.",
    "Keep going, it's worth it.",
    "Tomorrow is a new start.",
    "Hope is always there.",
    "Great things are coming!",
    "Stay strong!",
    "You are not alone.",
    "You can get through this.",
    "One step at a time.",
    "You are braver than you feel.",
    "Let your light shine!",
    "Keep shining!",
    "Be the light today.",
    "Trust the process.",
    "One day at a time.",
    "Keep believing!",
    "Good things take time.",
    "You were made for good.",
    "You are here for a reason.",
    "You matter so much.",
    "The world needs you!",
];

// Love-intense — warmth, care, affection
const LOVE_POOL = [
    "You are so loved!",
    "Sending you love!",
    "Love never gives up.",
    "You deserve kindness.",
    "Love makes us stronger.",
    "You are cared for.",
    "So much love for you!",
    "Your kindness matters.",
    "Kindness goes a long way.",
    "Thank you for being kind.",
    "Small acts, big heart.",
    "Keep spreading kindness!",
    "Your heart is beautiful.",
    "Keep caring for others.",
    "A kind heart changes lives.",
    "Joy looks good on you!",
    "A happy heart helps others.",
    "You brighten people's lives.",
];

// Blessing — gratitude, grace, peace
const BLESSING_POOL = [
    "Peace to you today!",
    "Wishing you a calm day.",
    "May your day be peaceful.",
    "You deserve some rest.",
    "Every day is a fresh start.",
    "New day, new blessings.",
    "Grace for today!",
    "It's okay to start over.",
    "So thankful for you!",
    "You are a blessing!",
    "Grateful you're here.",
    "Blessings to you!",
    "What a gift you are!",
    "Choose joy today!",
    "Today is a gift!",
    "Smile — you earned it!",
    "You don't have to be perfect.",
    "Take a deep breath.",
];

const ENCOURAGING_MESSAGES = [...ENCOURAGING_POOL, ...LOVE_POOL, ...BLESSING_POOL];

function pickOne(pool: string[]): string {
    return pool[Math.floor(Math.random() * pool.length)];
}

const AMOUNT_EMOJIS: Record<number, string> = { 1: '1', 3: '3', 5: '5', 10: '10' };
const AMOUNT_LABELS: Record<number, string> = { 1: 'kind', 3: 'sweet', 5: 'generous', 10: 'amazing' };

/** Always returns 1 encouraging + 1 love + 1 blessing + 1 random (shuffled order) */
function pickRandomMessages(count: number): string[] {
    const pools = [ENCOURAGING_POOL, LOVE_POOL, BLESSING_POOL];
    const picks = pools.map(p => pickOne(p));
    // 4th pick: random from any pool, avoid duplicates
    let extra = pickOne(ENCOURAGING_MESSAGES);
    while (picks.includes(extra)) extra = pickOne(ENCOURAGING_MESSAGES);
    picks.push(extra);
    return picks.sort(() => Math.random() - 0.5);
}

// ─── Floating Hearts Component ───
const FloatingHearts = React.memo(function FloatingHearts({ trigger }: { trigger: number }) {
    const hearts = useRef<{ anim: Animated.Value; x: number; emoji: string }[]>([]);
    const [, forceUpdate] = useState(0);
    const HEART_EMOJIS = ['❤️', '💛', '🧡', '💖', '✨', '💕'];

    useEffect(() => {
        if (trigger === 0) return;
        const newHearts = Array.from({ length: 5 }, (_, i) => ({
            anim: new Animated.Value(0),
            x: Math.random() * 200 - 100,
            emoji: HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)],
        }));
        hearts.current = newHearts;
        forceUpdate(n => n + 1);
        newHearts.forEach((h, i) => {
            Animated.timing(h.anim, {
                toValue: 1,
                duration: 1200 + i * 150,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
                delay: i * 60,
            }).start();
        });
    }, [trigger]);

    return (
        <View style={styles.floatingHeartsContainer} pointerEvents="none">
            {hearts.current.map((h, i) => (
                <Animated.Text
                    key={`${trigger}-${i}`}
                    style={[
                        styles.floatingHeart,
                        {
                            opacity: h.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
                            transform: [
                                { translateY: h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) },
                                { translateX: h.x },
                                { scale: h.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.2, 0.6] }) },
                                { rotate: h.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(Math.random() - 0.5) * 40}deg`] }) },
                            ],
                        },
                    ]}
                >
                    {h.emoji}
                </Animated.Text>
            ))}
        </View>
    );
});

// ─── Twinkling Stars Component ───
const TwinklingStars = React.memo(function TwinklingStars() {
    const stars = useRef(
        Array.from({ length: 6 }, () => ({
            anim: new Animated.Value(Math.random()),
            x: Math.random() * 100,
            y: Math.random() * 60,
            size: 8 + Math.random() * 10,
        }))
    ).current;

    useEffect(() => {
        stars.forEach((star) => {
            const twinkle = () => {
                Animated.sequence([
                    Animated.timing(star.anim, {
                        toValue: 1,
                        duration: 600 + Math.random() * 800,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(star.anim, {
                        toValue: 0.15,
                        duration: 600 + Math.random() * 800,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ]).start(twinkle);
            };
            twinkle();
        });
    }, []);

    return (
        <View style={styles.twinkleContainer} pointerEvents="none">
            {stars.map((star, i) => (
                <Animated.Text
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${star.x}%`,
                        top: star.y,
                        fontSize: star.size,
                        opacity: star.anim,
                    }}
                >
                    ✦
                </Animated.Text>
            ))}
        </View>
    );
});

// ─── Shimmer Sweep Component ───
const ShimmerSweep = React.memo(function ShimmerSweep() {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmer, {
                toValue: 1,
                duration: 2200,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            })
        ).start();
    }, []);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.shimmer,
                {
                    transform: [{
                        translateX: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-80, SCREEN_WIDTH],
                        }),
                    }],
                },
            ]}
        />
    );
});

// ─── Main Component ───
function GiveCoinsModal({
    visible,
    recipientId,
    recipientUsername,
    contextType,
    contextId,
    onClose,
    onSuccess
}: GiveCoinsModalProps) {
    const { colors, isDark } = useTheme();
    const [amount, setAmount] = useState('1');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>(() => pickRandomMessages(4));
    const [heartTrigger, setHeartTrigger] = useState(0);
    const { showCelebration } = useCoinCelebration();

    // Modal entrance
    const modalScale = useRef(new Animated.Value(0.9)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;
    // Hero coin
    const coinBounce = useRef(new Animated.Value(0)).current;
    const coinRotate = useRef(new Animated.Value(0)).current;
    // Decorative coins (3 of them)
    const decorCoin1Y = useRef(new Animated.Value(0)).current;
    const decorCoin2Y = useRef(new Animated.Value(0)).current;
    const decorCoin3Y = useRef(new Animated.Value(0)).current;
    // Staggered chip animations
    const chipAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
    // Amount button pop
    const amountScales = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current;
    // Shuffle icon spin
    const shuffleSpin = useRef(new Animated.Value(0)).current;
    // Custom message box
    const customBoxAnim = useRef(new Animated.Value(0)).current;
    // Give button pulse
    const givePulse = useRef(new Animated.Value(1)).current;
    // Give button glow
    const giveGlow = useRef(new Animated.Value(0)).current;
    // Amount section coin spin
    const amountCoinSpin = useRef(new Animated.Value(0)).current;
    // Selected chip bounce
    const chipBounces = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current;

    const animateChipsIn = useCallback(() => {
        chipAnims.forEach(a => a.setValue(0));
        Animated.stagger(50, chipAnims.map(anim =>
            Animated.timing(anim, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true })
        )).start();
    }, []);

    useEffect(() => {
        if (visible) {
            setAmount('1');
            setMessage('');
            setShowCustomInput(false);
            setSuggestions(pickRandomMessages(4));
            setHeartTrigger(0);

            // Modal entrance
            Animated.parallel([
                Animated.spring(modalScale, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
                Animated.timing(modalOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();

            // Hero coin float
            Animated.loop(Animated.sequence([
                Animated.timing(coinBounce, { toValue: -7, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(coinBounce, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();

            // Hero coin slow wobble
            Animated.loop(Animated.sequence([
                Animated.timing(coinRotate, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(coinRotate, { toValue: -1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(coinRotate, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();

            // Decorative coin floats (all different)
            Animated.loop(Animated.sequence([
                Animated.timing(decorCoin1Y, { toValue: -8, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(decorCoin1Y, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();
            Animated.loop(Animated.sequence([
                Animated.timing(decorCoin2Y, { toValue: 6, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(decorCoin2Y, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();
            Animated.loop(Animated.sequence([
                Animated.timing(decorCoin3Y, { toValue: -5, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(decorCoin3Y, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();

            // Give button pulse
            Animated.loop(Animated.sequence([
                Animated.timing(givePulse, { toValue: 1.04, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(givePulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();

            // Give button glow
            Animated.loop(Animated.sequence([
                Animated.timing(giveGlow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(giveGlow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])).start();

            setTimeout(animateChipsIn, 80);
        } else {
            // Stop all running loops when modal hides
            [coinBounce, coinRotate, decorCoin1Y, decorCoin2Y, decorCoin3Y, givePulse, giveGlow].forEach(v => v.stopAnimation());
            modalScale.setValue(0.9);
            modalOpacity.setValue(0);
            coinBounce.setValue(0);
            coinRotate.setValue(0);
            chipAnims.forEach(a => a.setValue(0));
            customBoxAnim.setValue(0);
            decorCoin1Y.setValue(0);
            decorCoin2Y.setValue(0);
            decorCoin3Y.setValue(0);
            givePulse.setValue(1);
            giveGlow.setValue(0);
        }
    }, [visible]);

    const presetAmounts = [1, 3, 5, 10];

    const popAmountButton = useCallback((index: number) => {
        // Pop scale
        amountScales[index].setValue(0.8);
        Animated.spring(amountScales[index], { toValue: 1, friction: 3, tension: 300, useNativeDriver: true }).start();

        // Spin the amount section coin
        amountCoinSpin.setValue(0);
        Animated.timing(amountCoinSpin, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [amountScales, amountCoinSpin]);

    const shuffleSuggestions = useCallback(() => {
        shuffleSpin.setValue(0);
        Animated.timing(shuffleSpin, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        setSuggestions(pickRandomMessages(4));
        setMessage('');
        setShowCustomInput(false);
        animateChipsIn();
    }, [shuffleSpin, animateChipsIn]);

    const selectSuggestion = useCallback((text: string, index: number) => {
        const deselecting = message === text;
        setMessage(deselecting ? '' : text);
        setShowCustomInput(false);

        if (!deselecting) {
            // Bounce the selected chip
            chipBounces[index].setValue(0.9);
            Animated.spring(chipBounces[index], { toValue: 1, friction: 3, tension: 250, useNativeDriver: true }).start();
            // Trigger floating hearts
            setHeartTrigger(n => n + 1);
        }
    }, [message, chipBounces]);

    const openCustomInput = useCallback(() => {
        setShowCustomInput(true);
        setMessage('');
        customBoxAnim.setValue(0);
        Animated.spring(customBoxAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
    }, [customBoxAnim]);

    const closeCustomInput = useCallback(() => {
        Animated.timing(customBoxAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setShowCustomInput(false);
            setMessage('');
        });
    }, [customBoxAnim]);

    const handleGive = useCallback(async () => {
        const coinsAmount = parseInt(amount);
        if (isNaN(coinsAmount) || coinsAmount < 1 || coinsAmount > 100) {
            Alert.alert('Invalid Amount', 'Please enter a number between 1 and 100');
            return;
        }

        setSubmitting(true);
        try {
            await api.giveCoins({
                toUserId: recipientId,
                amount: coinsAmount,
                message: message.trim() || undefined,
                contextType,
                contextId,
            });
            showCelebration(coinsAmount, 'gift', recipientUsername);
            onSuccess();
            onClose();
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to give coins';
            Alert.alert('Error', errorMessage);
        } finally {
            setSubmitting(false);
        }
    }, [amount, message, recipientId, recipientUsername, contextType, contextId, showCelebration, onSuccess, onClose]);

    const selectedAmount = parseInt(amount) || 0;

    const shuffleRotation = shuffleSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
    const coinWobble = coinRotate.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-4deg', '0deg', '4deg'] });
    const amountCoinRotation = amountCoinSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.modal,
                        {
                            backgroundColor: isDark ? colors.surface : colors.background,
                            transform: [{ scale: modalScale }],
                            opacity: modalOpacity,
                        },
                    ]}
                >
                    {/* Twinkling stars in the header background */}
                    <TwinklingStars />

                    {/* Close button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <View style={[styles.closeCircle, { backgroundColor: isDark ? colors.surfaceVariant : '#F3F4F6' }]}>
                            <Ionicons name="close" size={18} color={colors.text.secondary} />
                        </View>
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
                        {/* ─── Header ─── */}
                        <View style={styles.headerSection}>
                            {/* Decorative coins */}
                            <Animated.View style={[styles.decorCoin, { top: 8, left: 14, transform: [{ translateY: decorCoin1Y }, { rotate: '-20deg' }] }]}>
                                <KindnessCoin size={20} />
                            </Animated.View>
                            <Animated.View style={[styles.decorCoin, { top: 0, right: 18, transform: [{ translateY: decorCoin2Y }, { rotate: '25deg' }] }]}>
                                <KindnessCoin size={16} />
                            </Animated.View>
                            <Animated.View style={[styles.decorCoin, { top: 30, left: 50, transform: [{ translateY: decorCoin3Y }, { rotate: '10deg' }] }]}>
                                <KindnessCoin size={12} />
                            </Animated.View>

                            {/* Floating hearts (triggered on chip select) */}
                            <FloatingHearts trigger={heartTrigger} />

                            {/* Hero coin */}
                            <Animated.View style={{ transform: [{ translateY: coinBounce }, { rotate: coinWobble }] }}>
                                <KindnessCoin size={56} showGlow />
                            </Animated.View>

                            <Text style={[styles.title, { color: colors.text.primary }]}>
                                Give to <Text style={{ color: '#F59E0B' }}>@{recipientUsername}</Text>
                            </Text>
                            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                                Spread some kindness today
                            </Text>
                        </View>

                        {/* ─── Amount Section ─── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Amount</Text>
                                <Animated.View style={{ transform: [{ rotate: amountCoinRotation }] }}>
                                    <KindnessCoin size={16} />
                                </Animated.View>
                            </View>
                            <View style={styles.presets}>
                                {presetAmounts.map((preset, index) => {
                                    const isSelected = amount === preset.toString();
                                    return (
                                        <Animated.View key={preset} style={{ flex: 1, transform: [{ scale: amountScales[index] }] }}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.presetButton,
                                                    {
                                                        backgroundColor: isSelected
                                                            ? (isDark ? '#78350F' : '#FEF3C7')
                                                            : (isDark ? colors.surfaceVariant : '#F9FAFB'),
                                                        borderColor: isSelected ? '#FBBF24' : (isDark ? colors.border : '#E5E7EB'),
                                                    },
                                                ]}
                                                onPress={() => { setAmount(preset.toString()); popAmountButton(index); }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.presetNumber, { color: isSelected ? '#D97706' : colors.text.primary }]}>
                                                    {AMOUNT_EMOJIS[preset]}
                                                </Text>
                                                <Text style={[styles.presetLabel, { color: isSelected ? '#F59E0B' : colors.text.tertiary }]}>
                                                    {AMOUNT_LABELS[preset]}
                                                </Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                            {/* Custom amount row */}
                            <View style={[styles.customAmountRow, {
                                backgroundColor: isDark ? colors.surfaceVariant : '#F9FAFB',
                                borderColor: !presetAmounts.includes(selectedAmount) && selectedAmount > 0
                                    ? '#FBBF24' : (isDark ? colors.border : '#E5E7EB'),
                            }]}>
                                <Ionicons name="pencil-outline" size={14} color={colors.text.tertiary} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[styles.customInput, { color: colors.text.primary }]}
                                    value={presetAmounts.includes(selectedAmount) ? '' : amount}
                                    onChangeText={setAmount}
                                    placeholder="or type a custom amount..."
                                    placeholderTextColor={colors.text.tertiary}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                />
                            </View>
                        </View>

                        {/* ─── Message Section ─── */}
                        <View style={styles.section}>
                            <View style={styles.messageLabelRow}>
                                <View style={styles.messageLabelLeft}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.text.secondary} style={{ marginRight: 5 }} />
                                    <Text style={[styles.sectionLabel, { marginBottom: 0, color: colors.text.secondary }]}>
                                        Message
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.shuffleButton, { backgroundColor: isDark ? '#2E1065' : '#EDE9FE' }]}
                                    onPress={shuffleSuggestions}
                                    activeOpacity={0.7}
                                >
                                    <Animated.View style={{ transform: [{ rotate: shuffleRotation }] }}>
                                        <Ionicons name="sparkles" size={14} color="#8B5CF6" />
                                    </Animated.View>
                                    <Text style={styles.shuffleText}>Shuffle</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.suggestionsGrid}>
                                {suggestions.map((text, i) => {
                                    const isSelected = message === text;
                                    return (
                                        <Animated.View
                                            key={`${text}-${i}`}
                                            style={[
                                                styles.suggestionChipWrapper,
                                                {
                                                    opacity: chipAnims[i],
                                                    transform: [
                                                        { translateY: chipAnims[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                                                        { scale: Animated.multiply(
                                                            chipAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
                                                            chipBounces[i]
                                                        )},
                                                    ],
                                                },
                                            ]}
                                        >
                                            <TouchableOpacity
                                                style={[
                                                    styles.suggestionChip,
                                                    {
                                                        backgroundColor: isSelected
                                                            ? (isDark ? '#4C1D95' : '#EDE9FE')
                                                            : (isDark ? colors.surfaceVariant : '#F9FAFB'),
                                                        borderColor: isSelected ? '#8B5CF6' : (isDark ? colors.border : '#E5E7EB'),
                                                    },
                                                ]}
                                                onPress={() => selectSuggestion(text, i)}
                                                activeOpacity={0.7}
                                            >
                                                {isSelected && (
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={14}
                                                        color="#8B5CF6"
                                                        style={{ marginBottom: 2 }}
                                                    />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.suggestionText,
                                                        {
                                                            color: isSelected ? '#8B5CF6' : colors.text.primary,
                                                            fontWeight: isSelected ? '700' : '500',
                                                        },
                                                    ]}
                                                    numberOfLines={2}
                                                >
                                                    {text}
                                                </Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    );
                                })}
                            </View>

                            {/* Write your own */}
                            {!showCustomInput ? (
                                <TouchableOpacity style={styles.writeOwnButton} onPress={openCustomInput} activeOpacity={0.7}>
                                    <Ionicons name="create-outline" size={15} color={colors.text.secondary} />
                                    <Text style={[styles.writeOwnText, { color: colors.text.secondary }]}>
                                        Write your own
                                    </Text>
                                </TouchableOpacity>
                            ) : (
                                <Animated.View style={{
                                    opacity: customBoxAnim,
                                    transform: [{ translateY: customBoxAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                                }}>
                                    <View style={[styles.customMessageBox, {
                                        borderColor: isDark ? '#7C3AED' : '#C4B5FD',
                                        backgroundColor: isDark ? colors.surfaceVariant : '#FAFAFE',
                                    }]}>
                                        <TextInput
                                            style={[styles.messageInput, { color: colors.text.primary }]}
                                            value={message}
                                            onChangeText={setMessage}
                                            placeholder="Write something kind..."
                                            placeholderTextColor={colors.text.tertiary}
                                            multiline
                                            maxLength={200}
                                            autoFocus
                                        />
                                        <View style={styles.messageFooter}>
                                            <TouchableOpacity onPress={closeCustomInput}>
                                                <Text style={[styles.cancelCustom, { color: colors.text.tertiary }]}>Cancel</Text>
                                            </TouchableOpacity>
                                            <Text style={[styles.charCount, { color: message.length > 180 ? '#EF4444' : colors.text.tertiary }]}>
                                                {message.length}/200
                                            </Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            )}
                        </View>

                        {/* ─── Give Button ─── */}
                        <Animated.View style={{ transform: [{ scale: givePulse }] }}>
                            {/* Glow behind button */}
                            <Animated.View style={[styles.giveButtonGlowWrapper, {
                                opacity: giveGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
                            }]}>
                                <View style={styles.giveButtonGlow} />
                            </Animated.View>
                            <TouchableOpacity
                                style={[styles.giveButton, submitting && { opacity: 0.6 }]}
                                onPress={handleGive}
                                disabled={submitting}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#FBBF24', '#F59E0B', '#D97706']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.giveButtonGradient}
                                >
                                    <ShimmerSweep />
                                    {submitting ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="heart" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                            <Text style={styles.giveText}>
                                                Give {selectedAmount > 0 ? selectedAmount : ''} {selectedAmount === 1 ? 'Coin' : 'Coins'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Bottom decorative coin */}
                        <View style={styles.bottomDecor}>
                            <Animated.View style={{ transform: [{ translateY: decorCoin1Y }, { rotate: '45deg' }] }}>
                                <KindnessCoin size={14} />
                            </Animated.View>
                            <Text style={[styles.bottomText, { color: colors.text.tertiary }]}>kindness is contagious</Text>
                            <Animated.View style={{ transform: [{ translateY: decorCoin2Y }, { rotate: '-30deg' }] }}>
                                <KindnessCoin size={14} />
                            </Animated.View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default React.memo(GiveCoinsModal);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        borderRadius: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '92%',
        padding: 20,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 20,
        overflow: 'hidden',
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
    },
    closeCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // ─── Header ───
    headerSection: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 16,
        position: 'relative',
    },
    decorCoin: {
        position: 'absolute',
        opacity: 0.55,
        zIndex: 1,
    },
    title: {
        fontSize: 19,
        fontWeight: '700',
        marginTop: 10,
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 3,
        fontStyle: 'italic',
    },
    // ─── Twinkling stars ───
    twinkleContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 70,
        overflow: 'hidden',
    },
    // ─── Floating hearts ───
    floatingHeartsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    floatingHeart: {
        position: 'absolute',
        fontSize: 18,
    },
    // ─── Sections ───
    section: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    // ─── Amount presets ───
    presets: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    presetButton: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    presetNumber: {
        fontSize: 20,
        fontWeight: '800',
    },
    presetLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    customAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    customInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        padding: 0,
    },
    // ─── Message ───
    messageLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    messageLabelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shuffleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 5,
    },
    shuffleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8B5CF6',
    },
    suggestionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    suggestionChipWrapper: {
        width: '48%',
        flexGrow: 1,
    },
    suggestionChip: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        minHeight: 44,
        justifyContent: 'center',
    },
    suggestionText: {
        fontSize: 13,
        lineHeight: 18,
    },
    writeOwnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        paddingVertical: 8,
    },
    writeOwnText: {
        fontSize: 13,
        fontWeight: '500',
    },
    customMessageBox: {
        marginTop: 10,
        borderWidth: 1.5,
        borderRadius: 14,
        overflow: 'hidden',
    },
    messageInput: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 4,
        fontSize: 15,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    cancelCustom: {
        fontSize: 12,
        fontWeight: '500',
    },
    charCount: {
        fontSize: 11,
        fontWeight: '500',
    },
    // ─── Give button ───
    giveButtonGlowWrapper: {
        position: 'absolute',
        top: -4,
        left: 8,
        right: 8,
        bottom: -4,
        zIndex: -1,
    },
    giveButtonGlow: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: '#FBBF24',
    },
    giveButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 4,
    },
    giveButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        overflow: 'hidden',
    },
    giveText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.3,
    },
    // ─── Shimmer ───
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 60,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.25)',
        transform: [{ skewX: '-15deg' }],
    },
    // ─── Bottom decor ───
    bottomDecor: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 8,
        paddingBottom: 4,
    },
    bottomText: {
        fontSize: 11,
        fontStyle: 'italic',
        fontWeight: '500',
    },
});
