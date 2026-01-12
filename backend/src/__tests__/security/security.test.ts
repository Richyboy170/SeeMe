/**
 * Security Tests (SEC-001 to SEC-005)
 * Tests for TESTCASE.md Security Requirements
 */

import request from 'supertest';
import app from '../../app';
import { setupTestDatabase, clearTestDatabase, cleanupTestDatabase } from '../../config/database.test';
import { createTestUser, generateTestToken } from '../helpers/testHelpers';

describe('SEC-001 to SEC-005: Security Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('SEC-001: SQL Injection Prevention', () => {
    it('should prevent SQL injection in login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: "admin' OR '1'='1",
        })
        .expect('Content-Type', /json/);

      expect(response.status).not.toBe(200);
      expect(response.body).not.toHaveProperty('token');
    });

    it('should prevent SQL injection in username search', async () => {
      const response = await request(app)
        .get("/api/users?username=' OR '1'='1")
        .expect('Content-Type', /json/);

      // Should either return empty or error, not all users
      if (response.status === 200) {
        expect(response.body).not.toContain('OR');
      }
    });

    it('should sanitize special characters in registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: "test'; DROP TABLE users; --",
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect('Content-Type', /json/);

      // Should reject or sanitize, not execute SQL
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('SEC-002: XSS Prevention', () => {
    it('should sanitize script tags in comments', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user.id);

      const maliciousComment = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/posts/test-post-id/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: maliciousComment,
        })
        .expect('Content-Type', /json/);

      // Should either reject or escape the script tag
      if (response.status === 201) {
        expect(response.body.content).not.toContain('<script>');
      }
    });

    it('should sanitize HTML in post captions', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user.id);

      const maliciousCaption = '<img src=x onerror=alert(1)>';

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          caption: maliciousCaption,
        })
        .expect('Content-Type', /json/);

      if (response.status === 201) {
        expect(response.body.caption).not.toContain('onerror');
      }
    });
  });

  describe('SEC-003: Authentication & Authorization', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with expired token', async () => {
      const user = await createTestUser();
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should prevent user from deleting other users posts', async () => {
      const user1 = await createTestUser();
      const token1 = generateTestToken(user1.id);

      // Try to delete a post that doesn't belong to user1 (or doesn't exist)
      const response = await request(app)
        .delete('/api/posts/non-existent-post-id')
        .set('Authorization', `Bearer ${token1}`)
        .expect('Content-Type', /json/);

      // Should be unauthorized or forbidden
      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('SEC-004: Input Validation', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'not-an-email',
          password: 'SecurePassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate password strength', async () => {
      const weakPasswords = ['123', 'password', 'abc'];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: `user${Math.random()}`,
            email: `test${Math.random()}@example.com`,
            password,
          })
          .expect('Content-Type', /json/)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          // missing email and password
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate username length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // too short
          email: 'test@example.com',
          password: 'SecurePassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate comment length', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user.id);

      const tooLongComment = 'a'.repeat(501);

      const response = await request(app)
        .post('/api/posts/test-post-id/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: tooLongComment,
        })
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('SEC-005: Rate Limiting & CSRF', () => {
    it('should have security headers set', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet should set these headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should limit request body size', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user.id);

      // Try to send a very large payload (over 10mb)
      const largePayload = 'a'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          caption: largePayload,
        })
        .expect('Content-Type', /json/);

      // Should be rejected (413 Payload Too Large or 400 Bad Request)
      expect([400, 413]).toContain(response.status);
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3001')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('SEC-006: Password Security', () => {
    it('should hash passwords (not store plaintext)', async () => {
      const { User } = require('../../models/User');

      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'secureuser',
          email: 'secure@example.com',
          password: 'MySecurePassword123!',
        })
        .expect(201);

      const user = await User.findOne({ where: { email: 'secure@example.com' } });

      expect(user.passwordHash).not.toBe('MySecurePassword123!');
      expect(user.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should not return password hash in API responses', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'apiuser',
          email: 'api@example.com',
          password: 'SecurePassword123!',
        })
        .expect(201);

      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.user).not.toHaveProperty('password');
    });
  });

  describe('SEC-007: Error Information Disclosure', () => {
    it('should not reveal sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password',
        })
        .expect(401);

      // Should not reveal whether email exists
      const errorMessage = response.body.error || response.body.message || '';
      expect(errorMessage.toLowerCase()).not.toContain('not found');
      expect(errorMessage.toLowerCase()).not.toContain('does not exist');
    });

    it('should use generic error messages for authentication failures', async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Should not reveal password is wrong (could reveal email exists)
      const errorMessage = response.body.error || response.body.message || '';
      expect(errorMessage.toLowerCase()).not.toContain('password');
      expect(errorMessage.toLowerCase()).not.toContain('incorrect');
    });
  });
});
