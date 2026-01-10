import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GiveCounterBadgeProps {
    giveCounter: number;
    rank: string;
}

export default function GiveCounterBadge({ giveCounter, rank }: GiveCounterBadgeProps) {
    const rankColors: { [key: string]: string } = {
        beginner: '#9CA3AF',
        kind: '#60A5FA',
        generous: '#A78BFA',
        inspirational: '#F59E0B',
        legend: '#EF4444'
    };

    const rankEmojis: { [key: string]: string } = {
        beginner: '🌱',
        kind: '💙',
        generous: '💜',
        inspirational: '⭐',
        legend: '🏆'
    };

    const color = rankColors[rank] || rankColors.beginner;
    const emoji = rankEmojis[rank] || rankEmojis.beginner;

    return (
        <View style={[styles.container, { borderColor: color }]}>
            <View style={styles.iconContainer}>
                <Ionicons name="gift" size={20} color={color} />
            </View>

            <View style={styles.content}>
                <View style={styles.row}>
                    <Text style={styles.label}>Given</Text>
                    <Text style={styles.emoji}>{emoji}</Text>
                </View>
                <Text style={[styles.count, { color }]}>
                    {giveCounter.toLocaleString()}
                </Text>
                <Text style={[styles.rank, { color }]}>
                    {rank.charAt(0).toUpperCase() + rank.slice(1)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    iconContainer: {
        marginRight: 12,
        justifyContent: 'center'
    },
    content: {
        flex: 1
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 4
    },
    emoji: {
        fontSize: 14
    },
    count: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 2
    },
    rank: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    }
});
