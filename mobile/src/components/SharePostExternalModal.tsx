import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import Avatar from './Avatar';
import { AvatarCustomizations } from './AvatarRenderer';
import CornerDecorations from './CornerDecorations';
import { getImageUrl } from '../services/api';
import { getPostShareUrl, APP_DOWNLOAD_URL } from '../services/shareService';
import { formatTimeAgo } from '../utils/postHelpers';
import {
  ResolvedDecoration,
  DecorationStyleBackground,
  DecorationStyleFrame,
  CornerDecorationConfig,
  CornerIconPlacement,
} from '../types/decorations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 56;
const IMAGE_SIZE = CARD_WIDTH - 24; // 12px padding each side like real post

// Instagram Story canvas (9:16 ratio)
const STORY_WIDTH = SCREEN_WIDTH;
const STORY_HEIGHT = STORY_WIDTH * (16 / 9);
const STORY_CARD_SCALE = 0.72; // card rendered at 72% size inside the story canvas

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
    likesCount?: number;
    commentsCount?: number;
    createdAt: string;
    goal?: { id: string; title: string | null; isVisible: boolean; isOwner?: boolean } | null;
    decoration?: ResolvedDecoration | null;
    postType?: 'regular' | 'activity';
    activity?: { id: string; title: string; description?: string } | null;
  };
}

