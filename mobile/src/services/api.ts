import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { accountManager } from './accountManager';

// Auto-detect dev server IP from Expo
const getDevApiUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000/api`;
  }
  // Fallback to localhost for emulators
  return 'http://localhost:3000/api';
};

export const API_URL = __DEV__
  ? getDevApiUrl()
  : 'https://api.seeme.app/api';   // Production

// Base URL without /api for static assets like images
export const getBaseUrl = () => {
  return API_URL.replace(/\/api$/, '');
};

// Helper to convert relative image URLs to absolute URLs
export const getImageUrl = (url: string | null | undefined): string | null => {
  // Return null for falsy values or empty/whitespace strings
  if (!url || typeof url !== 'string' || url.trim() === '') return null;

  const trimmedUrl = url.trim();

  // Already a valid absolute URL
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  // Relative storage URL - convert to absolute
  if (trimmedUrl.startsWith('/storage/')) {
    const baseUrl = getBaseUrl();
    if (baseUrl) {
      return `${baseUrl}${trimmedUrl}`;
    }
  }

  // Handle file:// URLs from backend storage - extract relative path
  if (trimmedUrl.startsWith('file://')) {
    // Extract the storage path from file:// URLs
    // e.g., file://C:\...\backend\storage\originals\... -> /storage/originals/...
    const storageMatch = trimmedUrl.match(/[/\\]storage[/\\](.*)/i);
    if (storageMatch) {
      const relativePath = '/storage/' + storageMatch[1].replace(/\\/g, '/');
      const baseUrl = getBaseUrl();
      if (baseUrl) {
        return `${baseUrl}${relativePath}`;
      }
    }
  }

  // For any other format, return null to prevent invalid URIs
  // This prevents passing malformed URLs to Image component
  console.warn('getImageUrl: Unrecognized URL format, returning null:', url);
  return null;
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        // First try multi-account system
        let token = await accountManager.getActiveToken();

        // Fallback to legacy AsyncStorage for migration
        if (!token) {
          token = await AsyncStorage.getItem('auth_token');
        }

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          const errorData = error.response?.data as any;
          const errorMsg = errorData?.error || errorData?.message || '';
          const accountStatus = errorData?.accountStatus;

          // Handle banned/suspended users detected mid-session
          if (accountStatus === 'banned' || accountStatus === 'suspended') {
            // Store the account status info so the login screen can display it
            await AsyncStorage.setItem('account_action', JSON.stringify({
              accountStatus,
              reason: errorData?.reason,
              suspendedUntil: errorData?.suspendedUntil,
            }));
            // Clear token to force re-login
            await AsyncStorage.removeItem('auth_token');
            console.log(`Account ${accountStatus} - cleared auth token.`);
          } else if (
            errorMsg.includes('token') ||
            errorMsg.includes('Token') ||
            errorMsg.includes('User not found') ||
            errorMsg.includes('log in again')
          ) {
            // Clear token and force re-login
            await AsyncStorage.removeItem('auth_token');
            console.log('Auth error - cleared auth token. Please log in again.');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async register(username: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
    });

    if (response.data.token && response.data.user) {
      // Store in multi-account system
      await accountManager.addAccount(response.data.token, {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        avatarUrl: response.data.user.avatarUrl,
      });
      // Also keep in AsyncStorage for backward compatibility
      await AsyncStorage.setItem('auth_token', response.data.token);
    }

    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });

    if (response.data.token && response.data.user) {
      // Store in multi-account system
      await accountManager.addAccount(response.data.token, {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        avatarUrl: response.data.user.avatarUrl,
      });
      // Also keep in AsyncStorage for backward compatibility
      await AsyncStorage.setItem('auth_token', response.data.token);
    }

    return response.data;
  }

  async logout() {
    // Get active account to remove
    const activeAccount = await accountManager.getActiveAccount();
    if (activeAccount) {
      await accountManager.removeAccount(activeAccount.id);
    }
    // Also clear legacy storage
    await AsyncStorage.removeItem('auth_token');
  }

  async googleSignIn(idToken: string) {
    const response = await this.client.post('/auth/google', {
      idToken,
    });

    if (response.data.token && response.data.user) {
      // Store in multi-account system
      await accountManager.addAccount(response.data.token, {
        id: response.data.user.id,
        username: response.data.user.username,
        email: response.data.user.email,
        avatarUrl: response.data.user.avatarUrl,
      });
      // Also keep in AsyncStorage for backward compatibility
      await AsyncStorage.setItem('auth_token', response.data.token);
    }

    return response.data;
  }

  // Feed methods
  async getFeed(page: number = 1) {
    const response = await this.client.get(`/feed?page=${page}`);
    return response.data;
  }

  async getAlgorithmicFeed(page: number = 1, limit: number = 20) {
    const response = await this.client.get(`/feed/algorithmic?page=${page}&limit=${limit}`);
    return response.data;
  }

  async trackInteraction(
    targetId: string,
    interactionType: 'view' | 'like' | 'comment' | 'comment_view' | 'share' | 'profile_view' | 'follow' | 'coin_gift' | 'save',
    metadata?: object
  ) {
    const response = await this.client.post('/feed/track-interaction', {
      targetId,
      interactionType,
      metadata
    });
    return response.data;
  }

  async createPost(
    imageUri: string,
    caption: string,
    visibility: 'friends_only' | 'topics_only' | 'topics_and_friends' = 'friends_only',
    topicIds: string[] = [],
    originalImageUri?: string,
    locationName?: string,
    locationLat?: number,
    locationLng?: number,
    photoTakenAt?: string
  ) {
    try {
      const formData = new FormData();

      // Map file extension to a valid MIME type
      const getMimeType = (uri: string): string => {
        const ext = uri.split('.').pop()?.toLowerCase();
        if (ext === 'png') return 'image/png';
        if (ext === 'webp') return 'image/webp';
        if (ext === 'heic') return 'image/heic';
        if (ext === 'heif') return 'image/heif';
        return 'image/jpeg'; // default for jpg, jpeg, or unknown extensions
      };

      // Create file object for the cropped image
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const type = getMimeType(imageUri);
      // Ensure filename has a proper image extension
      const safeName = /\.(jpe?g|png|webp|heic|heif)$/i.test(filename) ? filename : `${filename}.jpg`;

      formData.append('image', {
        uri: imageUri,
        type: type,
        name: safeName,
      } as any);

      // Append original (uncropped) image if different from cropped
      if (originalImageUri && originalImageUri !== imageUri) {
        const origFilename = originalImageUri.split('/').pop() || 'original.jpg';
        const origType = getMimeType(originalImageUri);
        const safeOrigName = /\.(jpe?g|png|webp|heic|heif)$/i.test(origFilename) ? origFilename : `${origFilename}.jpg`;

        formData.append('originalImage', {
          uri: originalImageUri,
          type: origType,
          name: safeOrigName,
        } as any);
      }

      if (caption) {
        formData.append('caption', caption);
      }

      // Add visibility and topicIds
      formData.append('visibility', visibility);
      if (topicIds.length > 0) {
        formData.append('topicIds', JSON.stringify(topicIds));
      }

      if (locationName) {
        formData.append('locationName', locationName);
      }
      if (locationLat !== undefined) {
        formData.append('locationLat', locationLat.toString());
      }
      if (locationLng !== undefined) {
        formData.append('locationLng', locationLng.toString());
      }
      if (photoTakenAt) {
        formData.append('photoTakenAt', photoTakenAt);
      }

      console.log('Creating post with image:', filename, 'caption:', caption, 'visibility:', visibility, 'topics:', topicIds);

      const response = await this.client.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for image uploads
      });

      return response.data;
    } catch (error: any) {
      console.error('API createPost error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPostStatus(postId: string) {
    const response = await this.client.get(`/posts/${postId}/status`);
    return response.data;
  }

  async getUserPosts(username?: string) {
    const endpoint = username ? `/posts/user/${username}` : '/posts/me/posts';
    const response = await this.client.get(endpoint);
    return response.data;
  }

  // Saved Posts methods
  async getSavedPosts(page: number = 1, limit: number = 20) {
    const response = await this.client.get(`/saved-posts?page=${page}&limit=${limit}`);
    return response.data;
  }

  async savePost(postId: string) {
    const response = await this.client.post(`/posts/${postId}/save`);
    return response.data;
  }

  async unsavePost(postId: string) {
    const response = await this.client.delete(`/posts/${postId}/save`);
    return response.data;
  }

  async checkSavedStatus(postId: string) {
    const response = await this.client.get(`/posts/${postId}/saved`);
    return response.data;
  }

  async getProfile(userId?: string) {
    const endpoint = userId ? `/users/${userId}` : '/users/me';
    const response = await this.client.get(endpoint);
    return response.data;
  }

  async updateProfile(data: { username?: string; bio?: string; avatarUrl?: string }) {
    const response = await this.client.patch('/users/me', data);
    return response.data;
  }

  async uploadProfileImage(imageUri: string) {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const ext = filename.split('.').pop()?.toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await this.client.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // Coins methods
  async getMyCoins() {
    const response = await this.client.get('/coins/me');
    return response.data;
  }

  async claimCooldownCoins() {
    const response = await this.client.post('/coins/claim-cooldown');
    return response.data;
  }

  async giveCoins(data: {
    toUserId: string;
    amount: number;
    message?: string;
    contextType?: string;
    contextId?: string;
  }) {
    const response = await this.client.post('/coins/give', data);
    return response.data;
  }

  async getCoinsHistory(limit: number = 50) {
    const response = await this.client.get(`/coins/history?limit=${limit}`);
    return response.data;
  }

  async getGiveLeaderboard(limit: number = 50) {
    const response = await this.client.get(`/coins/leaderboard?limit=${limit}`);
    return response.data;
  }

  async getGivingActivity(page: number = 1) {
    const response = await this.client.get(`/coins/activity?page=${page}`);
    return response.data;
  }

  async getReceivedCoins(limit: number = 10, collected?: boolean) {
    let url = `/coins/received?limit=${limit}`;
    if (collected !== undefined) {
      url += `&collected=${collected}`;
    }
    const response = await this.client.get(url);
    return response.data;
  }

  async collectCoins(transactionIds: string[]) {
    const response = await this.client.post('/coins/collect', { transactionIds });
    return response.data;
  }

  async getMissions() {
    const response = await this.client.get('/coins/missions');
    return response.data;
  }

  async claimMission(missionId: string) {
    const response = await this.client.post(`/coins/missions/${missionId}/claim`);
    return response.data;
  }

  // Chat methods
  async getConversations() {
    const response = await this.client.get('/messages/conversations');
    return response.data;
  }

  async createConversation(otherUserId: string) {
    const response = await this.client.post('/messages/conversations', { otherUserId });
    return response.data;
  }

  async getMessages(conversationId: string, limit: number = 50, before?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);
    const response = await this.client.get(`/messages/conversations/${conversationId}/messages?${params}`);
    return response.data;
  }

  async sendMessage(conversationId: string, data: {
    messageType: string;
    content?: string;
    mediaUrl?: string;
    sharedPostId?: string;
  }) {
    const response = await this.client.post(`/messages/conversations/${conversationId}/messages`, data);
    return response.data;
  }

  async deleteMessage(messageId: string) {
    const response = await this.client.delete(`/messages/messages/${messageId}`);
    return response.data;
  }

  async searchMessages(query: string, limit: number = 50) {
    const response = await this.client.get(`/messages/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  async blockUser(userId: string, reason?: string) {
    const response = await this.client.post(`/messages/users/${userId}/block`, { reason });
    return response.data;
  }

  async unblockUser(userId: string) {
    const response = await this.client.delete(`/messages/users/${userId}/block`);
    return response.data;
  }

  async getBlockedUsers() {
    const response = await this.client.get('/messages/blocked-users');
    return response.data;
  }

  async getUserOnlineStatus(userId: string) {
    const response = await this.client.get(`/messages/users/${userId}/online-status`);
    return response.data;
  }

  // Image message methods
  async sendImageMessage(formData: FormData) {
    const response = await this.client.post('/messages/messages/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async markImageViewed(messageId: string) {
    const response = await this.client.post(`/messages/messages/${messageId}/viewed`);
    return response.data;
  }

  async getTotalUnreadCount() {
    const response = await this.client.get('/messages/unread-count');
    return response.data;
  }

  // Follow methods
  async followUser(username: string) {
    const response = await this.client.post(`/users/${username}/follow`);
    return response.data;
  }

  async unfollowUser(username: string) {
    const response = await this.client.delete(`/users/${username}/follow`);
    return response.data;
  }

  async checkFollowingStatus(username: string) {
    const response = await this.client.get(`/users/${username}/following-status`);
    return response.data;
  }

  async getFollowers(username: string) {
    const response = await this.client.get(`/users/${username}/followers`);
    return response.data;
  }

  async getFollowing(username: string) {
    const response = await this.client.get(`/users/${username}/following`);
    return response.data;
  }

  // Search users
  async searchUsers(query: string, limit: number = 20, offset: number = 0) {
    const response = await this.client.get(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
    return response.data;
  }

  // Get recommended users
  async getRecommendedUsers(limit: number = 20) {
    const response = await this.client.get(`/users/recommendations?limit=${limit}`);
    return response.data;
  }

  // Privacy settings methods
  async getPrivacySettings() {
    const response = await this.client.get('/users/privacy-settings');
    return response.data;
  }

  async updatePrivacySettings(isPrivate: boolean) {
    const response = await this.client.patch('/users/privacy-settings', { isPrivate });
    return response.data;
  }

  // Follow requests methods
  async getFollowRequests(page: number = 1) {
    const response = await this.client.get(`/users/follow-requests?page=${page}`);
    return response.data;
  }

  async getFollowRequestCount() {
    const response = await this.client.get('/users/follow-requests/count');
    return response.data;
  }

  async acceptFollowRequest(requestId: string) {
    const response = await this.client.post(`/users/follow-requests/${requestId}/accept`);
    return response.data;
  }

  async rejectFollowRequest(requestId: string) {
    const response = await this.client.post(`/users/follow-requests/${requestId}/reject`);
    return response.data;
  }

  async cancelFollowRequest(username: string) {
    const response = await this.client.delete(`/users/follow-requests/${username}`);
    return response.data;
  }

  // Comments methods
  async getPostComments(postId: string, page: number = 1) {
    const response = await this.client.get(`/posts/${postId}/comments?page=${page}`);
    return response.data;
  }

  async createComment(postId: string, content: string, parentCommentId?: string) {
    const response = await this.client.post(`/posts/${postId}/comments`, {
      content,
      parentCommentId: parentCommentId || null
    });
    return response.data;
  }

  async getCommentReplies(commentId: string, page: number = 1) {
    const response = await this.client.get(`/comments/${commentId}/replies?page=${page}`);
    return response.data;
  }

  async deleteComment(commentId: string) {
    const response = await this.client.delete(`/comments/${commentId}`);
    return response.data;
  }

  async updatePost(postId: string, caption: string, imageUri?: string) {
    if (imageUri) {
      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'edited-image.jpg',
      } as any);
      const response = await this.client.put(`/posts/${postId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }
    const response = await this.client.put(`/posts/${postId}`, { caption });
    return response.data;
  }

  async deletePost(postId: string) {
    const response = await this.client.delete(`/posts/${postId}`);
    return response.data;
  }

  async archivePost(postId: string) {
    const response = await this.client.put(`/posts/${postId}/archive`);
    return response.data;
  }

  async unarchivePost(postId: string) {
    const response = await this.client.put(`/posts/${postId}/unarchive`);
    return response.data;
  }

  async getArchivedPosts(page: number = 1) {
    const response = await this.client.get(`/posts/me/posts?archived=true&page=${page}`);
    return response.data;
  }

  // Avatar methods
  async getMyAvatars() {
    const response = await this.client.get('/avatars/me');
    return response.data;
  }

  async getAvatar(avatarId: string) {
    const response = await this.client.get(`/avatars/${avatarId}`);
    return response.data;
  }

  async createAvatar(data: {
    name: string;
    style: 'cartoon' | 'anime' | 'minimalist';
    customizations?: {
      skinTone?: string;
      eyeColor?: string;
      eyeSize?: number;
      hairColor?: string;
      hairStyle?: string;
      gender?: 'male' | 'female' | null;
      faceShape?: string | null;
      facialHair?: string | null;
      eyebrowStyle?: string | null;
      mouthStyle?: string | null;
      noseStyle?: string | null;
      accessories?: {
        glasses?: string | null;
        hat?: string | null;
        earrings?: string | null;
      };
    };
  }) {
    const response = await this.client.post('/avatars', data);
    return response.data;
  }

  async updateAvatar(avatarId: string, data: {
    name?: string;
    style?: 'cartoon' | 'anime' | 'minimalist';
    customizations?: {
      skinTone?: string;
      eyeColor?: string;
      eyeSize?: number;
      hairColor?: string;
      hairStyle?: string;
      gender?: 'male' | 'female' | null;
      faceShape?: string | null;
      facialHair?: string | null;
      eyebrowStyle?: string | null;
      mouthStyle?: string | null;
      noseStyle?: string | null;
      accessories?: {
        glasses?: string | null;
        hat?: string | null;
        earrings?: string | null;
      };
    };
  }) {
    const response = await this.client.put(`/avatars/${avatarId}`, data);
    return response.data;
  }

  async deleteAvatar(avatarId: string) {
    const response = await this.client.delete(`/avatars/${avatarId}`);
    return response.data;
  }

  async activateAvatar(avatarId: string) {
    const response = await this.client.post(`/avatars/${avatarId}/activate`);
    return response.data;
  }

  // Topics/Communities methods
  async getTopics(category?: string, search?: string, type?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    const response = await this.client.get(`/topics?${params.toString()}`);
    return response.data;
  }

  async getTopicCategories() {
    const response = await this.client.get('/topics/categories');
    return response.data;
  }

  async getTopicBySlug(topicSlug: string) {
    const response = await this.client.get(`/topics/${topicSlug}`);
    return response.data;
  }

  async getTopicByInviteCode(inviteCode: string) {
    const response = await this.client.get(`/topics/invite/${inviteCode}`);
    return response.data;
  }

  async createTopic(data: {
    name: string;
    description?: string;
    iconEmoji?: string;
    iconImageUrl?: string;
    category: string;
    adminIds?: string[];
    type?: 'community' | 'private' | 'broadcast';
  }) {
    const response = await this.client.post('/topics', data);
    return response.data;
  }

  async followTopic(topicId: string) {
    const response = await this.client.post(`/topics/${topicId}/follow`);
    return response.data;
  }

  async unfollowTopic(topicId: string) {
    const response = await this.client.delete(`/topics/${topicId}/follow`);
    return response.data;
  }

  async getTopicLeaderboard(topicId: string, type: 'givers' | 'receivers' = 'givers', period: 'weekly' | 'monthly' | 'all_time' = 'weekly') {
    const response = await this.client.get(`/topics/${topicId}/leaderboard?type=${type}&period=${period}`);
    return response.data;
  }

  async getTopicPosts(topicId: string, page: number = 1) {
    const response = await this.client.get(`/topics/${topicId}/posts?page=${page}`);
    return response.data;
  }

  async getTopicBeginners(topicId: string) {
    const response = await this.client.get(`/topics/${topicId}/beginners`);
    return response.data;
  }

  async getTopicShareLinks(topicId: string) {
    const response = await this.client.get(`/topics/${topicId}/share`);
    return response.data;
  }

  async getMyFollowedTopics() {
    // Get all topics and filter to only those the user follows
    const response = await this.client.get('/topics?following=true');
    return response.data;
  }

  async updateTopic(topicId: string, data: {
    name?: string;
    description?: string;
    iconEmoji?: string;
    iconImageUrl?: string;
    coverImageUrl?: string;
  }) {
    const response = await this.client.put(`/topics/${topicId}`, data);
    return response.data;
  }

  async getTopicMembers(topicId: string, page: number = 1, search?: string) {
    const params = new URLSearchParams();
    params.append('limit', '50');
    params.append('offset', String((page - 1) * 50));
    if (search) params.append('search', search);
    const response = await this.client.get(`/topics/${topicId}/members?${params.toString()}`);
    return response.data;
  }

  async uploadTopicCover(formData: FormData) {
    const response = await this.client.post('/upload/topic-cover', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async uploadTopicIcon(formData: FormData) {
    const response = await this.client.post('/upload/topic-icon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getTopicAdmins(topicId: string) {
    const response = await this.client.get(`/topics/${topicId}/admins`);
    return response.data;
  }

  async addTopicAdmin(topicId: string, userId: string) {
    const response = await this.client.post(`/topics/${topicId}/admins`, { userId });
    return response.data;
  }

  async removeTopicAdmin(topicId: string, userId: string) {
    const response = await this.client.delete(`/topics/${topicId}/admins/${userId}`);
    return response.data;
  }

  // Private group methods
  async requestToJoinTopic(topicId: string) {
    const response = await this.client.post(`/topics/${topicId}/request-join`);
    return response.data;
  }

  async getPendingRequests(topicId: string) {
    const response = await this.client.get(`/topics/${topicId}/pending-requests`);
    return response.data;
  }

  async handleMemberRequest(topicId: string, userId: string, action: 'approve' | 'reject') {
    const response = await this.client.post(`/topics/${topicId}/handle-request`, { userId, action });
    return response.data;
  }

  // Broadcaster methods
  async getBroadcasters(topicId: string) {
    const response = await this.client.get(`/topics/${topicId}/broadcasters`);
    return response.data;
  }

  async addBroadcaster(topicId: string, userId: string) {
    const response = await this.client.post(`/topics/${topicId}/broadcasters`, { userId });
    return response.data;
  }

  async removeBroadcaster(topicId: string, userId: string) {
    const response = await this.client.delete(`/topics/${topicId}/broadcasters/${userId}`);
    return response.data;
  }

  // Favorites methods
  async addFavorite(favoriteUserId: string) {
    const response = await this.client.post(`/favorites/${favoriteUserId}`);
    return response.data;
  }

  async removeFavorite(favoriteUserId: string) {
    const response = await this.client.delete(`/favorites/${favoriteUserId}`);
    return response.data;
  }

  async checkFavorite(userId: string) {
    const response = await this.client.get(`/favorites/${userId}/status`);
    return response.data;
  }

  async getMyFavorites() {
    const response = await this.client.get('/favorites');
    return response.data;
  }

  // Medals methods
  async getUserMedals(userId: string) {
    const response = await this.client.get(`/medals/user/${userId}`);
    return response.data;
  }

  async getMyMedals() {
    const response = await this.client.get('/medals/me');
    return response.data;
  }

  // Trust Score methods
  async getTrustScore(userId: string) {
    const response = await this.client.get(`/trust/score/${userId}`);
    return response.data;
  }

  async getTrustConnections(page: number = 1, limit: number = 20, sortBy: 'score' | 'streak' | 'recent' = 'score') {
    const response = await this.client.get(`/trust/connections?page=${page}&limit=${limit}&sortBy=${sortBy}`);
    return response.data;
  }

  async getTrustStats() {
    const response = await this.client.get('/trust/stats');
    return response.data;
  }

  async getFriendshipDetail(userId: string, month?: string) {
    const params = month ? `?month=${month}` : '';
    const response = await this.client.get(`/trust/friendship/${userId}${params}`);
    return response.data;
  }

  // Story of Me methods
  async getMyStories(periodType?: string) {
    const params = periodType ? `?periodType=${periodType}` : '';
    const response = await this.client.get(`/stories/me${params}`);
    return response.data;
  }

  async getUserStories(userId: string, periodType?: string) {
    const params = periodType ? `?periodType=${periodType}` : '';
    const response = await this.client.get(`/stories/user/${userId}${params}`);
    return response.data;
  }

  async getLatestStory(userId: string, periodType?: string) {
    const params = periodType ? `?periodType=${periodType}` : '';
    const response = await this.client.get(`/stories/user/${userId}/latest${params}`);
    return response.data;
  }

  async generateStory(periodType: string = 'weekly') {
    const response = await this.client.post('/stories/generate', { periodType });
    return response.data;
  }

  // Decoration Store methods
  async getDecorationStore(category?: string) {
    const params = category ? `?category=${category}` : '';
    const response = await this.client.get(`/decorations/store${params}`);
    return response.data;
  }

  async getMyDecorations() {
    const response = await this.client.get('/decorations/mine');
    return response.data;
  }

  async purchaseDecoration(decorationId: string) {
    const response = await this.client.post('/decorations/purchase', { decorationId });
    return response.data;
  }

  async getMyActiveDecoration() {
    const response = await this.client.get('/decorations/active');
    return response.data;
  }

  async setActiveDecoration(config: {
    lightBackgroundId?: string | null;
    darkBackgroundId?: string | null;
    frameId?: string | null;
    iconColorId?: string | null;
  }) {
    const response = await this.client.put('/decorations/active', config);
    return response.data;
  }

  async getUserActiveDecoration(userId: string) {
    const response = await this.client.get(`/decorations/user/${userId}/active`);
    return response.data;
  }

  // Corner Icon methods
  async getMyCornerIcons() {
    const response = await this.client.get('/corner-icons/mine');
    return response.data;
  }

  async purchaseCornerIcon(iconFamily: string, iconName: string) {
    const response = await this.client.post('/corner-icons/purchase', { iconFamily, iconName });
    return response.data;
  }

  async placeCornerIcon(position: string, iconFamily: string, iconName: string, color: string) {
    const response = await this.client.put('/corner-icons/place', { position, iconFamily, iconName, color });
    return response.data;
  }

  async removeCornerIcon(position: string) {
    const response = await this.client.delete(`/corner-icons/place/${position}`);
    return response.data;
  }

  async updateCornerIconColor(position: string, color: string) {
    const response = await this.client.patch(`/corner-icons/place/${position}/color`, { color });
    return response.data;
  }

  async getUserCornerIcons(userId: string) {
    const response = await this.client.get(`/corner-icons/user/${userId}`);
    return response.data;
  }

  // Generic HTTP methods for flexibility
  async get(endpoint: string) {
    const response = await this.client.get(endpoint);
    return response;
  }

  async post(endpoint: string, data?: any, config?: any) {
    const response = await this.client.post(endpoint, data, config);
    return response;
  }

  async put(endpoint: string, data?: any) {
    const response = await this.client.put(endpoint, data);
    return response;
  }

  async patch(endpoint: string, data?: any) {
    const response = await this.client.patch(endpoint, data);
    return response;
  }

  async delete(endpoint: string) {
    const response = await this.client.delete(endpoint);
    return response;
  }

  // ===== FRIENDSHIP MEETUP METHODS =====

  async createFriendshipSession(lat?: number, lng?: number) {
    const response = await this.client.post('/friendship-meetup/sessions', { lat, lng });
    return response.data;
  }

  async joinFriendshipSession(code: string, lat?: number, lng?: number) {
    const response = await this.client.post('/friendship-meetup/sessions/join', { code, lat, lng });
    return response.data;
  }

  async getFriendshipSession(sessionId: string) {
    const response = await this.client.get(`/friendship-meetup/sessions/${sessionId}`);
    return response.data;
  }



  async validateFriendshipPose(sessionId: string, photoUri: string, poseName: string, minPeople: number = 2) {
    const formData = new FormData();
    formData.append('image', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'frame.jpg',
    } as any);
    formData.append('poseName', poseName);
    formData.append('minPeople', String(minPeople));

    const response = await this.client.post(
      `/friendship-meetup/sessions/${sessionId}/validate-pose`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 5000 }
    );
    return response.data;
  }

  async submitFriendshipPhoto(sessionId: string, photoUri: string, poseIndex: number, poseName: string) {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: `pose_${poseIndex}.jpg`,
    } as any);
    formData.append('poseIndex', String(poseIndex));
    formData.append('poseName', poseName);

    const response = await this.client.post(
      `/friendship-meetup/sessions/${sessionId}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }

  async getSessionPhotos(sessionId: string) {
    const response = await this.client.get(`/friendship-meetup/sessions/${sessionId}/photos`);
    return response.data;
  }

  async completeFriendshipMeetup(sessionId: string) {
    const response = await this.client.post(`/friendship-meetup/sessions/${sessionId}/complete`);
    return response.data;
  }

  async saveDecoratedStrip(sessionId: string, imageUri: string) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'decorated-strip.jpg',
    } as any);
    const response = await this.client.post(
      `/friendship-meetup/sessions/${sessionId}/decorated-strip`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }

  async cancelFriendshipSession(sessionId: string) {
    const response = await this.client.post(`/friendship-meetup/sessions/${sessionId}/cancel`);
    return response.data;
  }

  async getFriendshipMeetupHistory(page: number = 1, limit: number = 20) {
    const response = await this.client.get(`/friendship-meetup/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  async checkFriendshipDailyLimit(partnerId: string) {
    const response = await this.client.get(`/friendship-meetup/daily-check/${partnerId}`);
    return response.data;
  }
}

export const api = new ApiClient();
