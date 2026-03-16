import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, getImageUrl } from '../services/api';
import { useTheme } from '../theme';

interface Member {
    user: {
        id: string;
        username: string;
        activeAvatarId: string | null;
    };
    joinedAt: string;
    postCount: number;
    coinsReceived: number;
    isBeginner: boolean;
    isCreator: boolean;
}

interface TopicMembersModalProps {
    visible: boolean;
    topicId: string;
    topicName: string;
    onClose: () => void;
    onUserPress: (userId: string, username: string) => void;
}

export default function TopicMembersModal({
    visible,
    topicId,
    topicName,
    onClose,
    onUserPress,
}: TopicMembersModalProps) {
    const { colors } = useTheme();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const isInitialMount = useRef(true);
    const lastLoadedTopicId = useRef<string | null>(null);

    useEffect(() => {
        if (visible && topicId && lastLoadedTopicId.current !== topicId) {
            lastLoadedTopicId.current = topicId;
            isInitialMount.current = true;
            loadMembers(1, true);
        }
        if (!visible) {
            lastLoadedTopicId.current = null;
        }
    }, [visible, topicId]);

    useEffect(() => {
        // Only run search effect after initial load (not on mount)
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (visible) {
            const timer = setTimeout(() => {
                loadMembers(1, true);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [search]);

    const loadMembers = async (pageNum: number, reset: boolean = false) => {
        if (reset) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const response = await api.getTopicMembers(topicId, pageNum, search || undefined);
            if (reset) {
                setMembers(response.members || []);
            } else {
                setMembers(prev => [...prev, ...(response.members || [])]);
            }
            setTotal(response.total || 0);
            setHasMore(response.hasMore || false);
            setPage(pageNum);
        } catch (error) {
            console.error('Error loading members:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            loadMembers(page + 1, false);
        }
    };

    const handleClose = () => {
        setSearch('');
        setMembers([]);
        setPage(1);
        onClose();
    };

    const renderMember = ({ item }: { item: Member }) => (
        <TouchableOpacity
            style={[styles.memberItem, { borderBottomColor: colors.separator }]}
            onPress={() => {
                handleClose();
                onUserPress(item.user.id, item.user.username);
            }}
        >
            <Image
                source={{
                    uri: item.user.activeAvatarId
                        ? getImageUrl(`/avatars/${item.user.activeAvatarId}/thumbnail`)
                        : 'https://via.placeholder.com/48'
                }}
                style={styles.memberAvatar}
            />
            <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName, { color: colors.text.primary }]}>@{item.user.username}</Text>
                    {item.isCreator && (
                        <View style={styles.creatorBadge}>
                            <Ionicons name="shield-checkmark" size={12} color="#7C3AED" />
                            <Text style={styles.creatorBadgeText}>Creator</Text>
                        </View>
                    )}
                    {item.isBeginner && !item.isCreator && (
                        <View style={styles.beginnerBadge}>
                            <Text style={styles.beginnerBadgeText}>New</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.memberStats, { color: colors.text.secondary }]}>
                    {item.postCount} posts · {item.coinsReceived} coins received
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.icon.secondary} />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.icon.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Members</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>{topicName} · {total} members</Text>
                    </View>
                    <View style={styles.placeholder} />
                </View>

                {/* Search */}
                <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
                    <Ionicons name="search" size={20} color={colors.icon.secondary} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text.primary }]}
                        placeholder="Search members..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor={colors.text.tertiary}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Members List */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#7C3AED" />
                        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading members...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={members}
                        renderItem={renderMember}
                        keyExtractor={item => item.user.id}
                        contentContainerStyle={styles.listContent}
                        removeClippedSubviews
                        maxToRenderPerBatch={10}
                        windowSize={7}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={styles.footerLoader}>
                                    <ActivityIndicator size="small" color="#7C3AED" />
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={48} color={colors.disabled} />
                                <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No members found</Text>
                                <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
                                    {search ? 'Try a different search term' : 'Be the first to join!'}
                                </Text>
                            </View>
                        }
                    />
                )}
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
    closeButton: {
        padding: 4,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    placeholder: {
        width: 32,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 16,
        color: '#1F2937',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
    },
    listContent: {
        paddingHorizontal: 16,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
    },
    memberInfo: {
        flex: 1,
        marginLeft: 12,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    creatorBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    creatorBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7C3AED',
    },
    beginnerBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    beginnerBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#10B981',
    },
    memberStats: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
});
