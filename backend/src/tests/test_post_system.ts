/**
 * Post System Test Script
 * Tests the post creation, management, and ML processing callback
 *
 * This script validates WORKSTREAM 2.1: POST CREATION & MANAGEMENT implementation
 */

import dotenv from 'dotenv';
import { connectPostgreSQL, disconnectPostgreSQL } from '../config/database';
import { connectRedis, disconnectRedis } from '../config/redis';
import { logger } from '../utils/logger';
import { User } from '../models/User';
import { Post, PostStatus } from '../models/Post';
import { MLService } from '../services/MLService';
import { S3Service } from '../services/S3Service';
import { ImageProcessor } from '../utils/imageProcessing';
import { setupAssociations } from '../models/associations';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Test data setup
 */
async function setupTestData() {
  logger.info('Setting up test data...');

  // Create test user
  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    ageVerified: true,
    activeAvatarId: 'cartoon_1'
  });

  logger.info('Created test user', { userId: user.id });

  return { user };
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  logger.info('Cleaning up test data...');

  await Post.destroy({ where: {} });
  await User.destroy({ where: { email: 'test@example.com' } });

  logger.info('Test data cleaned up');
}

/**
 * Test 1: Create post record
 */
async function testCreatePost(userId: string): Promise<string | null> {
  logger.info('Test 1: Creating post record...');

  try {
    const post = await Post.create({
      userId,
      originalImageUrl: 'file:///test/original.jpg',
      caption: 'Test post caption',
      status: PostStatus.PROCESSING,
      avatarId: 'cartoon_1',
      imageWidth: 1024,
      imageHeight: 1024,
      processingStartedAt: new Date()
    });

    logger.info('✓ Post created successfully', { postId: post.id });
    return post.id;

  } catch (error) {
    logger.error('✗ Failed to create post', { error });
    return null;
  }
}

/**
 * Test 2: Get post by ID
 */
async function testGetPost(postId: string): Promise<boolean> {
  logger.info('Test 2: Getting post by ID...');

  try {
    const post = await Post.findByPk(postId);

    if (!post) {
      logger.error('✗ Post not found');
      return false;
    }

    logger.info('✓ Post retrieved successfully', {
      postId: post.id,
      status: post.status,
      caption: post.caption
    });
    return true;

  } catch (error) {
    logger.error('✗ Failed to get post', { error });
    return false;
  }
}

/**
 * Test 3: Update post caption
 */
async function testUpdatePost(postId: string): Promise<boolean> {
  logger.info('Test 3: Updating post caption...');

  try {
    const post = await Post.findByPk(postId);

    if (!post) {
      logger.error('✗ Post not found');
      return false;
    }

    await post.update({ caption: 'Updated caption' });

    logger.info('✓ Post updated successfully', { newCaption: post.caption });
    return true;

  } catch (error) {
    logger.error('✗ Failed to update post', { error });
    return false;
  }
}

/**
 * Test 4: Processing callback - success
 */
async function testProcessingCallbackSuccess(postId: string): Promise<boolean> {
  logger.info('Test 4: Testing successful processing callback...');

  try {
    await MLService.handleProcessingCallback({
      postId,
      success: true,
      processedImageUrl: 'file:///test/processed.jpg',
      thumbnailUrl: 'file:///test/thumbnail.jpg',
      processingTime: 8.5,
      metadata: {
        num_faces: 1,
        processing_time: 8.5,
        style: 'cartoon'
      }
    });

    const post = await Post.findByPk(postId);

    if (!post) {
      logger.error('✗ Post not found after callback');
      return false;
    }

    if (post.status !== PostStatus.COMPLETED) {
      logger.error('✗ Post status not updated to completed', { status: post.status });
      return false;
    }

    if (!post.processedImageUrl || !post.thumbnailUrl) {
      logger.error('✗ Image URLs not set');
      return false;
    }

    logger.info('✓ Processing callback succeeded', {
      status: post.status,
      processingTime: post.processingTimeSeconds,
      facesDetected: post.facesDetected
    });
    return true;

  } catch (error) {
    logger.error('✗ Processing callback failed', { error });
    return false;
  }
}

/**
 * Test 5: Processing callback - failure
 */
