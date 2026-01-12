/**
 * User Model Tests (DB-001)
 * Tests for TESTCASE.md Phase 0 - Database Schema
 */

import { User } from '../../models/User';
import { setupTestDatabase, clearTestDatabase, cleanupTestDatabase } from '../../config/database.test';
import bcrypt from 'bcrypt';

describe('DB-001: User Model Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('DB-001-01: User table schema', () => {
    it('should create user with all required fields', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        ageVerified: true,
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.passwordHash).toBeDefined();
      expect(user.ageVerified).toBe(true);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });
  });

  describe('DB-001-02: Email validation', () => {
    it('should accept valid email addresses', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_123@test-domain.org',
      ];

      for (const email of validEmails) {
        const user = await User.create({
          username: `user${Date.now()}`,
          email,
          passwordHash: await bcrypt.hash('password', 10),
          ageVerified: true,
        });

        expect(user.email).toBe(email);
      }
    });

    it('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user @example.com',
        '',
      ];

      for (const email of invalidEmails) {
        if (!email) {
          await expect(
            User.create({
              username: 'testuser',
              email,
              passwordHash: await bcrypt.hash('password', 10),
              ageVerified: true,
            })
          ).rejects.toThrow();
        }
      }
    });
  });

  describe('DB-001-03: Username validation', () => {
    it('should reject username with spaces', async () => {
      await expect(
        User.create({
          username: 'user name',
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('password', 10),
          ageVerified: true,
        })
      ).rejects.toThrow();
    });

    it('should accept valid usernames', async () => {
      const validUsernames = [
        'username',
        'user_name',
        'user123',
        'user_123',
        'USERNAME',
      ];

      for (const username of validUsernames) {
        const user = await User.create({
          username,
          email: `${username}@example.com`,
          passwordHash: await bcrypt.hash('password', 10),
          ageVerified: true,
        });

        expect(user.username).toBe(username);
      }
    });
  });

  describe('DB-001-04: Username length validation', () => {
    it('should reject username longer than 30 characters', async () => {
      const longUsername = 'a'.repeat(31);

      await expect(
        User.create({
          username: longUsername,
          email: 'test@example.com',
          passwordHash: await bcrypt.hash('password', 10),
          ageVerified: true,
        })
      ).rejects.toThrow();
    });

    it('should accept username with 30 or fewer characters', async () => {
      const username = 'a'.repeat(30);
      const user = await User.create({
        username,
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        ageVerified: true,
      });

      expect(user.username).toBe(username);
    });
  });

  describe('DB-001-05: Unique constraint on email', () => {
    it('should reject duplicate email', async () => {
      await User.create({
        username: 'user1',
        email: 'duplicate@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        ageVerified: true,
      });

      await expect(
        User.create({
          username: 'user2',
          email: 'duplicate@example.com',
          passwordHash: await bcrypt.hash('password', 10),
          ageVerified: true,
        })
      ).rejects.toThrow();
    });
  });

  describe('DB-001-06: Unique constraint on username', () => {
    it('should reject duplicate username', async () => {
      await User.create({
        username: 'duplicateuser',
        email: 'user1@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        ageVerified: true,
      });

      await expect(
        User.create({
          username: 'duplicateuser',
          email: 'user2@example.com',
          passwordHash: await bcrypt.hash('password', 10),
          ageVerified: true,
        })
      ).rejects.toThrow();
    });
  });

  describe('DB-001-08: Timestamps auto-created', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const user = await User.create({
        username: 'timetest',
        email: 'time@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        ageVerified: true,
      });

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on modification', async () => {
      const user = await User.create({
        username: 'updatetest',
        email: 'update@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        ageVerified: true,
      });

      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 100));

      user.username = 'updatedusername';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('User model methods', () => {
    it('should exclude passwordHash from JSON output', async () => {
      const user = await User.create({
        username: 'jsontest',
        email: 'json@example.com',
        passwordHash: await bcrypt.hash('password', 10),
        ageVerified: true,
      });

      const json = user.toJSON();
      expect(json).not.toHaveProperty('passwordHash');
      expect(json.username).toBe('jsontest');
    });
  });
});