export default function SharePostExternalModal({
  visible,
  onClose,
  post,
}: SharePostExternalModalProps) {
  const { colors, isDark } = useTheme();
  const viewShotRef = useRef<ViewShot>(null);
  const storyViewShotRef = useRef<ViewShot>(null);
  const [capturing, setCapturing] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);

  const imageUri = getImageUrl(post.thumbnailUrl) || getImageUrl(post.imageUrl) || getImageUrl(post.originalImageUrl);
  const postUrl = getPostShareUrl(post.id);

  useEffect(() => {
    setImageReady(false);
  }, [post.id]);

  const captureCard = useCallback(async (): Promise<string | null> => {
    try {
      setCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 500));
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

  const captureStoryCard = useCallback(async (): Promise<string | null> => {
    try {
      setCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const uri = await captureRef(storyViewShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      return uri;
    } catch (error) {
      console.error('Error capturing story card:', error);
      Alert.alert('Error', 'Failed to capture story image');
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  // ── Share handlers ──────────────────────────────────────────────────

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
      Alert.alert('Error', 'Failed to share post');
    } finally {
      setActiveAction(null);
    }
  };

  const handleShareToInstagramStory = async () => {
    setActiveAction('igstory');
    try {
      const uri = await captureStoryCard();
      if (!uri) return;

      // Save to gallery so the image is accessible
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to share to Instagram Stories.');
        setActiveAction(null);
        return;
      }
      await MediaLibrary.createAssetAsync(uri);

      if (Platform.OS === 'android') {
        // Android: Try direct Story intent targeting Instagram, then story camera deeplink
        try {
          const FileSystem = await import('expo-file-system');
          const IntentLauncher = await import('expo-intent-launcher');

          const contentUri = await FileSystem.getContentUriAsync(uri);
          await IntentLauncher.startActivityAsync(
            'com.instagram.share.ADD_TO_STORY',
            {
              data: contentUri,
              type: 'image/*',
              flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
              packageName: 'com.instagram.android',
              extra: { source_application: 'com.richy.seeme' },
            }
          );
        } catch {
          // Intent failed — open Instagram story camera directly
          try {
            await Linking.openURL('instagram://story-camera');
            Alert.alert('Image saved!', 'Tap the gallery icon and select the image to use in your story.', [{ text: 'Got it' }]);
          } catch {
            Alert.alert('Instagram not found', 'Please install Instagram to share stories.');
          }
        }
      } else {
        // iOS: Open Instagram story camera directly (pasteboard-based sharing not available in Expo)
        try {
          await Linking.openURL('instagram://story-camera');
          Alert.alert('Image saved!', 'Tap the gallery icon and select the image to use in your story.', [{ text: 'Got it' }]);
        } catch {
          Alert.alert('Instagram not found', 'Please install Instagram to share stories.');
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('cancelled') || error?.message?.includes('dismiss')) return;
      Alert.alert('Error', 'Failed to share to Instagram Story');
    } finally {
      setActiveAction(null);
    }
  };

  const handleShareToInstagram = async () => {
    setActiveAction('igpost');
    try {
      const uri = await captureCard();
      if (!uri) return;

      // Save to gallery first so Instagram can access it
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to share to Instagram.');
        setActiveAction(null);
        return;
      }
      await MediaLibrary.createAssetAsync(uri);

      if (Platform.OS === 'android') {
        try {
          const FileSystem = await import('expo-file-system');
          const IntentLauncher = await import('expo-intent-launcher');

          const contentUri = await FileSystem.getContentUriAsync(uri);
          await IntentLauncher.startActivityAsync('android.intent.action.SEND', {
            data: contentUri,
            type: 'image/*',
            flags: 1,
            extra: { 'android.intent.extra.STREAM': contentUri },
            packageName: 'com.instagram.android',
          });
        } catch {
          // Instagram not installed — open share sheet
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share to Instagram' });
          } else {
            Alert.alert('Instagram not found', 'Please install Instagram to share.');
          }
        }
      } else {
        // iOS: Open share sheet — user picks Instagram
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device.');
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('cancelled') || error?.message?.includes('dismiss')) return;
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
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setActiveAction(null);
    }
  };

  const handleCopyLink = async () => {
    setActiveAction('link');
    try {
      const { default: Clipboard } = await import('expo-clipboard');
      await Clipboard.setStringAsync(postUrl);
      Alert.alert('Copied!', 'Post link copied to clipboard.');
    } catch {
      try {
        const { Share } = require('react-native');
        await Share.share({ message: postUrl, title: 'SeeMe Post' });
      } catch (e) {
        Alert.alert('Error', 'Failed to copy link');
      }
    } finally {
      setActiveAction(null);
    }
  };

  const handleShareLink = async () => {
    setActiveAction('sharelink');
    try {
      const { Share } = require('react-native');
      const message = post.caption
        ? `"${post.caption.length > 100 ? post.caption.substring(0, 100) + '...' : post.caption}" - @${post.user.username} on SeeMe\n\n${postUrl}\n\nDownload SeeMe: ${APP_DOWNLOAD_URL}`
        : `Check out this post by @${post.user.username} on SeeMe!\n\n${postUrl}\n\nDownload SeeMe: ${APP_DOWNLOAD_URL}`;
      await Share.share(
        Platform.OS === 'ios'
          ? { message, url: postUrl, title: `Post by @${post.user.username}` }
          : { message, title: `Post by @${post.user.username}` }
      );
    } catch (error: any) {
      if (error?.message?.includes('cancelled') || error?.message?.includes('dismiss')) return;
      Alert.alert('Error', 'Failed to share link');
    } finally {
      setActiveAction(null);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const likesCount = post.likesCount || 0;
  const commentsCount = post.commentsCount || 0;
  const hasGoal = !!post.goal;
  const isActivityPost = post.postType === 'activity' && !!post.activity;

  // ── Resolve decoration styles ──────────────────────────────────────
  const decoration = post.decoration;
  const bgDecoration: DecorationStyleBackground | null =
    isDark ? (decoration?.darkBackground as DecorationStyleBackground | null) || null
           : (decoration?.lightBackground as DecorationStyleBackground | null) || null;
  const frameDecoration: DecorationStyleFrame | null = (decoration?.frame as DecorationStyleFrame | null) || null;
  const frameCornerConfig: CornerDecorationConfig | null = frameDecoration?.cornerDecorations || null;
  const bgCornerConfig: CornerDecorationConfig | null = bgDecoration?.cornerDecorations || null;
  const perCornerIcons: CornerIconPlacement[] | null = (decoration?.cornerIcons as CornerIconPlacement[] | null) || null;

  // Decoration text colors
  const decorTextColor = bgDecoration?.textColor || '#111827';
  const decorCaptionColor = bgDecoration?.captionColor || '#1F2937';

  // Frame style for image wrapper
  const frameStyle = frameDecoration ? {
    borderWidth: frameDecoration.borderWidth,
    borderColor: frameDecoration.borderColor,
    borderRadius: frameDecoration.borderRadius,
    ...(frameDecoration.shadowColor ? {
      shadowColor: frameDecoration.shadowColor,
      shadowOpacity: frameDecoration.shadowOpacity || 0.3,
      shadowRadius: frameDecoration.shadowRadius || 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    } : {}),
  } : {};

  // Background color for card
  const cardBgColor = (() => {
    if (bgDecoration?.type === 'solid' && bgDecoration.color) return bgDecoration.color;
    return '#FFFFFF';
  })();

  // Accent strip / binder icon renderer
  const renderAccentStrip = () => {
    if (!bgDecoration) return null;
    const binder = bgDecoration.binderIcon;
    if (binder) {
      const BinderIcon = binder.iconFamily === 'Ionicons' ? Ionicons : MaterialCommunityIcons;
      const gradientColors = bgDecoration.type === 'gradient' && bgDecoration.colors
        ? bgDecoration.colors as [string, string, ...string[]]
        : [bgDecoration.color || '#888', bgDecoration.color || '#888'] as [string, string];
      return (
        <LinearGradient
          colors={gradientColors}
          locations={bgDecoration.locations as [number, number, ...number[]] | undefined}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.decorIconBinder}
        >
          <BinderIcon name={binder.iconName as any} size={10} color={binder.color} style={{ opacity: 0.7 }} />
          <BinderIcon name={binder.iconName as any} size={10} color={binder.color} style={{ opacity: 0.5 }} />
          <BinderIcon name={binder.iconName as any} size={10} color={binder.color} style={{ opacity: 0.7 }} />
        </LinearGradient>
      );
    }
    if (bgDecoration.type === 'gradient' && bgDecoration.colors) {
      return (
        <LinearGradient
          colors={bgDecoration.colors as [string, string, ...string[]]}
          locations={bgDecoration.locations as [number, number, ...number[]] | undefined}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.decorAccentStrip}
        />
      );
    }
    if (bgDecoration.type === 'solid' && bgDecoration.color) {
      return <View style={[styles.decorAccentStrip, { backgroundColor: bgDecoration.color }]} />;
    }
    return null;
  };

  if (!visible) return null;

  // ── Card content renderer ───────────────────────────────────────────

  const renderCardContent = ({ showBrand = true }: { showBrand?: boolean } = {}) => (
    <>
      {/* ── Post header: avatar + username + time ── */}
      <View style={styles.postHeader}>
        <Avatar
          size={36}
          avatarUrl={!post.user.activeAvatar ? post.user.avatarUrl : undefined}
          username={post.user.username}
          customizations={post.user.activeAvatar?.customizations}
          avatarStyle={post.user.activeAvatar?.style}
        />
        <View style={styles.postUserInfo}>
          <Text style={[styles.postUsername, { color: decorTextColor }]}>@{post.user.username}</Text>
          <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>
        </View>
        {/* Engagement stats */}
        {(likesCount > 0 || commentsCount > 0) && (
          <View style={styles.postStats}>
            {likesCount > 0 && (
              <View style={styles.postStat}>
                <Ionicons name="heart" size={13} color="#F43F5E" />
                <Text style={styles.postStatNum}>{formatCount(likesCount)}</Text>
              </View>
            )}
            {commentsCount > 0 && (
              <View style={styles.postStat}>
                <Ionicons name="chatbubble-outline" size={12} color="#9CA3AF" />
                <Text style={styles.postStatNum}>{formatCount(commentsCount)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Goal badge ── */}
      {hasGoal && (
        <View style={styles.goalRow}>
          <View style={styles.goalBadge}>
            <Ionicons name="flag" size={12} color="#10B981" />
            {post.goal!.isVisible && post.goal!.title && (
              <Text style={styles.goalText} numberOfLines={1}>{post.goal!.title}</Text>
            )}
          </View>
        </View>
      )}

      {/* ── Caption (above image, like real post) ── */}
      {post.caption ? (
        <View style={styles.captionWrap}>
          <Text style={[styles.captionText, { color: decorCaptionColor }]} numberOfLines={4}>{post.caption}</Text>
        </View>
      ) : null}

      {/* ── Image with frame decoration or activity rainbow ── */}
      <View style={styles.imageWrap}>
        {isActivityPost ? (
          /* Activity post: rainbow gradient frame + title banner */
          <>
            <LinearGradient
              colors={['#FF0000', '#FF8800', '#FFDD00', '#00CC44', '#0088FF', '#8800FF', '#FF0088']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activityRainbowFrame}
            >
              <View style={styles.activityFrameInner}>
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.activityImage}
                    resizeMode="cover"
                    onLoad={() => setImageReady(true)}
                    onError={() => setImageReady(true)}
                  />
                ) : (
                  <View style={[styles.activityImage, styles.imagePlaceholder]}>
                    <Ionicons name="image-outline" size={40} color="#D1D5DB" />
                  </View>
                )}
                {(frameCornerConfig || perCornerIcons) && (
                  <CornerDecorations config={frameCornerConfig || undefined} cornerIcons={perCornerIcons} />
                )}
              </View>
            </LinearGradient>
            {/* Activity title banner below rainbow frame */}
            <View style={styles.activityBanner}>
              <LinearGradient
                colors={['#FF0088', '#8800FF', '#0088FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activityBannerGradient}
              >
                <Ionicons name="color-wand" size={12} color="#FFF" />
                <Text style={styles.activityBannerText} numberOfLines={2}>
                  {post.activity?.title || 'Activity'}
                </Text>
              </LinearGradient>
            </View>
          </>
        ) : (
          /* Regular post: optional frame decoration */
          <View style={[styles.imageFrame, frameStyle]}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.postImage}
                resizeMode="cover"
                onLoad={() => setImageReady(true)}
                onError={() => setImageReady(true)}
              />
            ) : (
              <View style={[styles.postImage, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={40} color="#D1D5DB" />
              </View>
            )}
            {(frameCornerConfig || perCornerIcons) && (
              <CornerDecorations config={frameCornerConfig || undefined} cornerIcons={perCornerIcons} />
            )}
          </View>
        )}
      </View>

      {/* ── SeeMe branded footer (hidden for story since story canvas has its own) ── */}
      {showBrand && (
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.brandBar}
        >
          <View style={styles.brandIcon}>
            <Ionicons name="heart" size={10} color="#FBBF24" />
          </View>
          <Text style={styles.brandSee}>See</Text>
          <Text style={styles.brandMe}>Me</Text>
          <View style={styles.brandDot} />
          <Text style={styles.brandTagline}>spread kindness</Text>
        </LinearGradient>
      )}
    </>
  );

  // ── Action button ───────────────────────────────────────────────────

  const ActionBtn = ({ icon, label, color, id, onPress }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    id: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={styles.actionBtn}
      onPress={onPress}
      disabled={activeAction !== null}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
        {activeAction === id ? (
          <ActivityIndicator size={16} color={color} />
        ) : (
          <Ionicons name={icon} size={20} color={color} />
        )}
      </View>
      <Text style={[styles.actionLabel, { color: colors.text.primary }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: isDark ? '#555' : '#D1D5DB' }]} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={28} color={colors.text.tertiary} />
            </TouchableOpacity>
            <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>Share Post</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>

            {/* ───── Capturable card (mirrors real post layout) ───── */}
            <View style={styles.cardWrapper}>
              <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={styles.viewShot}>
                {/* Card with background decoration */}
                {bgDecoration?.type === 'gradient' && bgDecoration.colors ? (
                  <LinearGradient
                    colors={bgDecoration.colors as [string, string, ...string[]]}
                    locations={bgDecoration.locations as [number, number, ...number[]] | undefined}
                    start={bgDecoration.start || { x: 0, y: 0 }}
                    end={bgDecoration.end || { x: 1, y: 1 }}
                    style={[styles.card]}
                  >
                    {bgCornerConfig && <CornerDecorations config={bgCornerConfig} />}
                    {renderAccentStrip()}
                    {renderCardContent()}
                  </LinearGradient>
                ) : (
                  <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {bgCornerConfig && <CornerDecorations config={bgCornerConfig} />}
                    {renderAccentStrip()}
                    {renderCardContent()}
                  </View>
                )}
              </ViewShot>
            </View>

            {/* ───── Share actions (horizontal scroll) ───── */}
            <Text style={[styles.sectionLabel, { color: colors.text.secondary }]}>Share to</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionsScroll}
            >
              <ActionBtn icon="paper-plane-outline" label="Share Link" color="#3B82F6" id="sharelink" onPress={handleShareLink} />
              <ActionBtn icon="image-outline" label="Share Image" color="#10B981" id="share" onPress={handleShareToApps} />
              <ActionBtn icon="albums-outline" label="IG Story" color="#E4405F" id="igstory" onPress={handleShareToInstagramStory} />
              <ActionBtn icon="logo-instagram" label="Instagram" color="#C13584" id="igpost" onPress={handleShareToInstagram} />
              <ActionBtn icon="download-outline" label="Save Image" color="#F59E0B" id="save" onPress={handleSaveImage} />
              <ActionBtn icon="link-outline" label="Copy Link" color="#8B5CF6" id="link" onPress={handleCopyLink} />
            </ScrollView>
          </ScrollView>

          {/* Capturing overlay */}
          {capturing && (
            <View style={styles.capturingOverlay}>
              <View style={styles.capturingBox}>
                <ActivityIndicator size="large" color="#FBBF24" />
                <Text style={styles.capturingText}>Preparing image...</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>

      {/* ───── Hidden story-sized capture (off-screen) ───── */}
      <View style={styles.storyOffscreen} pointerEvents="none">
        <ViewShot ref={storyViewShotRef} options={{ format: 'png', quality: 1 }}>
          <LinearGradient
            colors={isDark ? ['#0F172A', '#1E293B', '#0F172A'] : ['#F8FAFC', '#E2E8F0', '#F8FAFC']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.storyCanvas}
          >
            {/* Centered, smaller card */}
            <View style={styles.storyCardContainer}>
              {bgDecoration?.type === 'gradient' && bgDecoration.colors ? (
                <LinearGradient
                  colors={bgDecoration.colors as [string, string, ...string[]]}
                  locations={bgDecoration.locations as [number, number, ...number[]] | undefined}
                  start={bgDecoration.start || { x: 0, y: 0 }}
                  end={bgDecoration.end || { x: 1, y: 1 }}
                  style={[styles.storyCard, styles.storyCardShadow]}
                >
                  {bgCornerConfig && <CornerDecorations config={bgCornerConfig} />}
                  {renderAccentStrip()}
                  {renderCardContent({ showBrand: false })}
                </LinearGradient>
              ) : (
                <View style={[styles.storyCard, styles.storyCardShadow, { backgroundColor: cardBgColor }]}>
                  {bgCornerConfig && <CornerDecorations config={bgCornerConfig} />}
                  {renderAccentStrip()}
                  {renderCardContent({ showBrand: false })}
                </View>
              )}
            </View>

            {/* Branding at the bottom of story */}
            <View style={styles.storyBranding}>
              <Ionicons name="heart" size={14} color="#FBBF24" />
              <Text style={[styles.storyBrandText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                SeeMe
              </Text>
            </View>
          </LinearGradient>
        </ViewShot>
      </View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Sheet chrome
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 2 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  scrollContent: { paddingBottom: 8 },

  // ── Card (mirrors real PostCard layout) ─────────────────────────────
  cardWrapper: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  viewShot: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  card: {
    width: CARD_WIDTH,
  },

  // Post header
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  postUserInfo: {
    flex: 1,
    marginLeft: 10,
  },
  postUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  postTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  postStatNum: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Goal
  goalRow: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
  },
  goalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },

  // Caption
  captionWrap: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  captionText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },

  // Image
  imageWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  imageFrame: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  postImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Activity rainbow frame
  activityRainbowFrame: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 3,
  },
  activityFrameInner: {
    flex: 1,
    borderRadius: 13,
    overflow: 'hidden',
  },
  activityImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  activityBanner: {
    marginTop: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  activityBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activityBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 16,
  },

  // Decoration accent strip (left edge)
  decorAccentStrip: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  // Wider icon binder strip
  decorIconBinder: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 16,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  // Brand footer
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 0,
  },
  brandIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(251,191,36,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandSee: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.3,
  },
  brandMe: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  brandDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#475569',
    marginHorizontal: 8,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.2,
  },

  // ── Share actions ───────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  actionsScroll: {
    paddingHorizontal: 18,
    gap: 8,
    paddingBottom: 4,
  },
  actionBtn: {
    alignItems: 'center',
    width: 72,
    gap: 6,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Capturing overlay ───────────────────────────────────────────────
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  capturingBox: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  capturingText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Story-sized capture (hidden off-screen) ──────────────────────────
  storyOffscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 1, // must be 1 for ViewShot to capture
  },
  storyCanvas: {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCardContainer: {
    transform: [{ scale: STORY_CARD_SCALE }],
    borderRadius: 18,
    overflow: 'hidden',
  },
  storyCard: {
    width: CARD_WIDTH,
  },
  storyCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  storyBranding: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storyBrandText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
