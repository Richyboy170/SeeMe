import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import { PositivityCoins } from '../models/PositivityCoins';
import { CoinTransaction } from '../models/CoinTransaction';
import { getSocketInstance } from '../socket/socketInstance';
import { logger } from '../utils/logger';

const WELCOME_MIN_COINS = 2;
const WELCOME_MAX_COINS = 8;
const GENEROSITY_WINDOW_DAYS = 7;
const GENEROSITY_MAX_REWARDS_PER_DAY = 3;
const GENEROSITY_MAX_REWARD = 10;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class BotService {
  /**
   * Send welcome coins from all 3 bots to a newly registered user.
   * Each bot sends 2-8 coins with a staggered delay (1-5s).
   * Idempotent: skips if bot_welcome transactions already exist for this user.
   */
  static async sendWelcomeCoins(userId: string): Promise<void> {
    try {
      // Check idempotency - skip if user already has bot_welcome transactions
      const existingWelcome = await CoinTransaction.count({
        where: {
          toUserId: userId,
          transactionType: 'bot_welcome',
        },
      });

      if (existingWelcome > 0) {
        logger.info('Bot welcome coins already sent, skipping', { userId });
        return;
      }

      const bots = await User.findAll({ where: { isBot: true } });
      if (bots.length === 0) {
        logger.warn('No bots found for welcome coins');
        return;
      }

      for (const bot of bots) {
        const delayMs = randomInt(1000, 5000);

        setTimeout(async () => {
          try {
            await this.sendBotCoins(bot.id, userId, randomInt(WELCOME_MIN_COINS, WELCOME_MAX_COINS), 'bot_welcome');
          } catch (err) {
            logger.error('Failed to send welcome coins from bot', { botId: bot.id, userId, error: err });
          }
        }, delayMs);
      }
    } catch (error) {
      logger.error('Error in sendWelcomeCoins', { error, userId });
    }
  }

  /**
   * Reward a new user for being generous (giving coins to others).
   * Only applies to users in their first 7 days, max 3 rewards per day.
   * Reward = 1x-2x the amount given, capped at 10 coins.
   */
  static async rewardGenerosity(fromUserId: string, amountGiven: number): Promise<void> {
    try {
      const sender = await User.findByPk(fromUserId);
      if (!sender || sender.isBot) return;

      // Check if user is within their first 7 days
      const accountAgeDays = (Date.now() - new Date(sender.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays > GENEROSITY_WINDOW_DAYS) return;

      // Check daily reward count
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayRewards = await CoinTransaction.count({
        where: {
          toUserId: fromUserId,
          transactionType: 'bot_generosity_reward',
          createdAt: { [Op.gte]: startOfDay },
        },
      });

      if (todayRewards >= GENEROSITY_MAX_REWARDS_PER_DAY) return;

      // Pick a random bot
      const bots = await User.findAll({ where: { isBot: true } });
      if (bots.length === 0) return;

      const bot = bots[randomInt(0, bots.length - 1)];

      // Calculate reward: 1x-2x the given amount, capped at 10
      const multiplier = 1 + Math.random(); // 1.0 to 2.0
      const reward = Math.min(Math.round(amountGiven * multiplier), GENEROSITY_MAX_REWARD);
      if (reward < 1) return;

      // Small delay to make it feel natural
      const delayMs = randomInt(2000, 8000);

      setTimeout(async () => {
        try {
          await this.sendBotCoins(bot.id, fromUserId, reward, 'bot_generosity_reward');
        } catch (err) {
          logger.error('Failed to send generosity reward from bot', { botId: bot.id, userId: fromUserId, error: err });
        }
      }, delayMs);
    } catch (error) {
      logger.error('Error in rewardGenerosity', { error, fromUserId });
    }
  }

  /**
   * Transfer coins from a bot to a user, recording a transaction.
   * Coins are deferred (collected: false) — the user collects them
   * via the EncouragementModal, same as user-to-user gifts.
   */
  private static async sendBotCoins(
    botId: string,
    toUserId: string,
    amount: number,
    transactionType: 'bot_welcome' | 'bot_generosity_reward'
  ): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      const botCoins = await PositivityCoins.findByPk(botId, { transaction });
      if (!botCoins || botCoins.totalCoins < amount) {
        await transaction.rollback();
        logger.warn('Bot has insufficient coins', { botId, available: botCoins?.totalCoins, needed: amount });
        return;
      }

      // Deduct from bot
      await botCoins.update(
        { totalCoins: botCoins.totalCoins - amount },
        { transaction }
      );

      // Do NOT credit receiver — coins stay uncollected until the user
      // taps the heart in the EncouragementModal (same as user-to-user gifts).

      // Record the transaction with collected: false
      await CoinTransaction.create(
        {
          fromUserId: botId,
          toUserId: toUserId,
          amount,
          transactionType,
          message: transactionType === 'bot_welcome'
            ? 'Welcome to SeeMe!'
            : 'Thanks for being generous!',
          collected: false,
        },
        { transaction }
      );

      await transaction.commit();
      logger.info('Bot coins sent', { botId, toUserId, amount, transactionType });

      // Emit socket event so the mobile client can show a toast
      try {
        const io = getSocketInstance();
        if (io) {
          const bot = await User.findByPk(botId, { attributes: ['username'] });
          io.to(`user:${toUserId}`).emit('bot:coins_received', {
            botUsername: bot?.username || 'Bot',
            amount,
            transactionType,
            message: transactionType === 'bot_welcome'
              ? 'Welcome to SeeMe!'
              : 'Thanks for being generous!',
          });
        }
      } catch (emitError) {
        logger.error('Failed to emit bot:coins_received event', { emitError, botId, toUserId });
      }
    } catch (error) {
      await transaction.rollback();
      logger.error('Error sending bot coins', { error, botId, toUserId, amount });
      throw error;
    }
  }
}

export default BotService;
