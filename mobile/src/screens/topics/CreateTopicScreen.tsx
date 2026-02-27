import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, Share, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api, getImageUrl } from '../../services/api';
import { useTheme, Colors } from '../../theme';
import { COMMUNITY_ICON_CATEGORIES } from '../../constants/communityIcons';
import { useAccountContext } from '../../contexts/AccountContext';

const CATEGORIES = [
    { id: 'creative', name: 'Creative', icon: '🎨' },
    { id: 'hobbies', name: 'Hobbies', icon: '🎯' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '🏠' },
    { id: 'fitness', name: 'Fitness', icon: '💪' },
    { id: 'learning', name: 'Learning', icon: '📚' },
    { id: 'tech', name: 'Tech', icon: '💻' }
];

// Detect if an icon value is an Ionicons name (lowercase ASCII + hyphens)
const isIoniconName = (value: string): boolean => /^[a-z][a-z0-9-]*$/.test(value);

type IconMode = 'icons' | 'photo';

export default function CreateTopicScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { activeAccount } = useAccountContext();

    // Type state
    const [topicType, setTopicType] = useState<'community' | 'private' | 'broadcast'>('community');

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('star');
    const [iconImageUrl, setIconImageUrl] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('creative');
    const [iconMode, setIconMode] = useState<IconMode>('icons');
    const [activeIconCategory, setActiveIconCategory] = useState('general');

    // Admin state
    const [showAdmins, setShowAdmins] = useState(false);
    const [adminSearch, setAdminSearch] = useState('');
    const [friends, setFriends] = useState<any[]>([]);
    const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);

    // Refs
    const descriptionRef = useRef<TextInput>(null);

    // General state
    const [loading, setLoading] = useState(false);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const [createdTopic, setCreatedTopic] = useState<any>(null);

    // Load friends when admin section is expanded
    useEffect(() => {
        if (showAdmins && friends.length === 0) {
            loadFriends();
        }
    }, [showAdmins]);

    const loadFriends = async () => {
        setLoadingFriends(true);
        try {
            const username = activeAccount?.username;
            if (username) {
                const response = await api.getFollowing(username);
                setFriends(response.following || []);
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setLoadingFriends(false);
        }
    };

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setUploadingIcon(true);
            try {
                const asset = result.assets[0];
                const formData = new FormData();
                formData.append('image', {
                    uri: asset.uri,
                    type: 'image/jpeg',
                    name: 'topic-icon.jpg',
                } as any);

                const response = await api.uploadTopicIcon(formData);
                if (response.success) {
                    setIconImageUrl(response.url);
                    setIconMode('photo');
                }
            } catch (error) {
                Alert.alert('Upload Failed', 'Could not upload the image. Please try again.');
            } finally {
                setUploadingIcon(false);
            }
        }
    };

    const toggleAdmin = (userId: string) => {
        setSelectedAdminIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const filteredFriends = friends.filter(f =>
        !adminSearch || f.username?.toLowerCase().includes(adminSearch.toLowerCase())
    );

    const handleCreate = async () => {
        if (name.length < 2) {
            Alert.alert('Name Required', 'Community name must be at least 2 characters');
            return;
        }

        setLoading(true);
        try {
            const topicData: any = {
                name,
                description,
                category: selectedCategory,
                type: topicType,
            };

            if (iconMode === 'photo' && iconImageUrl) {
                topicData.iconImageUrl = iconImageUrl;
                topicData.iconEmoji = '🏷️'; // fallback emoji
            } else {
                topicData.iconEmoji = selectedIcon;
            }

            if (selectedAdminIds.length > 0) {
                topicData.adminIds = selectedAdminIds;
            }

            const response = await api.createTopic(topicData);
            setCreatedTopic(response.topic);
        } catch (error: any) {
            Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to create community'
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

    // Render the icon for preview/success based on type
    const renderTopicIcon = (iconEmoji: string | null, imageUrl: string | null, size: number) => {
        if (imageUrl) {
            const resolvedUrl = getImageUrl(imageUrl);
            return (
                <Image
                    source={{ uri: resolvedUrl || imageUrl }}
                    style={{ width: size, height: size, borderRadius: size / 2 }}
                />
            );
        }
        if (iconEmoji && isIoniconName(iconEmoji)) {
            return (
                <Ionicons
                    name={`${iconEmoji}-outline` as any}
                    size={size * 0.6}
                    color={Colors.brand.primary}
                />
            );
        }
        return <Text style={{ fontSize: size * 0.6 }}>{iconEmoji || '🏷️'}</Text>;
    };

    // Success screen
    if (createdTopic) {
        const successIconEmoji = createdTopic.iconEmoji;
        const successImageUrl = createdTopic.iconImageUrl;

        return (
            <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.successIconWrap, { backgroundColor: isDark ? Colors.dark.surfaceVariant : '#EDE9FE' }]}>
                    {renderTopicIcon(successIconEmoji, successImageUrl, 100)}
                </View>
                <Text style={[styles.successTitle, { color: colors.text.primary }]}>
                    {createdTopic.type === 'private' ? 'Private Group Created!' :
                     createdTopic.type === 'broadcast' ? 'Channel Created!' :
                     'Community Created!'}
                </Text>
                <Text style={[styles.successName, { color: Colors.brand.primary }]}>{createdTopic.name}</Text>
                <Text style={[styles.successSubtitle, { color: colors.text.secondary }]}>
                    Your community is ready. Share it with friends!
                </Text>

                <View style={[styles.linksCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.linksTitle, { color: colors.text.primary }]}>Share Links</Text>
                    <View style={styles.linkItem}>
                        <Ionicons name="link" size={20} color={Colors.brand.primary} />
                        <Text style={[styles.linkText, { color: colors.text.secondary }]}>
                            seeme.app/t/{createdTopic.slug}
                        </Text>
                    </View>
                    <View style={styles.linkItem}>
                        <Ionicons name="ticket" size={20} color={Colors.brand.primary} />
                        <Text style={[styles.linkText, { color: colors.text.secondary }]}>
                            Invite Code: {createdTopic.inviteCode}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: Colors.brand.primary }]}
                    onPress={handleShare}
                >
                    <Ionicons name="share-social" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Share Community</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => navigation.replace('TopicPage', { topicSlug: createdTopic.slug })}
                >
                    <Text style={[styles.secondaryBtnText, { color: Colors.brand.primary }]}>View Community</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.tertiaryBtn} onPress={() => navigation.goBack()}>
                    <Text style={[styles.tertiaryBtnText, { color: colors.text.secondary }]}>Done</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentCategoryIcons = COMMUNITY_ICON_CATEGORIES.find(c => c.id === activeIconCategory)?.icons || [];

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={[styles.title, { color: colors.text.primary }]}>
                {topicType === 'private' ? 'Create Private Group' :
                 topicType === 'broadcast' ? 'Create Channel' :
                 'Create Community'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                {topicType === 'private' ? 'A private space for approved members only' :
                 topicType === 'broadcast' ? 'A channel where only designated broadcasters post' :
                 'Start a new community around something you love'}
            </Text>

            {/* Type Selector */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.text.primary }]}>Type</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([
                        { key: 'community' as const, label: 'Community', icon: 'people-outline', desc: 'Open to all' },
                        { key: 'private' as const, label: 'Private Group', icon: 'lock-closed-outline', desc: 'Approval required' },
                        { key: 'broadcast' as const, label: 'Channel', icon: 'megaphone-outline', desc: 'Broadcasters post' },
                    ]).map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={[
                                styles.typeCard,
                                {
                                    backgroundColor: topicType === t.key
                                        ? (isDark ? 'rgba(139,92,246,0.2)' : '#EDE9FE')
                                        : colors.surfaceVariant,
                                    borderColor: topicType === t.key ? Colors.brand.primary : colors.border,
                                    borderWidth: topicType === t.key ? 2 : 1,
                                    flex: 1,
                                }
                            ]}
                            onPress={() => setTopicType(t.key)}
                        >
                            <Ionicons
                                name={t.icon as any}
                                size={22}
                                color={topicType === t.key ? Colors.brand.primary : colors.text.secondary}
                            />
                            <Text style={[
                                styles.typeLabel,
                                { color: topicType === t.key ? Colors.brand.primary : colors.text.primary }
                            ]}>
                                {t.label}
                            </Text>
                            <Text style={[styles.typeDesc, { color: colors.text.secondary }]} numberOfLines={1}>
                                {t.desc}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Section 1: Community Icon */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.text.primary }]}>Community Icon</Text>

                {/* Icon mode toggle */}
                <View style={[styles.toggleRow, { backgroundColor: colors.surfaceVariant }]}>
                    <TouchableOpacity
                        style={[
                            styles.toggleBtn,
                            iconMode === 'icons' && { backgroundColor: Colors.brand.primary }
                        ]}
                        onPress={() => setIconMode('icons')}
                    >
                        <Ionicons
                            name="grid-outline"
                            size={16}
                            color={iconMode === 'icons' ? '#FFF' : colors.text.secondary}
                        />
                        <Text style={[
                            styles.toggleText,
                            { color: iconMode === 'icons' ? '#FFF' : colors.text.secondary }
                        ]}>Icons</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.toggleBtn,
                            iconMode === 'photo' && { backgroundColor: Colors.brand.primary }
                        ]}
                        onPress={() => setIconMode('photo')}
                    >
                        <Ionicons
                            name="image-outline"
                            size={16}
                            color={iconMode === 'photo' ? '#FFF' : colors.text.secondary}
                        />
                        <Text style={[
                            styles.toggleText,
                            { color: iconMode === 'photo' ? '#FFF' : colors.text.secondary }
                        ]}>Photo</Text>
                    </TouchableOpacity>
                </View>

                {iconMode === 'icons' ? (
                    <View>
                        {/* Category pills */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.categoryPillScroll}
                            contentContainerStyle={styles.categoryPillContent}
                        >
                            {COMMUNITY_ICON_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryPill,
                                        {
                                            backgroundColor: activeIconCategory === cat.id
                                                ? Colors.brand.primary
                                                : colors.surfaceVariant,
                                        }
                                    ]}
                                    onPress={() => setActiveIconCategory(cat.id)}
                                >
                                    <Text style={[
                                        styles.categoryPillText,
                                        {
                                            color: activeIconCategory === cat.id
                                                ? '#FFF'
                                                : colors.text.secondary
                                        }
                                    ]}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Icon grid */}
                        <View style={styles.iconGrid}>
                            {currentCategoryIcons.map(iconName => (
                                <TouchableOpacity
                                    key={iconName}
                                    style={[
                                        styles.iconOption,
                                        {
                                            backgroundColor: selectedIcon === iconName && iconMode === 'icons'
                                                ? (isDark ? '#3B2070' : '#EDE9FE')
                                                : colors.surfaceVariant,
                                            borderColor: selectedIcon === iconName && iconMode === 'icons'
                                                ? Colors.brand.primary
                                                : 'transparent',
                                        }
                                    ]}
                                    onPress={() => {
                                        setSelectedIcon(iconName);
                                        setIconImageUrl(null);
                                        setIconMode('icons');
                                    }}
                                >
                                    <Ionicons
                                        name={`${iconName}-outline` as any}
                                        size={24}
                                        color={selectedIcon === iconName && iconMode === 'icons'
                                            ? Colors.brand.primary
                                            : colors.text.secondary}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.photoSection}>
                        {iconImageUrl ? (
                            <View style={styles.photoPreviewWrap}>
                                <Image
                                    source={{ uri: getImageUrl(iconImageUrl) || iconImageUrl }}
                                    style={styles.photoPreview}
                                />
                                <TouchableOpacity
                                    style={styles.photoRemoveBtn}
                                    onPress={() => {
                                        setIconImageUrl(null);
                                        setIconMode('icons');
                                    }}
                                >
                                    <Ionicons name="close-circle" size={24} color={Colors.common.error} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.photoPickerBtn, { borderColor: colors.border }]}
                                onPress={handlePickImage}
                                disabled={uploadingIcon}
                            >
                                {uploadingIcon ? (
                                    <ActivityIndicator color={Colors.brand.primary} />
                                ) : (
                                    <>
                                        <Ionicons name="camera-outline" size={32} color={colors.text.secondary} />
                                        <Text style={[styles.photoPickerText, { color: colors.text.secondary }]}>
                                            Tap to upload photo
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Section 2: Name & Description */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.text.primary }]}>Community Name</Text>
                <TextInput
                    style={[styles.input, {
                        backgroundColor: colors.surfaceVariant,
                        color: colors.text.primary,
                        borderColor: colors.border,
                    }]}
                    placeholder="e.g., Beginner Cooking"
                    placeholderTextColor={colors.text.tertiary}
                    value={name}
                    onChangeText={setName}
                    maxLength={50}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => descriptionRef.current?.focus()}
                />
                <Text style={[styles.charCount, { color: colors.text.tertiary }]}>{name.length}/50</Text>

                <Text style={[styles.cardLabel, { color: colors.text.primary, marginTop: 16 }]}>
                    Description (Optional)
                </Text>
                <TextInput
                    ref={descriptionRef}
                    style={[styles.input, styles.textArea, {
                        backgroundColor: colors.surfaceVariant,
                        color: colors.text.primary,
                        borderColor: colors.border,
                    }]}
                    placeholder="What's your community about?"
                    placeholderTextColor={colors.text.tertiary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                />
                <Text style={[styles.charCount, { color: colors.text.tertiary }]}>{description.length}/200</Text>
            </View>

            {/* Section 3: Category */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.text.primary }]}>Category</Text>
                <View style={styles.categoryGrid}>
                    {CATEGORIES.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={[
                                styles.categoryOption,
                                {
                                    backgroundColor: selectedCategory === category.id
                                        ? (isDark ? '#3B2070' : '#EDE9FE')
                                        : colors.surfaceVariant,
                                    borderColor: selectedCategory === category.id
                                        ? Colors.brand.primary
                                        : 'transparent',
                                }
                            ]}
                            onPress={() => setSelectedCategory(category.id)}
                        >
                            <Text style={styles.categoryIcon}>{category.icon}</Text>
                            <Text style={[
                                styles.categoryName,
                                {
                                    color: selectedCategory === category.id
                                        ? Colors.brand.primary
                                        : colors.text.secondary,
                                    fontWeight: selectedCategory === category.id ? '600' : '400',
                                }
                            ]}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Section 4: Add Admins (collapsible) */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.adminHeader}
                    onPress={() => setShowAdmins(!showAdmins)}
                >
                    <View style={styles.adminHeaderLeft}>
                        <Ionicons name="people-outline" size={20} color={Colors.brand.primary} />
                        <Text style={[styles.cardLabel, { color: colors.text.primary, marginBottom: 0 }]}>
                            Add Admins
                        </Text>
                        <Text style={[styles.optionalBadge, { color: colors.text.tertiary }]}>Optional</Text>
                    </View>
                    <Ionicons
                        name={showAdmins ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.text.secondary}
                    />
                </TouchableOpacity>

                {showAdmins && (
                    <View style={styles.adminContent}>
                        {/* Selected admin chips */}
                        {selectedAdminIds.length > 0 && (
                            <View style={styles.adminChips}>
                                {selectedAdminIds.map(id => {
                                    const friend = friends.find(f => f.id === id);
                                    if (!friend) return null;
                                    return (
                                        <View
                                            key={id}
                                            style={[styles.adminChip, { backgroundColor: isDark ? '#3B2070' : '#EDE9FE' }]}
                                        >
                                            <Text style={[styles.adminChipText, { color: Colors.brand.primary }]}>
                                                {friend.username}
                                            </Text>
                                            <TouchableOpacity onPress={() => toggleAdmin(id)}>
                                                <Ionicons name="close-circle" size={16} color={Colors.brand.primary} />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Search input */}
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: colors.surfaceVariant,
                                color: colors.text.primary,
                                borderColor: colors.border,
                            }]}
                            placeholder="Search friends..."
                            placeholderTextColor={colors.text.tertiary}
                            value={adminSearch}
                            onChangeText={setAdminSearch}
                        />

                        {/* Friends list */}
                        {loadingFriends ? (
                            <ActivityIndicator style={{ marginTop: 12 }} color={Colors.brand.primary} />
                        ) : (
                            <View style={styles.friendsList}>
                                {filteredFriends.slice(0, 20).map(friend => {
                                    const isSelected = selectedAdminIds.includes(friend.id);
                                    return (
                                        <TouchableOpacity
                                            key={friend.id}
                                            style={[styles.friendItem, { borderBottomColor: colors.borderLight }]}
                                            onPress={() => toggleAdmin(friend.id)}
                                        >
                                            <View style={[styles.friendAvatar, { backgroundColor: colors.surfaceVariant }]}>
                                                <Ionicons name="person" size={18} color={colors.text.tertiary} />
                                            </View>
                                            <Text style={[styles.friendName, { color: colors.text.primary }]}>
                                                {friend.username}
                                            </Text>
                                            <View style={[
                                                styles.checkbox,
                                                {
                                                    borderColor: isSelected ? Colors.brand.primary : colors.border,
                                                    backgroundColor: isSelected ? Colors.brand.primary : 'transparent',
                                                }
                                            ]}>
                                                {isSelected && (
                                                    <Ionicons name="checkmark" size={14} color="#FFF" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                                {filteredFriends.length === 0 && !loadingFriends && (
                                    <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
                                        {friends.length === 0 ? 'No friends found' : 'No matching friends'}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Section 5: Preview */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.text.primary }]}>Preview</Text>
                <View style={[styles.previewCard, { backgroundColor: colors.surfaceVariant }]}>
                    <View style={[styles.previewIconWrap, { backgroundColor: isDark ? '#3B2070' : '#EDE9FE' }]}>
                        {iconMode === 'photo' && iconImageUrl
                            ? renderTopicIcon(null, iconImageUrl, 48)
                            : renderTopicIcon(selectedIcon, null, 48)
                        }
                    </View>
                    <View style={styles.previewInfo}>
                        <Text style={[styles.previewName, { color: colors.text.primary }]}>
                            {name || 'Community Name'}
                        </Text>
                        <Text style={[styles.previewCategory, { color: colors.text.secondary }]}>
                            {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                            {selectedAdminIds.length > 0 && ` · ${selectedAdminIds.length + 1} admins`}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity
                style={[
                    styles.primaryBtn,
                    { backgroundColor: Colors.brand.primary },
                    (!name || loading) && styles.btnDisabled
                ]}
                onPress={handleCreate}
                disabled={!name || loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <>
                        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryBtnText}>Create Community</Text>
                    </>
                )}
            </TouchableOpacity>

            <Text style={[styles.disclaimer, { color: colors.text.tertiary }]}>
                Communities are visible to everyone. You can share an invite link after creation.
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
    },

    // Type selector
    typeCard: {
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        minHeight: 80,
        justifyContent: 'center',
    },
    typeLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
    typeDesc: {
        fontSize: 9,
        marginTop: 2,
        textAlign: 'center',
    },

    // Card container
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    cardLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
    },

    // Icon mode toggle
    toggleRow: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 3,
        marginBottom: 14,
    },
    toggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Category pills (icon category)
    categoryPillScroll: {
        marginBottom: 12,
    },
    categoryPillContent: {
        gap: 8,
    },
    categoryPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    categoryPillText: {
        fontSize: 13,
        fontWeight: '500',
    },

    // Icon grid
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    iconOption: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },

    // Photo section
    photoSection: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    photoPickerBtn: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    photoPickerText: {
        fontSize: 12,
        textAlign: 'center',
    },
    photoPreviewWrap: {
        position: 'relative',
    },
    photoPreview: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    photoRemoveBtn: {
        position: 'absolute',
        top: -4,
        right: -4,
    },

    // Input
    input: {
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
    },
    textArea: {
        height: 90,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },

    // Category grid
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 2,
        gap: 6,
    },
    categoryIcon: {
        fontSize: 16,
    },
    categoryName: {
        fontSize: 14,
    },

    // Admin section
    adminHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    adminHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionalBadge: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    adminContent: {
        marginTop: 14,
    },
    adminChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    adminChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
    },
    adminChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    friendsList: {
        marginTop: 10,
        maxHeight: 240,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        gap: 10,
    },
    friendAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendName: {
        flex: 1,
        fontSize: 15,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 16,
        fontSize: 14,
    },

    // Preview
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
    },
    previewIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    previewInfo: {
        flex: 1,
    },
    previewName: {
        fontSize: 17,
        fontWeight: '600',
    },
    previewCategory: {
        fontSize: 14,
        marginTop: 2,
    },

    // Buttons
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        width: '100%',
        marginTop: 4,
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    secondaryBtn: {
        marginTop: 12,
        paddingVertical: 14,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    tertiaryBtn: {
        marginTop: 4,
        paddingVertical: 12,
    },
    tertiaryBtnText: {
        fontSize: 16,
    },
    disclaimer: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 16,
    },

    // Success screen
    successContainer: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    successName: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
    },
    linksCard: {
        width: '100%',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    linksTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    linkText: {
        fontSize: 14,
    },
});
