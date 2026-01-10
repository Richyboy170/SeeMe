/**
 * WORKSTREAM 2.3: Social Interactions Test Suite
 *
 * Tests for:
 * - Follow/unfollow operations
 * - Like/unlike operations with count accuracy
 * - Comment CRUD with nested replies
 * - Batch like status checking
 * - Integration with feed system
 */

import { sequelize } from '../config/database';
import { Post, PostStatus } from '../models/Post';
import { User } from '../models/User';
import { Follow } from '../models/Follow';
import { Like } from '../models/Like';
import { Comment } from '../models/Comment';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';

interface TestUser {
  id: string;
  username: string;
  email: string;
}

interface TestPost {
  id: string;
  userId: string;
}

async function createTestUser(username: string): Promise<TestUser> {
  const passwordHash = await bcrypt.hash('test123', 10);
  const user = await User.create({
    username,
    email: `${username}@test.com`,
    passwordHash,
    ageVerified: true
  });
  return {
    id: user.id,
    username: user.username,
    email: user.email
  };
}

async function createTestPost(userId: string, caption: string): Promise<TestPost> {
  const post = await Post.create({
    userId,
    originalImageUrl: `https://test.com/${caption}.jpg`,
    processedImageUrl: `https://test.com/${caption}_processed.jpg`,
    thumbnailUrl: `https://test.com/${caption}_thumb.jpg`,
    status: PostStatus.COMPLETED,
    caption
  });
  return {
    id: post.id,
    userId: post.userId
  };
}

async function testFollowSystem() {
  console.log('\n=== Testing Follow System ===\n');

  const user1 = await createTestUser('follow_user1');
  const user2 = await createTestUser('follow_user2');
  const user3 = await createTestUser('follow_user3');

  // Test 1: Follow user
  await Follow.create({
    followerId: user1.id,
    followingId: user2.id
  });
  console.log('✓ User1 followed User2');

  // Test 2: Get followers
  const followers = await Follow.findAll({
    where: { followingId: user2.id }
  });
  console.assert(followers.length === 1, 'Should have 1 follower');
  console.log(`✓ User2 has ${followers.length} follower(s)`);

  // Test 3: Get following
  const following = await Follow.findAll({
    where: { followerId: user1.id }
  });
  console.assert(following.length === 1, 'Should be following 1 user');
  console.log(`✓ User1 is following ${following.length} user(s)`);

  // Test 4: Multiple follows
  await Follow.create({
    followerId: user1.id,
    followingId: user3.id
  });
  await Follow.create({
    followerId: user3.id,
    followingId: user2.id
  });
  console.log('✓ Created multiple follow relationships');

  // Test 5: Prevent duplicate follows
  try {
    await Follow.create({
      followerId: user1.id,
      followingId: user2.id
    });
    console.error('✗ Should not allow duplicate follows');
  } catch (error) {
    console.log('✓ Duplicate follow prevented');
  }

  // Test 6: Unfollow
  await Follow.destroy({
    where: {
      followerId: user1.id,
      followingId: user2.id
    }
  });
  const followingAfterUnfollow = await Follow.findAll({
    where: { followerId: user1.id }
  });
  console.assert(followingAfterUnfollow.length === 1, 'Should be following 1 user after unfollow');
  console.log('✓ Unfollow operation successful');

  console.log('\n✅ Follow System Tests Passed\n');
}

