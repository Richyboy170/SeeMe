import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/database';
import { connectMongoDB, disconnectMongoDB } from '../config/mongodb';
import { logger } from './logger';
import User from '../models/User';
import Post, { PostStatus } from '../models/Post';
import AvatarConfig from '../models/AvatarConfig';
import Topic from '../models/Topic';

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
      await Topic.destroy({ where: {} });
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

    // Create default communities/topics
    const defaultTopics = [
      // Creative Category
      {
        id: uuidv4(),
        name: 'Digital Art',
        slug: 'digital-art',
        description: 'Share your digital paintings, illustrations, and graphic designs. From beginners to pros, everyone is welcome!',
        iconEmoji: '🎨',
        category: 'creative',
        inviteCode: 'DIGART',
        isOfficial: true,
        encouragementMultiplier: 1.2,
      },
      {
        id: uuidv4(),
        name: 'Music Makers',
        slug: 'music-makers',
        description: 'For musicians, producers, and music lovers. Share your beats, covers, compositions, and musical journey.',
        iconEmoji: '🎵',
        category: 'creative',
        inviteCode: 'MUSIK1',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Writers Corner',
        slug: 'writers-corner',
        description: 'Poetry, short stories, novels, scripts - share your written words and get feedback from fellow writers.',
        iconEmoji: '✍️',
        category: 'creative',
        inviteCode: 'WRITE1',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Photography',
        slug: 'photography',
        description: 'Capture and share beautiful moments. Tips, critiques, and inspiration for photographers of all levels.',
        iconEmoji: '📷',
        category: 'creative',
        inviteCode: 'PHOTOG',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Cosplay & Costumes',
        slug: 'cosplay-costumes',
        description: 'Show off your cosplay creations, WIPs, and costume designs. All fandoms welcome!',
        iconEmoji: '🦸',
        category: 'creative',
        inviteCode: 'COSPLY',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Animation Station',
        slug: 'animation-station',
        description: 'For animators and animation enthusiasts. Share your work, tutorials, and discuss techniques.',
        iconEmoji: '🎬',
        category: 'creative',
        inviteCode: 'ANIMAT',
        isOfficial: true,
      },

      // Hobbies Category
      {
        id: uuidv4(),
        name: 'Gaming Hub',
        slug: 'gaming-hub',
        description: 'Share your gaming moments, discuss strategies, find teammates, and celebrate victories!',
        iconEmoji: '🎮',
        category: 'hobbies',
        inviteCode: 'GAMERS',
        isOfficial: true,
        encouragementMultiplier: 1.3,
      },
      {
        id: uuidv4(),
        name: 'Plant Parents',
        slug: 'plant-parents',
        description: 'Share your plant babies, gardening tips, and green thumb victories. Succulents to jungle vibes!',
        iconEmoji: '🌱',
        category: 'hobbies',
        inviteCode: 'PLANTS',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'DIY & Crafts',
        slug: 'diy-crafts',
        description: 'From woodworking to knitting, share your handmade projects and get inspired by others.',
        iconEmoji: '🔨',
        category: 'hobbies',
        inviteCode: 'DIYCFT',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Board Game Geeks',
        slug: 'board-game-geeks',
        description: 'Discuss your favorite tabletop games, share game nights, and discover new titles to play.',
        iconEmoji: '🎲',
        category: 'hobbies',
        inviteCode: 'BRDGAM',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Collectors Club',
        slug: 'collectors-club',
        description: 'Show off your collections! Sneakers, cards, figures, vinyl - whatever you collect.',
        iconEmoji: '🏆',
        category: 'hobbies',
        inviteCode: 'COLECT',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Pet Lovers',
        slug: 'pet-lovers',
        description: 'Share adorable moments with your furry, scaly, or feathery friends. All pets welcome!',
        iconEmoji: '🐾',
        category: 'hobbies',
        inviteCode: 'PETLUV',
        isOfficial: true,
        encouragementMultiplier: 1.5,
      },
      {
        id: uuidv4(),
        name: 'Anime & Manga',
        slug: 'anime-manga',
        description: 'Discuss your favorite anime and manga, share recommendations, and celebrate Japanese pop culture.',
        iconEmoji: '⛩️',
        category: 'hobbies',
        inviteCode: 'ANIMNG',
        isOfficial: true,
      },

      // Lifestyle Category
      {
        id: uuidv4(),
        name: 'Foodies',
        slug: 'foodies',
        description: 'Share your culinary creations, restaurant finds, and food photography. From home cooks to food critics!',
        iconEmoji: '🍳',
        category: 'lifestyle',
        inviteCode: 'FOODIE',
        isOfficial: true,
        encouragementMultiplier: 1.2,
      },
      {
        id: uuidv4(),
        name: 'Travel Diaries',
        slug: 'travel-diaries',
        description: 'Share your adventures, travel tips, and bucket list destinations. Inspire and be inspired!',
        iconEmoji: '✈️',
        category: 'lifestyle',
        inviteCode: 'TRAVEL',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Fashion Forward',
        slug: 'fashion-forward',
        description: 'OOTDs, style inspo, thrift finds, and fashion discussions. Express yourself through clothing!',
        iconEmoji: '👗',
        category: 'lifestyle',
        inviteCode: 'FASHUN',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Cozy Home',
        slug: 'cozy-home',
        description: 'Interior design, home organization, decor ideas, and creating comfortable living spaces.',
        iconEmoji: '🏡',
        category: 'lifestyle',
        inviteCode: 'COZYHM',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Mindfulness',
        slug: 'mindfulness',
        description: 'Mental wellness, meditation, journaling, and self-care practices. Support each other\'s well-being.',
        iconEmoji: '🧘',
        category: 'lifestyle',
        inviteCode: 'MINDFL',
        isOfficial: true,
        encouragementMultiplier: 1.5,
      },
      {
        id: uuidv4(),
        name: 'Coffee & Tea',
        slug: 'coffee-tea',
        description: 'For caffeine enthusiasts! Share your brews, cafe finds, latte art, and beverage reviews.',
        iconEmoji: '☕',
        category: 'lifestyle',
        inviteCode: 'CAFFNE',
        isOfficial: true,
      },

      // Fitness Category
      {
        id: uuidv4(),
        name: 'Gym Life',
        slug: 'gym-life',
        description: 'Share your fitness journey, workout routines, progress pics, and motivation. Gains together!',
        iconEmoji: '🏋️',
        category: 'fitness',
        inviteCode: 'GYMFIT',
        isOfficial: true,
        encouragementMultiplier: 1.4,
      },
      {
        id: uuidv4(),
        name: 'Runners World',
        slug: 'runners-world',
        description: 'From couch to 5K to marathons. Share your runs, routes, and running achievements!',
        iconEmoji: '🏃',
        category: 'fitness',
        inviteCode: 'RUNNER',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Yoga Flow',
        slug: 'yoga-flow',
        description: 'Poses, routines, flexibility progress, and yoga lifestyle. Namaste, friends!',
        iconEmoji: '🧘‍♀️',
        category: 'fitness',
        inviteCode: 'YOGAFM',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Outdoor Adventures',
        slug: 'outdoor-adventures',
        description: 'Hiking, climbing, camping, and exploring the great outdoors. Share your nature experiences!',
        iconEmoji: '⛰️',
        category: 'fitness',
        inviteCode: 'OUTADV',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Sports Fans',
        slug: 'sports-fans',
        description: 'Discuss your favorite sports, teams, and athletes. From football to esports!',
        iconEmoji: '⚽',
        category: 'fitness',
        inviteCode: 'SPORTS',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Martial Arts',
        slug: 'martial-arts',
        description: 'BJJ, boxing, karate, taekwondo, and more. Share techniques, progress, and training!',
        iconEmoji: '🥋',
        category: 'fitness',
        inviteCode: 'MRTART',
        isOfficial: true,
      },

      // Learning Category
      {
        id: uuidv4(),
        name: 'Language Learners',
        slug: 'language-learners',
        description: 'Learning a new language? Share your progress, resources, and practice with others!',
        iconEmoji: '🗣️',
        category: 'learning',
        inviteCode: 'LANGLN',
        isOfficial: true,
        encouragementMultiplier: 1.3,
      },
      {
        id: uuidv4(),
        name: 'Study Buddies',
        slug: 'study-buddies',
        description: 'Students supporting students. Share study tips, notes, and academic achievements.',
        iconEmoji: '📚',
        category: 'learning',
        inviteCode: 'STUDYB',
        isOfficial: true,
        encouragementMultiplier: 1.4,
      },
      {
        id: uuidv4(),
        name: 'Science Nerds',
        slug: 'science-nerds',
        description: 'Fascinating discoveries, experiments, and science discussions. Curiosity encouraged!',
        iconEmoji: '🔬',
        category: 'learning',
        inviteCode: 'SCINCE',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Book Club',
        slug: 'book-club',
        description: 'Share what you\'re reading, book recommendations, and literary discussions.',
        iconEmoji: '📖',
        category: 'learning',
        inviteCode: 'BOOKRD',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Career Growth',
        slug: 'career-growth',
        description: 'Professional development, job search tips, workplace advice, and career wins.',
        iconEmoji: '💼',
        category: 'learning',
        inviteCode: 'CAREER',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'History Buffs',
        slug: 'history-buffs',
        description: 'Explore and discuss fascinating moments from the past. Learn from history together!',
        iconEmoji: '🏛️',
        category: 'learning',
        inviteCode: 'HISTOR',
        isOfficial: true,
      },

      // Tech Category
      {
        id: uuidv4(),
        name: 'Coders United',
        slug: 'coders-united',
        description: 'Programming discussions, code snippets, project showcases, and dev life memes.',
        iconEmoji: '💻',
        category: 'tech',
        inviteCode: 'CODERS',
        isOfficial: true,
        encouragementMultiplier: 1.2,
      },
      {
        id: uuidv4(),
        name: 'Tech News',
        slug: 'tech-news',
        description: 'Latest in technology, gadget reviews, and discussions about the future of tech.',
        iconEmoji: '📱',
        category: 'tech',
        inviteCode: 'TCHNWS',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'PC Builders',
        slug: 'pc-builders',
        description: 'Custom PC builds, battlestations, hardware discussions, and setup showcases.',
        iconEmoji: '🖥️',
        category: 'tech',
        inviteCode: 'PCBULD',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'AI Explorers',
        slug: 'ai-explorers',
        description: 'Discuss artificial intelligence, machine learning, and the future of AI technology.',
        iconEmoji: '🤖',
        category: 'tech',
        inviteCode: 'AIEXPL',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Cybersecurity',
        slug: 'cybersecurity',
        description: 'Stay safe online! Security tips, privacy discussions, and infosec knowledge sharing.',
        iconEmoji: '🔒',
        category: 'tech',
        inviteCode: 'CYBSEC',
        isOfficial: true,
        minAge: 16,
      },
      {
        id: uuidv4(),
        name: 'Startup Life',
        slug: 'startup-life',
        description: 'Entrepreneurs, founders, and dreamers. Share your startup journey and learn from others.',
        iconEmoji: '🚀',
        category: 'tech',
        inviteCode: 'STRTUP',
        isOfficial: true,
      },
      {
        id: uuidv4(),
        name: 'Web3 & Crypto',
        slug: 'web3-crypto',
        description: 'Blockchain technology, NFTs, and the decentralized web. Learn and discuss the future of finance.',
        iconEmoji: '⛓️',
        category: 'tech',
        inviteCode: 'WEB3CR',
        isOfficial: true,
        minAge: 18,
      },
    ];

    const topics = await Topic.bulkCreate(defaultTopics);
    logger.info(`Created ${topics.length} default communities`);

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
