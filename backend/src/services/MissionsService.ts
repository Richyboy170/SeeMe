import { sequelize } from '../config/database';
import { User } from '../models/User';
import { Post, PostStatus } from '../models/Post';
import { CoinTransaction } from '../models/CoinTransaction';
import { TopicFollow } from '../models/TopicFollow';
import { PositivityCoins } from '../models/PositivityCoins';
import { CoinsService } from './CoinsService';
import { logger } from '../utils/logger';

interface MissionDef {
  id: string;
  title: string;
  description: string;
  reward: number;
}

export interface MissionStatus extends MissionDef {
  completed: boolean;
  claimed: boolean;
}

const MISSIONS: MissionDef[] = [
  {
    id: 'customize_avatar',
    title: 'Express Yourself',
    description: 'Customize your avatar',
    reward: 3,
  },
  {
    id: 'first_post',
    title: 'Share Your Voice',
    description: 'Create your first post',
    reward: 4,
  },
  {
    id: 'first_give',
    title: 'Spread Kindness',
    description: 'Give coins to someone',
    reward: 3,
  },
  {
    id: 'join_community',
    title: 'Find Your People',
    description: 'Join a community',
    reward: 3,
  },
];

export class MissionsService {
  /**
   * Get all missions with completion/claimed status for a user.
   */
  static async getMissions(userId: string): Promise<MissionStatus[]> {
    // Run all checks in parallel
    const [user, postCount, giveCount, topicCount, claimedTxs] = await Promise.all([
      User.findByPk(userId, { attributes: ['id', 'activeAvatarId'] }),
      Post.count({ where: { userId, status: PostStatus.COMPLETED } }),
      CoinTransaction.count({ where: { fromUserId: userId, transactionType: 'given_to_user' } }),
      TopicFollow.count({ where: { userId } }),
      CoinTransaction.findAll({
        where: {
          toUserId: userId,
          transactionType: 'mission_reward',
        },
        attributes: ['message'],
      }),
    ]);

    const claimedIds = new Set(claimedTxs.map(tx => tx.message));

    const completionMap: Record<string, boolean> = {
      customize_avatar: !!user?.activeAvatarId,
      first_post: postCount > 0,
      first_give: giveCount > 0,
      join_community: topicCount > 0,
    };

    return MISSIONS.map(m => ({
      ...m,
      completed: completionMap[m.id] ?? false,
      claimed: claimedIds.has(m.id),
    }));
  }

  /**
   * Claim a mission reward. Credits totalCoins + lifetimeEarned.
   */
  static async claimMissionReward(
    userId: string,
    missionId: string
  ): Promise<{ success: boolean; reward: number; newBalance: number }> {
    const mission = MISSIONS.find(m => m.id === missionId);
    if (!mission) {
      throw new Error('Unknown mission');
    }

    // Verify mission is actually completed
    const missions = await this.getMissions(userId);
    const status = missions.find(m => m.id === missionId);
    if (!status?.completed) {
      throw new Error('Mission not yet completed');
    }
    if (status.claimed) {
      throw new Error('Mission reward already claimed');
    }

    // Initialize coins if needed (outside transaction)
    let coins = await PositivityCoins.findByPk(userId);
    if (!coins) {
      coins = await CoinsService.initializeUserCoins(userId);
    }

    const transaction = await sequelize.transaction();

    try {
      // Double-check not already claimed inside transaction
      const existing = await CoinTransaction.count({
        where: {
          toUserId: userId,
          transactionType: 'mission_reward',
          message: missionId,
        },
        transaction,
      });
      if (existing > 0) {
        await transaction.rollback();
        throw new Error('Mission reward already claimed');
      }

      // Create reward transaction
      await CoinTransaction.create(
        {
          fromUserId: null, // system
          toUserId: userId,
          amount: mission.reward,
          transactionType: 'mission_reward',
          message: missionId,
        },
        { transaction }
      );

      // Credit user's balance
      const coinsInTx = await PositivityCoins.findByPk(userId, { transaction });
      if (!coinsInTx) {
        await transaction.rollback();
        throw new Error('Coins not initialized');
      }

      await coinsInTx.update(
        {
          totalCoins: coinsInTx.totalCoins + mission.reward,
          lifetimeEarned: coinsInTx.lifetimeEarned + mission.reward,
        },
        { transaction }
      );

      await transaction.commit();

      logger.info('Mission reward claimed', { userId, missionId, reward: mission.reward });

      return {
        success: true,
        reward: mission.reward,
        newBalance: coinsInTx.totalCoins + mission.reward,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

export default MissionsService;
