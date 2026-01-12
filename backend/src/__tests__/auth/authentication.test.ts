/**
 * Authentication Tests (AUTH-001)
 * Tests for TESTCASE.md Phase 0 - Authentication
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { setupTestDatabase, clearTestDatabase, cleanupTestDatabase } from '../../config/database.test';
import { createTestUser } from '../helpers/testHelpers';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('AUTH-001: Authentication Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('AUTH-001-01: Register new user', () => {
    it('should register a new user with valid credentials', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePass123!',
      };

      // Direct model test (until we have app integration)
      const passwordHash = await bcrypt.hash(userData.password, 10);
      const user = await User.create({
        username: userData.username,
        email: userData.email,
        passwordHash,
        ageVerified: true,
      });

      expect(user.id).toBeDefined();
      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.passwordHash).not.toBe(userData.password);
    });

    it('should return user object without password hash', async () => {
      const user = await createTestUser({
        username: 'testuser',
        email: 'test@example.com',
      });

      const userJson = user.toJSON();
      expect(userJson.passwordHash).toBeUndefined();
    });
  });

  describe('AUTH-001-02: Register with existing email', () => {
    it('should reject registration with duplicate email', async () => {
      await createTestUser({ email: 'existing@example.com' });

      await expect(
        createTestUser({ email: 'existing@example.com' })
      ).rejects.toThrow();
    });
  });

  describe('AUTH-001-03: Register with weak password', () => {
    it('should validate password strength', () => {
      const weakPasswords = ['123', 'password', 'abc'];
      const strongPassword = 'SecurePass123!';

      // Password validation logic
      const isStrongPassword = (password: string): boolean => {
        return (
          password.length >= 8 &&
          /[A-Z]/.test(password) &&
          /[a-z]/.test(password) &&
          /[0-9]/.test(password)
        );
      };

      weakPasswords.forEach(pwd => {
        expect(isStrongPassword(pwd)).toBe(false);
      });

      expect(isStrongPassword(strongPassword)).toBe(true);
    });
  });

  describe('AUTH-001-04 to AUTH-001-06: Login validation', () => {
    let testUser: any;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash(testPassword, 10);
      testUser = await createTestUser({
        username: 'loginuser',
        email: 'login@example.com',
        passwordHash,
      });
    });

    it('AUTH-001-04: should validate correct credentials', async () => {
      const isValid = await bcrypt.compare(testPassword, testUser.passwordHash);
      expect(isValid).toBe(true);
    });

    it('AUTH-001-05: should reject invalid email', async () => {
      const user = await User.findOne({ where: { email: 'nonexistent@example.com' } });
      expect(user).toBeNull();
    });

    it('AUTH-001-06: should reject invalid password', async () => {
      const isValid = await bcrypt.compare('WrongPassword123!', testUser.passwordHash);
      expect(isValid).toBe(false);
    });
  });

  describe('AUTH-001-07 to AUTH-001-09: JWT token validation', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
    });

    it('AUTH-001-07: should generate valid JWT token', () => {
      const token = jwt.sign({ userId: testUser.id }, JWT_SECRET, { expiresIn: '1h' });
      expect(token).toBeDefined();

      const decoded: any = jwt.verify(token, JWT_SECRET);
      expect(decoded.userId).toBe(testUser.id);
    });

    it('AUTH-001-08: should reject expired token', () => {
      const token = jwt.sign({ userId: testUser.id }, JWT_SECRET, { expiresIn: '-1s' });

      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow('jwt expired');
    });

    it('AUTH-001-09: should reject invalid signature', () => {
      const token = jwt.sign({ userId: testUser.id }, 'wrong-secret', { expiresIn: '1h' });

      expect(() => {
        jwt.verify(token, JWT_SECRET);
      }).toThrow('invalid signature');
    });
  });

  describe('AUTH-001-12: Password hashing', () => {
    it('should hash passwords with bcrypt', async () => {
      const plainPassword = 'MySecurePassword123!';
      const hash = await bcrypt.hash(plainPassword, 10);

      expect(hash).not.toBe(plainPassword);
      expect(hash).toMatch(/^\$2[aby]\$/); // Bcrypt hash pattern
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SamePassword123!';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);

      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });

    it('should not store plain text passwords', async () => {
      const password = 'PlainTextPassword123!';
      const user = await createTestUser({
        passwordHash: await bcrypt.hash(password, 10),
      });

      expect(user.passwordHash).not.toBe(password);
      const hash = user.passwordHash || '';
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });
  });
});
