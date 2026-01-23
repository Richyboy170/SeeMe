import React, { useState } from 'react';
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
} from 'react-native';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, getImageUrl } from '../../services/api';
import GiveCounterBadge from '../../components/coins/GiveCounterBadge';
import GiveCoinsModal from '../../components/coins/GiveCoinsModal';
import Avatar from '../../components/Avatar';
import { AvatarCustomizations } from '../../components/AvatarRenderer';

const { width } = Dimensions.get('window');
const GRID_GAP = 1;
const IMAGE_SIZE = (width - GRID_GAP * 2) / 3;

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

  const userId = route?.params?.userId;
  const username = route?.params?.username;

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
      loadPosts();
      if (!userId) {
        loadPrivacySettings();
        loadFollowRequestCount();
      }
    }, [userId, username])
  );

  // Check follow status when viewing other profiles
  React.useEffect(() => {
    if (user && !isOwnProfile && user.username) {
      checkFollowStatus();
    }
  }, [user, isOwnProfile]);

  const loadProfile = async () => {
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
  };

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const data = await api.getUserPosts(username);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

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

  const loadPrivacySettings = async () => {
    try {
      const response = await api.getPrivacySettings();
      setIsPrivate(response.settings?.isPrivate || false);
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const loadFollowRequestCount = async () => {
    try {
      const response = await api.getFollowRequestCount();
      setFollowRequestCount(response.count || 0);
    } catch (error) {
      console.error('Error loading follow request count:', error);
    }
  };

  const handleFollow = async () => {
    if (followLoading || !user?.username) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(user.username);
        setIsFollowing(false);
        setFollowRequestStatus(null);
        // Update local follower count
        setUser((prev: any) => ({
          ...prev,
          followersCount: Math.max(0, (prev.followersCount || 1) - 1)
        }));
      } else if (followRequestStatus === 'pending') {
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

  const handleTogglePrivacy = async () => {
    try {
      const newPrivacyState = !isPrivate;
      await api.updatePrivacySettings(newPrivacyState);
      setIsPrivate(newPrivacyState);
      Alert.alert(
        'Success',
        newPrivacyState
          ? 'Your account is now private. New followers will need your approval.'
          : 'Your account is now public.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update privacy settings');
    }
  };

  const getFollowButtonText = () => {
    if (isFollowing) return 'Following';
    if (followRequestStatus === 'pending') return 'Requested';
    return 'Follow';
  };

  const getFollowButtonStyle = () => {
    if (isFollowing) return [styles.followButton, styles.followingButton];
    if (followRequestStatus === 'pending') return [styles.followButton, styles.requestedButton];
    return [styles.followButton];
  };

  const handleMessage = async () => {
    if (messageLoading || !user?.id) return;

    setMessageLoading(true);
    try {
      // Create or get existing conversation
      const response = await api.createConversation(user.id);
      const conversation = response.conversation;

      if (conversation) {
        // Navigate to Messages tab and then to Chat screen
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Messages',
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

  const openPost = (post: any, index: number) => {
    setSelectedPost(post);
    setSelectedPostIndex(index);
  };

  const closePost = () => {
    setSelectedPost(null);
  };

  const handleEditProfile = () => {
    setEditUsername(user?.username || '');
    setEditBio(user?.bio || '');
    setEditModalVisible(true);
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

  const handleShareProfile = async () => {
    try {
      const profileUrl = `https://seeme.app/@${user?.username}`;
      const message = `Check out ${user?.username}'s profile on SeeMe!`;

      await Share.share({
        message: `${message}\n${profileUrl}`,
        url: profileUrl, // iOS only
        title: `${user?.username}'s SeeMe Profile`,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share profile');
      }
    }
  };

  const goToPrevPost = () => {
    if (selectedPostIndex > 0) {
      const newIndex = selectedPostIndex - 1;
      setSelectedPostIndex(newIndex);
      setSelectedPost(posts[newIndex]);
    }
  };

  const goToNextPost = () => {
    if (selectedPostIndex < posts.length - 1) {
      const newIndex = selectedPostIndex + 1;
      setSelectedPostIndex(newIndex);
      setSelectedPost(posts[newIndex]);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const renderGridItem = ({ item, index }: { item: any; index: number }) => {
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
          <View style={[styles.gridImage, styles.placeholderImage]}>
            <Ionicons name="image-outline" size={24} color="#C7C7CC" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileTop}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <Avatar
                size={86}
                avatarUrl={!activeAvatar ? user.avatarUrl : undefined}
                username={user.username}
                showBorder
                customizations={activeAvatar?.customizations}
                avatarStyle={activeAvatar?.style}
              />
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{user.followersCount || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>

          {/* Username & Bio */}
          <View style={styles.bioSection}>
            <Text style={styles.displayName}>{user.username}</Text>
            {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                  <Text style={styles.editButtonText}>Edit profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareProfile}>
                  <Text style={styles.editButtonText}>Share profile</Text>
                </TouchableOpacity>
                {followRequestCount > 0 && (
                  <TouchableOpacity
                    style={styles.requestsButton}
                    onPress={() => navigation.navigate('FollowRequests')}
                  >
                    <View style={styles.requestsBadge}>
                      <Text style={styles.requestsBadgeText}>{followRequestCount}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={getFollowButtonStyle()}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing || followRequestStatus === 'pending' ? '#000' : '#FFF'} />
                  ) : (
                    <Text style={[
                      styles.followButtonText,
                      (isFollowing || followRequestStatus === 'pending') && styles.followingButtonText
                    ]}>
                      {getFollowButtonText()}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={handleMessage}
                  disabled={messageLoading}
                >
                  {messageLoading ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Ionicons name="chatbubble-outline" size={18} color="#000" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.giveCoinsButton}
                  onPress={() => setGiveModalVisible(true)}
                >
                  <Ionicons name="gift" size={18} color="#FFF" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Give Counter Badge */}
          {user.positivityGiveCounter !== undefined && user.positivityRank && (
            <View style={styles.badgeContainer}>
              <GiveCounterBadge
                giveCounter={user.positivityGiveCounter}
                rank={user.positivityRank}
              />
            </View>
          )}
        </View>

        {/* Grid/Tabs Header */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Ionicons name="grid" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Ionicons name="bookmark-outline" size={24} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        {loadingPosts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#C7C7CC" />
          </View>
        ) : posts.length > 0 ? (
          <View style={styles.gridContainer}>
            {posts.map((item, index) => (
              <View key={item.id}>
                {renderGridItem({ item, index })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="camera-outline" size={48} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
            <Text style={styles.emptySubtitle}>
              {isOwnProfile ? 'Share photos to see them here' : 'No posts to show'}
            </Text>
          </View>
        )}

        {/* Logout button for own profile */}
        {isOwnProfile && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        )}
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

      {/* Instagram-style Post View Modal */}
      <Modal
        visible={!!selectedPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePost}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closePost} style={styles.modalBackButton}>
              <Ionicons name="arrow-back" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Posts</Text>
            <View style={{ width: 28 }} />
          </View>

          {selectedPost && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Post Card */}
              <View style={styles.postCard}>
                {/* Post Header */}
                <View style={styles.postHeader}>
                  <View style={styles.postUserInfo}>
                    <Avatar
                      size={32}
                      avatarUrl={user.avatarUrl}
                      username={user.username}
                      style={styles.postAvatar}
                    />
                    <Text style={styles.postUsername}>{user.username}</Text>
                  </View>
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
                  </TouchableOpacity>
                </View>

                {/* Post Image */}
                {(() => {
                  const imageUri = getImageUrl(selectedPost.processedImageUrl) || getImageUrl(selectedPost.originalImageUrl);
                  return imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  ) : null;
                })()}

                {/* Action Buttons */}
                <View style={styles.postActions}>
                  <View style={styles.postActionsLeft}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="heart-outline" size={28} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="chatbubble-outline" size={26} color="#000" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="paper-plane-outline" size={26} color="#000" />
                    </TouchableOpacity>
                    {/* Give Coins Button */}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setPostGiveModalVisible(true)}
                    >
                      <Ionicons name="gift" size={26} color="#FBBF24" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity>
                    <Ionicons name="bookmark-outline" size={26} color="#000" />
                  </TouchableOpacity>
                </View>

                {/* Likes */}
                <View style={styles.likesContainer}>
                  <Text style={styles.likesText}>
                    {selectedPost.likesCount || 0} likes
                  </Text>
                </View>

                {/* Caption */}
                {selectedPost.caption && (
                  <View style={styles.captionContainer}>
                    <Text style={styles.captionText}>
                      <Text style={styles.captionUsername}>{user.username}</Text>
                      {'  '}{selectedPost.caption}
                    </Text>
                  </View>
                )}

                {/* Comments Link */}
                {selectedPost.commentsCount > 0 && (
                  <TouchableOpacity style={styles.viewComments}>
                    <Text style={styles.viewCommentsText}>
                      View all {selectedPost.commentsCount} comments
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Timestamp */}
                <Text style={styles.postTimestamp}>
                  {formatTimeAgo(selectedPost.createdAt)}
                </Text>
              </View>

              {/* Navigation buttons */}
              <View style={styles.postNavigation}>
                <TouchableOpacity
                  style={[styles.navButton, selectedPostIndex === 0 && styles.navButtonDisabled]}
                  onPress={goToPrevPost}
                  disabled={selectedPostIndex === 0}
                >
                  <Ionicons name="chevron-back" size={24} color={selectedPostIndex === 0 ? '#C7C7CC' : '#000'} />
                  <Text style={[styles.navButtonText, selectedPostIndex === 0 && styles.navButtonTextDisabled]}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.postCounter}>{selectedPostIndex + 1} of {posts.length}</Text>
                <TouchableOpacity
                  style={[styles.navButton, selectedPostIndex === posts.length - 1 && styles.navButtonDisabled]}
                  onPress={goToNextPost}
                  disabled={selectedPostIndex === posts.length - 1}
                >
                  <Text style={[styles.navButtonText, selectedPostIndex === posts.length - 1 && styles.navButtonTextDisabled]}>Next</Text>
                  <Ionicons name="chevron-forward" size={24} color={selectedPostIndex === posts.length - 1 ? '#C7C7CC' : '#000'} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Give Coins Modal for Posts */}
      {selectedPost && (
        <GiveCoinsModal
          visible={postGiveModalVisible}
          recipientId={user.id}
          recipientUsername={user.username}
          contextType="post"
          contextId={selectedPost.id}
          onClose={() => setPostGiveModalVisible(false)}
          onSuccess={() => {
            setPostGiveModalVisible(false);
          }}
        />
      )}

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
              <Avatar
                size={100}
                avatarUrl={!activeAvatar ? user?.avatarUrl : undefined}
                username={user?.username}
                showBorder
                customizations={activeAvatar?.customizations}
                avatarStyle={activeAvatar?.style}
              />
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={() => {
                  setEditModalVisible(false);
                  navigation.navigate('AvatarCustomization', {});
                }}
              >
                <Text style={styles.editAvatarButtonText}>Customize Avatar</Text>
              </TouchableOpacity>
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
                        ? 'Only approved followers can see your posts'
                        : 'Anyone can see your posts'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 28,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 0.5,
    borderColor: '#C7C7CC',
  },
  avatarPlaceholder: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statLabel: {
    fontSize: 13,
    color: '#000',
    marginTop: 2,
  },

  // Bio Section
  bioSection: {
    marginBottom: 12,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  bio: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  followButton: {
    flex: 1,
    backgroundColor: '#3897F0',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  followingButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  requestedButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  followingButtonText: {
    color: '#000',
  },
  requestsButton: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestsBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  messageButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  giveCoinsButton: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    marginTop: 4,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#C7C7CC',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderTopWidth: 1,
    borderTopColor: '#000',
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginBottom: GRID_GAP,
  },
  gridImageContainer: {
    flex: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Loading
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  // Logout
  logoutButton: {
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#C7C7CC',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
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

  // Post Navigation
  postNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#C7C7CC',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  navButtonTextDisabled: {
    color: '#C7C7CC',
  },
  postCounter: {
    fontSize: 14,
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
  editAvatarButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FBBF24',
    borderRadius: 20,
  },
  editAvatarButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
});
