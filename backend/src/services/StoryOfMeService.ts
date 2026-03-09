import { Op, fn, col } from 'sequelize';
import { StoryOfMe, StoryPeriodType, StoryStats, PostSummary, HighlightCard } from '../models/StoryOfMe';
import { Post } from '../models/Post';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import { logger } from '../utils/logger';

// ── Template pools ────────────────────────────────────────────────────

const WEEKLY_OPENERS = [
    'Your week at a glance',
    'This week\'s spotlight',
    'What a week!',
    'Your weekly highlights',
];

const MONTHLY_OPENERS = [
    'Your month in review',
    'This month\'s best moments',
    'A month to remember',
    'Your monthly spotlight',
];

const YEARLY_OPENERS = [
    'Your year wrapped',
    'A year of moments',
    'Your year in review',
    'What a year!',
];

const WEEKLY_CLOSERS = [
    'Keep the momentum going!',
    'Another great week in the books.',
    'Can\'t wait to see what next week brings!',
    'Your positivity is contagious.',
];

const MONTHLY_CLOSERS = [
    'Here\'s to another amazing month!',
    'Keep shining and inspiring others.',
    'What a month - keep it up!',
    'The community is lucky to have you.',
];

const YEARLY_CLOSERS = [
    'Here\'s to another incredible year!',
    'What a journey - here\'s to the next chapter.',
    'A whole year of making a difference.',
    'You made this year unforgettable.',
];

