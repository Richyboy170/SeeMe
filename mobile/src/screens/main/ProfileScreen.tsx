import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  StatusBar,
  Share,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ViewToken,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { api, getImageUrl } from '../../services/api';
import GiveCoinsModal from '../../components/coins/GiveCoinsModal';
import PostViewerModal from '../../components/PostViewerModal';
import Avatar from '../../components/Avatar';
import { AvatarCustomizations } from '../../components/AvatarRenderer';
import ProfileMedalsSection from '../../components/profile/ProfileMedalsSection';
import StoryOfMeSection from '../../components/profile/StoryOfMeSection';
import FavoriteButton from '../../components/favorites/FavoriteButton';
import TrustGauge from '../../components/TrustGauge';
import ProfileGuide from '../../components/guide/ProfileGuide';
import { useAccountContext } from '../../contexts/AccountContext';

const { width } = Dimensions.get('window');
const GRID_GAP = 1;
const IMAGE_SIZE = (width - GRID_GAP * 2) / 3;

const getRankInfo = (rank: string) => {
  const rankData: { [key: string]: {
    color: string;
    ringColor: string;
    gradient: [string, string, string];
  } } = {
    beginner: { color: '#9CA3AF', ringColor: '#9CA3AF', gradient: ['#9CA3AF', '#6B7280', '#4B5563'] },
    kind: { color: '#60A5FA', ringColor: '#60A5FA', gradient: ['#60A5FA', '#3B82F6', '#2563EB'] },
    generous: { color: '#A78BFA', ringColor: '#A78BFA', gradient: ['#A78BFA', '#8B5CF6', '#7C3AED'] },
    inspirational: { color: '#F59E0B', ringColor: '#F59E0B', gradient: ['#F59E0B', '#D97706', '#B45309'] },
    legend: { color: '#EF4444', ringColor: '#EF4444', gradient: ['#EF4444', '#DC2626', '#B91C1C'] },
  };
  return rankData[rank] || rankData.beginner;
};

interface ProfileScreenProps {
  route?: {
    params?: {
      userId?: string;
      username?: string;
    };
  };
}

