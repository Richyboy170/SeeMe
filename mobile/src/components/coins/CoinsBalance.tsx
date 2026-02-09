import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface CoinsBalanceProps {
    totalCoins: number;
    size?: 'small' | 'medium' | 'large';
}

export default function CoinsBalance({ totalCoins, size = 'medium' }: CoinsBalanceProps) {
    const { colors } = useTheme();
    const sizeStyles = {
        small: {
            container: styles.smallContainer,
            icon: 16,
            text: styles.smallText
        },
        medium: {
            container: styles.mediumContainer,
            icon: 20,
            text: styles.mediumText
        },
        large: {
            container: styles.largeContainer,
            icon: 28,
            text: styles.largeText
        }
    };

    const currentSize = sizeStyles[size];

    return (
        <View style={[styles.container, currentSize.container, { backgroundColor: colors.card }]}>
            <Ionicons name="heart" size={currentSize.icon} color={colors.gift} />
            <Text style={[styles.text, currentSize.text, { color: colors.text.primary }]}>
                {totalCoins.toLocaleString()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    text: {
        marginLeft: 6,
        fontWeight: '700',
        color: '#374151'
    },
    smallContainer: {
        paddingHorizontal: 8,
        paddingVertical: 4
    },
    smallText: {
        fontSize: 13
    },
    mediumContainer: {
        paddingHorizontal: 12,
        paddingVertical: 6
    },
    mediumText: {
        fontSize: 16
    },
    largeContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8
    },
    largeText: {
        fontSize: 20
    }
});
