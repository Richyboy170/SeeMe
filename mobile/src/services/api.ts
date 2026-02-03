import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

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
        const token = await AsyncStorage.getItem('auth_token');
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
          // Check if it's an invalid/expired token error or user not found
          if (
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

    if (response.data.token) {
      await AsyncStorage.setItem('auth_token', response.data.token);
    }

    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });

    if (response.data.token) {
      await AsyncStorage.setItem('auth_token', response.data.token);
    }

    return response.data;
  }

  async logout() {
    await AsyncStorage.removeItem('auth_token');
  }

  async googleSignIn(idToken: string) {
    const response = await this.client.post('/auth/google', {
      idToken,
    });

    if (response.data.token) {
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
    topicIds: string[] = []
  ) {
    try {
      const formData = new FormData();

      // Create file object for the image
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        type: type,
        name: filename,
      } as any);

      if (caption) {
        formData.append('caption', caption);
      }

      // Add visibility and topicIds (Phase 3.3)
      formData.append('visibility', visibility);
      if (topicIds.length > 0) {
        formData.append('topicIds', JSON.stringify(topicIds));
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

  async getReceivedCoins(limit: number = 10) {
    const response = await this.client.get(`/coins/received?limit=${limit}`);
    return response.data;
  }

  // Chat methods
  async getConversations() {
    const response = await this.client.get('/chat/conversations');
    return response.data;
  }

  async createConversation(otherUserId: string) {
    const response = await this.client.post('/chat/conversations', { otherUserId });
    return response.data;
  }

  async getMessages(conversationId: string, limit: number = 50, before?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);
    const response = await this.client.get(`/chat/conversations/${conversationId}/messages?${params}`);
    return response.data;
  }

  async sendMessage(conversationId: string, data: {
    messageType: string;
    content?: string;
    mediaUrl?: string;
    sharedPostId?: string;
  }) {
    const response = await this.client.post(`/chat/conversations/${conversationId}/messages`, data);
    return response.data;
  }

  async deleteMessage(messageId: string) {
    const response = await this.client.delete(`/chat/messages/${messageId}`);
    return response.data;
  }

  async searchMessages(query: string, limit: number = 50) {
    const response = await this.client.get(`/chat/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  async blockUser(userId: string, reason?: string) {
    const response = await this.client.post(`/chat/users/${userId}/block`, { reason });
    return response.data;
  }

  async unblockUser(userId: string) {
    const response = await this.client.delete(`/chat/users/${userId}/block`);
    return response.data;
  }

  async getBlockedUsers() {
    const response = await this.client.get('/chat/blocked-users');
    return response.data;
  }

  async getUserOnlineStatus(userId: string) {
    const response = await this.client.get(`/chat/users/${userId}/online-status`);
    return response.data;
  }

  // Image message methods
  async sendImageMessage(formData: FormData) {
    const response = await this.client.post('/chat/messages/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async markImageViewed(messageId: string) {
    const response = await this.client.post(`/chat/messages/${messageId}/viewed`);
    return response.data;
  }

  async getTotalUnreadCount() {
    const response = await this.client.get('/chat/unread-count');
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
  async getTopics(category?: string, search?: string) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
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
    category: string;
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
}

export const api = new ApiClient();