// ── Helpers ───────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateRange(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (s.getFullYear() !== e.getFullYear()) {
        return `${s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
    }
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

function getRollingBounds(periodType: StoryPeriodType): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    switch (periodType) {
        case 'weekly':
            start.setDate(now.getDate() - 7);
            break;
        case 'monthly':
            start.setDate(now.getDate() - 30);
            break;
        case 'yearly':
            start.setFullYear(now.getFullYear() - 1);
            break;
    }
    start.setHours(0, 0, 0, 0);

    return { start, end };
}

function toDateOnly(d: Date): string {
    return d.toISOString().split('T')[0];
}

function engagementScore(post: Post): number {
    return (post.likesCount || 0) * 1 + (post.commentsCount || 0) * 2 + (post.repostCount || 0) * 2;
}

function toPostSummary(post: Post): PostSummary {
    return {
        id: post.id,
        imageUrl: post.processedImageUrl || post.originalImageUrl || null,
        caption: post.caption || null,
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        repostCount: post.repostCount || 0,
        createdAt: post.createdAt?.toISOString?.() || new Date().toISOString(),
    };
}

function extractCaptionPhrases(captions: string[], limit: number = 5): string[] {
    const phrases: string[] = [];
    for (const cap of captions) {
        if (!cap || cap.trim().length === 0) continue;
        const trimmed = cap.trim();
        if (trimmed.length <= 60) {
            phrases.push(trimmed);
        } else {
            const firstSentence = trimmed.split(/[.!?]/)[0]?.trim();
            if (firstSentence && firstSentence.length > 0) {
                phrases.push(firstSentence);
            }
        }
        if (phrases.length >= limit) break;
    }
    return phrases;
}

// ── Service ───────────────────────────────────────────────────────────

export class StoryOfMeService {

    static async generateStory(userId: string, periodType: StoryPeriodType): Promise<StoryOfMe | null> {
        try {
            const user = await User.findByPk(userId);
            if (!user) return null;

            const bounds = getRollingBounds(periodType);
            const periodStart = toDateOnly(bounds.start);
            const periodEnd = toDateOnly(bounds.end);

            // ── Gather posts ──────────────────────────────────────────

            const posts = await Post.findAll({
                where: {
                    userId,
                    createdAt: { [Op.between]: [bounds.start, bounds.end] },
                    isArchived: false,
                },
                order: [['createdAt', 'DESC']],
            });

            const postCount = posts.length;
            if (postCount === 0) return null;

            const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
            const totalComments = posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);
            const totalReposts = posts.reduce((sum, p) => sum + (p.repostCount || 0), 0);

            // ── Coins ─────────────────────────────────────────────────

            const coinsEarnedResult = await CoinTransaction.findAll({
                attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
                where: {
                    toUserId: userId,
                    createdAt: { [Op.between]: [bounds.start, bounds.end] },
                    transactionType: {
                        [Op.in]: ['received_from_user', 'earned_post', 'earned_comment', 'earned_cooldown', 'encouragement', 'gift', 'post_reward', 'beginner_bonus'],
                    },
                },
                raw: true,
            });
            const coinsEarned = Number((coinsEarnedResult[0] as any)?.total) || 0;

            const coinsGivenResult = await CoinTransaction.findAll({
                attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
                where: {
                    fromUserId: userId,
                    createdAt: { [Op.between]: [bounds.start, bounds.end] },
                    transactionType: { [Op.in]: ['given_to_user', 'encouragement', 'gift'] },
                },
                raw: true,
            });
            const coinsGiven = Number((coinsGivenResult[0] as any)?.total) || 0;

            const stats: StoryStats = { postCount, totalLikes, totalComments, totalReposts, coinsEarned, coinsGiven };

            // ── Rank posts by engagement ──────────────────────────────

            const ranked = [...posts].sort((a, b) => engagementScore(b) - engagementScore(a));
            const topPost = ranked[0];

            // All remaining posts included (no cap)
            let openers: string[];
            let closers: string[];
            let titlePrefix: string;
            let topPostLabel: string;
            let galleryLabel: string;
            let quotesLabel: string;

            switch (periodType) {
                case 'weekly':
                    openers = WEEKLY_OPENERS;
                    closers = WEEKLY_CLOSERS;
                    titlePrefix = 'This Week\'s Highlights';
                    topPostLabel = 'Highlight of the week';
                    galleryLabel = 'More from this week';
                    quotesLabel = 'In your words';
                    break;
                case 'monthly':
                    openers = MONTHLY_OPENERS;
                    closers = MONTHLY_CLOSERS;
                    titlePrefix = 'This Month\'s Story';
                    topPostLabel = 'Standout moment';
                    galleryLabel = 'More highlights';
                    quotesLabel = 'Your own words';
                    break;
                case 'yearly':
                    openers = YEARLY_OPENERS;
                    closers = YEARLY_CLOSERS;
                    titlePrefix = 'Your Year in Review';
                    topPostLabel = 'Most popular post';
                    galleryLabel = 'Greatest hits';
                    quotesLabel = 'Words that defined your year';
                    break;
            }

            const galleryPosts = ranked.slice(1);

            // ── Caption excerpts ──────────────────────────────────────

            const captions = ranked
                .map(p => p.caption)
                .filter((c): c is string => c !== null && c.trim().length > 0);
            const captionExcerpts = extractCaptionPhrases(captions);

            // ── Build highlight cards ─────────────────────────────────

            const highlights: HighlightCard[] = [];

            // Opener
            highlights.push({ type: 'opener', text: pick(openers) });

            // Top post
            highlights.push({
                type: 'top_post',
                label: topPostLabel,
                post: toPostSummary(topPost),
            });

            // Post gallery (only if there are additional posts)
            if (galleryPosts.length > 0) {
                highlights.push({
                    type: 'post_gallery',
                    label: galleryLabel,
                    posts: galleryPosts.map(toPostSummary),
                });
            }

            // All posts sorted by date (newest first) for the inline grid
            const allPostsByDate = [...posts].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            highlights.push({
                type: 'all_posts',
                label: 'All posts',
                posts: allPostsByDate.map(toPostSummary),
            });

            // Stat row
            const statItems: { icon: string; value: number; label: string }[] = [
                { icon: 'images-outline', value: postCount, label: 'posts' },
                { icon: 'heart-outline', value: totalLikes, label: 'likes' },
                { icon: 'chatbubble-outline', value: totalComments, label: 'comments' },
            ];
            if (totalReposts > 0) {
                statItems.push({ icon: 'repeat-outline', value: totalReposts, label: 'reposts' });
            }
            highlights.push({ type: 'stat_row', items: statItems });

            // Caption quotes
            if (captionExcerpts.length > 0) {
                highlights.push({
                    type: 'caption_quotes',
                    label: quotesLabel,
                    quotes: captionExcerpts,
                });
            }

            // Coins
            if (coinsEarned > 0 || coinsGiven > 0) {
                highlights.push({
                    type: 'coins',
                    earned: coinsEarned,
                    given: coinsGiven,
                });
            }

            // Closer
            highlights.push({ type: 'closer', text: pick(closers) });

            // ── Persist ───────────────────────────────────────────────

            const content = JSON.stringify(highlights);
            const dateRange = formatDateRange(periodStart, periodEnd);

            await StoryOfMe.destroy({
                where: { userId, periodType },
            });

            const story = await StoryOfMe.create({
                userId,
                periodType,
                periodStart,
                periodEnd,
                title: `${titlePrefix} (${dateRange})`,
                content,
                stats: JSON.stringify(stats),
                captionExcerpts: JSON.stringify(captionExcerpts),
            });

            logger.info('Generated story', { userId, periodType, storyId: story.id, postCount });
            return story;
        } catch (error) {
            logger.error('Error generating story', { userId, periodType, error });
            return null;
        }
    }

    static async generateWeeklyStory(userId: string) {
        return this.generateStory(userId, 'weekly');
    }

    static async generateMonthlyStory(userId: string) {
        return this.generateStory(userId, 'monthly');
    }

    static async generateYearlyStory(userId: string) {
        return this.generateStory(userId, 'yearly');
    }

    static async generateAllWeeklyStories(): Promise<number> {
        try {
            const bounds = getRollingBounds('weekly');

            const results = await Post.findAll({
                attributes: [[fn('DISTINCT', col('user_id')), 'userId']],
                where: {
                    createdAt: { [Op.between]: [bounds.start, bounds.end] },
                    isArchived: false,
                },
                raw: true,
            });

            const userIds = results.map((r: any) => r.userId);
            let generated = 0;

            for (const uid of userIds) {
                const story = await this.generateWeeklyStory(uid);
                if (story) generated++;
            }

            logger.info(`Generated ${generated} weekly stories for ${userIds.length} active users`);
            return generated;
        } catch (error) {
            logger.error('Error generating all weekly stories', { error });
            return 0;
        }
    }

    static async getUserStories(userId: string, periodType?: StoryPeriodType): Promise<StoryOfMe[]> {
        const where: any = { userId, isPublished: true };
        if (periodType) where.periodType = periodType;

        return StoryOfMe.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: 20,
        });
    }

    static async getLatestStory(userId: string, periodType?: StoryPeriodType): Promise<StoryOfMe | null> {
        const where: any = { userId, isPublished: true };
        if (periodType) where.periodType = periodType;

        return StoryOfMe.findOne({
            where,
            order: [['createdAt', 'DESC']],
        });
    }
}
