/**
 * Comment Model Tests (SOCIAL-003)
 * Tests for TESTCASE.md Phase 2 - Social Interactions
 */

import { Comment } from '../../models/Comment';
import { setupTestDatabase, clearTestDatabase, cleanupTestDatabase } from '../../config/database.test';
import { createTestUser, createTestPost } from '../helpers/testHelpers';

describe('SOCIAL-003: Comment Model Tests', () => {
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

  describe('SOCIAL-003-01: Create comment', () => {
    it('should create comment on post', async () => {
      const comment = await Comment.create({
        userId: testUserId,
        postId: testPostId,
        content: 'Great post!',
      });

      expect(comment.id).toBeDefined();
      expect(comment.userId).toBe(testUserId);
      expect(comment.postId).toBe(testPostId);
      expect(comment.content).toBe('Great post!');
      expect(comment.createdAt).toBeDefined();
      expect(comment.updatedAt).toBeDefined();
    });

    it('should create comment with maximum length', async () => {
      const longComment = 'a'.repeat(500);

      const comment = await Comment.create({
        userId: testUserId,
        postId: testPostId,
        content: longComment,
      });

      expect(comment.content).toBe(longComment);
      expect(comment.content.length).toBe(500);
    });
  });

  describe('SOCIAL-003-02: Content validation', () => {
    it('should reject empty comment', async () => {
      await expect(
        Comment.create({
          userId: testUserId,
          postId: testPostId,
          content: '',
        })
      ).rejects.toThrow();
    });

    it('should reject comment exceeding max length', async () => {
      const tooLongComment = 'a'.repeat(501);

      await expect(
        Comment.create({
          userId: testUserId,
          postId: testPostId,
          content: tooLongComment,
        })
      ).rejects.toThrow();
    });

    it('should accept comment at max length boundary', async () => {
      const maxComment = 'a'.repeat(500);

      const comment = await Comment.create({
        userId: testUserId,
        postId: testPostId,
        content: maxComment,
      });

      expect(comment.content.length).toBe(500);
    });
  });

  describe('SOCIAL-003-03: Delete comment', () => {
    it('should delete own comment', async () => {
      const comment = await Comment.create({
        userId: testUserId,
        postId: testPostId,
        content: 'Test comment',
      });

      await comment.destroy();

      const found = await Comment.findByPk(comment.id);
      expect(found).toBeNull();
    });
  });

  describe('SOCIAL-003-04: Get post comments', () => {
    it('should retrieve all comments for a post', async () => {
      const commentContents = ['First!', 'Great work!', 'Amazing!'];

      for (const content of commentContents) {
        await Comment.create({
          userId: testUserId,
          postId: testPostId,
          content,
        });
      }

      const comments = await Comment.findAll({
        where: { postId: testPostId },
        order: [['createdAt', 'ASC']],
      });

      expect(comments.length).toBe(3);
      expect(comments[0].content).toBe('First!');
      expect(comments[1].content).toBe('Great work!');
      expect(comments[2].content).toBe('Amazing!');
    });

    it('should count comments on a post', async () => {
      for (let i = 0; i < 5; i++) {
        await Comment.create({
          userId: testUserId,
          postId: testPostId,
          content: `Comment ${i + 1}`,
        });
      }

      const count = await Comment.count({
        where: { postId: testPostId },
      });

      expect(count).toBe(5);
    });
  });

  describe('SOCIAL-003-05: Get user comments', () => {
    it('should retrieve all comments by a user', async () => {
      // Create multiple posts
      const posts = [];
      for (let i = 0; i < 3; i++) {
        const post = await createTestPost(testUserId);
        posts.push(post);
      }

      // User comments on each post
      for (const post of posts) {
        await Comment.create({
          userId: testUserId,
          postId: post.id,
          content: `Comment on post ${post.id}`,
        });
      }

      const comments = await Comment.findAll({
        where: { userId: testUserId },
      });

      expect(comments.length).toBe(3);
    });
  });

  describe('SOCIAL-003-06: Update comment', () => {
    it('should update comment content', async () => {
      const comment = await Comment.create({
        userId: testUserId,
        postId: testPostId,
        content: 'Original comment',
      });

      const originalUpdatedAt = comment.updatedAt;

      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 100));

      comment.content = 'Updated comment';
      await comment.save();

      expect(comment.content).toBe('Updated comment');
      expect(comment.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Multiple users and posts', () => {
    it('should handle complex comment scenarios', async () => {
      // Create 3 users
      const users = [];
      for (let i = 0; i < 3; i++) {
        const user = await createTestUser();
        users.push(user);
      }

      // Create 2 posts
      const posts = [];
      for (let i = 0; i < 2; i++) {
        const post = await createTestPost(testUserId);
        posts.push(post);
      }

      // Each user comments on each post
      for (const user of users) {
        for (const post of posts) {
          await Comment.create({
            userId: user.id,
            postId: post.id,
            content: `Comment by ${user.username} on post ${post.id}`,
          });
        }
      }

      // Verify total comments
      const totalComments = await Comment.count();
      expect(totalComments).toBe(6); // 3 users × 2 posts

      // Verify comments per post
      const post1Comments = await Comment.count({ where: { postId: posts[0].id } });
      expect(post1Comments).toBe(3);

      // Verify comments per user
      const user1Comments = await Comment.count({ where: { userId: users[0].id } });
      expect(user1Comments).toBe(2);
    });
  });

  describe('Timestamps', () => {
    it('should auto-create timestamps', async () => {
      const comment = await Comment.create({
        userId: testUserId,
        postId: testPostId,
        content: 'Test comment',
      });

      expect(comment.createdAt).toBeDefined();
      expect(comment.updatedAt).toBeDefined();
      expect(comment.createdAt).toBeInstanceOf(Date);
      expect(comment.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Comment ordering', () => {
    it('should retrieve comments in chronological order', async () => {
      const comments = [];
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
        const comment = await Comment.create({
          userId: testUserId,
          postId: testPostId,
          content: `Comment ${i + 1}`,
        });
        comments.push(comment);
      }

      const retrieved = await Comment.findAll({
        where: { postId: testPostId },
        order: [['createdAt', 'ASC']],
      });

      expect(retrieved[0].content).toBe('Comment 1');
      expect(retrieved[1].content).toBe('Comment 2');
      expect(retrieved[2].content).toBe('Comment 3');
    });

    it('should retrieve comments in reverse chronological order', async () => {
      const comments = [];
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
        const comment = await Comment.create({
          userId: testUserId,
          postId: testPostId,
          content: `Comment ${i + 1}`,
        });
        comments.push(comment);
      }

      const retrieved = await Comment.findAll({
        where: { postId: testPostId },
        order: [['createdAt', 'DESC']],
      });

      expect(retrieved[0].content).toBe('Comment 3');
      expect(retrieved[1].content).toBe('Comment 2');
      expect(retrieved[2].content).toBe('Comment 1');
    });
  });
});