async function testProcessingCallbackFailure(userId: string): Promise<boolean> {
  logger.info('Test 5: Testing failed processing callback...');

  try {
    // Create a new post for this test
    const post = await Post.create({
      userId,
      originalImageUrl: 'file:///test/original2.jpg',
      status: PostStatus.PROCESSING,
      processingStartedAt: new Date()
    });

    await MLService.handleProcessingCallback({
      postId: post.id,
      success: false,
      error: 'No face detected in image'
    });

    const updatedPost = await Post.findByPk(post.id);

    if (!updatedPost) {
      logger.error('✗ Post not found after callback');
      return false;
    }

    if (updatedPost.status !== PostStatus.FAILED) {
      logger.error('✗ Post status not updated to failed', { status: updatedPost.status });
      return false;
    }

    if (!updatedPost.processingError) {
      logger.error('✗ Processing error not set');
      return false;
    }

    logger.info('✓ Processing failure callback succeeded', {
      status: updatedPost.status,
      error: updatedPost.processingError
    });
    return true;

  } catch (error) {
    logger.error('✗ Processing failure callback test failed', { error });
    return false;
  }
}

/**
 * Test 6: Image validation
 */
async function testImageValidation(): Promise<boolean> {
  logger.info('Test 6: Testing image validation...');

  try {
    // Test invalid buffer
    const invalidResult = await ImageProcessor.validateImage(Buffer.from('invalid'));

    if (invalidResult.valid) {
      logger.error('✗ Invalid image passed validation');
      return false;
    }

    logger.info('✓ Image validation correctly rejects invalid images');

    // Test valid image (if test image exists)
    const testImagePath = path.join(__dirname, '../../test-assets/test-image.jpg');

    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      const validResult = await ImageProcessor.validateImage(imageBuffer);

      if (!validResult.valid) {
        logger.error('✗ Valid image failed validation', { error: validResult.error });
        return false;
      }

      logger.info('✓ Image validation correctly accepts valid images');
    } else {
      logger.warn('Test image not found, skipping valid image test');
    }

    return true;

  } catch (error) {
    logger.error('✗ Image validation test failed', { error });
    return false;
  }
}

/**
 * Test 7: Get processing stats
 */
async function testProcessingStats(): Promise<boolean> {
  logger.info('Test 7: Getting processing stats...');

  try {
    const stats = await MLService.getProcessingStats();

    logger.info('✓ Processing stats retrieved', {
      total: stats.total,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      averageTime: stats.averageProcessingTime
    });

    return true;

  } catch (error) {
    logger.error('✗ Failed to get processing stats', { error });
    return false;
  }
}

/**
 * Test 8: S3 Service info
 */
async function testS3ServiceInfo(): Promise<boolean> {
  logger.info('Test 8: Getting S3 service info...');

  try {
    const info = S3Service.getStorageInfo();

    logger.info('✓ S3 service info retrieved', {
      type: info.type,
      configured: info.configured
    });

    return true;

  } catch (error) {
    logger.error('✗ Failed to get S3 service info', { error });
    return false;
  }
}

/**
 * Test 9: Delete post
 */
async function testDeletePost(postId: string): Promise<boolean> {
  logger.info('Test 9: Deleting post...');

  try {
    const post = await Post.findByPk(postId);

    if (!post) {
      logger.error('✗ Post not found');
      return false;
    }

    await post.destroy();

    const deletedPost = await Post.findByPk(postId);

    if (deletedPost) {
      logger.error('✗ Post still exists after deletion');
      return false;
    }

    logger.info('✓ Post deleted successfully');
    return true;

  } catch (error) {
    logger.error('✗ Failed to delete post', { error });
    return false;
  }
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
    const { user } = await setupTestData();

    // Run tests
    logger.info('\n=== Starting Post System Tests ===\n');

    // Test 1: Create post
    const postId = await testCreatePost(user.id);
    if (postId) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    if (postId) {
      // Test 2: Get post
      if (await testGetPost(postId)) {
        testsPassed++;
      } else {
        testsFailed++;
      }

      // Test 3: Update post
      if (await testUpdatePost(postId)) {
        testsPassed++;
      } else {
        testsFailed++;
      }

      // Test 4: Processing callback success
      if (await testProcessingCallbackSuccess(postId)) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    } else {
      testsFailed += 3; // Skip tests 2-4
    }

    // Test 5: Processing callback failure
    if (await testProcessingCallbackFailure(user.id)) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 6: Image validation
    if (await testImageValidation()) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 7: Processing stats
    if (await testProcessingStats()) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 8: S3 service info
    if (await testS3ServiceInfo()) {
      testsPassed++;
    } else {
      testsFailed++;
    }

    // Test 9: Delete post (if postId exists)
    if (postId) {
      if (await testDeletePost(postId)) {
        testsPassed++;
      } else {
        testsFailed++;
      }
    }

    // Clean up test data
    await cleanupTestData();

    // Print results
    logger.info('\n=== POST SYSTEM TEST RESULTS ===');
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
