import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 50;
const CONFETTI_COLORS = ['#FBBF24', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#3B82F6', '#10B981'];

interface GiveCoinsModalProps {
    visible: boolean;
    recipientId: string;
    recipientUsername: string;
    contextType?: string;
    contextId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

const ENCOURAGING_MESSAGES = [
    "You're awesome!",
    "Keep shining!",
    "You inspire me!",
    "Stay amazing!",
    "You made my day!",
    "Love your energy!",
    "You're a star!",
    "Keep being you!",
    "So proud of you!",
    "You're incredible!",
    "Thanks for being you!",
    "You rock!",
    "Spreading positivity!",
    "You're the best!",
    "Keep up the great work!",
    "You brighten my day!",
    "Sending good vibes!",
    "You're appreciated!",
    "Stay wonderful!",
    "You make a difference!",
    "Keep doing great things!",
    "You're a legend!",
    "Much love!",
    "You're unstoppable!",
    "Stay blessed!"
];

export default function GiveCoinsModal({
    visible,
    recipientId,
    recipientUsername,
    contextType,
    contextId,
    onClose,
    onSuccess
}: GiveCoinsModalProps) {
    const [amount, setAmount] = useState('1');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [sentAmount, setSentAmount] = useState(0);

    // Celebration animation values
    const celebrationOpacity = useRef(new Animated.Value(0)).current;
    const coinScale = useRef(new Animated.Value(0)).current;
    const coinRotate = useRef(new Animated.Value(0)).current;
    const textScale = useRef(new Animated.Value(0)).current;
    const sparkleOpacity = useRef(new Animated.Value(0)).current;

    // Confetti animations
    const confettiAnims = useRef(
        Array.from({ length: CONFETTI_COUNT }, () => {
            const initialX = Math.random() * SCREEN_WIDTH;
            return {
                translateX: new Animated.Value(initialX),
                translateY: new Animated.Value(-50),
                rotate: new Animated.Value(0),
                opacity: new Animated.Value(1),
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                size: Math.random() * 10 + 5,
                delay: Math.random() * 500,
                initialX,
            };
        })
    ).current;

    const presetAmounts = [1, 3, 5, 10];

    const startCelebration = (coinsAmount: number) => {
        setSentAmount(coinsAmount);
        setShowCelebration(true);

        // Reset animations
        celebrationOpacity.setValue(0);
        coinScale.setValue(0);
        coinRotate.setValue(0);
        textScale.setValue(0);
        sparkleOpacity.setValue(0);
        confettiAnims.forEach(anim => {
            anim.translateX.setValue(Math.random() * SCREEN_WIDTH);
            anim.translateY.setValue(-50);
            anim.rotate.setValue(0);
            anim.opacity.setValue(1);
        });

        // Start celebration animation
        Animated.sequence([
            // Fade in background
            Animated.timing(celebrationOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            // Coin bounce in
            Animated.parallel([
                Animated.spring(coinScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(coinRotate, {
                    toValue: 2,
                    duration: 800,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // Text pop in
        Animated.sequence([
            Animated.delay(300),
            Animated.spring(textScale, {
                toValue: 1,
                friction: 5,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();

        // Sparkle pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(sparkleOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(sparkleOpacity, {
                    toValue: 0.3,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]),
            { iterations: 4 }
        ).start();

        // Start confetti
        confettiAnims.forEach((anim) => {
            Animated.sequence([
                Animated.delay(anim.delay),
                Animated.parallel([
                    Animated.timing(anim.translateY, {
                        toValue: SCREEN_HEIGHT + 50,
                        duration: 3000 + Math.random() * 2000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.translateX, {
                        toValue: anim.initialX + (Math.random() - 0.5) * 200,
                        duration: 3000 + Math.random() * 2000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.rotate, {
                        toValue: 10,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.delay(2000),
                        Animated.timing(anim.opacity, {
                            toValue: 0,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]).start();
        });

        // Auto close after 3 seconds
        setTimeout(() => {
            closeCelebration();
        }, 3000);
    };

    const closeCelebration = () => {
        Animated.timing(celebrationOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowCelebration(false);
            onSuccess();
            onClose();
        });
    };

    const getRandomMessage = () => {
        const randomIndex = Math.floor(Math.random() * ENCOURAGING_MESSAGES.length);
        setMessage(ENCOURAGING_MESSAGES[randomIndex]);
    };

    const handleGive = async () => {
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
                contextId
            });

            // Start celebration animation instead of Alert
            startCelebration(coinsAmount);
        } catch (error: any) {
            const errorMessage = error.response?.data?.error ||
                                error.response?.data?.message ||
                                error.message ||
                                'Failed to give coins';
            Alert.alert('Error', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const renderCelebration = () => {
        const coinRotation = coinRotate.interpolate({
            inputRange: [0, 2],
            outputRange: ['0deg', '720deg'],
        });

        return (
            <Modal
                visible={showCelebration}
                transparent
                animationType="none"
                onRequestClose={closeCelebration}
            >
                <Animated.View style={[styles.celebrationOverlay, { opacity: celebrationOpacity }]}>
                    {/* Confetti */}
                    {confettiAnims.map((anim, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.confetti,
                                {
                                    width: anim.size,
                                    height: anim.size * 1.5,
                                    backgroundColor: anim.color,
                                    borderRadius: anim.size / 4,
                                    opacity: anim.opacity,
                                    transform: [
                                        { translateX: anim.translateX },
                                        { translateY: anim.translateY },
                                        {
                                            rotate: anim.rotate.interpolate({
                                                inputRange: [0, 10],
                                                outputRange: ['0deg', '360deg'],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        />
                    ))}

                    {/* Sparkles around coin */}
                    <Animated.View style={[styles.sparkleContainer, { opacity: sparkleOpacity }]}>
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
                            <Ionicons
                                key={index}
                                name="sparkles"
                                size={24}
                                color="#FBBF24"
                                style={[
                                    styles.sparkle,
                                    {
                                        transform: [
                                            { rotate: `${angle}deg` },
                                            { translateY: -100 },
                                        ],
                                    },
                                ]}
                            />
                        ))}
                    </Animated.View>

                    {/* Main coin */}
                    <Animated.View
                        style={[
                            styles.celebrationCoin,
                            {
                                transform: [
                                    { scale: coinScale },
                                    { rotate: coinRotation },
                                ],
                            },
                        ]}
                    >
                        <View style={styles.coinInner}>
                            <Ionicons name="gift" size={60} color="#FFF" />
                        </View>
                    </Animated.View>

                    {/* Text */}
                    <Animated.View style={[styles.celebrationTextContainer, { transform: [{ scale: textScale }] }]}>
                        <Text style={styles.celebrationTitle}>Kindness Sent!</Text>
                        <Text style={styles.celebrationAmount}>
                            {sentAmount} coin{sentAmount > 1 ? 's' : ''} to @{recipientUsername}
                        </Text>
                        <Text style={styles.celebrationMessage}>You're spreading positivity!</Text>
                    </Animated.View>

                    {/* Tap to close */}
                    <TouchableOpacity style={styles.tapToClose} onPress={closeCelebration}>
                        <Text style={styles.tapToCloseText}>Tap anywhere to continue</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Modal>
        );
    };

    return (
        <>
        {renderCelebration()}
        <Modal
            visible={visible && !showCelebration}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Give Positivity Coins</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Recipient */}
                    <View style={styles.recipient}>
                        <Ionicons name="person-circle" size={40} color="#9CA3AF" />
                        <Text style={styles.recipientName}>@{recipientUsername}</Text>
                    </View>

                    {/* Amount Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>How many coins?</Text>

                        <View style={styles.presets}>
                            {presetAmounts.map((preset) => (
                                <TouchableOpacity
                                    key={preset}
                                    style={[
                                        styles.presetButton,
                                        amount === preset.toString() && styles.presetButtonActive
                                    ]}
                                    onPress={() => setAmount(preset.toString())}
                                >
                                    <Text style={[
                                        styles.presetText,
                                        amount === preset.toString() && styles.presetTextActive
                                    ]}>
                                        {preset}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="Custom amount"
                            keyboardType="number-pad"
                            maxLength={3}
                        />
                    </View>

                    {/* Message (Optional) */}
                    <View style={styles.section}>
                        <View style={styles.messageLabelRow}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>Add a message (optional)</Text>
                            <TouchableOpacity
                                style={styles.randomButton}
                                onPress={getRandomMessage}
                            >
                                <Ionicons name="shuffle" size={16} color="#8B5CF6" />
                                <Text style={styles.randomButtonText}>Random</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.messageInput}
                            value={message}
                            onChangeText={setMessage}
                            placeholder="You're awesome!"
                            multiline
                            maxLength={200}
                        />
                        <Text style={styles.charCount}>{message.length}/200</Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.giveButton, submitting && styles.giveButtonDisabled]}
                            onPress={handleGive}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.giveText}>Give Coins</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modal: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        padding: 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827'
    },
    recipient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 20
    },
    recipientName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginLeft: 12
    },
    section: {
        marginBottom: 20
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12
    },
    messageLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    randomButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4
    },
    randomButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8B5CF6'
    },
    presets: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12
    },
    presetButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFF',
        alignItems: 'center'
    },
    presetButtonActive: {
        borderColor: '#FBBF24',
        backgroundColor: '#FEF3C7'
    },
    presetText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280'
    },
    presetTextActive: {
        color: '#F59E0B'
    },
    amountInput: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        fontSize: 16
    },
    messageInput: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top'
    },
    charCount: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 4
    },
    actions: {
        flexDirection: 'row',
        gap: 12
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center'
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280'
    },
    giveButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#EF4444',
        alignItems: 'center'
    },
    giveButtonDisabled: {
        backgroundColor: '#FCA5A5'
    },
    giveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF'
    },

    // Celebration styles
    celebrationOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confetti: {
        position: 'absolute',
    },
    sparkleContainer: {
        position: 'absolute',
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sparkle: {
        position: 'absolute',
    },
    celebrationCoin: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FBBF24',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 20,
    },
    coinInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FCD34D',
    },
    celebrationTextContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    celebrationTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
        textShadowColor: 'rgba(251, 191, 36, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    celebrationAmount: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FBBF24',
        marginBottom: 8,
    },
    celebrationMessage: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    tapToClose: {
        position: 'absolute',
        bottom: 60,
    },
    tapToCloseText: {
        fontSize: 14,
        color: '#6B7280',
    },
});
