/**
 * Authentication API Endpoint Tests
 * Tests for TESTCASE.md Phase 0 - API Endpoints
 */

import request from 'supertest';
import app from '../../app';
import { setupTestDatabase, clearTestDatabase, cleanupTestDatabase } from '../../config/database.test';
import { createTestUser } from '../helpers/testHelpers';
import bcrypt from 'bcrypt';

describe('API: Authentication Endpoints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('newuser');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject registration with missing fields', async () => {
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

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: '123',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with duplicate username', async () => {
      await createTestUser({ username: 'existinguser', email: 'user1@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'user2@example.com',
          password: 'SecurePassword123!',
        })
        .expect('Content-Type', /json/);

      expect([400, 409, 500]).toContain(response.status);
    });
  });

  describe('POST /api/auth/login', () => {
    const testPassword = 'TestPassword123!';
    let testUser: any;

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash(testPassword, 10);
      testUser = await createTestUser({
        username: 'loginuser',
        email: 'login@example.com',
        passwordHash,
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: testPassword,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          // missing password
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const user = await createTestUser();
      const token = 'Bearer ' + require('jsonwebtoken').sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', token)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.id).toBe(user.id);
      expect(response.body.username).toBe(user.username);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject request with expired token', async () => {
      const user = await createTestUser();
      const expiredToken = 'Bearer ' + require('jsonwebtoken').sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1s' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', expiredToken)
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });
});
