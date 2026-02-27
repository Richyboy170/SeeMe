import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import { useAccountContext } from '../../contexts/AccountContext';
import PhotoStrip from '../../components/friendship/PhotoStrip';
import StripDecorationBar from '../../components/friendship/StripDecorationBar';
import type { Sticker } from '../../components/friendship/StripDecorationBar';
import { FriendshipMeetupStackParamList } from '../../navigation/types';

type MeetupDetailRouteProp = RouteProp<FriendshipMeetupStackParamList, 'MeetupDetail'>;

let stickerCounter = 0;

export default function MeetupDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<MeetupDetailRouteProp>();
  const { meetup } = route.params;
  const { activeAccount } = useAccountContext();

  // Determine partner (the other user)
  const currentUserId = activeAccount?.userId;
  const partnerUser = meetup.userA?.id === currentUserId ? meetup.userB : meetup.userA;
  const partnerUsername = partnerUser?.username || 'friend';
  // Decoration state
  const [frameColor, setFrameColor] = useState('#FFFFFF');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [saved, setSaved] = useState(false);

  // Scroll control for sticker dragging
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Share state
  const captureStripRef = useRef<(() => Promise<string | null>) | null>(null);
  const [sending, setSending] = useState(false);

  const photos = (meetup.photos || [])
    .sort((a: any, b: any) => (a.poseIndex ?? 0) - (b.poseIndex ?? 0))
    .map((p: any) => getImageUrl(p.photoUrl))
    .filter((url: string | null) => url != null) as string[];

  const poses = (meetup.photos || [])
    .sort((a: any, b: any) => (a.poseIndex ?? 0) - (b.poseIndex ?? 0))
    .map((p: any) => p.poseName || 'silly_faces');

  const date = meetup.completedAt
    ? new Date(meetup.completedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  // Sticker handlers
  const handleAddSticker = useCallback((emoji: string) => {
    const offset = (stickerCounter % 5) * 30;
    stickerCounter++;
    const newSticker: Sticker = {
      id: `s_${Date.now()}_${stickerCounter}`,
      emoji,
      x: 80 + offset,
      y: 60 + offset,
      rotation: 0,
    };
    setStickers(prev => [...prev, newSticker]);
  }, []);

  const handleUpdateSticker = useCallback((id: string, x: number, y: number) => {
    setStickers(prev => prev.map(s => (s.id === id ? { ...s, x, y } : s)));
  }, []);

  const handleRemoveSticker = useCallback((id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleRotateSticker = useCallback((id: string, rotation: number) => {
    setStickers(prev => prev.map(s => (s.id === id ? { ...s, rotation } : s)));
  }, []);

  const handleRemoveLastSticker = useCallback(() => {
    setStickers(prev => prev.slice(0, -1));
  }, []);

  const handleCaptureReady = useCallback((fn: () => Promise<string | null>) => {
    captureStripRef.current = fn;
  }, []);

  // Helper: get strip image URI (from saved decorated strip or ViewShot capture)
  const getStripUri = async (): Promise<string | null> => {
    if (meetup.decoratedStripUrl) {
      const url = getImageUrl(meetup.decoratedStripUrl) as string;
      const localUri = `${FileSystem.cacheDirectory}decorated-strip-${Date.now()}.jpg`;
      const result = await FileSystem.downloadAsync(url, localUri);
      return result.uri;
    }
    if (captureStripRef.current) {
      return captureStripRef.current();
    }
    return null;
  };

  // Save: saves decorated strip to backend (both users see it) + saves to gallery
  const handleSave = async () => {
    setSending(true);
    try {
      const uri = await getStripUri();
      if (!uri) throw new Error('Failed to capture strip');

      // Save to backend so both users see decorated version in Recent Meetups
      if (meetup.sessionId) {
        await api.saveDecoratedStrip(meetup.sessionId, uri);
      }

      // Save to device gallery
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(uri);
      }

      setSaved(true);
      Alert.alert('Saved!', 'Photo strip saved for you and your friend');
    } catch (err) {
      Alert.alert('Error', 'Failed to save photo strip');
      console.error('Save error:', err);
    } finally {
      setSending(false);
    }
  };

  // Share: native share sheet
  const handleShare = async () => {
    try {
      const uri = await getStripUri();
      if (!uri) throw new Error('Failed to capture strip');
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      scrollEnabled={scrollEnabled}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Meetup with @{partnerUsername}
        </Text>
        {meetup.coinsAwarded > 0 && (
          <Text style={[styles.coinsText, { color: colors.text.link }]}>
            +{meetup.coinsAwarded} Positivity Coins
          </Text>
        )}
      </View>

      {meetup.decoratedStripUrl ? (
        <>
          {/* Show the saved decorated strip */}
          <View style={styles.decoratedStripWrapper}>
            <Image
              source={{ uri: getImageUrl(meetup.decoratedStripUrl) as string }}
              style={styles.decoratedStripImage}
              resizeMode="contain"
            />
          </View>

          {/* Action buttons */}
          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={18} color={colors.text.primary} />
              <Text style={[styles.shareBtnText, { color: colors.text.primary }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : photos.length > 0 ? (
        <>
          <PhotoStrip
            photos={photos}
            poses={poses}
            partnerUsername={partnerUsername}
            date={date}
            frameColor={frameColor}
            stickers={stickers}
            onUpdateSticker={handleUpdateSticker}
            onRemoveSticker={handleRemoveSticker}
            onRotateSticker={handleRotateSticker}
            onCaptureReady={handleCaptureReady}
            onScrollEnabled={setScrollEnabled}
          />

          <StripDecorationBar
            activeColor={frameColor}
            onSelectColor={setFrameColor}
            onAddSticker={handleAddSticker}
            onRemoveLastSticker={stickers.length > 0 ? handleRemoveLastSticker : undefined}
          />

          {/* Action buttons */}
          <View style={styles.shareRow}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.text.link }]}
              onPress={handleSave}
              disabled={sending || saved}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name={saved ? 'checkmark-circle' : 'download-outline'} size={18} color="#FFF" />
              )}
              <Text style={styles.shareBtnTextLight}>{saved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={18} color={colors.text.primary} />
              <Text style={[styles.shareBtnText, { color: colors.text.primary }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color={colors.text.tertiary} />
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            No photos available
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.goBack()}
      >
        <Text style={[styles.backBtnText, { color: colors.text.primary }]}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  coinsText: {
    fontSize: 16,
    fontWeight: '700',
  },
  decoratedStripWrapper: {
    alignItems: 'center',
    width: 280,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  decoratedStripImage: {
    width: 280,
    height: 500,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
    maxWidth: 320,
    justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  shareBtnTextLight: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 24,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
