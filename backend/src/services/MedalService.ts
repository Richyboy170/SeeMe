import { Op } from 'sequelize';
import { UserCommunityMedal, UserGlobalMedal, CoinTransaction, Topic } from '../models';
import { MedalType } from '../models/UserCommunityMedal';
import { logger } from '../utils/logger';
import { sequelize } from '../config/database';

export class MedalService {
    /**
     * Award weekly medals for a specific topic
     * Called by cron job every Sunday
     */
    static async awardWeeklyTopicMedals(topicId: string): Promise<void> {
        try {
            const topic = await Topic.findByPk(topicId);
            if (!topic) {
                logger.warn(`Topic not found for medal award: ${topicId}`);
                return;
            }

            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date();
            weekEnd.setHours(23, 59, 59, 999);

            // Get top 3 givers in this topic for the week
            const topGivers = await CoinTransaction.findAll({
                attributes: [
                    'fromUserId',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'totalGiven']
                ],
                where: {
                    topicId,
                    transactionType: { [Op.in]: ['encouragement', 'gift', 'post_reward'] },
                    createdAt: { [Op.between]: [weekStart, weekEnd] }
                },
                group: ['fromUserId'],
                order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
                limit: 3,
                raw: true
            }) as any[];

            const medalTypes: MedalType[] = ['gold', 'silver', 'bronze'];

            for (let i = 0; i < topGivers.length && i < 3; i++) {
                const giver = topGivers[i];
                const totalGiven = parseInt(giver.totalGiven) || 0;

                if (totalGiven > 0 && giver.fromUserId) {
                    try {
                        await UserCommunityMedal.create({
                            userId: giver.fromUserId,
                            topicId: topic.id,
                            medalType: medalTypes[i],
                            leaderboardType: 'givers',
                            periodType: 'weekly',
                            periodStart: weekStart,
                            periodEnd: weekEnd,
                            rankPosition: i + 1,
                            coinsAmount: totalGiven,
                            topicName: topic.name,
                            topicEmoji: topic.iconEmoji
                        });
                        logger.info(`Awarded ${medalTypes[i]} medal to user ${giver.fromUserId} in topic ${topic.name}`);
                    } catch (err) {
                        // Likely duplicate - skip
                        logger.debug(`Skipping duplicate medal for user ${giver.fromUserId}`);
                    }
                }
            }
        } catch (error) {
            logger.error(`Error awarding weekly medals for topic ${topicId}`, { error });
        }
    }

    /**
     * Award weekly global medals
     * Called by cron job every Sunday
     */
    static async awardWeeklyGlobalMedals(): Promise<void> {
        try {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date();
            weekEnd.setHours(23, 59, 59, 999);

            // Get top 3 global givers for the week
            const topGivers = await CoinTransaction.findAll({
                attributes: [
                    'fromUserId',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'totalGiven']
                ],
                where: {
                    transactionType: { [Op.in]: ['encouragement', 'gift', 'post_reward', 'given_to_user'] },
                    createdAt: { [Op.between]: [weekStart, weekEnd] }
                },
                group: ['fromUserId'],
                order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
                limit: 3,
                raw: true
            }) as any[];

            const medalTypes: MedalType[] = ['gold', 'silver', 'bronze'];

            for (let i = 0; i < topGivers.length && i < 3; i++) {
                const giver = topGivers[i];
                const totalGiven = parseInt(giver.totalGiven) || 0;

                if (totalGiven > 0 && giver.fromUserId) {
                    try {
                        await UserGlobalMedal.create({
                            userId: giver.fromUserId,
                            medalType: medalTypes[i],
                            leaderboardType: 'givers',
                            periodType: 'weekly',
                            periodStart: weekStart,
                            periodEnd: weekEnd,
                            rankPosition: i + 1,
                            coinsAmount: totalGiven
                        });
                        logger.info(`Awarded global ${medalTypes[i]} medal to user ${giver.fromUserId}`);
                    } catch (err) {
                        // Likely duplicate - skip
                        logger.debug(`Skipping duplicate global medal for user ${giver.fromUserId}`);
                    }
                }
            }
        } catch (error) {
            logger.error('Error awarding weekly global medals', { error });
        }
    }

    /**
     * Run all weekly medal awards
     */
    static async runWeeklyMedalAwards(): Promise<void> {
        logger.info('Starting weekly medal awards...');

        try {
            // Award global medals
            await MedalService.awardWeeklyGlobalMedals();
            logger.info('Global medals awarded');

            // Award medals for each active topic
            const topics = await Topic.findAll({ where: { isActive: true } });

            for (const topic of topics) {
                await MedalService.awardWeeklyTopicMedals(topic.id);
            }

            logger.info(`Weekly medal awards complete! Processed ${topics.length} topics`);
        } catch (error) {
            logger.error('Error in weekly medal awards', { error });
        }
    }

    /**
     * Get medal emoji based on type
     */
    static getMedalEmoji(medalType: MedalType): string {
        switch (medalType) {
            case 'gold': return '🥇';
            case 'silver': return '🥈';
            case 'bronze': return '🥉';
        }
    }
}

export default MedalService;
