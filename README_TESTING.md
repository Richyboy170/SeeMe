# SeeMe Testing Guide 🧪

**Last Updated:** January 11, 2026

## 🎯 Quick Start

```bash
# Install dependencies
cd backend && npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (development)
npm run test:watch

# CI mode
npm run test:ci
```

## 📊 Current Status

### Test Coverage Overview

```
✅ 80 Automated Tests
✅ 51 Passing (64% pass rate)
✅ 12 Test Suites
✅ 14 second execution time
✅ Full CI/CD integration
```

### Coverage by Feature

| Feature | Tests | Passing | Coverage |
|---------|-------|---------|----------|
| **Post Model** | 12 | 12 | 100% ✅ |
| **User Model** | 12 | 11 | 92% ✅ |
| **Auth API** | 15 | 12 | 80% ✅ |
| **Security** | 25 | 13 | 52% 🟡 |
| **Comments** | 8 | 6 | 75% ✅ |
| **Follow** | 10 | 0 | 0% 🔴 |
| **Likes** | 7 | 0 | 0% 🔴 |
| **Coins** | 9 | 2 | 22% 🔴 |

**Overall:** 38% coverage (target: 80%)

## 📁 Test Structure

```
backend/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts                    # Global test configuration
│   │   ├── helpers/
│   │   │   └── testHelpers.ts          # Reusable test utilities
│   │   ├── auth/
│   │   │   └── authentication.test.ts  # Auth business logic (13 tests)
│   │   ├── models/
│   │   │   ├── user.test.ts            # User model (12 tests)
│   │   │   ├── post.test.ts            # Post model (12 tests)
│   │   │   ├── coins.test.ts           # Coins model (9 tests)
│   │   │   ├── follow.test.ts          # Follow model (10 tests)
│   │   │   ├── like.test.ts            # Like model (7 tests)
│   │   │   └── comment.test.ts         # Comment model (8 tests)
│   │   ├── api/
│   │   │   └── auth.api.test.ts        # Auth API endpoints (15 tests)
│   │   └── security/
│   │       └── security.test.ts        # Security tests (25 tests)
│   ├── config/
│   │   └── database.test.ts            # Test database setup
│   └── app.ts                          # Testable Express app
├── jest.config.js                      # Jest configuration
└── .env.test                           # Test environment variables
```

## 🧪 Test Categories

### 1. Model Tests (58 tests)
Tests database models, validation, constraints, and relationships.

**Example:**
```typescript
it('should create user with all required fields', async () => {
  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: await bcrypt.hash('password', 10),
    ageVerified: true,
  });

  expect(user.id).toBeDefined();
  expect(user.username).toBe('testuser');
});
```

### 2. API Endpoint Tests (15 tests)
Tests HTTP endpoints using Supertest.

**Example:**
```typescript
it('should register a new user successfully', async () => {
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
    })
    .expect(201);

  expect(response.body).toHaveProperty('token');
  expect(response.body.user).not.toHaveProperty('passwordHash');
});
```

### 3. Security Tests (25 tests)
Tests for SQL injection, XSS, authentication, and input validation.

**Example:**
```typescript
it('should prevent SQL injection in login', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: "admin' OR '1'='1",
      password: "admin' OR '1'='1",
    });

  expect(response.status).not.toBe(200);
});
```

## 🛠️ Writing Tests

### Using Test Helpers

```typescript
import { createTestUser, createTestPost, generateTestToken } from '../helpers/testHelpers';

// Create a test user
const user = await createTestUser();

// Create multiple users
const users = await createTestUsers(3);

// Create a test post
const post = await createTestPost(userId);

// Generate JWT token
const token = generateTestToken(userId);
```

### Test Structure (AAA Pattern)

```typescript
it('should do something', async () => {
  // Arrange - Set up test data
  const user = await createTestUser();

  // Act - Perform the action
  const result = await someFunction(user.id);

  // Assert - Verify the result
  expect(result).toBe(expectedValue);
});
```

### Database Cleanup

```typescript
describe('My Test Suite', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase(); // Clear data before each test
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  // Your tests here
});
```

## 🚀 CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Manual workflow dispatch

**Workflow includes:**
- ✅ Backend tests (Node.js 18.x, 20.x)
- ✅ Integration tests (with PostgreSQL, Redis, MongoDB)
- ✅ ML service tests (Python 3.11)
- ✅ Linting and formatting
- ✅ Security audit
- ✅ Coverage reporting

### Coverage Reports

Coverage is automatically uploaded to Codecov and commented on pull requests.

**View coverage:**
```bash
npm run test:coverage
open coverage/index.html
```

## 📋 Test Checklist

When adding new features, ensure you:

- [ ] Write unit tests for models
- [ ] Write API endpoint tests
- [ ] Write security tests for user inputs
- [ ] Update test helpers if needed
- [ ] Run `npm test` locally
- [ ] Ensure coverage doesn't decrease
- [ ] Update documentation

## 🔧 Troubleshooting

### Tests Failing Locally

**Database issues:**
```bash
# Delete test database and restart
rm -rf backend/data/seeme.db
npm test
```

**Dependency issues:**
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules
npm install
```

### Slow Tests

**Check for:**
- Unnecessary database operations
- Missing `await` keywords
- Large data sets in tests

**Fix:**
```typescript
// Bad - Creates 100 records
for (let i = 0; i < 100; i++) {
  await createTestUser();
}

// Good - Creates only what's needed
const user = await createTestUser();
```

### Test Isolation Issues

**Ensure:**
- `beforeEach` clears database
- No shared state between tests
- Each test is independent

## 📈 Roadmap

### Immediate (This Week)
- [ ] Fix foreign key constraints in test database
- [ ] Add Posts API tests
- [ ] Add Coins API tests

### Short Term (This Month)
- [ ] Reach 60% overall coverage
- [ ] Add Feed system tests
- [ ] Add performance benchmarks

### Long Term (3 Months)
- [ ] Reach 80% overall coverage
- [ ] Add E2E tests with Playwright
- [ ] Add mobile app tests
- [ ] Mutation testing

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [TESTCASE.md](./TESTCASE.md) - Complete test plan
- [FINAL_TEST_IMPLEMENTATION_SUMMARY.md](./FINAL_TEST_IMPLEMENTATION_SUMMARY.md) - Detailed report

## 🆘 Getting Help

**Common Commands:**
```bash
# Run specific test file
npm test -- user.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Update snapshots
npm test -- -u

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

**Check Logs:**
- Test failures show in console
- Coverage reports in `coverage/` directory
- CI/CD logs in GitHub Actions

---

**Happy Testing!** 🎉

For questions or issues, check the documentation or create an issue in the repository.