export default function ProfileScreen({ route }: ProfileScreenProps) {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { setShowAccountSwitcher } = useAccountContext();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [giveModalVisible, setGiveModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState<string | null>(null);
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [postGiveModalVisible, setPostGiveModalVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [followRequestCount, setFollowRequestCount] = useState(0);
  const [messageLoading, setMessageLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeAvatar, setActiveAvatar] = useState<{
    customizations: AvatarCustomizations;
    style: 'cartoon' | 'anime' | 'minimalist';
  } | null>(null);
  const [visiblePostIndex, setVisiblePostIndex] = useState(0);
  const postListRef = useRef<FlatList>(null);
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [shareCardVisible, setShareCardVisible] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [setupBannerDismissed, setSetupBannerDismissed] = useState(false);
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
  const shareCardRef = useRef<ViewShot>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Profile Guide state
  const [guideVisible, setGuideVisible] = useState(false);
  const guideRefs = useRef<Record<string, View | null>>({});

  // Scroll to top when tab is re-tapped
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    const unsubscribe = parent.addListener('tabPress', (e: any) => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return unsubscribe;
  }, [navigation]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [trustData, setTrustData] = useState<{
    hasConnection: boolean;
    trustScore: number;
    currentStreak: number;
    longestStreak: number;
    isMutualFollow: boolean;
  } | null>(null);

  const userId = route?.params?.userId;
  const username = route?.params?.username;

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
      loadPosts();
      if (!userId) {
        loadPrivacySettings();
        loadFollowRequestCount();
        loadSavedPosts();
      }
    }, [userId, username])
  );

  // Auto-trigger profile guide for own profile on first visit
  useEffect(() => {
    if (!loading && user && isOwnProfile) {
      AsyncStorage.getItem('@seeme_profile_guide_completed').then((val) => {
        if (!val) {
          setTimeout(() => setGuideVisible(true), 800);
        }
      });
    }
  }, [loading, user, isOwnProfile]);

  const setGuideRef = useCallback(
    (key: string) => (ref: View | null) => {
      guideRefs.current[key] = ref;
    },
    [],
  );

  const loadSavedPosts = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const data = await api.getSavedPosts();
      setSavedPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading saved posts:', error);
      setSavedPosts([]);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  const handleArchivePost = useCallback(async (postId: string) => {
    try {
      await api.archivePost(postId);
      setPosts((prev: any[]) => prev.filter((p: any) => p.id !== postId));
      closePost();
    } catch (error) {
      console.error('Error archiving post:', error);
      Alert.alert('Error', 'Failed to archive post');
    }
  }, []);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await api.deletePost(postId);
      setPosts((prev: any[]) => prev.filter((p: any) => p.id !== postId));
      setSavedPosts((prev: any[]) => prev.filter((p: any) => p.id !== postId));
      closePost();
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  }, []);

  // Check follow status and trust score when viewing other profiles
  React.useEffect(() => {
    if (user && !isOwnProfile && user.username) {
      checkFollowStatus();
      loadTrustScore(user.id);
    }
  }, [user, isOwnProfile]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getProfile(userId);
      const userData = response.user || response;
      setUser(userData);
      setIsOwnProfile(!userId || response.isOwnProfile);

      // Set active avatar from profile response
      if (userData.activeAvatar) {
        setActiveAvatar({
          customizations: userData.activeAvatar.customizations,
          style: userData.activeAvatar.style,
        });
      } else {
        setActiveAvatar(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const data = await api.getUserPosts(username);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [username]);

  const checkFollowStatus = async () => {
    try {
      const response = await api.checkFollowingStatus(user.username);
      setIsFollowing(response.isFollowing);
      setFollowRequestStatus(response.followRequestStatus || null);
      setIsPrivateProfile(response.isPrivate || false);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const loadTrustScore = async (targetUserId: string) => {
    try {
      // Don't try to load trust score if no valid target user ID
      if (!targetUserId) {
        setTrustData(null);
        return;
      }
      const response = await api.getTrustScore(targetUserId);
      setTrustData(response);
    } catch (error: any) {
      // Silently handle 400 errors (e.g., trying to get trust score with yourself)
      if (error?.response?.status !== 400) {
        console.error('Error loading trust score:', error);
      }
      setTrustData(null);
    }
  };

  const loadPrivacySettings = useCallback(async () => {
    try {
      const response = await api.getPrivacySettings();
      setIsPrivate(response.settings?.isPrivate || false);
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  }, []);

  const loadFollowRequestCount = useCallback(async () => {
    try {
      const response = await api.getFollowRequestCount();
      setFollowRequestCount(response.count || 0);
    } catch (error) {
      console.error('Error loading follow request count:', error);
    }
  }, []);

  const executeUnfollow = async () => {
    setFollowLoading(true);
    try {
      await api.unfollowUser(user!.username);
      setIsFollowing(false);
      setFollowRequestStatus(null);
      setUser((prev: any) => ({
        ...prev,
        followersCount: Math.max(0, (prev.followersCount || 1) - 1)
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update follow status';
      Alert.alert('Error', errorMessage);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFollow = async () => {
    if (followLoading || !user?.username) return;

    if (isFollowing) {
      Alert.alert(
        'Unfriend',
        `Are you sure you want to unfriend @${user.username}? You will lose your connection and trust score progress.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unfriend', style: 'destructive', onPress: executeUnfollow },
        ]
      );
      return;
    }

    setFollowLoading(true);
    try {
      if (followRequestStatus === 'pending') {
        // Cancel follow request
        await api.unfollowUser(user.username);
        setFollowRequestStatus(null);
      } else {
        const response = await api.followUser(user.username);
        if (response.status === 'requested') {
          // Follow request sent to private account
          setFollowRequestStatus('pending');
        } else {
          // Direct follow to public account
          setIsFollowing(true);
          // Update local follower count
          setUser((prev: any) => ({
            ...prev,
            followersCount: (prev.followersCount || 0) + 1
          }));
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update follow status';
      Alert.alert('Error', errorMessage);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTogglePrivacy = useCallback(async () => {
    try {
      const newPrivacyState = !isPrivate;
      await api.updatePrivacySettings(newPrivacyState);
      setIsPrivate(newPrivacyState);
      Alert.alert(
        'Success',
        newPrivacyState
          ? 'Your account is now private. New friends will need your approval.'
          : 'Your account is now public. Anyone can be your friend!'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update privacy settings');
    }
  }, [isPrivate]);

  const getFollowButtonText = useCallback(() => {
    if (isFollowing) return 'Friends';
    if (followRequestStatus === 'pending') return 'Request Sent';
    return 'Add Friend';
  }, [isFollowing, followRequestStatus]);

  const handleMessage = async () => {
    if (messageLoading || !user?.id) return;

    setMessageLoading(true);
    try {
      // Create or get existing conversation
      const response = await api.createConversation(user.id);
      const conversation = response.conversation;

      if (conversation) {
        // Navigate to Feed tab and then to Chat screen
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Feed',
            params: {
              screen: 'Chat',
              params: {
                conversationId: conversation.id,
                otherUser: {
                  id: user.id,
                  username: user.username,
                  avatarUrl: user.avatarUrl,
                },
              },
            },
          })
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to start conversation';
      Alert.alert('Error', errorMessage);
    } finally {
      setMessageLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            setLoading(true);
            try {
              await api.logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const openPost = useCallback((post: any, index: number) => {
    setSelectedPost(post);
    setSelectedPostIndex(index);
    setVisiblePostIndex(index);
  }, []);

  const closePost = useCallback(() => {
    setSelectedPost(null);
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setVisiblePostIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleEditProfile = useCallback(() => {
    setEditUsername(user?.username || '');
    setEditBio(user?.bio || '');
    setEditModalVisible(true);
  }, [user?.username, user?.bio]);

  const handleChangeProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      setUploadingImage(true);
      const response = await api.uploadProfileImage(result.assets[0].uri);
      if (response.avatarUrl) {
        setUser((prev: any) => ({ ...prev, avatarUrl: response.avatarUrl, activeAvatarId: null }));
        // Clear custom avatar so the uploaded photo is displayed
        setActiveAvatar(null);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to upload image';
      Alert.alert('Error', errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (savingProfile) return;

    const trimmedUsername = editUsername.trim();
    const trimmedBio = editBio.trim();

    if (!trimmedUsername) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    if (trimmedUsername.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    setSavingProfile(true);
    try {
      await api.updateProfile({
        username: trimmedUsername,
        bio: trimmedBio,
      });

      // Update local state
      setUser((prev: any) => ({
        ...prev,
        username: trimmedUsername,
        bio: trimmedBio,
      }));

      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleShareProfile = useCallback(() => {
    setShareCardVisible(true);
  }, []);

  const handleSaveCard = async () => {
    if (savingCard) return;

    setSavingCard(true);
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to save images to your gallery.');
        setSavingCard(false);
        return;
      }

      // Capture the card
      if (shareCardRef.current?.capture) {
        const uri = await shareCardRef.current.capture();

        // Save to gallery
        await MediaLibrary.saveToLibraryAsync(uri);

        Alert.alert('Saved!', 'Profile card saved to your gallery. Share it on social media!');
      }
    } catch (error) {
      console.error('Error saving card:', error);
      Alert.alert('Error', 'Failed to save card to gallery');
    } finally {
      setSavingCard(false);
    }
  };

  const handleShareLink = async () => {
    try {
      const profileUrl = `https://seeme.app/@${user?.username}`;
      const message = `✨ Check out @${user?.username} on SeeMe!\n\n` +
        `📸 ${posts.length} Posts • 👥 ${user?.followersCount || 0} Friends • 💛 ${(user?.positivityGiveCounter || 0).toLocaleString()} Kindness Given\n\n` +
        `${user?.bio ? `"${user.bio}"\n\n` : ''}` +
        `🔗 ${profileUrl}\n\n` +
        `📲 Download SeeMe - Where Positivity Shines!`;

      await Share.share({
        message: message,
        title: `@${user?.username} on SeeMe`,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share profile');
      }
    }
  };

  const formatTimeAgo = useCallback((dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  }, []);

  const userRank = user?.positivityRank || 'beginner';
  const rankInfo = getRankInfo(userRank);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text.secondary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text.secondary }]}>User not found</Text>
      </View>
    );
  }

  const activePosts = useMemo(() => posts.filter((p: any) => !p.isArchived), [posts]);

  const renderGridItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const imageUri = getImageUrl(item.processedImageUrl) || getImageUrl(item.thumbnailUrl) || getImageUrl(item.originalImageUrl);
    const isProcessing = item.status === 'processing';

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => openPost(item, index)}
        activeOpacity={0.9}
      >
        {imageUri ? (
          <View style={styles.gridImageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            )}
            {/* Multiple photos indicator */}
            {item.mediaCount > 1 && (
              <View style={styles.multipleIndicator}>
                <Ionicons name="copy" size={16} color="#FFF" />
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.gridImage, styles.placeholderImage, { backgroundColor: colors.surface }]}>
            <Ionicons name="image-outline" size={24} color={colors.text.tertiary} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [colors, openPost]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.background }]}>
          {/* Top Bar */}
          <View style={styles.topBar} ref={setGuideRef('topBar')}>
            <View style={styles.usernameRow}>
              {isPrivate && (
                <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.topUsername, { color: colors.text.primary }]}>{user.username}</Text>
            </View>
            {isOwnProfile && (
              <View style={styles.topBarRight}>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => {
                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    setTimeout(() => setGuideVisible(true), 350);
                  }}
                >
                  <Ionicons name="information-circle-outline" size={22} color={colors.icon.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => setSettingsMenuVisible(true)}
                >
                  <Ionicons name="menu-outline" size={22} color={colors.icon.secondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Setup Banner */}
          {isOwnProfile && !user.avatarUrl && !activeAvatar && !setupBannerDismissed && (
            <View style={styles.setupBannerWrapper}>
              <TouchableOpacity
                style={[styles.setupBanner, { backgroundColor: isDark ? '#1A1214' : '#FFF5F7' }]}
                onPress={handleEditProfile}
                activeOpacity={0.7}
              >
                <View style={[styles.setupBannerIcon, { backgroundColor: isDark ? '#2D1520' : '#FFE4EC' }]}>
                  <Ionicons name="heart-outline" size={20} color="#E8538A" />
                </View>
                <View style={styles.setupBannerText}>
                  <Text style={[styles.setupBannerTitle, { color: colors.text.primary }]}>Show your friends who you are!</Text>
                  <Text style={[styles.setupBannerSubtitle, { color: colors.text.secondary }]}>Add a photo or create a fun avatar</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} style={{ marginRight: 4 }} />
                <TouchableOpacity
                  onPress={() => setSetupBannerDismissed(true)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={[styles.setupBannerClose, { backgroundColor: isDark ? '#2D1520' : '#FFE4EC' }]}
                >
                  <Ionicons name="close" size={14} color={colors.text.tertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}

          {/* Avatar with rank-colored ring */}
          <View style={styles.avatarSection} ref={setGuideRef('avatarSection')}>
            <TouchableOpacity style={styles.avatarOuter} activeOpacity={0.8} onPress={() => setAvatarViewerVisible(true)}>
              <View style={[styles.avatarRing, { borderColor: rankInfo.ringColor, backgroundColor: colors.surface }]}>
                <Avatar
                  size={84}
                  avatarUrl={!activeAvatar ? user.avatarUrl : undefined}
                  username={user.username}
                  showBorder={false}
                  customizations={activeAvatar?.customizations}
                  avatarStyle={activeAvatar?.style}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Bio */}
          {(user.bio || isOwnProfile) && (
            <View style={styles.bioSection} ref={setGuideRef('bioSection')}>
              {user.bio ? (
                <Text style={[styles.bio, { color: colors.text.secondary }]}>{user.bio}</Text>
              ) : (
                <Text style={[styles.bioPlaceholder, { color: colors.text.tertiary }]}>Say hi! Tell your friends a little about yourself</Text>
              )}
            </View>
          )}

          {/* Rank */}
          {user.positivityRank && (
            <View style={styles.rankBar} ref={setGuideRef('rankBar')}>
              <View style={[styles.rankBadge, { backgroundColor: rankInfo.color + '14' }]}>
                <View style={[styles.rankDot, { backgroundColor: rankInfo.color }]} />
                <Text style={[styles.rankLabel, { color: rankInfo.color }]}>
                  {userRank.charAt(0).toUpperCase() + userRank.slice(1)}
                </Text>
              </View>
            </View>
          )}

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: isDark ? colors.surfaceVariant : rankInfo.color + '0F', borderRadius: 16 }]} ref={setGuideRef('statsRow')}>
            <TouchableOpacity style={styles.statCard}>
              <Text style={[styles.statNumber, { color: rankInfo.color }]}>{posts.length}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Posts</Text>
            </TouchableOpacity>
            <View style={[styles.statDivider, { backgroundColor: rankInfo.color + '30' }]} />
            <TouchableOpacity style={styles.statCard}>
              <Text style={[styles.statNumber, { color: rankInfo.color }]}>{user.followersCount || 0}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Friends</Text>
            </TouchableOpacity>
            <View style={[styles.statDivider, { backgroundColor: rankInfo.color + '30' }]} />
            <TouchableOpacity style={styles.statCard}>
              <Text style={[styles.statNumber, { color: rankInfo.color }]}>{(user.positivityGiveCounter || 0).toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Kindness Given</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons} ref={setGuideRef('actionButtons')}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]} onPress={handleEditProfile}>
                  <Text style={[styles.editButtonText, { color: colors.text.primary }]}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]} onPress={handleShareProfile}>
                  <Text style={[styles.editButtonText, { color: colors.text.primary }]}>Share</Text>
                </TouchableOpacity>
                {followRequestCount > 0 && (
                  <TouchableOpacity
                    style={styles.requestsButton}
                    onPress={() => navigation.navigate('FollowRequests')}
                  >
                    <Ionicons name="people" size={16} color="#FFF" />
                    <View style={styles.requestsBadge}>
                      <Text style={styles.requestsBadgeText}>{followRequestCount}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    {
                      backgroundColor: isFollowing || followRequestStatus === 'pending'
                        ? colors.surfaceVariant
                        : rankInfo.color,
                      borderWidth: isFollowing || followRequestStatus === 'pending' ? StyleSheet.hairlineWidth : 0,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing || followRequestStatus === 'pending' ? colors.text.primary : '#FFF'} />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons
                        name={isFollowing ? 'heart' : followRequestStatus === 'pending' ? 'time-outline' : 'heart-outline'}
                        size={16}
                        color={isFollowing || followRequestStatus === 'pending' ? colors.text.primary : '#FFF'}
                      />
                      <Text style={[
                        styles.followButtonText,
                        { color: isFollowing || followRequestStatus === 'pending' ? colors.text.primary : '#FFF' },
                      ]}>
                        {getFollowButtonText()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.messageButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  onPress={handleMessage}
                  disabled={messageLoading}
                >
                  {messageLoading ? (
                    <ActivityIndicator size="small" color={colors.icon.secondary} />
                  ) : (
                    <Ionicons name="chatbubble-outline" size={18} color={colors.icon.secondary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.giveCoinsButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  onPress={() => setGiveModalVisible(true)}
                >
                  <Ionicons name="gift-outline" size={18} color={colors.icon.secondary} />
                </TouchableOpacity>
                <FavoriteButton
                  userId={user.id}
                  size={18}
                  style={[styles.favoriteButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                />
              </>
            )}
          </View>

          {/* Friendship Score */}
          {!isOwnProfile && trustData?.hasConnection && (
            <TouchableOpacity
              style={styles.trustGaugeContainer}
              activeOpacity={0.7}
              onPress={() => {
                navigation.navigate('FriendshipDetail', {
                  otherUserId: user.id,
                  otherUsername: user.username,
                  otherAvatarUrl: user.avatarUrl,
                  otherActiveAvatar: activeAvatar || null,
                });
              }}
            >
              <TrustGauge
                trustScore={trustData.trustScore}
                currentStreak={trustData.currentStreak}
                isMutualFollow={trustData.isMutualFollow}
                theme={isDark ? 'dark' : 'light'}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Medals Section */}
        <View ref={setGuideRef('medalsSection')}>
          <ProfileMedalsSection userId={user.id} isOwnProfile={isOwnProfile} />
        </View>

        {/* Story of Me Section */}
        <View ref={setGuideRef('storyOfMeSection')}>
          <StoryOfMeSection userId={user.id} isOwnProfile={isOwnProfile} rankGradient={rankInfo.gradient} rankColor={rankInfo.color} />
        </View>

        {/* Grid/Tabs Header */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]} ref={setGuideRef('postTabs')}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && [styles.activeTab, { borderBottomColor: colors.text.primary }]]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons name="grid" size={22} color={activeTab === 'posts' ? colors.text.primary : colors.text.tertiary} />
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'saved' && [styles.activeTab, { borderBottomColor: colors.text.primary }]]}
              onPress={() => setActiveTab('saved')}
            >
              <Ionicons name="bookmark" size={22} color={activeTab === 'saved' ? colors.text.primary : colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Posts Grid */}
        <View ref={setGuideRef('postsGrid')}>
        {activeTab === 'posts' ? (
          loadingPosts ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="small" color={colors.text.tertiary} />
            </View>
          ) : activePosts.length > 0 ? (
            <View style={[styles.gridContainer, { backgroundColor: colors.background }]}>
              {activePosts.map((item, index) => (
                <View key={item.id}>
                  {renderGridItem({ item, index })}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
              <View style={[styles.emptyIcon, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
                <Ionicons name="camera-outline" size={44} color={colors.text.tertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Posts Yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
                {isOwnProfile ? 'Share your first photo' : 'No posts to show'}
              </Text>
            </View>
          )
        ) : activeTab === 'saved' ? (
          /* Saved Posts Tab */
          loadingSaved ? (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="small" color={colors.text.tertiary} />
            </View>
          ) : savedPosts.length > 0 ? (
            <View style={[styles.gridContainer, { backgroundColor: colors.background }]}>
              {savedPosts.map((item, index) => (
                <View key={item.id}>
                  {renderGridItem({ item, index })}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
              <View style={[styles.emptyIcon, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
                <Ionicons name="bookmark-outline" size={44} color={colors.text.tertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Saved Posts</Text>
              <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
                Save posts you love and they'll appear here
              </Text>
            </View>
          )
        ) : null}
        </View>

      </ScrollView>

      {/* Give Coins Modal */}
      <GiveCoinsModal
        visible={giveModalVisible}
        recipientId={user.id}
        recipientUsername={user.username}
        contextType="profile"
        onClose={() => setGiveModalVisible(false)}
        onSuccess={() => {
          setGiveModalVisible(false);
          loadProfile();
        }}
      />

      {/* Post Viewer Modal - Uses shared component for all post interactions */}
      <PostViewerModal
        visible={!!selectedPost}
        posts={(activeTab === 'saved' ? savedPosts : activePosts).map(post => ({
          ...post,
          user: {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            activeAvatar: activeAvatar,
          },
        }))}
        initialIndex={selectedPostIndex}
        title="Posts"
        onClose={closePost}
        onCommentPress={(postId) => {
          closePost();
          navigation.navigate('Comments', { postId });
        }}
        onUserPress={(userId, username) => {
          closePost();
          navigation.navigate('UserProfile', { userId, username });
        }}
        isOwnProfile={isOwnProfile}
        onArchivePost={handleArchivePost}
        onDeletePost={handleDeletePost}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContainer}
        >
          <View style={styles.editModalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.editModalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editModalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? (
                <ActivityIndicator size="small" color="#3897F0" />
              ) : (
                <Text style={styles.editModalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalContent}>
            {/* Avatar Section */}
            <View style={styles.editAvatarSection}>
              <View>
                <Avatar
                  size={100}
                  avatarUrl={!activeAvatar ? user?.avatarUrl : undefined}
                  username={user?.username}
                  showBorder
                  customizations={activeAvatar?.customizations}
                  avatarStyle={activeAvatar?.style}
                />
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                )}
              </View>
              <Text style={styles.editAvatarActiveLabel}>
                {activeAvatar ? 'Using custom avatar' : user?.avatarUrl ? 'Using profile photo' : 'No profile picture set'}
              </Text>
              <TouchableOpacity
                style={[styles.editAvatarButton, !activeAvatar && user?.avatarUrl && styles.editAvatarButtonActive]}
                onPress={handleChangeProfileImage}
                disabled={uploadingImage}
              >
                <Text style={[styles.editAvatarButtonText, !activeAvatar && user?.avatarUrl && styles.editAvatarButtonTextActive]}>
                  {uploadingImage ? 'Uploading...' : user?.avatarUrl && activeAvatar ? 'Switch to Profile Photo' : 'Upload Profile Photo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editAvatarButton, { marginTop: 4 }, activeAvatar && styles.editAvatarButtonActive]}
                onPress={() => {
                  setEditModalVisible(false);
                  navigation.navigate('AvatarCustomization', {});
                }}
              >
                <Text style={[styles.editAvatarButtonText, activeAvatar ? styles.editAvatarButtonTextActive : { color: '#6B7280' }]}>
                  {activeAvatar ? 'Edit Custom Avatar' : 'Use Custom Avatar'}
                </Text>
              </TouchableOpacity>
              {activeAvatar && user?.avatarUrl && (
                <TouchableOpacity
                  style={[styles.editAvatarButton, { marginTop: 4 }]}
                  onPress={async () => {
                    try {
                      // Deactivate custom avatar to show profile photo
                      await api.updateProfile({ clearActiveAvatar: true } as any);
                      setActiveAvatar(null);
                      setUser((prev: any) => ({ ...prev, activeAvatarId: null }));
                    } catch (error) {
                      Alert.alert('Error', 'Failed to switch to profile photo');
                    }
                  }}
                >
                  <Text style={[styles.editAvatarButtonText]}>Switch to Profile Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Username Input */}
            <View style={styles.editInputGroup}>
              <Text style={styles.editInputLabel}>Username</Text>
              <TextInput
                style={styles.editInput}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Enter username"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
              />
            </View>

            {/* Bio Input */}
            <View style={styles.editInputGroup}>
              <Text style={styles.editInputLabel}>Bio</Text>
              <TextInput
                style={[styles.editInput, styles.editBioInput]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Write something about yourself"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                maxLength={150}
                textAlignVertical="top"
              />
              <Text style={styles.editCharCount}>{editBio.length}/150</Text>
            </View>

            {/* Privacy Settings */}
            <View style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Privacy</Text>
              <TouchableOpacity style={styles.privacyToggle} onPress={handleTogglePrivacy}>
                <View style={styles.privacyToggleLeft}>
                  <Ionicons
                    name={isPrivate ? 'lock-closed' : 'lock-open'}
                    size={20}
                    color={isPrivate ? '#FBBF24' : '#8E8E93'}
                  />
                  <View style={styles.privacyToggleText}>
                    <Text style={styles.privacyToggleLabel}>Private Account</Text>
                    <Text style={styles.privacyToggleDescription}>
                      {isPrivate
                        ? 'Only approved friends can see your posts'
                        : 'Anyone can see your posts and be your friend'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.toggleSwitch, isPrivate && styles.toggleSwitchActive]}>
                  <View style={[styles.toggleKnob, isPrivate && styles.toggleKnobActive]} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings Menu Modal */}
      <Modal
        visible={settingsMenuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.settingsOverlay}
          activeOpacity={1}
          onPress={() => setSettingsMenuVisible(false)}
        >
          <View style={styles.settingsMenu}>
            <View style={styles.settingsHandle} />
            <Text style={styles.settingsTitle}>Settings</Text>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsMenuVisible(false);
                handleEditProfile();
              }}
            >
              <View style={styles.settingsItemIcon}>
                <Ionicons name="person-outline" size={22} color="#262626" />
              </View>
              <Text style={styles.settingsItemText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsMenuVisible(false);
                navigation.navigate('AvatarCustomization', {});
              }}
            >
              <View style={styles.settingsItemIcon}>
                <Ionicons name="happy-outline" size={22} color="#262626" />
              </View>
              <Text style={styles.settingsItemText}>Customize Avatar</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsMenuVisible(false);
                handleTogglePrivacy();
              }}
            >
              <View style={styles.settingsItemIcon}>
                <Ionicons name={isPrivate ? 'lock-closed-outline' : 'lock-open-outline'} size={22} color="#262626" />
              </View>
              <Text style={styles.settingsItemText}>Private Account</Text>
              <View style={[styles.settingsToggle, isPrivate && styles.settingsToggleActive]}>
                <View style={[styles.settingsToggleKnob, isPrivate && styles.settingsToggleKnobActive]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsMenuVisible(false);
                setTimeout(() => handleShareProfile(), 300);
              }}
            >
              <View style={styles.settingsItemIcon}>
                <Ionicons name="share-social-outline" size={22} color="#262626" />
              </View>
              <Text style={styles.settingsItemText}>Share Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsMenuVisible(false);
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                setTimeout(() => setGuideVisible(true), 350);
              }}
            >
              <View style={styles.settingsItemIcon}>
                <Ionicons name="help-circle-outline" size={22} color="#262626" />
              </View>
              <Text style={styles.settingsItemText}>Profile Tour</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsMenuVisible(false);
                navigation.navigate('ArchivedPosts');
              }}
            >
              <View style={styles.settingsItemIcon}>
                <Ionicons name="archive-outline" size={22} color="#262626" />
              </View>
              <Text style={styles.settingsItemText}>Archived Posts</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            {followRequestCount > 0 && (
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={() => {
                  setSettingsMenuVisible(false);
                  navigation.navigate('FollowRequests');
                }}
              >
                <View style={styles.settingsItemIcon}>
                  <Ionicons name="people-outline" size={22} color="#262626" />
                </View>
                <Text style={styles.settingsItemText}>Friend Requests</Text>
                <View style={styles.settingsItemBadge}>
                  <Text style={styles.settingsItemBadgeText}>{followRequestCount}</Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.settingsDivider} />

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsMenuVisible(false);
                setTimeout(() => setShowAccountSwitcher(true), 300);
              }}
            >
              <View style={styles.settingsItemIcon}>
                <Ionicons name="swap-horizontal-outline" size={22} color="#262626" />
              </View>
              <Text style={styles.settingsItemText}>Switch Account</Text>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setSettingsMenuVisible(false);
                handleLogout();
              }}
            >
              <View style={[styles.settingsItemIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.settingsItemText, { color: '#EF4444' }]}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingsCancelButton}
              onPress={() => setSettingsMenuVisible(false)}
            >
              <Text style={styles.settingsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Share Profile Card Modal */}
      <Modal
        visible={shareCardVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShareCardVisible(false)}
      >
        <View style={styles.shareCardOverlay}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.shareCardClose}
            onPress={() => setShareCardVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.shareCardScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* The Card - Wrapped in ViewShot for capture */}
            <ViewShot
              ref={shareCardRef}
              options={{ format: 'png', quality: 1 }}
              style={styles.shareCardWrapper}
            >
              <View style={styles.shareCard}>
                {/* Gradient Header */}
                <View style={styles.shareCardHeader}>
                  <View style={styles.shareCardAvatarContainer}>
                    <View style={styles.shareCardAvatarRing}>
                      <Avatar
                        size={100}
                        avatarUrl={!activeAvatar ? user?.avatarUrl : undefined}
                        username={user?.username}
                        showBorder={false}
                        customizations={activeAvatar?.customizations}
                        avatarStyle={activeAvatar?.style}
                      />
                    </View>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.shareCardBody}>
                  <Text style={styles.shareCardUsername}>@{user?.username}</Text>
                  {user?.bio && (
                    <Text style={styles.shareCardBio} numberOfLines={2}>
                      "{user.bio}"
                    </Text>
                  )}

                  {/* Stats Row */}
                  <View style={styles.shareCardStats}>
                    <View style={styles.shareCardStat}>
                      <Text style={styles.shareCardStatNumber}>{posts.length}</Text>
                      <Text style={styles.shareCardStatLabel}>Posts</Text>
                    </View>
                    <View style={styles.shareCardStatDivider} />
                    <View style={styles.shareCardStat}>
                      <Text style={styles.shareCardStatNumber}>{user?.followersCount || 0}</Text>
                      <Text style={styles.shareCardStatLabel}>Friends</Text>
                    </View>
                    <View style={styles.shareCardStatDivider} />
                    <View style={styles.shareCardStat}>
                      <Text style={styles.shareCardStatNumber}>{(user?.positivityGiveCounter || 0).toLocaleString()}</Text>
                      <Text style={styles.shareCardStatLabel}>Kindness Given</Text>
                    </View>
                  </View>

                  {/* Posts Preview Grid */}
                  {posts.length > 0 && (
                    <View style={styles.shareCardPostsSection}>
                      <Text style={styles.shareCardPostsTitle}>Recent Posts</Text>
                      <View style={styles.shareCardPostsGrid}>
                        {posts.slice(0, 6).map((post, index) => {
                          const imageUri = getImageUrl(post.processedImageUrl) || getImageUrl(post.thumbnailUrl) || getImageUrl(post.originalImageUrl);
                          return (
                            <View key={post.id} style={styles.shareCardPostItem}>
                              {imageUri ? (
                                <Image
                                  source={{ uri: imageUri }}
                                  style={styles.shareCardPostImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={[styles.shareCardPostImage, styles.shareCardPostPlaceholder]}>
                                  <Ionicons name="image-outline" size={16} color="#C7C7CC" />
                                </View>
                              )}
                            </View>
                          );
                        })}
                        {/* Fill empty slots if less than 6 posts */}
                        {posts.length < 6 && Array.from({ length: Math.min(6 - posts.length, 6) }).map((_, i) => (
                          <View key={`empty-${i}`} style={styles.shareCardPostItem}>
                            <View style={[styles.shareCardPostImage, styles.shareCardPostEmpty]} />
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* App Branding */}
                  <View style={styles.shareCardBranding}>
                    <View style={styles.shareCardLogo}>
                      <Text style={styles.shareCardLogoText}>S</Text>
                    </View>
                    <View style={styles.shareCardBrandText}>
                      <Text style={styles.shareCardAppName}>SeeMe</Text>
                      <Text style={styles.shareCardTagline}>Where Positivity Shines</Text>
                    </View>
                  </View>

                  {/* Download CTA */}
                  <View style={styles.shareCardCTA}>
                    <Text style={styles.shareCardCTAText}>Download the app to connect!</Text>
                  </View>
                </View>
              </View>
            </ViewShot>

            {/* Action Buttons */}
            <View style={styles.shareCardActions}>
              <TouchableOpacity
                style={styles.shareCardSaveButton}
                onPress={handleSaveCard}
                disabled={savingCard}
              >
                {savingCard ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={22} color="#FFF" />
                    <Text style={styles.shareCardSaveText}>Save to Gallery</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareCardLinkButton}
                onPress={handleShareLink}
              >
                <Ionicons name="link-outline" size={22} color="#FBBF24" />
                <Text style={styles.shareCardLinkText}>Share Link</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Avatar Full View Modal */}
      <Modal
        visible={avatarViewerVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setAvatarViewerVisible(false)}
      >
        <View style={styles.avatarViewerOverlay}>
          <TouchableOpacity
            style={styles.avatarViewerClose}
            onPress={() => setAvatarViewerVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.avatarViewerContent}>
            <View style={[styles.avatarViewerRing, { borderColor: rankInfo.ringColor }]}>
              {activeAvatar ? (
                <View style={styles.avatarViewerInner}>
                  <Avatar
                    size={width * 0.7}
                    customizations={activeAvatar.customizations}
                    avatarStyle={activeAvatar.style}
                    showBorder={false}
                  />
                </View>
              ) : user?.avatarUrl ? (
                <Image
                  source={{ uri: getImageUrl(user.avatarUrl)! }}
                  style={styles.avatarViewerImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarViewerInner, { backgroundColor: '#374151' }]}>
                  <Text style={styles.avatarViewerInitial}>
                    {user?.username?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.avatarViewerUsername}>@{user?.username}</Text>
          </View>
        </View>
      </Modal>

      {/* Profile Guide Overlay */}
      <ProfileGuide
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        guideRefs={guideRefs}
        scrollViewRef={scrollViewRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // Profile Header
  profileHeader: {
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topUsername: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  topBarRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
  },
  settingsButton: {
    padding: 8,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarOuter: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarRing: {
    borderRadius: 48,
    borderWidth: 3,
    padding: 3,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 28,
    borderRadius: 1,
    opacity: 0.5,
  },

  // Bio
  bioSection: {
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bio: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  bioPlaceholder: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Rank Bar
  rankBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 8,
    flexWrap: 'wrap',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  rankSep: {
    fontSize: 10,
  },
  rankStat: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  shareButton: {
    flex: 0.6,
    flexDirection: 'row',
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 11,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  followingButton: {},
  requestedButton: {},
  followingButtonText: {},
  requestsButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  requestsBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  requestsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  messageButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  giveCoinsButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  favoriteButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Trust Gauge
  trustGaugeContainer: {
    marginTop: 16,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#262626',
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    backgroundColor: '#FFF',
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginBottom: GRID_GAP,
  },
  gridImageContainer: {
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: '#FFF',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  modalBackButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  // Post Card
  postCard: {
    backgroundColor: '#FFF',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: '#C7C7CC',
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  postImage: {
    width: width,
    height: width,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  likesContainer: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  captionContainer: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  captionText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
  },
  viewComments: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  viewCommentsText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  postTimestamp: {
    fontSize: 11,
    color: '#8E8E93',
    paddingHorizontal: 12,
    marginBottom: 16,
    textTransform: 'uppercase',
  },

  // Post ScrollView
  postScrollView: {
    flex: 1,
  },

  // Post Separator
  postSeparator: {
    height: 8,
    backgroundColor: '#F2F2F7',
  },

  // Post Navigation
  postNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#C7C7CC',
    backgroundColor: '#FFF',
  },
  postCounter: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },

  // Edit Profile Modal
  editModalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#C7C7CC',
  },
  editModalCancel: {
    fontSize: 16,
    color: '#000',
  },
  editModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  editModalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3897F0',
  },
  editModalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  editAvatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  editAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 0.5,
    borderColor: '#C7C7CC',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarActiveLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    fontWeight: '500',
  },
  editAvatarButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editAvatarButtonActive: {
    backgroundColor: '#FBBF24',
    borderColor: '#FBBF24',
  },
  editAvatarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  editAvatarButtonTextActive: {
    color: '#FFF',
  },
  editInputGroup: {
    marginBottom: 20,
  },
  editInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  editInput: {
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  editBioInput: {
    height: 100,
    paddingTop: 12,
  },
  editCharCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },

  // Privacy Section
  privacySection: {
    marginTop: 20,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 20,
  },
  privacySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  privacyToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyToggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  privacyToggleDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5EA',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#FBBF24',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },

  // Settings Menu
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsMenu: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  settingsHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingsItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 16,
    color: '#262626',
    fontWeight: '500',
  },
  settingsItemBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  settingsItemBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  settingsToggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E5EA',
    padding: 2,
    justifyContent: 'center',
  },
  settingsToggleActive: {
    backgroundColor: '#FBBF24',
  },
  settingsToggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsToggleKnobActive: {
    alignSelf: 'flex-end',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  settingsCancelButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  settingsCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
  },

  // Share Card Modal
  shareCardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareCardClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareCardScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  shareCardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  shareCard: {
    width: width - 60,
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  shareCardHeader: {
    height: 120,
    backgroundColor: '#FBBF24',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 0,
  },
  shareCardAvatarContainer: {
    position: 'absolute',
    bottom: -50,
    alignItems: 'center',
  },
  shareCardAvatarRing: {
    padding: 4,
    borderRadius: 60,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  shareCardBody: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  shareCardUsername: {
    fontSize: 24,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 8,
  },
  shareCardBio: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  shareCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    width: '100%',
  },
  shareCardStat: {
    flex: 1,
    alignItems: 'center',
  },
  shareCardStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#262626',
    marginBottom: 2,
  },
  shareCardStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  shareCardStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  shareCardPostsSection: {
    width: '100%',
    marginBottom: 20,
  },
  shareCardPostsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 10,
    textAlign: 'center',
  },
  shareCardPostsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
  },
  shareCardPostItem: {
    width: (width - 60 - 48 - 8) / 3, // card width - padding - gaps / 3
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  shareCardPostImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  shareCardPostPlaceholder: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareCardPostEmpty: {
    backgroundColor: '#F9F9F9',
  },
  shareCardBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shareCardLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  shareCardLogoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  shareCardBrandText: {
    alignItems: 'flex-start',
  },
  shareCardAppName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
  },
  shareCardTagline: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '500',
  },
  shareCardCTA: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  shareCardCTAText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
  },
  shareCardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  shareCardSaveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FBBF24',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareCardSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  shareCardLinkButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FBBF24',
  },
  shareCardLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FBBF24',
  },

  // Setup Banner
  setupBannerWrapper: {
    marginBottom: 16,
  },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  setupBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  setupBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  setupBannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  setupBannerClose: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Avatar Viewer Modal
  avatarViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarViewerClose: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarViewerContent: {
    alignItems: 'center',
    gap: 20,
  },
  avatarViewerRing: {
    borderWidth: 3,
    borderRadius: width * 0.4,
    padding: 4,
    backgroundColor: 'transparent',
  },
  avatarViewerImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
  },
  avatarViewerInner: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarViewerInitial: {
    fontSize: width * 0.3,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  avatarViewerUsername: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },

});