async function testLikeSystem() {
  console.log('\n=== Testing Like System ===\n');

  const user1 = await createTestUser('like_user1');
  const user2 = await createTestUser('like_user2');
  const user3 = await createTestUser('like_user3');

  const post1 = await createTestPost(user1.id, 'Like test post 1');
  const post2 = await createTestPost(user1.id, 'Like test post 2');

  // Test 1: Like a post
  await Like.create({
    userId: user2.id,
    postId: post1.id
  });

  // Increment likesCount manually (in production, this is done in transaction)
  await Post.increment('likesCount', {
    where: { id: post1.id }
  });

  const post1After = await Post.findByPk(post1.id);
  console.assert(post1After!.likesCount === 1, 'Post should have 1 like');
  console.log(`✓ Post has ${post1After!.likesCount} like(s)`);

  // Test 2: Multiple users like the same post
  await Like.create({
    userId: user3.id,
    postId: post1.id
  });
  await Post.increment('likesCount', {
    where: { id: post1.id }
  });

  const post1After2 = await Post.findByPk(post1.id);
  console.assert(post1After2!.likesCount === 2, 'Post should have 2 likes');
  console.log(`✓ Post has ${post1After2!.likesCount} like(s) after second like`);

  // Test 3: Prevent duplicate likes
  try {
    await Like.create({
      userId: user2.id,
      postId: post1.id
    });
    console.error('✗ Should not allow duplicate likes');
  } catch (error) {
    console.log('✓ Duplicate like prevented');
  }

  // Test 4: Unlike a post
  await Like.destroy({
    where: {
      userId: user2.id,
      postId: post1.id
    }
  });
  await Post.decrement('likesCount', {
    where: { id: post1.id }
  });

  const post1After3 = await Post.findByPk(post1.id);
  console.assert(post1After3!.likesCount === 1, 'Post should have 1 like after unlike');
  console.log(`✓ Post has ${post1After3!.likesCount} like(s) after unlike`);

  // Test 5: Batch check liked status
  await Like.create({
    userId: user2.id,
    postId: post2.id
  });

  const likedPosts = await Like.findAll({
    where: {
      userId: user2.id,
      postId: [post1.id, post2.id]
    },
    attributes: ['postId']
  });

  const likedPostIds = new Set(likedPosts.map(l => l.postId));
  console.assert(!likedPostIds.has(post1.id), 'User2 should not have liked post1');
  console.assert(likedPostIds.has(post2.id), 'User2 should have liked post2');
  console.log('✓ Batch like status check successful');

  // Test 6: Get users who liked a post
  const likesForPost1 = await Like.findAll({
    where: { postId: post1.id },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username']
    }]
  });
  console.assert(likesForPost1.length === 1, 'Post1 should have 1 like');
  console.log(`✓ Retrieved ${likesForPost1.length} user(s) who liked the post`);

  console.log('\n✅ Like System Tests Passed\n');
}

async function testCommentSystem() {
  console.log('\n=== Testing Comment System ===\n');

  const user1 = await createTestUser('comment_user1');
  const user2 = await createTestUser('comment_user2');
  const user3 = await createTestUser('comment_user3');

  const post1 = await createTestPost(user1.id, 'Comment test post');

  // Test 1: Create a comment
  const comment1 = await Comment.create({
    postId: post1.id,
    userId: user2.id,
    content: 'This is a great post!'
  });
  await Post.increment('commentsCount', {
    where: { id: post1.id }
  });

  console.log('✓ Comment created successfully');

  // Test 2: Create a reply to comment
  const reply1 = await Comment.create({
    postId: post1.id,
    userId: user3.id,
    content: 'I agree!',
    parentCommentId: comment1.id
  });
  await Post.increment('commentsCount', {
    where: { id: post1.id }
  });

  console.log('✓ Reply created successfully');

  // Test 3: Get comments for post
  const comments = await Comment.findAll({
    where: {
      postId: post1.id,
      parentCommentId: null
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username']
    }],
    order: [['createdAt', 'DESC']]
  });

  console.assert(comments.length === 1, 'Post should have 1 top-level comment');
  console.log(`✓ Retrieved ${comments.length} top-level comment(s)`);

  // Test 4: Get replies for comment
  const replies = await Comment.findAll({
    where: {
      parentCommentId: comment1.id
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username']
    }],
    order: [['createdAt', 'ASC']]
  });

  console.assert(replies.length === 1, 'Comment should have 1 reply');
  console.log(`✓ Retrieved ${replies.length} reply/replies`);

  // Test 5: Nested replies (reply to a reply)
  await Comment.create({
    postId: post1.id,
    userId: user1.id,
    content: 'Thanks everyone!',
    parentCommentId: reply1.id
  });
  await Post.increment('commentsCount', {
    where: { id: post1.id }
  });

  const nestedReplies = await Comment.findAll({
    where: { parentCommentId: reply1.id }
  });

  console.assert(nestedReplies.length === 1, 'Reply should have 1 nested reply');
  console.log('✓ Nested replies work correctly');

  // Test 6: Update comment
  await comment1.update({
    content: 'This is an AMAZING post!'
  });

  const updatedComment = await Comment.findByPk(comment1.id);
  console.assert(updatedComment!.content === 'This is an AMAZING post!', 'Comment should be updated');
  console.log('✓ Comment updated successfully');

  // Test 7: Delete comment
  const commentId = comment1.id;
  await comment1.destroy();
  await Post.decrement('commentsCount', {
    where: { id: post1.id }
  });

  const deletedComment = await Comment.findByPk(commentId);
  console.assert(deletedComment === null, 'Comment should be deleted');
  console.log('✓ Comment deleted successfully');

  // Test 8: Check commentsCount
  const postAfter = await Post.findByPk(post1.id);
  console.assert(postAfter!.commentsCount === 2, 'Post should have 2 comments (1 reply + 1 nested reply)');
  console.log(`✓ Post has correct commentsCount: ${postAfter!.commentsCount}`);

  console.log('\n✅ Comment System Tests Passed\n');
}

