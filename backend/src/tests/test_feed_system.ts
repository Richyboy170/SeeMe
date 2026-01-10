/**
 * Feed System Test Script
 * Tests the feed generation, pagination, and caching functionality
 *
 * This script validates WORKSTREAM 2.2: FEED SYSTEM implementation
 */

import dotenv from 'dotenv';
import { connectPostgreSQL, disconnectPostgreSQL } from '../config/database';
import { connectRedis, disconnectRedis } from '../config/redis';
import { logger } from '../utils/logger';
import { User } from '../models/User';
import { Post, PostStatus } from '../models/Post';
import { Follow } from '../models/Follow';
import { FeedController } from '../controllers/FeedController';
import { setupAssociations } from '../models/associations';
import bcrypt from 'bcrypt';

dotenv.config();

/**
 * Test data setup
 */
async function setupTestData() {
  logger.info('Setting up test data...');

  // Create test users
  const users = await Promise.all([
    User.create({
      username: 'alice',
      email: 'alice@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      ageVerified: true
    }),
    User.create({
      username: 'bob',
      email: 'bob@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      ageVerified: true
    }),
    User.create({
      username: 'charlie',
      email: 'charlie@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      ageVerified: true
    })
  ]);

  logger.info(`Created ${users.length} test users`);

  // Create test posts for each user
  const posts = [];
  for (const user of users) {
    for (let i = 1; i <= 5; i++) {
      const post = await Post.create({
        userId: user.id,
        originalImageUrl: `https://example.com/original/${user.username}_${i}.jpg`,
        processedImageUrl: `https://example.com/processed/${user.username}_${i}.jpg`,
        thumbnailUrl: `https://example.com/thumb/${user.username}_${i}.jpg`,
        caption: `Post ${i} by ${user.username}`,
        status: PostStatus.COMPLETED,
        likesCount: Math.floor(Math.random() * 100),
        commentsCount: Math.floor(Math.random() * 20)
      });
      posts.push(post);
    }
  }

  logger.info(`Created ${posts.length} test posts`);

  // Create follow relationships
  // Alice follows Bob and Charlie
  await Follow.create({
    followerId: users[0].id,
    followingId: users[1].id
  });
  await Follow.create({
    followerId: users[0].id,
    followingId: users[2].id
  });

  // Bob follows Charlie
  await Follow.create({
    followerId: users[1].id,
    followingId: users[2].id
  });

  logger.info('Created follow relationships');

  return { users, posts };
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  logger.info('Cleaning up test data...');

  await Follow.destroy({ where: {} });
  await Post.destroy({ where: {} });
  await User.destroy({ where: { email: { $like: '%@test.com' } } as any });

  logger.info('Test data cleaned up');
}

/**
 * Test feed generation
 */
async function testFeedGeneration(userId: string, username: string) {
  logger.info(`Testing feed generation for ${username}...`);

  // Create mock request and response
  const req: any = {
    user: { id: userId },
    query: { page: '1' }
  };

  let responseData: any;
  const res: any = {
    json: (data: any) => {
      responseData = data;
    },
    status: (code: number) => ({
      json: (data: any) => {
        responseData = { statusCode: code, ...data };
      }
    })
  };

  await FeedController.getFeed(req, res);

  if (responseData?.error) {
    logger.error(`Feed generation failed for ${username}`, { error: responseData.error });
    return false;
  }

  logger.info(`Feed for ${username}:`, {
    postCount: responseData.posts.length,
    pagination: responseData.pagination
  });

  return true;
}

/**
 * Test discover feed
 */
async function testDiscoverFeed() {
  logger.info('Testing discover feed...');

  const req: any = {
    query: { page: '1' }
  };

  let responseData: any;
  const res: any = {
    json: (data: any) => {
      responseData = data;
    },
    status: (code: number) => ({
      json: (data: any) => {
        responseData = { statusCode: code, ...data };
      }
    })
  };

  await FeedController.getDiscoverFeed(req, res);

  if (responseData?.error) {
    logger.error('Discover feed generation failed', { error: responseData.error });
    return false;
  }

  logger.info('Discover feed results:', {
    postCount: responseData.posts.length,
    pagination: responseData.pagination
  });

  return true;
}

/**
 * Test pagination
 */
async function testPagination(userId: string, username: string) {
  logger.info(`Testing pagination for ${username}...`);

  // Get page 1
  const req1: any = {
    user: { id: userId },
    query: { page: '1' }
  };

  let page1Data: any;
  const res1: any = {
    json: (data: any) => {
      page1Data = data;
    },
    status: (code: number) => ({
      json: (data: any) => {
        page1Data = { statusCode: code, ...data };
      }
    })
  };

  await FeedController.getFeed(req1, res1);

  // Get page 2 if available
  if (page1Data.pagination.hasMore) {
    const req2: any = {
      user: { id: userId },
      query: { page: '2' }
    };

    let page2Data: any;
    const res2: any = {
      json: (data: any) => {
        page2Data = data;
      },
      status: (code: number) => ({
        json: (data: any) => {
          page2Data = { statusCode: code, ...data };
        }
      })
    };

    await FeedController.getFeed(req2, res2);

    logger.info('Pagination test results:', {
      page1Count: page1Data.posts.length,
      page2Count: page2Data.posts.length,
      totalPages: page1Data.pagination.totalPages
    });
  } else {
    logger.info('Only one page of results available');
  }

  return true;
}

/**
 * Test cache invalidation
 */
async function testCacheInvalidation(userId: string, username: string) {
  logger.info(`Testing cache invalidation for ${username}...`);

  // Invalidate cache
  await FeedController.invalidateFeedCache(userId);
  logger.info('Feed cache invalidated successfully');

  // Invalidate discover cache
  await FeedController.invalidateDiscoverCache();
  logger.info('Discover cache invalidated successfully');

  return true;
}

/**
 * Main test runner
 */
async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Connect to databases
    await connectPostgreSQL();
    await connectRedis();

    // Set up associations
    setupAssociations();

    // Clean up any existing test data
    await cleanupTestData();

    // Set up test data
    const { users } = await setupTestData();

    // Run tests
    logger.info('Starting feed system tests...\n');

    // Test 1: Feed generation for Alice (follows Bob and Charlie)
    if (await testFeedGeneration(users[0].id, 'Alice')) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 2: Feed generation for Bob (follows Charlie)
    if (await testFeedGeneration(users[1].id, 'Bob')) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 3: Feed generation for Charlie (follows nobody)
    if (await testFeedGeneration(users[2].id, 'Charlie')) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 4: Discover feed
    if (await testDiscoverFeed()) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 5: Pagination
    if (await testPagination(users[0].id, 'Alice')) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 6: Cache invalidation
    if (await testCacheInvalidation(users[0].id, 'Alice')) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Clean up test data
    await cleanupTestData();

    // Print results
    logger.info('\n=== FEED SYSTEM TEST RESULTS ===');
    logger.info(`Tests Passed: ${testsPassed}`);
    logger.info(`Tests Failed: ${testsFailed}`);
    logger.info(`Total Tests: ${testsPassed + testsFailed}`);

    if (testsFailed === 0) {
      logger.info('✓ All tests passed!');
    } else {
      logger.error('✗ Some tests failed');
    }

  } catch (error) {
    logger.error('Test execution failed', { error });
  } finally {
    // Disconnect from databases
    await disconnectPostgreSQL();
    await disconnectRedis();
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

// Run tests
if (require.main === module) {
  runTests();
}

export { runTests };
