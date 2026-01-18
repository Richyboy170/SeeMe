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
  FlatList,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, getImageUrl } from '../../services/api';
import GiveCounterBadge from '../../components/coins/GiveCounterBadge';
import GiveCoinsModal from '../../components/coins/GiveCoinsModal';

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
  const [followLoading, setFollowLoading] = useState(false);
  const [postGiveModalVisible, setPostGiveModalVisible] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const userId = route?.params?.userId;
  const username = route?.params?.username;

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
      loadPosts();
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
      setUser(response.user || response);
      setIsOwnProfile(!userId || response.isOwnProfile);
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
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (followLoading || !user?.username) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api.unfollowUser(user.username);
        setIsFollowing(false);
        // Update local follower count
        setUser((prev: any) => ({
          ...prev,
          followersCount: Math.max(0, (prev.followersCount || 1) - 1)
        }));
      } else {
        await api.followUser(user.username);
        setIsFollowing(true);
        // Update local follower count
        setUser((prev: any) => ({
          ...prev,
          followersCount: (prev.followersCount || 0) + 1
        }));
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update follow status';
      Alert.alert('Error', errorMessage);
    } finally {
      setFollowLoading(false);
    }
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
              {(() => {
                const avatarUri = user.avatarUrl ? getImageUrl(user.avatarUrl) : null;
                return avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={40} color="#C7C7CC" />
                  </View>
                );
              })()}
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
                <TouchableOpacity style={styles.editButton}>
                  <Text style={styles.editButtonText}>Edit profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareButton}>
                  <Text style={styles.editButtonText}>Share profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? '#000' : '#FFF'} />
                  ) : (
                    <Text style={[
                      styles.followButtonText,
                      isFollowing && styles.followingButtonText
                    ]}>
                      {isFollowing ? 'Following' : 'Follow'}
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
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            renderItem={renderGridItem}
            columnWrapperStyle={styles.gridRow}
          />
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
                    {(() => {
                      const avatarUri = user.avatarUrl ? getImageUrl(user.avatarUrl) : null;
                      return avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.postAvatar} />
                      ) : (
                        <View style={[styles.postAvatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={16} color="#C7C7CC" />
                        </View>
                      );
                    })()}
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
  followingButtonText: {
    color: '#000',
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
  gridRow: {
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
});
