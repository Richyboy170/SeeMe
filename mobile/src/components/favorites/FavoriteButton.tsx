import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

interface FavoriteButtonProps {
    userId: string;
    size?: number;
    style?: any;
    onToggle?: (isFavorite: boolean) => void;
}

export default function FavoriteButton({ userId, size = 24, style, onToggle }: FavoriteButtonProps) {
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        checkFavoriteStatus();
    }, [userId]);

    const checkFavoriteStatus = async () => {
        try {
            const response = await api.checkFavorite(userId);
            setIsFavorite(response.isFavorited);
        } catch (error) {
            console.error('Error checking favorite status:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFavorite = async () => {
        if (toggling) return;

        setToggling(true);
        try {
            if (isFavorite) {
                await api.removeFavorite(userId);
                setIsFavorite(false);
                onToggle?.(false);
            } else {
                await api.addFavorite(userId);
                setIsFavorite(true);
                onToggle?.(true);
            }
        } catch (error: any) {
            const message = error.response?.data?.error || 'Failed to update favorites';
            Alert.alert('Error', message);
        } finally {
            setToggling(false);
        }
    };

    if (loading) {
        return (
            <TouchableOpacity style={[styles.button, style]} disabled>
                <ActivityIndicator size="small" color="#FBBF24" />
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={toggleFavorite}
            disabled={toggling}
        >
            <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={size}
                color={isFavorite ? '#FBBF24' : '#6B7280'}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
