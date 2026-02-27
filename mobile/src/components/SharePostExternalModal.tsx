import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import Avatar from './Avatar';
import { AvatarCustomizations } from './AvatarRenderer';
import { getImageUrl } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_IMAGE_SIZE = CARD_WIDTH - 32;

interface ActiveAvatar {
  id: string;
  style: 'cartoon' | 'anime' | 'minimalist';
  customizations: AvatarCustomizations;
}

interface SharePostExternalModalProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string;
    user: {
      id: string;
      username: string;
      avatarUrl?: string | null;
      activeAvatar?: ActiveAvatar | null;
    };
    imageUrl?: string;
    originalImageUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
    createdAt: string;
  };
}

export default function SharePostExternalModal({
  visible,
  onClose,
  post,
}: SharePostExternalModalProps) {
  const { colors, isDark } = useTheme();
  const viewShotRef = useRef<ViewShot>(null);
  const [capturing, setCapturing] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const imageUri = getImageUrl(post.thumbnailUrl) || getImageUrl(post.imageUrl) || getImageUrl(post.originalImageUrl);
  const profileUrl = `https://seeme.app/@${post.user.username}`;

  const captureCard = useCallback(async (): Promise<string | null> => {
    try {
      setCapturing(true);
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      return uri;
    } catch (error) {
      console.error('Error capturing post card:', error);
      Alert.alert('Error', 'Failed to capture post image');
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleShareToApps = async () => {
    setActiveAction('share');
    try {
      const uri = await captureCard();
      if (!uri) return;

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Post by @${post.user.username} on SeeMe`,
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error: any) {
      if (error?.message?.includes('cancelled') || error?.message?.includes('dismiss')) return;
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share post');
    } finally {
      setActiveAction(null);
    }
  };

  const handleShareToInstagram = async () => {
    setActiveAction('instagram');
    try {
      // Check if Instagram is installed
      const canOpen = await Linking.canOpenURL('instagram://');
      if (!canOpen) {
        Alert.alert(
          'Instagram not found',
          'Please install Instagram to share to your story.',
          [{ text: 'OK' }]
        );
        setActiveAction(null);
        return;
      }

      const uri = await captureCard();
      if (!uri) return;

      // Save to camera roll first so Instagram can access it
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library to share to Instagram.');
        setActiveAction(null);
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(uri);

      if (Platform.OS === 'ios') {
        // On iOS, try opening Instagram Stories directly
        // The image is in the camera roll, Instagram will pick it up
        const instagramUrl = `instagram-stories://share?source_application=com.richy.seeme`;
        const canOpenStories = await Linking.canOpenURL(instagramUrl);
        if (canOpenStories) {
          await Linking.openURL(instagramUrl);
        } else {
          // Fallback: open Instagram and user can create story from gallery
          await Linking.openURL('instagram://camera');
        }
      } else {
        // On Android, use the share sheet targeting Instagram
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share to Instagram Story',
          });
        } else {
          await Linking.openURL('instagram://camera');
        }
      }

      Alert.alert(
        'Image saved!',
        'Your post image has been saved. Select it from your recent photos in Instagram to share to your story.',
        [{ text: 'Got it' }]
      );
    } catch (error: any) {
      if (error?.message?.includes('cancelled') || error?.message?.includes('dismiss')) return;
      console.error('Instagram share error:', error);
      Alert.alert('Error', 'Failed to share to Instagram');
    } finally {
      setActiveAction(null);
    }
  };

  const handleSaveImage = async () => {
    setActiveAction('save');
    try {
      const uri = await captureCard();
      if (!uri) return;

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save images to your gallery.');
        setActiveAction(null);
        return;
      }

      await MediaLibrary.createAssetAsync(uri);
      Alert.alert('Saved!', 'Post image saved to your gallery.');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setActiveAction(null);
    }
  };

  const handleCopyLink = async () => {
    setActiveAction('link');
    try {
      // Use the Clipboard module or share sheet for the link
      const { default: Clipboard } = await import('expo-clipboard');
      await Clipboard.setStringAsync(profileUrl);
      Alert.alert('Copied!', `Profile link copied: ${profileUrl}`);
    } catch {
      // Fallback: share sheet with just the URL
      try {
        const { Share } = require('react-native');
        await Share.share({ message: profileUrl, title: 'SeeMe Profile' });
      } catch (e) {
        Alert.alert('Error', 'Failed to copy link');
      }
    } finally {
      setActiveAction(null);
    }
  };

  const shareActions = [
    {
      id: 'instagram',
      icon: 'logo-instagram' as const,
      label: 'Instagram Story',
      color: '#E4405F',
      bgColor: '#E4405F15',
      onPress: handleShareToInstagram,
    },
    {
      id: 'share',
      icon: 'share-outline' as const,
      label: 'Share Image',
      color: '#3B82F6',
      bgColor: '#3B82F615',
      onPress: handleShareToApps,
    },
    {
      id: 'save',
      icon: 'download-outline' as const,
      label: 'Save Image',
      color: '#10B981',
      bgColor: '#10B98115',
      onPress: handleSaveImage,
    },
    {
      id: 'link',
      icon: 'link-outline' as const,
      label: 'Copy Link',
      color: '#8B5CF6',
      bgColor: '#8B5CF615',
      onPress: handleCopyLink,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text.primary }]}>Share Post</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Capturable Card Preview */}
            <View style={styles.cardPreviewWrapper}>
              <ViewShot
                ref={viewShotRef}
                options={{ format: 'png', quality: 1 }}
                style={styles.viewShotContainer}
              >
                <View style={styles.shareCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <Avatar
                      size={36}
                      avatarUrl={!post.user.activeAvatar ? post.user.avatarUrl : undefined}
                      username={post.user.username}
                      customizations={post.user.activeAvatar?.customizations}
                      avatarStyle={post.user.activeAvatar?.style}
                    />
                    <View style={styles.cardUserInfo}>
                      <Text style={styles.cardUsername}>@{post.user.username}</Text>
                    </View>
                  </View>

                  {/* Caption */}
                  {post.caption && (
                    <Text style={styles.cardCaption} numberOfLines={4}>
                      {post.caption}
                    </Text>
                  )}

                  {/* Post Image */}
                  {imageUri && (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  )}

                  {/* SeeMe Branded Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.cardFooterLeft}>
                      <View style={styles.seeMeLogo}>
                        <Text style={styles.seeMe}>SeeMe</Text>
                      </View>
                    </View>
                    <View style={styles.cardFooterRight}>
                      <Ionicons name="person-add-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.cardFooterLink}>seeme.app/@{post.user.username}</Text>
                    </View>
                  </View>
                </View>
              </ViewShot>
            </View>

            {/* Share Actions */}
            <View style={styles.actionsGrid}>
              {shareActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionItem, { backgroundColor: action.bgColor }]}
                  onPress={action.onPress}
                  disabled={activeAction !== null}
                  activeOpacity={0.7}
                >
                  {activeAction === action.id ? (
                    <ActivityIndicator size="small" color={action.color} />
                  ) : (
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  )}
                  <Text style={[styles.actionLabel, { color: colors.text.primary }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Profile link hint */}
            <Text style={[styles.hintText, { color: colors.text.tertiary }]}>
              Friends who see your story can visit your SeeMe profile at{' '}
              <Text style={{ fontWeight: '600' }}>seeme.app/@{post.user.username}</Text>
            </Text>
          </ScrollView>

          {/* Capturing overlay */}
          {capturing && (
            <View style={styles.capturingOverlay}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={styles.capturingText}>Preparing image...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  cardPreviewWrapper: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  viewShotContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  shareCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
  },
  cardUserInfo: {
    marginLeft: 10,
    flex: 1,
  },
  cardUsername: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardCaption: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  cardImage: {
    width: CARD_IMAGE_SIZE,
    height: CARD_IMAGE_SIZE,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 10,
  },
  cardFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeMeLogo: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seeMe: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooterLink: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 10,
  },
  actionItem: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 48 - 30) / 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  capturingText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
  },
});
