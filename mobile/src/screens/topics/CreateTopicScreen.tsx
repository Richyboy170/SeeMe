import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, Share, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

const EMOJI_OPTIONS = ['🎨', '🍳', '💪', '🎮', '📚', '🎵', '🌱', '✂️', '🛠️', '📷', '🧶', '🎭', '⚽', '🎲', '💻', '🎸', '🎬', '🏃', '🧘', '🎯'];

const CATEGORIES = [
    { id: 'creative', name: 'Creative', icon: '🎨' },
    { id: 'hobbies', name: 'Hobbies', icon: '🎯' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '🏠' },
    { id: 'fitness', name: 'Fitness', icon: '💪' },
    { id: 'learning', name: 'Learning', icon: '📚' },
    { id: 'tech', name: 'Tech', icon: '💻' }
];

export default function CreateTopicScreen({ navigation }: any) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('🎨');
    const [selectedCategory, setSelectedCategory] = useState('creative');
    const [loading, setLoading] = useState(false);
    const [createdTopic, setCreatedTopic] = useState<any>(null);

    const handleCreate = async () => {
        if (name.length < 2) {
            Alert.alert('Name Required', 'Topic name must be at least 2 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/topics', {
                name,
                description,
                iconEmoji: selectedEmoji,
                category: selectedCategory
            });

            setCreatedTopic(response.data.topic);
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to create topic'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!createdTopic) return;

        try {
            await Share.share({
                message: `Join ${createdTopic.name} on SeeMe! seeme.app/t/${createdTopic.slug}`,
                title: createdTopic.name
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    // Success screen after creation
    if (createdTopic) {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                    <Text style={styles.successEmoji}>{createdTopic.iconEmoji}</Text>
                </View>
                <Text style={styles.successTitle}>Community Created!</Text>
                <Text style={styles.successName}>{createdTopic.name}</Text>
                <Text style={styles.successSubtitle}>
                    Your community is ready. Share it with friends!
                </Text>

                <View style={styles.linksCard}>
                    <Text style={styles.linksTitle}>Share Links</Text>

                    <View style={styles.linkItem}>
                        <Ionicons name="link" size={20} color="#7C3AED" />
                        <Text style={styles.linkText}>seeme.app/t/{createdTopic.slug}</Text>
                    </View>

                    <View style={styles.linkItem}>
                        <Ionicons name="ticket" size={20} color="#7C3AED" />
                        <Text style={styles.linkText}>Invite Code: {createdTopic.inviteCode}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Ionicons name="share-social" size={20} color="#FFFFFF" />
                    <Text style={styles.shareButtonText}>Share Community</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => navigation.replace('TopicPage', { topicSlug: createdTopic.slug })}
                >
                    <Text style={styles.viewButtonText}>View Community</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Create Community</Text>
            <Text style={styles.subtitle}>
                Start a new community around something you love
            </Text>

            {/* Emoji Selector */}
            <View style={styles.section}>
                <Text style={styles.label}>Choose an Icon</Text>
                <View style={styles.emojiGrid}>
                    {EMOJI_OPTIONS.map((emoji) => (
                        <TouchableOpacity
                            key={emoji}
                            style={[
                                styles.emojiOption,
                                selectedEmoji === emoji && styles.emojiOptionSelected
                            ]}
                            onPress={() => setSelectedEmoji(emoji)}
                        >
                            <Text style={styles.emojiText}>{emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Name Input */}
            <View style={styles.section}>
                <Text style={styles.label}>Community Name</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Beginner Cooking"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    maxLength={50}
                />
                <Text style={styles.charCount}>{name.length}/50</Text>
            </View>

            {/* Description Input */}
            <View style={styles.section}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="What's your community about?"
                    placeholderTextColor="#9CA3AF"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                />
                <Text style={styles.charCount}>{description.length}/200</Text>
            </View>

            {/* Category Selector */}
            <View style={styles.section}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                    {CATEGORIES.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryOption,
                                selectedCategory === category.id && styles.categoryOptionSelected
                            ]}
                            onPress={() => setSelectedCategory(category.id)}
                        >
                            <Text style={styles.categoryIcon}>{category.icon}</Text>
                            <Text style={[
                                styles.categoryName,
                                selectedCategory === category.id && styles.categoryNameSelected
                            ]}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Preview */}
            <View style={styles.section}>
                <Text style={styles.label}>Preview</Text>
                <View style={styles.previewCard}>
                    <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
                    <View style={styles.previewInfo}>
                        <Text style={styles.previewName}>{name || 'Community Name'}</Text>
                        <Text style={styles.previewCategory}>
                            {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
                style={[styles.createButton, (!name || loading) && styles.createButtonDisabled]}
                onPress={handleCreate}
                disabled={!name || loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <>
                        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.createButtonText}>Create Community</Text>
                    </>
                )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
                Communities are visible to everyone. You can share an invite link after creation.
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB'
    },
    content: {
        padding: 16,
        paddingBottom: 40
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 24
    },
    section: {
        marginBottom: 24
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    emojiOption: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent'
    },
    emojiOptionSelected: {
        borderColor: '#7C3AED',
        backgroundColor: '#EDE9FE'
    },
    emojiText: {
        fontSize: 24
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top'
    },
    charCount: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 4
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 6
    },
    categoryOptionSelected: {
        backgroundColor: '#EDE9FE',
        borderColor: '#7C3AED'
    },
    categoryIcon: {
        fontSize: 16
    },
    categoryName: {
        fontSize: 14,
        color: '#6B7280'
    },
    categoryNameSelected: {
        color: '#7C3AED',
        fontWeight: '600'
    },
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    previewEmoji: {
        fontSize: 40,
        marginRight: 12
    },
    previewInfo: {
        flex: 1
    },
    previewName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937'
    },
    previewCategory: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        marginTop: 8
    },
    createButtonDisabled: {
        opacity: 0.6
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600'
    },
    disclaimer: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 16
    },
    // Success screen styles
    successContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EDE9FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24
    },
    successEmoji: {
        fontSize: 48
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8
    },
    successName: {
        fontSize: 20,
        color: '#7C3AED',
        fontWeight: '600',
        marginBottom: 8
    },
    successSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32
    },
    linksCard: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24
    },
    linksTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
    },
    linkText: {
        fontSize: 14,
        color: '#4B5563'
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        gap: 8,
        width: '100%'
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600'
    },
    viewButton: {
        marginTop: 12,
        paddingVertical: 16,
        paddingHorizontal: 32
    },
    viewButtonText: {
        color: '#7C3AED',
        fontSize: 16,
        fontWeight: '600'
    },
    doneButton: {
        marginTop: 8,
        paddingVertical: 12
    },
    doneButtonText: {
        color: '#6B7280',
        fontSize: 16
    }
});
