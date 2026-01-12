/**
 * Post Model Tests (POST-001)
 * Tests for TESTCASE.md Phase 2 - Posts
 */

import { Post, PostStatus } from '../../models/Post';
import { setupTestDatabase, clearTestDatabase, cleanupTestDatabase } from '../../config/database.test';
import { createTestUser, createTestPost } from '../helpers/testHelpers';

describe('POST-001: Post Model Tests', () => {
  let testUserId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    const user = await createTestUser();
    testUserId = user.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST-001-01: Create post with image', () => {
    it('should create post with all required fields', async () => {
      const post = await Post.create({
        userId: testUserId,
        originalImageUrl: 'https://example.com/original.jpg',
        processedImageUrl: 'https://example.com/processed.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        caption: 'Test post caption',
        status: PostStatus.COMPLETED,
      });

      expect(post.id).toBeDefined();
      expect(post.userId).toBe(testUserId);
      expect(post.originalImageUrl).toBe('https://example.com/original.jpg');
      expect(post.caption).toBe('Test post caption');
      expect(post.status).toBe(PostStatus.COMPLETED);
      expect(post.likesCount).toBe(0);
      expect(post.commentsCount).toBe(0);
    });
  });

  describe('POST-001-02: Create post without caption', () => {
    it('should allow post creation without caption', async () => {
      const post = await Post.create({
        userId: testUserId,
        originalImageUrl: 'https://example.com/original.jpg',
        processedImageUrl: 'https://example.com/processed.jpg',
        status: PostStatus.COMPLETED,
      });

      expect(post.id).toBeDefined();
      expect(post.caption).toBeNull();
    });
  });

  describe('POST-001-07: Caption length validation', () => {
    it('should reject caption longer than 2200 characters', async () => {
      const longCaption = 'a'.repeat(2201);

      await expect(
        Post.create({
          userId: testUserId,
          originalImageUrl: 'https://example.com/original.jpg',
          status: PostStatus.PROCESSING,
          caption: longCaption,
        })
      ).rejects.toThrow();
    });

    it('should accept caption with 2200 or fewer characters', async () => {
      const validCaption = 'a'.repeat(2200);

      const post = await Post.create({
        userId: testUserId,
        originalImageUrl: 'https://example.com/original.jpg',
        status: PostStatus.PROCESSING,
        caption: validCaption,
      });

      expect(post.caption).toBe(validCaption);
    });
  });

  describe('POST-001-10: Post status is processing', () => {
    it('should set initial status to processing', async () => {
      const post = await Post.create({
        userId: testUserId,
        originalImageUrl: 'https://example.com/original.jpg',
        status: PostStatus.PROCESSING,
      });

      expect(post.status).toBe(PostStatus.PROCESSING);
    });

    it('should update status to completed', async () => {
      const post = await createTestPost(testUserId, {
        status: PostStatus.PROCESSING,
      });

      post.status = PostStatus.COMPLETED;
      post.processedImageUrl = 'https://example.com/processed.jpg';
      await post.save();

      expect(post.status).toBe(PostStatus.COMPLETED);
    });

    it('should handle failed status', async () => {
      const post = await createTestPost(testUserId, {
        status: PostStatus.PROCESSING,
      });

      post.status = PostStatus.FAILED;
      post.processingError = 'Test error message';
      await post.save();

      expect(post.status).toBe(PostStatus.FAILED);
      expect(post.processingError).toBe('Test error message');
    });
  });

  describe('POST-001-12: Image dimensions stored', () => {
    it('should store image dimensions', async () => {
      const post = await Post.create({
        userId: testUserId,
        originalImageUrl: 'https://example.com/original.jpg',
        status: PostStatus.COMPLETED,
        imageWidth: 1920,
        imageHeight: 1080,
      });

      expect(post.imageWidth).toBe(1920);
      expect(post.imageHeight).toBe(1080);
    });
  });

  describe('Post counters', () => {
    it('should initialize counters to zero', async () => {
      const post = await createTestPost(testUserId);

      expect(post.likesCount).toBe(0);
      expect(post.commentsCount).toBe(0);
    });

    it('should increment likesCount', async () => {
      const post = await createTestPost(testUserId);

      post.likesCount += 1;
      await post.save();

      expect(post.likesCount).toBe(1);
    });

    it('should increment commentsCount', async () => {
      const post = await createTestPost(testUserId);

      post.commentsCount += 1;
      await post.save();

      expect(post.commentsCount).toBe(1);
    });
  });

  describe('Post timestamps', () => {
    it('should auto-create timestamps', async () => {
      const post = await createTestPost(testUserId);

      expect(post.createdAt).toBeDefined();
      expect(post.updatedAt).toBeDefined();
      expect(post.createdAt).toBeInstanceOf(Date);
    });
  });
});
