import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, getImageUrl } from '../services/api';

const EMOJI_OPTIONS = [
    '🎨', '🎯', '🏠', '💪', '📚', '💻', '🎮', '🎵', '📷', '🌱',
    '🚀', '✨', '🔥', '💡', '🎬', '🍳', '🏃', '📱', '🎸', '🐾',
    '🌍', '💬', '🎪', '🏖️', '🏔️', '🎭', '🧘', '🚴', '⚽', '🎾'
];

// Detect if an icon value is an Ionicons name (lowercase ASCII + hyphens)
const isIoniconName = (value: string): boolean => /^[a-z][a-z0-9-]*$/.test(value);

interface TopicEditModalProps {
    visible: boolean;
    topic: {
        id: string;
        name: string;
        description: string | null;
        iconEmoji: string | null;
        iconImageUrl?: string | null;
        coverImageUrl: string | null;
    } | null;
    onClose: () => void;
    onSave: (updates: any) => void;
}

export default function TopicEditModal({
    visible,
    topic,
    onClose,
    onSave,
}: TopicEditModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [iconEmoji, setIconEmoji] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useEffect(() => {
        if (topic && visible) {
            setName(topic.name);
            setDescription(topic.description || '');
            setIconEmoji(topic.iconEmoji || '');
            setCoverImageUrl(topic.coverImageUrl);
        }
    }, [topic, visible]);

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please allow access to your photos to change the cover image.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            const formData = new FormData();
            const filename = uri.split('/').pop() || 'cover.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('image', {
                uri,
                name: filename,
                type,
            } as any);

            const response = await api.uploadTopicCover(formData);
            if (response.url) {
                setCoverImageUrl(response.url);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!topic) return;

        setSaving(true);
        try {
            const updates: any = {};
            if (name !== topic.name) updates.name = name;
            if (description !== (topic.description || '')) updates.description = description;
            if (iconEmoji !== (topic.iconEmoji || '')) updates.iconEmoji = iconEmoji;
            if (coverImageUrl !== topic.coverImageUrl) updates.coverImageUrl = coverImageUrl;

            if (Object.keys(updates).length > 0) {
                await api.updateTopic(topic.id, updates);
                onSave(updates);
            }
            onClose();
        } catch (error: any) {
            console.error('Error saving topic:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setShowEmojiPicker(false);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Community</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.headerButton}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#7C3AED" />
                        ) : (
                            <Text style={styles.saveText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {/* Cover Image */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Cover Image</Text>
                        <TouchableOpacity
                            style={styles.coverImageContainer}
                            onPress={pickImage}
                            disabled={uploading}
                        >
                            {coverImageUrl ? (
                                <Image
                                    source={{ uri: getImageUrl(coverImageUrl) || coverImageUrl }}
                                    style={styles.coverImage}
                                />
                            ) : (
                                <View style={[styles.coverImage, styles.coverPlaceholder]}>
                                    {iconEmoji && isIoniconName(iconEmoji) ? (
                                        <Ionicons name={`${iconEmoji}-outline` as any} size={64} color="rgba(255,255,255,0.3)" />
                                    ) : (
                                        <Text style={styles.coverPlaceholderEmoji}>{iconEmoji || '🏷️'}</Text>
                                    )}
                                </View>
                            )}
                            <View style={styles.coverOverlay}>
                                {uploading ? (
                                    <ActivityIndicator size="large" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="camera" size={32} color="#FFFFFF" />
                                        <Text style={styles.coverOverlayText}>Change Cover</Text>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                        {coverImageUrl && (
                            <TouchableOpacity
                                style={styles.removeImageButton}
                                onPress={() => setCoverImageUrl(null)}
                            >
                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                <Text style={styles.removeImageText}>Remove Cover Image</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Icon Emoji */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Community Icon</Text>
                        <TouchableOpacity
                            style={styles.emojiSelector}
                            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                            {topic?.iconImageUrl ? (
                                <Image
                                    source={{ uri: getImageUrl(topic.iconImageUrl) || topic.iconImageUrl }}
                                    style={{ width: 36, height: 36, borderRadius: 18 }}
                                />
                            ) : iconEmoji && isIoniconName(iconEmoji) ? (
                                <Ionicons name={`${iconEmoji}-outline` as any} size={32} color="#7C3AED" />
                            ) : (
                                <Text style={styles.selectedEmoji}>{iconEmoji || '🏷️'}</Text>
                            )}
                            <Text style={styles.emojiSelectorText}>Tap to change</Text>
                            <Ionicons name="chevron-down" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        {showEmojiPicker && (
                            <View style={styles.emojiGrid}>
                                {EMOJI_OPTIONS.map((emoji) => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={[
                                            styles.emojiOption,
                                            iconEmoji === emoji && styles.emojiOptionSelected
                                        ]}
                                        onPress={() => {
                                            setIconEmoji(emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                    >
                                        <Text style={styles.emojiOptionText}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Name */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Community Name</Text>
                        <TextInput
                            style={styles.textInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter community name"
                            maxLength={50}
                        />
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What is this community about?"
                            maxLength={500}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerButton: {
        minWidth: 60,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    cancelText: {
        fontSize: 16,
        color: '#6B7280',
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7C3AED',
        textAlign: 'right',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    coverImageContainer: {
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverPlaceholderEmoji: {
        fontSize: 64,
        opacity: 0.3,
    },
    coverOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverOverlayText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    removeImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 6,
    },
    removeImageText: {
        fontSize: 14,
        color: '#EF4444',
    },
    emojiSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
    },
    selectedEmoji: {
        fontSize: 36,
    },
    emojiSelectorText: {
        flex: 1,
        fontSize: 16,
        color: '#6B7280',
        marginLeft: 12,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 8,
    },
    emojiOption: {
        width: '16.66%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    emojiOptionSelected: {
        backgroundColor: '#EDE9FE',
    },
    emojiOptionText: {
        fontSize: 24,
    },
    textInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1F2937',
    },
    textArea: {
        minHeight: 100,
    },
});
