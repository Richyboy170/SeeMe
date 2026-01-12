/**
 * Like Model Tests (SOCIAL-002)
 * Tests for TESTCASE.md Phase 2 - Social Interactions
 */

import { Like } from '../../models/Like';
import { setupTestDatabase, clearTestDatabase, cleanupTestDatabase } from '../../config/database.test';
import { createTestUser, createTestPost } from '../helpers/testHelpers';

describe('SOCIAL-002: Like Model Tests', () => {
  let testUserId: string;
  let testPostId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    const user = await createTestUser();
    testUserId = user.id;
    const post = await createTestPost(testUserId);
    testPostId = post.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('SOCIAL-002-01: Create like', () => {
    it('should create like on post', async () => {
      const like = await Like.create({
        userId: testUserId,
        postId: testPostId,
      });

      expect(like.id).toBeDefined();
      expect(like.userId).toBe(testUserId);
      expect(like.postId).toBe(testPostId);
      expect(like.createdAt).toBeDefined();
    });
  });

  describe('SOCIAL-002-02: Unique like constraint', () => {
    it('should prevent duplicate likes on same post', async () => {
      await Like.create({
        userId: testUserId,
        postId: testPostId,
      });

      // Attempt duplicate like
      await expect(
        Like.create({
          userId: testUserId,
          postId: testPostId,
        })
      ).rejects.toThrow();
    });
  });

  describe('SOCIAL-002-03: Unlike', () => {
    it('should delete like', async () => {
      const like = await Like.create({
        userId: testUserId,
        postId: testPostId,
      });

      await like.destroy();

      const found = await Like.findByPk(like.id);
      expect(found).toBeNull();
    });
  });

  describe('SOCIAL-002-04: Get post likes', () => {
    it('should retrieve all likes for a post', async () => {
      const users = [];
      for (let i = 0; i < 3; i++) {
        const user = await createTestUser();
        users.push(user);
        await Like.create({
          userId: user.id,
          postId: testPostId,
        });
      }

      const likes = await Like.findAll({
        where: { postId: testPostId },
      });

      expect(likes.length).toBe(3);
    });

    it('should count likes on a post', async () => {
      for (let i = 0; i < 5; i++) {
        const user = await createTestUser();
        await Like.create({
          userId: user.id,
          postId: testPostId,
        });
      }

      const count = await Like.count({
        where: { postId: testPostId },
      });

      expect(count).toBe(5);
    });
  });

  describe('SOCIAL-002-05: Get user likes', () => {
    it('should retrieve all posts liked by a user', async () => {
      const posts = [];
      for (let i = 0; i < 3; i++) {
        const post = await createTestPost(testUserId);
        posts.push(post);
        await Like.create({
          userId: testUserId,
          postId: post.id,
        });
      }

      const likes = await Like.findAll({
        where: { userId: testUserId },
      });

      expect(likes.length).toBe(3);
    });
  });

  describe('SOCIAL-002-06: Check if user liked post', () => {
    it('should return true if user liked post', async () => {
      await Like.create({
        userId: testUserId,
        postId: testPostId,
      });

      const like = await Like.findOne({
        where: {
          userId: testUserId,
          postId: testPostId,
        },
      });

      expect(like).not.toBeNull();
    });

    it('should return null if user has not liked post', async () => {
      const like = await Like.findOne({
        where: {
          userId: testUserId,
          postId: testPostId,
        },
      });

      expect(like).toBeNull();
    });
  });

  describe('Multiple posts and users', () => {
    it('should handle complex like scenarios', async () => {
      // Create 3 users and 3 posts
      const users = [];
      const posts = [];

      for (let i = 0; i < 3; i++) {
        const user = await createTestUser();
        users.push(user);
        const post = await createTestPost(user.id);
        posts.push(post);
      }

      // Each user likes each post
      for (const user of users) {
        for (const post of posts) {
          await Like.create({
            userId: user.id,
            postId: post.id,
          });
        }
      }

      // Verify total likes
      const totalLikes = await Like.count();
      expect(totalLikes).toBe(9); // 3 users × 3 posts

      // Verify likes per post
      const post1Likes = await Like.count({ where: { postId: posts[0].id } });
      expect(post1Likes).toBe(3);

      // Verify likes per user
      const user1Likes = await Like.count({ where: { userId: users[0].id } });
      expect(user1Likes).toBe(3);
    });
  });

  describe('Timestamps', () => {
    it('should auto-create createdAt timestamp', async () => {
      const like = await Like.create({
        userId: testUserId,
        postId: testPostId,
      });

      expect(like.createdAt).toBeDefined();
      expect(like.createdAt).toBeInstanceOf(Date);
    });
  });
});
