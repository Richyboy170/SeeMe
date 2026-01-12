/**
 * Test Helper Functions
 * Reusable utilities for tests
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { Post, PostStatus } from '../../models/Post';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

/**
 * Create a test user
 */
export const createTestUser = async (overrides?: any) => {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits to keep it short
  const defaults = {
    username: `testuser${timestamp}`,
    email: `test${timestamp}@example.com`,
    passwordHash: await bcrypt.hash('TestPassword123!', 10),
    ageVerified: true,
  };

  const userData = { ...defaults, ...overrides };
  return await User.create(userData);
};

/**
 * Create multiple test users
 */
export const createTestUsers = async (count: number) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const timestamp = Date.now().toString().slice(-6);
    const user = await createTestUser({
      username: `testuser${i}${timestamp}`,
      email: `test${i}${timestamp}@example.com`,
    });
    users.push(user);
  }
  return users;
};

/**
 * Generate JWT token for a user
 */
export const generateTestToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Create a test post
 */
export const createTestPost = async (userId: string, overrides?: any) => {
  const defaults = {
    userId,
    originalImageUrl: 'https://example.com/original.jpg',
    processedImageUrl: 'https://example.com/processed.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    caption: 'Test post caption',
    status: PostStatus.COMPLETED,
    likesCount: 0,
    commentsCount: 0,
  };

  const postData = { ...defaults, ...overrides };
  return await Post.create(postData);
};

/**
 * Create multiple test posts
 */
export const createTestPosts = async (userId: string, count: number) => {
  const posts = [];
  for (let i = 0; i < count; i++) {
    const post = await createTestPost(userId, {
      caption: `Test post ${i}`,
    });
    posts.push(post);
  }
  return posts;
};

/**
 * Wait for a specified time (for async tests)
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Clean up test data
 */
export const cleanupTestData = async () => {
  // Order matters due to foreign key constraints
  await Post.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
};
