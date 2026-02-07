import { v4 as uuidv4 } from 'uuid';
import Topic from '../models/Topic';
import { logger } from './logger';

/**
 * Default communities to seed on startup if they don't exist
 */
const defaultTopics = [
  // Creative Category
  {
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
    name: 'Music Makers',
    slug: 'music-makers',
    description: 'For musicians, producers, and music lovers. Share your beats, covers, compositions, and musical journey.',
    iconEmoji: '🎵',
    category: 'creative',
    inviteCode: 'MUSIK1',
    isOfficial: true,
  },
  {
    name: 'Writers Corner',
    slug: 'writers-corner',
    description: 'Poetry, short stories, novels, scripts - share your written words and get feedback from fellow writers.',
    iconEmoji: '✍️',
    category: 'creative',
    inviteCode: 'WRITE1',
    isOfficial: true,
  },
  {
    name: 'Photography',
    slug: 'photography',
    description: 'Capture and share beautiful moments. Tips, critiques, and inspiration for photographers of all levels.',
    iconEmoji: '📷',
    category: 'creative',
    inviteCode: 'PHOTOG',
    isOfficial: true,
  },
  {
    name: 'Cosplay & Costumes',
    slug: 'cosplay-costumes',
    description: 'Show off your cosplay creations, WIPs, and costume designs. All fandoms welcome!',
    iconEmoji: '🦸',
    category: 'creative',
    inviteCode: 'COSPLY',
    isOfficial: true,
  },
  {
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
    name: 'Plant Parents',
    slug: 'plant-parents',
    description: 'Share your plant babies, gardening tips, and green thumb victories. Succulents to jungle vibes!',
    iconEmoji: '🌱',
    category: 'hobbies',
    inviteCode: 'PLANTS',
    isOfficial: true,
  },
  {
    name: 'DIY & Crafts',
    slug: 'diy-crafts',
    description: 'From woodworking to knitting, share your handmade projects and get inspired by others.',
    iconEmoji: '🔨',
    category: 'hobbies',
    inviteCode: 'DIYCFT',
    isOfficial: true,
  },
  {
    name: 'Board Game Geeks',
    slug: 'board-game-geeks',
    description: 'Discuss your favorite tabletop games, share game nights, and discover new titles to play.',
    iconEmoji: '🎲',
    category: 'hobbies',
    inviteCode: 'BRDGAM',
    isOfficial: true,
  },
  {
    name: 'Collectors Club',
    slug: 'collectors-club',
    description: 'Show off your collections! Sneakers, cards, figures, vinyl - whatever you collect.',
    iconEmoji: '🏆',
    category: 'hobbies',
    inviteCode: 'COLECT',
    isOfficial: true,
  },
  {
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
    name: 'Travel Diaries',
    slug: 'travel-diaries',
    description: 'Share your adventures, travel tips, and bucket list destinations. Inspire and be inspired!',
    iconEmoji: '✈️',
    category: 'lifestyle',
    inviteCode: 'TRAVEL',
    isOfficial: true,
  },
  {
    name: 'Fashion Forward',
    slug: 'fashion-forward',
    description: 'OOTDs, style inspo, thrift finds, and fashion discussions. Express yourself through clothing!',
    iconEmoji: '👗',
    category: 'lifestyle',
    inviteCode: 'FASHUN',
    isOfficial: true,
  },
  {
    name: 'Cozy Home',
    slug: 'cozy-home',
    description: 'Interior design, home organization, decor ideas, and creating comfortable living spaces.',
    iconEmoji: '🏡',
    category: 'lifestyle',
    inviteCode: 'COZYHM',
    isOfficial: true,
  },
  {
    name: 'Mindfulness',
    slug: 'mindfulness',
    description: "Mental wellness, meditation, journaling, and self-care practices. Support each other's well-being.",
    iconEmoji: '🧘',
    category: 'lifestyle',
    inviteCode: 'MINDFL',
    isOfficial: true,
    encouragementMultiplier: 1.5,
  },
  {
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
    name: 'Runners World',
    slug: 'runners-world',
    description: 'From couch to 5K to marathons. Share your runs, routes, and running achievements!',
    iconEmoji: '🏃',
    category: 'fitness',
    inviteCode: 'RUNNER',
    isOfficial: true,
  },
  {
    name: 'Yoga Flow',
    slug: 'yoga-flow',
    description: 'Poses, routines, flexibility progress, and yoga lifestyle. Namaste, friends!',
    iconEmoji: '🧘‍♀️',
    category: 'fitness',
    inviteCode: 'YOGAFM',
    isOfficial: true,
  },
  {
    name: 'Outdoor Adventures',
    slug: 'outdoor-adventures',
    description: 'Hiking, climbing, camping, and exploring the great outdoors. Share your nature experiences!',
    iconEmoji: '⛰️',
    category: 'fitness',
    inviteCode: 'OUTADV',
    isOfficial: true,
  },
  {
    name: 'Sports Fans',
    slug: 'sports-fans',
    description: 'Discuss your favorite sports, teams, and athletes. From football to esports!',
    iconEmoji: '⚽',
    category: 'fitness',
    inviteCode: 'SPORTS',
    isOfficial: true,
  },
  {
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
    name: 'Science Nerds',
    slug: 'science-nerds',
    description: 'Fascinating discoveries, experiments, and science discussions. Curiosity encouraged!',
    iconEmoji: '🔬',
    category: 'learning',
    inviteCode: 'SCINCE',
    isOfficial: true,
  },
  {
    name: 'Book Club',
    slug: 'book-club',
    description: "Share what you're reading, book recommendations, and literary discussions.",
    iconEmoji: '📖',
    category: 'learning',
    inviteCode: 'BOOKRD',
    isOfficial: true,
  },
  {
    name: 'Career Growth',
    slug: 'career-growth',
    description: 'Professional development, job search tips, workplace advice, and career wins.',
    iconEmoji: '💼',
    category: 'learning',
    inviteCode: 'CAREER',
    isOfficial: true,
  },
  {
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
    name: 'Tech News',
    slug: 'tech-news',
    description: 'Latest in technology, gadget reviews, and discussions about the future of tech.',
    iconEmoji: '📱',
    category: 'tech',
    inviteCode: 'TCHNWS',
    isOfficial: true,
  },
  {
    name: 'PC Builders',
    slug: 'pc-builders',
    description: 'Custom PC builds, battlestations, hardware discussions, and setup showcases.',
    iconEmoji: '🖥️',
    category: 'tech',
    inviteCode: 'PCBULD',
    isOfficial: true,
  },
  {
    name: 'AI Explorers',
    slug: 'ai-explorers',
    description: 'Discuss artificial intelligence, machine learning, and the future of AI technology.',
    iconEmoji: '🤖',
    category: 'tech',
    inviteCode: 'AIEXPL',
    isOfficial: true,
  },
  {
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
    name: 'Startup Life',
    slug: 'startup-life',
    description: 'Entrepreneurs, founders, and dreamers. Share your startup journey and learn from others.',
    iconEmoji: '🚀',
    category: 'tech',
    inviteCode: 'STRTUP',
    isOfficial: true,
  },
  {
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

/**
 * Seeds default communities on startup if they don't exist
 * Does NOT delete existing data - only creates missing communities
 */
export async function seedDefaultTopics(): Promise<void> {
  try {
    const existingSlugs = (await Topic.findAll({ attributes: ['slug'] })).map(t => t.getDataValue('slug'));

    const missing = defaultTopics.filter(t => !existingSlugs.includes(t.slug));

    if (missing.length === 0) {
      logger.info(`All ${defaultTopics.length} default communities already exist, nothing to seed`);
      return;
    }

    logger.info(`Found ${existingSlugs.length} existing communities, seeding ${missing.length} missing ones...`);

    const topicsToCreate = missing.map(topic => ({
      id: uuidv4(),
      ...topic,
    }));

    const created = await Topic.bulkCreate(topicsToCreate);
    logger.info(`Created ${created.length} default communities (${existingSlugs.length} already existed)`);
  } catch (error) {
    logger.error('Failed to seed default communities', { error });
    // Don't throw - this shouldn't crash the server
  }
}

export default seedDefaultTopics;