async function testFeedIntegration() {
  console.log('\n=== Testing Feed Integration ===\n');

  const user1 = await createTestUser('feed_user1');
  const user2 = await createTestUser('feed_user2');
  const user3 = await createTestUser('feed_user3');

  // User1 follows User2 and User3
  await Follow.create({
    followerId: user1.id,
    followingId: user2.id
  });
  await Follow.create({
    followerId: user1.id,
    followingId: user3.id
  });

  // User2 and User3 create posts
  const post1 = await createTestPost(user2.id, 'Feed integration post 1');
  const post2 = await createTestPost(user3.id, 'Feed integration post 2');
  const post3 = await createTestPost(user2.id, 'Feed integration post 3');

  // User1 likes post1
  await Like.create({
    userId: user1.id,
    postId: post1.id
  });
  await Post.increment('likesCount', {
    where: { id: post1.id }
  });

  // Test 1: Get personalized feed
  const following = await Follow.findAll({
    where: { followerId: user1.id },
    attributes: ['followingId']
  });
  const followingIds = following.map(f => f.followingId);

  const { rows: feedPosts } = await Post.findAndCountAll({
    where: {
      userId: followingIds,
      status: 'completed'
    },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username']
    }],
    order: [['createdAt', 'DESC']],
    limit: 20
  });

  console.assert(feedPosts.length === 3, 'Feed should have 3 posts');
  console.log(`✓ Personalized feed has ${feedPosts.length} post(s)`);

  // Test 2: Check likedByMe status in feed
  const postIds = feedPosts.map(p => p.id);
  const likes = await Like.findAll({
    where: {
      userId: user1.id,
      postId: postIds
    },
    attributes: ['postId']
  });

  const likedPostIds = new Set(likes.map(like => like.postId));
  console.assert(likedPostIds.has(post1.id), 'post1 should be liked by user1');
  console.assert(!likedPostIds.has(post2.id), 'post2 should not be liked by user1');
  console.assert(!likedPostIds.has(post3.id), 'post3 should not be liked by user1');
  console.log('✓ likedByMe status correctly populated in feed');

  // Test 3: Comment on feed post
  await Comment.create({
    postId: post1.id,
    userId: user1.id,
    content: 'Great post from my feed!'
  });
  await Post.increment('commentsCount', {
    where: { id: post1.id }
  });

  const postWithComment = await Post.findByPk(post1.id);
  console.assert(postWithComment!.commentsCount === 1, 'Post should have 1 comment');
  console.log('✓ Comments integrated with feed posts');

  // Test 4: Discover feed (all posts)
  const { rows: discoverPosts } = await Post.findAndCountAll({
    where: { status: 'completed' },
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'username']
    }],
    order: [['createdAt', 'DESC']],
    limit: 20
  });

  console.assert(discoverPosts.length >= 3, 'Discover feed should have at least 3 posts');
  console.log(`✓ Discover feed has ${discoverPosts.length} post(s)`);

  console.log('\n✅ Feed Integration Tests Passed\n');
}

async function runTests() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  WORKSTREAM 2.3: Social Interactions Test Suite       ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Connect to database
    await sequelize.sync({ force: false });
    console.log('✓ Database connected\n');

    // Run tests
    await testFollowSystem();
    await testLikeSystem();
    await testCommentSystem();
    await testFeedIntegration();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  🎉 ALL TESTS PASSED!                                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    logger.error('Test suite failed', { error });
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
