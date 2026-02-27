import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import { useCoinCelebration } from '../../contexts/CoinCelebrationContext';
import PhotoStrip from '../../components/friendship/PhotoStrip';
import StripDecorationBar from '../../components/friendship/StripDecorationBar';
import type { Sticker } from '../../components/friendship/StripDecorationBar';
import { friendshipSocket } from '../../services/friendshipSocket';
import { FriendshipMeetupStackParamList } from '../../navigation/types';

type PhotoStripRouteProp = RouteProp<FriendshipMeetupStackParamList, 'PhotoStrip'>;

let stickerCounter = 0;

export default function PhotoStripScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<PhotoStripRouteProp>();
  const { sessionId, photos, poses, partnerUsername } = route.params;
  const { showCelebration } = useCoinCelebration();

  const [completing, setCompleting] = useState(true);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [saved, setSaved] = useState(false);
  const [displayPhotos, setDisplayPhotos] = useState<string[]>(photos);

  // Decoration state
  const [frameColor, setFrameColor] = useState('#FFFFFF');
  const [stickers, setStickers] = useState<Sticker[]>([]);

  // Reset saved flag when decorations change so user can save again
  const decorationVersion = useRef(0);
  useEffect(() => {
    if (decorationVersion.current > 0 && saved) {
      setSaved(false);
    }
    decorationVersion.current++;
  }, [frameColor, stickers]);

  // Scroll control for sticker dragging
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Decorated strip from friend (real-time update)
  const [decoratedStripUrl, setDecoratedStripUrl] = useState<string | null>(null);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Share state
  const captureStripRef = useRef<(() => Promise<string | null>) | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (photos.length === 0 && sessionId) {
      fetchPhotosFromBackend();
    }
  }, []);

  useEffect(() => {
    completeMeetup();
  }, []);

  // Listen for friend's decorated strip in real-time
  useEffect(() => {
    const unsub = friendshipSocket.onStripDecorated((data) => {
      if (data.sessionId === sessionId) {
        setDecoratedStripUrl(data.decoratedStripUrl);
        setSaved(true);
      }
    });
    return unsub;
  }, [sessionId]);

  const fetchPhotosFromBackend = async () => {
    try {
      const result = await api.getSessionPhotos(sessionId);
      if (result.success && result.photos?.length > 0) {
        const photoUrls = result.photos
          .map((p: any) => getImageUrl(p.photoUrl))
          .filter((url: string | null) => url != null) as string[];
        setDisplayPhotos(photoUrls);
      }
    } catch (err) {
      console.error('Error fetching session photos:', err);
    }
  };

  const completeMeetup = async () => {
    try {
      const result = await api.completeFriendshipMeetup(sessionId);
      if (result.success) {
        setCoinsEarned(result.coinsAwarded);
        setTimeout(() => {
          showCelebration(result.coinsAwarded, 'friendship');
        }, 500);
      }
    } catch (err: any) {
      console.error('Error completing meetup:', err);
    } finally {
      setCompleting(false);
    }
  };

  // Pull-to-refresh: fetch friend's decorated strip from backend
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await api.getFriendshipSession(sessionId);
      if (result.success && result.session?.meetup?.decoratedStripUrl) {
        setDecoratedStripUrl(result.session.meetup.decoratedStripUrl);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const hasUnsavedDecorations = !saved && !decoratedStripUrl && (frameColor !== '#FFFFFF' || stickers.length > 0);

  const handleDone = () => {
    if (hasUnsavedDecorations) {
      Alert.alert(
        'Unsaved decorations',
        'You have unsaved decorations. Save before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => navigation.popToTop() },
          { text: 'Save', onPress: async () => { await handleSave(); navigation.popToTop(); } },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    navigation.popToTop();
  };

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

  // Save: saves decorated strip to backend (both users see it) + saves to gallery
  const handleSave = async () => {
    if (!captureStripRef.current) return;
    setSending(true);
    try {
      const uri = await captureStripRef.current();
      if (!uri) throw new Error('Failed to capture strip');

      // Save to backend so both users see decorated version in Recent Meetups
      const result = await api.saveDecoratedStrip(sessionId, uri);
      if (result.decoratedStripUrl) {
        setDecoratedStripUrl(result.decoratedStripUrl);
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
    if (!captureStripRef.current) return;
    try {
      const uri = await captureStripRef.current();
      if (!uri) throw new Error('Failed to capture strip');
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  if (completing) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text.link} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Creating your photo strip...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      scrollEnabled={scrollEnabled}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text.link} />
      }
    >
      {/* Celebration header */}
      <View style={styles.header}>
        <Text style={styles.celebrationEmoji}>{'\uD83C\uDF89'}</Text>
        <Text style={[styles.title, { color: colors.text.primary }]}>Meetup Complete!</Text>
        {coinsEarned > 0 && (
          <Text style={[styles.coinsText, { color: colors.text.link }]}>
            +{coinsEarned} Positivity Coins earned!
          </Text>
        )}
        <Text style={[styles.friendText, { color: colors.text.secondary }]}>
          You and @{partnerUsername} are now connected!
        </Text>
      </View>

      {/* Photo Strip — always interactive */}
      <PhotoStrip
        photos={displayPhotos}
        poses={poses}
        partnerUsername={partnerUsername}
        frameColor={frameColor}
        stickers={stickers}
        onUpdateSticker={handleUpdateSticker}
        onRemoveSticker={handleRemoveSticker}
        onRotateSticker={handleRotateSticker}
        onCaptureReady={handleCaptureReady}
        onScrollEnabled={setScrollEnabled}
      />

      {/* Decoration toolbar */}
      <StripDecorationBar
        activeColor={frameColor}
        onSelectColor={setFrameColor}
        onAddSticker={handleAddSticker}
        onRemoveLastSticker={stickers.length > 0 ? handleRemoveLastSticker : undefined}
      />

      {/* Friend's decorated strip */}
      {decoratedStripUrl ? (
        <View style={styles.friendStripSection}>
          <Text style={[styles.friendStripLabel, { color: colors.text.secondary }]}>
            @{partnerUsername}'s decorated strip
          </Text>
          <View style={styles.friendStripWrapper}>
            <Image
              source={{ uri: getImageUrl(decoratedStripUrl) as string }}
              style={styles.friendStripImage}
              resizeMode="contain"
            />
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.text.link} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={colors.text.secondary} />
          )}
          <Text style={[styles.refreshBtnText, { color: colors.text.secondary }]}>
            {refreshing ? 'Checking...' : "Check friend's decorations"}
          </Text>
        </TouchableOpacity>
      )}

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

      {/* Done Button */}
      <TouchableOpacity
        style={[styles.doneBtn, { backgroundColor: colors.text.link }]}
        onPress={handleDone}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  celebrationEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  coinsText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  friendText: {
    fontSize: 14,
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  friendStripSection: {
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
  friendStripLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  friendStripWrapper: {
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
  friendStripImage: {
    width: 280,
    height: 500,
    borderRadius: 12,
  },
  doneBtn: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 24,
    marginBottom: 32,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
