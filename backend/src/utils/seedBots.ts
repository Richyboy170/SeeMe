import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';
import { PositivityCoins } from '../models/PositivityCoins';
import { logger } from './logger';

const BOT_INITIAL_COINS = 10_000;

export interface BotDefinition {
  username: string;
  email: string;
  avatarConfig: {
    style: string;
    theme: string;
    eyeColor: string;
    hairColor: string;
    hairStyle: string;
    personality: string;
  };
}

export const BOT_DEFINITIONS: BotDefinition[] = [
  {
    username: 'SunnyBot',
    email: 'sunnybot@seeme.internal',
    avatarConfig: {
      style: 'cartoon',
      theme: 'Warm sunshine',
      eyeColor: '#FFB347',
      hairColor: '#FFD700',
      hairStyle: 'wavy',
      personality: 'Warm welcomer, spreads light',
    },
  },
  {
    username: 'StarBot',
    email: 'starbot@seeme.internal',
    avatarConfig: {
      style: 'anime',
      theme: 'Cosmic stars',
      eyeColor: '#6A0DAD',
      hairColor: '#191970',
      hairStyle: 'spiky',
      personality: 'Cool cosmic guide',
    },
  },
  {
    username: 'BloomBot',
    email: 'bloombot@seeme.internal',
    avatarConfig: {
      style: 'minimalist',
      theme: 'Nature growth',
      eyeColor: '#228B22',
      hairColor: '#8B4513',
      hairStyle: 'long',
      personality: 'Nurturing encourager',
    },
  },
];

export async function seedBots(): Promise<void> {
  try {
    for (const botDef of BOT_DEFINITIONS) {
      const existing = await User.findOne({ where: { username: botDef.username } });
      if (existing) {
        logger.info(`Bot already exists: ${botDef.username}`);
        continue;
      }

      const botId = uuidv4();

      await User.create({
        id: botId,
        username: botDef.username,
        email: botDef.email,
        passwordHash: null,
        authProvider: 'email',
        ageVerified: true,
        isBot: true,
      });

      // Initialize coin pool for the bot
      await PositivityCoins.create({
        userId: botId,
        totalCoins: BOT_INITIAL_COINS,
        lifetimeEarned: BOT_INITIAL_COINS,
      });

      logger.info(`Created bot: ${botDef.username}`, { botId });
    }
  } catch (error) {
    logger.error('Failed to seed bots', { error });
    // Don't throw - this shouldn't crash the server
  }
}

export default seedBots;
