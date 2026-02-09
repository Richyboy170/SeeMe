import React, { useRef, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Vibration,
    Platform,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccountContext } from '../contexts/AccountContext';
import { useTheme } from '../theme';
import Avatar from './Avatar';

interface ProfileTabButtonProps {
    onPress?: (e?: any) => void;
    accessibilityState?: { selected?: boolean };
    children?: React.ReactNode;
}

const DOUBLE_TAP_DELAY = 300; // ms between taps to count as double-tap
const LONG_PRESS_DELAY = 500; // ms for long press

export default function ProfileTabButton({
    onPress,
    accessibilityState,
}: ProfileTabButtonProps) {
    const { colors } = useTheme();
    const focused = accessibilityState?.selected ?? false;
    const lastTapTimeRef = useRef<number>(0);
    const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const {
        activeAccount,
        accounts,
        quickSwitch,
        setShowAccountSwitcher,
    } = useAccountContext();

    // Handle tap with double-tap detection
    const handlePress = useCallback(() => {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTimeRef.current;

        // Clear any pending single tap timeout
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
        }

        if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
            // Double tap detected
            lastTapTimeRef.current = 0; // Reset to prevent triple tap
            console.log('Double tap detected, accounts:', accounts.length);

            if (accounts.length < 2) {
                // Subtle feedback that double-tap was recognized but no action
                if (Platform.OS === 'android') {
                    Vibration.vibrate(50);
                }
                // Still navigate to profile on double tap if only one account
                onPress?.();
                return;
            }

            // Haptic feedback
            if (Platform.OS === 'android') {
                Vibration.vibrate(30);
            }

            quickSwitch().then(result => {
                console.log('Quick switch result:', result);
            });
        } else {
            // First tap - wait to see if it's a double tap
            lastTapTimeRef.current = now;
            tapTimeoutRef.current = setTimeout(() => {
                // Single tap confirmed - navigate to profile
                onPress?.();
                tapTimeoutRef.current = null;
            }, DOUBLE_TAP_DELAY);
        }
    }, [accounts.length, quickSwitch, onPress]);

    // Handle long press - show account switcher
    const handleLongPress = useCallback(() => {
        // Clear any pending tap
        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
        }
        lastTapTimeRef.current = 0;

        // Haptic feedback
        if (Platform.OS === 'android') {
            Vibration.vibrate(50);
        }

        setShowAccountSwitcher(true);
    }, [setShowAccountSwitcher]);

    return (
        <Pressable
            style={styles.container}
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={LONG_PRESS_DELAY}
        >
            {/* Show avatar if account is active, otherwise show default icon */}
            {activeAccount && activeAccount.avatarUrl ? (
                <View style={[
                    styles.avatarContainer,
                    focused && styles.avatarContainerFocused,
                    focused && { borderColor: colors.tabActive },
                ]}>
                    <Avatar
                        size={24}
                        avatarUrl={activeAccount.avatarUrl}
                        username={activeAccount.username}
                        showBorder={false}
                    />
                    {/* Multiple accounts indicator dot */}
                    {accounts.length > 1 && (
                        <View style={[styles.multiAccountDot, { borderColor: colors.background }]} />
                    )}
                </View>
            ) : (
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={focused ? 'person' : 'person-outline'}
                        size={24}
                        color={focused ? colors.tabActive : colors.tabInactive}
                    />
                    {/* Multiple accounts indicator dot */}
                    {accounts.length > 1 && (
                        <View style={[styles.multiAccountDot, { borderColor: colors.background }]} />
                    )}
                </View>
            )}
            {/* Profile label */}
            <Text style={[
                styles.label,
                { color: focused ? colors.tabActive : colors.tabInactive }
            ]}>
                Profile
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 4,
    },
    avatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    avatarContainerFocused: {
        borderColor: undefined,
    },
    iconContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    multiAccountDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        borderWidth: 1.5,
        borderColor: undefined,
    },
    label: {
        fontSize: 10,
        marginTop: 2,
    },
});
