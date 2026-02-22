/**
 * Drafts Gallery Screen — 3-column thumbnail grid of saved drafts.
 *
 * - Tap a draft → navigate to CreatePostHome with resumeDraftId
 * - Long press → confirm delete
 * - "Delete All" when 2+ drafts
 * - Empty state with icon + message
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Colors } from '../../theme';
import type { CreatePostStackParamList } from '../../navigation/types';
import * as draftService from '../../services/draftService';
import type { PostDraft } from '../../services/draftService';

const { width } = Dimensions.get('window');
const GRID_GAP = 1;
const IMAGE_SIZE = (width - GRID_GAP * 2) / 3;

type NavProp = StackNavigationProp<CreatePostStackParamList, 'DraftsGallery'>;

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function DraftsGalleryScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [drafts, setDrafts] = useState<PostDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    const all = await draftService.loadAllDrafts();
    setDrafts(all);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const handleTap = (draft: PostDraft) => {
    navigation.navigate('CreatePostHome', { resumeDraftId: draft.id });
  };

  const handleLongPress = (draft: PostDraft) => {
    Alert.alert(
      'Delete Draft?',
      'This draft will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await draftService.deleteDraft(draft.id);
            setDrafts(prev => prev.filter(d => d.id !== draft.id));
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Drafts?',
      `This will permanently delete all ${drafts.length} drafts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await draftService.deleteAllDrafts();
            setDrafts([]);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PostDraft }) => (
    <TouchableOpacity
      style={styles.cell}
      onPress={() => handleTap(item)}
      onLongPress={() => handleLongPress(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />

      {/* Caption preview overlay */}
      {item.caption.trim().length > 0 && (
        <View style={styles.captionOverlay}>
          <Text style={styles.captionPreview} numberOfLines={2}>
            {item.caption.trim()}
          </Text>
        </View>
      )}

      {/* Relative time badge */}
      <View style={styles.timeBadge}>
        <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  if (drafts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="document-text-outline" size={64} color={colors.text.tertiary} />
        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Drafts</Text>
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
          When you save a draft, it will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Delete All header button (when 2+) */}
      {drafts.length >= 2 && (
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.draftCountText, { color: colors.text.secondary }]}>
            {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={handleDeleteAll}>
            <Text style={styles.deleteAllText}>Delete All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={drafts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  draftCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  grid: {
    paddingBottom: 20,
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  cell: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  captionPreview: {
    color: '#FFF',
    fontSize: 11,
    lineHeight: 14,
  },
  timeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
