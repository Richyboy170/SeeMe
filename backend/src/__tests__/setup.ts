/**
 * Jest Test Setup
 * Runs before all tests to set up the test environment
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  console.log('🧪 Starting test suite...');
});

// Global test cleanup
afterAll(async () => {
  console.log('✅ Test suite completed');
});
