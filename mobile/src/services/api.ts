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
          // Check if it's an invalid/expired token error
          if (errorData?.error?.includes('token') || errorData?.error?.includes('Token')) {
            // Clear token and force re-login
            await AsyncStorage.removeItem('auth_token');
            console.log('Token invalid/expired - cleared auth token. Please log in again.');
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

  // Placeholder methods for future use
  async getFeed(page: number = 1) {
    const response = await this.client.get(`/feed?page=${page}`);
    return response.data;
  }

  async createPost(imageUri: string, caption: string) {
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

      console.log('Creating post with image:', filename, 'caption:', caption);

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

  // Generic HTTP methods for flexibility
  async get(endpoint: string) {
    const response = await this.client.get(endpoint);
    return response;
  }

  async post(endpoint: string, data?: any) {
    const response = await this.client.post(endpoint, data);
    return response;
  }

  async put(endpoint: string, data?: any) {
    const response = await this.client.put(endpoint, data);
    return response;
  }

  async delete(endpoint: string) {
    const response = await this.client.delete(endpoint);
    return response;
  }
}

export const api = new ApiClient();
