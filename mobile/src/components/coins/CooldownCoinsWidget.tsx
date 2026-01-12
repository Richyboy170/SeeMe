import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface CooldownCoinsWidgetProps {
    cooldownCoinsAvailable: number;
    minutesUntilNext: number | null;
    secondsUntilNext: number | null;
    onPress: () => void;
}

export default function CooldownCoinsWidget({
    cooldownCoinsAvailable,
    minutesUntilNext,
    secondsUntilNext,
    onPress
}: CooldownCoinsWidgetProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [localSecondsRemaining, setLocalSecondsRemaining] = useState<number | null>(secondsUntilNext);

    // Update local countdown every second
    useEffect(() => {
        setLocalSecondsRemaining(secondsUntilNext);
    }, [secondsUntilNext]);

    useEffect(() => {
        if (localSecondsRemaining === null || localSecondsRemaining <= 0) {
            return;
        }

        const interval = setInterval(() => {
            setLocalSecondsRemaining(prev => {
                if (prev === null || prev <= 1) {
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [localSecondsRemaining]);

    // Pulse animation when coins available
    useEffect(() => {
        if (cooldownCoinsAvailable > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.spring(scaleAnim, {
                        toValue: 1.1,
                        useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                        toValue: 1.0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scaleAnim.setValue(1);
        }
    }, [cooldownCoinsAvailable]);

    const formatTimeUntilNext = (seconds: number | null): string => {
        if (seconds === null || seconds === undefined || isNaN(seconds)) return '';
        if (seconds <= 0) return 'Ready!';

        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${mins}m ${secs}s`;
        } else if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            disabled={cooldownCoinsAvailable === 0}
        >
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
                {/* Stack of 3 coins */}
                <View style={styles.coinStack}>
                    {/* Bottom coin */}
                    <View style={[styles.coin, styles.coin3, cooldownCoinsAvailable >= 1 && styles.coinActive]} />

                    {/* Middle coin */}
                    <View style={[styles.coin, styles.coin2, cooldownCoinsAvailable >= 2 && styles.coinActive]} />

                    {/* Top coin */}
                    <View style={[styles.coin, styles.coin1, cooldownCoinsAvailable >= 3 && styles.coinActive]} />
                </View>

                {/* Badge showing count */}
                {cooldownCoinsAvailable > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{cooldownCoinsAvailable}</Text>
                    </View>
                )}
            </Animated.View>

            <View style={styles.info}>
                <Text style={styles.label}>Free Coins</Text>
                {cooldownCoinsAvailable > 0 ? (
                    <Text style={styles.ready}>Tap to claim!</Text>
                ) : (
                    <Text style={styles.timer}>{formatTimeUntilNext(localSecondsRemaining)}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    iconContainer: {
        position: 'relative',
        marginRight: 12
    },
    coinStack: {
        width: 50,
        height: 50,
        position: 'relative'
    },
    coin: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#D1D5DB',
        borderWidth: 3,
        borderColor: '#9CA3AF'
    },
    coin1: {
        left: 10,
        top: 0,
        zIndex: 3
    },
    coin2: {
        left: 5,
        top: 5,
        zIndex: 2
    },
    coin3: {
        left: 0,
        top: 10,
        zIndex: 1
    },
    coinActive: {
        backgroundColor: '#FBBF24',  // Gold
        borderColor: '#F59E0B'
    },
    badge: {
        position: 'absolute',
        right: -5,
        top: -5,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold'
    },
    info: {
        flex: 1
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2
    },
    ready: {
        fontSize: 13,
        color: '#10B981',
        fontWeight: '600'
    },
    timer: {
        fontSize: 13,
        color: '#6B7280'
    }
});
