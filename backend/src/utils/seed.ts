import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/database';
import { connectMongoDB, disconnectMongoDB } from '../config/mongodb';
import { logger } from './logger';
import User from '../models/User';
import Post, { PostStatus } from '../models/Post';
import AvatarConfig from '../models/AvatarConfig';

// Load environment variables
dotenv.config();

/**
 * Seeds the database with development data
 */
async function seed(): Promise<void> {
  try {
    logger.info('Starting database seeding...');

    // Connect to databases
    await sequelize.authenticate();
    await connectMongoDB();

    logger.info('Database connections established');

    // Clear existing data in development
    if (process.env.NODE_ENV === 'development') {
      await Post.destroy({ where: {} });
      await User.destroy({ where: {} });
      await AvatarConfig.deleteMany({});
      logger.info('Existing data cleared');
    }

    // Create demo users
    const password = await bcrypt.hash('password123', 10);

    const users = await User.bulkCreate([
      {
        id: uuidv4(),
        username: 'alice_wonder',
        email: 'alice@example.com',
        passwordHash: password,
        ageVerified: true,
        activeAvatarId: 'avatar_alice_1'
      },
      {
        id: uuidv4(),
        username: 'bob_builder',
        email: 'bob@example.com',
        passwordHash: password,
        ageVerified: true,
        activeAvatarId: 'avatar_bob_1'
      },
      {
        id: uuidv4(),
        username: 'charlie_dev',
        email: 'charlie@example.com',
        passwordHash: password,
        ageVerified: false,
        activeAvatarId: null
      }
    ]);

    logger.info(`Created ${users.length} demo users`);

    // Create demo avatar configurations
    const avatarConfigs = await AvatarConfig.insertMany([
      {
        userId: users[0].id,
        avatarId: 'avatar_alice_1',
        name: 'Cute Alice',
        style: 'anime',
        customizations: {
          skinTone: '#FFE4C4',
          eyeColor: '#4169E1',
          eyeSize: 1.2,
          hairColor: '#FFD700',
          hairStyle: 'long',
          accessories: {
            glasses: null,
            hat: 'bow',
            earrings: 'pearl'
          }
        },
        isActive: true
      },
      {
        userId: users[1].id,
        avatarId: 'avatar_bob_1',
        name: 'Cool Bob',
        style: 'cartoon',
        customizations: {
          skinTone: '#D2B48C',
          eyeColor: '#228B22',
          eyeSize: 1.0,
          hairColor: '#8B4513',
          hairStyle: 'short',
          accessories: {
            glasses: 'sunglasses',
            hat: 'cap',
            earrings: null
          }
        },
        isActive: true
      }
    ]);

    logger.info(`Created ${avatarConfigs.length} demo avatar configurations`);

    // Create demo posts
    const posts = await Post.bulkCreate([
      {
        id: uuidv4(),
        userId: users[0].id,
        originalImageUrl: 'https://example.com/images/alice_original_1.jpg',
        processedImageUrl: 'https://example.com/images/alice_processed_1.jpg',
        thumbnailUrl: 'https://example.com/images/alice_thumb_1.jpg',
        caption: 'My first AI avatar selfie! 🎨',
        status: PostStatus.COMPLETED,
        processingError: null,
        processingStartedAt: new Date(Date.now() - 300000),
        processingCompletedAt: new Date(Date.now() - 240000),
        processingTimeSeconds: 60,
        avatarId: 'avatar_alice_1',
        likesCount: 42,
        commentsCount: 8,
        imageWidth: 1080,
        imageHeight: 1080,
        facesDetected: 1
      },
      {
        id: uuidv4(),
        userId: users[1].id,
        originalImageUrl: 'https://example.com/images/bob_original_1.jpg',
        processedImageUrl: 'https://example.com/images/bob_processed_1.jpg',
        thumbnailUrl: 'https://example.com/images/bob_thumb_1.jpg',
        caption: 'Check out my cool avatar!',
        status: PostStatus.COMPLETED,
        processingError: null,
        processingStartedAt: new Date(Date.now() - 180000),
        processingCompletedAt: new Date(Date.now() - 120000),
        processingTimeSeconds: 60,
        avatarId: 'avatar_bob_1',
        likesCount: 27,
        commentsCount: 5,
        imageWidth: 1080,
        imageHeight: 1920,
        facesDetected: 1
      },
      {
        id: uuidv4(),
        userId: users[0].id,
        originalImageUrl: 'https://example.com/images/alice_original_2.jpg',
        processedImageUrl: null,
        thumbnailUrl: null,
        caption: 'Processing...',
        status: PostStatus.PROCESSING,
        processingError: null,
        processingStartedAt: new Date(),
        processingCompletedAt: null,
        processingTimeSeconds: null,
        avatarId: 'avatar_alice_1',
        likesCount: 0,
        commentsCount: 0,
        imageWidth: null,
        imageHeight: null,
        facesDetected: null
      }
    ]);

    logger.info(`Created ${posts.length} demo posts`);

    logger.info('Database seeding completed successfully');

    // Close connections
    await sequelize.close();
    await disconnectMongoDB();

    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed', { error });
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed();
}

export default seed;
