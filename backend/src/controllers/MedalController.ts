import { Response } from 'express';
import { UserCommunityMedal, UserGlobalMedal, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class MedalController {
    /**
     * GET /api/medals/me
     * Get medals for the current authenticated user
     */
    static async getMyMedals(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;

            // Get community medals
            const communityMedals = await UserCommunityMedal.findAll({
                where: { userId },
                order: [['awardedAt', 'DESC']],
                limit: 50
            });

            // Get global medals
            const globalMedals = await UserGlobalMedal.findAll({
                where: { userId },
                order: [['awardedAt', 'DESC']],
                limit: 20
            });

            // Group community medals by topic for display
            const medalsByTopic: Record<string, any> = {};
            for (const medal of communityMedals) {
                if (!medalsByTopic[medal.topicId]) {
                    medalsByTopic[medal.topicId] = {
                        topicId: medal.topicId,
                        topicName: medal.topicName,
                        topicEmoji: medal.topicEmoji,
                        medals: []
                    };
                }
                medalsByTopic[medal.topicId].medals.push({
                    id: medal.id,
                    medalType: medal.medalType,
                    leaderboardType: medal.leaderboardType,
                    periodType: medal.periodType,
                    periodStart: medal.periodStart,
                    periodEnd: medal.periodEnd,
                    rankPosition: medal.rankPosition,
                    coinsAmount: medal.coinsAmount,
                    awardedAt: medal.awardedAt
                });
            }

            // Calculate counts
            const goldCount = communityMedals.filter(m => m.medalType === 'gold').length +
                             globalMedals.filter(m => m.medalType === 'gold').length;
            const silverCount = communityMedals.filter(m => m.medalType === 'silver').length +
                               globalMedals.filter(m => m.medalType === 'silver').length;
            const bronzeCount = communityMedals.filter(m => m.medalType === 'bronze').length +
                               globalMedals.filter(m => m.medalType === 'bronze').length;

            res.json({
                success: true,
                communityMedals: Object.values(medalsByTopic),
                globalMedals: globalMedals.map(m => ({
                    id: m.id,
                    medalType: m.medalType,
                    leaderboardType: m.leaderboardType,
                    periodType: m.periodType,
                    periodStart: m.periodStart,
                    periodEnd: m.periodEnd,
                    rankPosition: m.rankPosition,
                    coinsAmount: m.coinsAmount,
                    awardedAt: m.awardedAt
                })),
                totalMedals: communityMedals.length + globalMedals.length,
                goldCount,
                silverCount,
                bronzeCount
            });
        } catch (error) {
            logger.error('Error fetching my medals', { error });
            res.status(500).json({ error: 'Failed to fetch medals' });
        }
    }

    /**
     * GET /api/medals/users/:userId
     * Get all medals for a user's profile
     */
    static async getUserMedals(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            // Verify user exists
            const user = await User.findByPk(userId);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Get community medals
            const communityMedals = await UserCommunityMedal.findAll({
                where: { userId },
                order: [['awardedAt', 'DESC']],
                limit: 50
            });

            // Get global medals
            const globalMedals = await UserGlobalMedal.findAll({
                where: { userId },
                order: [['awardedAt', 'DESC']],
                limit: 20
            });

            // Group community medals by topic for display
            const medalsByTopic: Record<string, any> = {};
            for (const medal of communityMedals) {
                if (!medalsByTopic[medal.topicId]) {
                    medalsByTopic[medal.topicId] = {
                        topicId: medal.topicId,
                        topicName: medal.topicName,
                        topicEmoji: medal.topicEmoji,
                        medals: []
                    };
                }
                medalsByTopic[medal.topicId].medals.push({
                    id: medal.id,
                    medalType: medal.medalType,
                    leaderboardType: medal.leaderboardType,
                    periodType: medal.periodType,
                    periodStart: medal.periodStart,
                    periodEnd: medal.periodEnd,
                    rankPosition: medal.rankPosition,
                    coinsAmount: medal.coinsAmount,
                    awardedAt: medal.awardedAt
                });
            }

            // Calculate counts
            const goldCount = communityMedals.filter(m => m.medalType === 'gold').length +
                             globalMedals.filter(m => m.medalType === 'gold').length;
            const silverCount = communityMedals.filter(m => m.medalType === 'silver').length +
                               globalMedals.filter(m => m.medalType === 'silver').length;
            const bronzeCount = communityMedals.filter(m => m.medalType === 'bronze').length +
                               globalMedals.filter(m => m.medalType === 'bronze').length;

            res.json({
                success: true,
                communityMedals: Object.values(medalsByTopic),
                globalMedals: globalMedals.map(m => ({
                    id: m.id,
                    medalType: m.medalType,
                    leaderboardType: m.leaderboardType,
                    periodType: m.periodType,
                    periodStart: m.periodStart,
                    periodEnd: m.periodEnd,
                    rankPosition: m.rankPosition,
                    coinsAmount: m.coinsAmount,
                    awardedAt: m.awardedAt
                })),
                totalMedals: communityMedals.length + globalMedals.length,
                goldCount,
                silverCount,
                bronzeCount
            });
        } catch (error) {
            logger.error('Error fetching user medals', { error });
            res.status(500).json({ error: 'Failed to fetch medals' });
        }
    }
}

export default MedalController;
