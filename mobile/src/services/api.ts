import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__
  ? 'http://localhost:3000/api'  // Development
  : 'https://api.seeme.app/api';   // Production

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
        if (error.response?.status === 401) {
          // Unauthorized: Clear token and redirect to login
          await AsyncStorage.removeItem('auth_token');
          // Trigger navigation to login (implement with navigation ref)
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

  // Placeholder methods for future use
  async getFeed(page: number = 1) {
    const response = await this.client.get(`/feed?page=${page}`);
    return response.data;
  }

  async createPost(imageUri: string, caption: string) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    formData.append('caption', caption);

    const response = await this.client.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async getPostStatus(postId: string) {
    const response = await this.client.get(`/posts/${postId}/status`);
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
}

export const api = new ApiClient();
