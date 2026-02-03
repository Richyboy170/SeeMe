import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Topic, TopicFollow, PostTopic, UserTopicStatus, User, Post, CoinTransaction, Like } from '../models';
import { PostStatus, PostVisibility } from '../models/Post';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class TopicController {
    /**
     * GET /api/topics
     * Get all topics with optional filtering
     */
    static async getTopics(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { category, search, sort = 'popular', limit = 20, offset = 0, following } = req.query;
            const userId = req.user?.id;

            // If following=true, only return topics the user follows
            if (following === 'true') {
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }

                const userFollows = await TopicFollow.findAll({
                    where: { userId },
                    include: [{
                        model: Topic,
                        as: 'topic',
                        where: { isActive: true },
                        include: [{
                            model: User,
                            as: 'creator',
                            attributes: ['id', 'username', 'activeAvatarId']
                        }]
                    }]
                });

                const followedTopics = userFollows
                    .map(f => f.topic)
                    .filter(Boolean)
                    .map(topic => ({
                        ...topic!.toJSON(),
                        isFollowing: true
                    }));

                res.json({
                    success: true,
                    topics: followedTopics
                });
                return;
            }

            const where: any = { isActive: true, isDiscoverable: true };

            if (category) {
                where.category = category;
            }

            if (search) {
                where[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            let order: any[] = [];
            switch (sort) {
                case 'popular':
                    order = [['followerCount', 'DESC']];
                    break;
                case 'newest':
                    order = [['createdAt', 'DESC']];
                    break;
                case 'active':
                    order = [['weeklyPostCount', 'DESC']];
                    break;
                default:
                    order = [['followerCount', 'DESC']];
            }

            const topics = await Topic.findAll({
                where,
                order,
                limit: Number(limit),
                offset: Number(offset),
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });

            // Check if user follows each topic
            let followedTopicIds: string[] = [];
            if (userId) {
                const follows = await TopicFollow.findAll({
                    where: { userId },
                    attributes: ['topicId']
                });
                followedTopicIds = follows.map(f => f.topicId);
            }

            // Fetch preview posts for each topic (5 most attractive posts)
            const topicIds = topics.map(t => t.id);
            const previewPostsMap = new Map<string, any[]>();

            if (topicIds.length > 0) {
                // Get top 5 posts for each topic ordered by coins received (most attractive)
                for (const topicId of topicIds) {
                    try {
                        const postTopics = await PostTopic.findAll({
                            where: { topicId },
                            include: [{
                                model: Post,
                                as: 'post',
                                where: {
                                    status: PostStatus.COMPLETED,
                                    visibility: {
                                        [Op.in]: [PostVisibility.TOPICS_ONLY, PostVisibility.TOPICS_AND_FRIENDS]
                                    }
                                },
                                attributes: ['id', 'processedImageUrl', 'originalImageUrl', 'coinsReceived'],
                                required: true
                            }],
                            limit: 10 // Fetch more, then sort in JS
                        });

                        // Sort by coinsReceived in JS and take top 5
                        const posts = postTopics
                            .map(pt => pt.post)
                            .filter(Boolean)
                            .sort((a: any, b: any) => (b?.coinsReceived || 0) - (a?.coinsReceived || 0))
                            .slice(0, 5);

                        previewPostsMap.set(topicId, posts);
                    } catch (err) {
                        // If error fetching posts for this topic, just set empty array
                        previewPostsMap.set(topicId, []);
                    }
                }
            }

            const topicsWithFollowStatus = topics.map(topic => ({
                ...topic.toJSON(),
                isFollowing: followedTopicIds.includes(topic.id),
                previewPosts: previewPostsMap.get(topic.id) || []
            }));

            res.json({
                success: true,
                topics: topicsWithFollowStatus
            });
        } catch (error) {
            logger.error('Error fetching topics', { error });
            res.status(500).json({ error: 'Failed to fetch topics' });
        }
    }

    /**
     * GET /api/topics/categories
     * Get available topic categories
     */
    static async getCategories(_req: Request, res: Response): Promise<void> {
        try {
            const categories = [
                { id: 'creative', name: 'Creative', icon: '🎨', description: 'Art, music, writing, and more' },
                { id: 'hobbies', name: 'Hobbies', icon: '🎯', description: 'Games, collecting, DIY projects' },
                { id: 'lifestyle', name: 'Lifestyle', icon: '🏠', description: 'Food, home, travel, fashion' },
                { id: 'fitness', name: 'Fitness', icon: '💪', description: 'Exercise, sports, health' },
                { id: 'learning', name: 'Learning', icon: '📚', description: 'Languages, skills, education' },
                { id: 'tech', name: 'Tech', icon: '💻', description: 'Programming, gadgets, gaming' }
            ];

            res.json({ success: true, categories });
        } catch (error) {
            logger.error('Error fetching categories', { error });
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    }

    /**
     * GET /api/topics/invite/:inviteCode
     * Get topic by invite code
     */
    static async getTopicByInviteCode(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { inviteCode } = req.params;
            const userId = req.user?.id;

            const topic = await Topic.findOne({
                where: { inviteCode, isActive: true },
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });

            if (!topic) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            let isFollowing = false;
            if (userId) {
                const follow = await TopicFollow.findOne({
                    where: { userId, topicId: topic.id }
                });
                isFollowing = !!follow;
            }

            res.json({
                success: true,
                topic: {
                    ...topic.toJSON(),
                    isFollowing
                }
            });
        } catch (error) {
            logger.error('Error fetching topic by invite code', { error });
            res.status(500).json({ error: 'Failed to fetch topic' });
        }
    }

    /**
     * GET /api/topics/:topicSlug
     * Get full topic page data
     */
    static async getTopicPage(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { topicSlug } = req.params;
            const userId = req.user?.id;

            const topic = await Topic.findOne({
                where: { slug: topicSlug, isActive: true },
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });

            if (!topic) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            let isFollowing = false;
            let userStatus = null;

            if (userId) {
                const follow = await TopicFollow.findOne({
                    where: { userId, topicId: topic.id }
                });
                isFollowing = !!follow;

                userStatus = await UserTopicStatus.findOne({
                    where: { userId, topicId: topic.id }
                });
            }

            // Get recent members
            const recentFollowers = await TopicFollow.findAll({
                where: { topicId: topic.id },
                limit: 10,
                order: [['createdAt', 'DESC']],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });

            // Get post count this week
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weeklyPosts = await PostTopic.count({
                where: {
                    topicId: topic.id,
                    createdAt: { [Op.gte]: weekAgo }
                }
            });

            res.json({
                success: true,
                topic: {
                    ...topic.toJSON(),
                    isFollowing,
                    userStatus,
                    weeklyPosts,
                    recentMembers: recentFollowers.map(f => f.user)
                }
            });
        } catch (error) {
            logger.error('Error fetching topic page', { error });
            res.status(500).json({ error: 'Failed to fetch topic page' });
        }
    }

    /**
     * POST /api/topics
     * Create a new topic (anyone can create)
     */
    static async createTopic(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { name, description, iconEmoji, category } = req.body;

            if (!name || name.length < 2) {
                res.status(400).json({ error: 'Topic name must be at least 2 characters' });
                return;
            }

            if (!category) {
                res.status(400).json({ error: 'Category is required' });
                return;
            }

            // Generate unique slug
            let slug = Topic.generateSlug(name);
            const existingSlug = await Topic.findOne({ where: { slug } });
            if (existingSlug) {
                slug = `${slug}-${Date.now().toString(36)}`;
            }

            // Generate unique invite code
            let inviteCode: string;
            let attempts = 0;
            do {
                inviteCode = Topic.generateInviteCode();
                const existingCode = await Topic.findOne({ where: { inviteCode } });
                if (!existingCode) break;
                attempts++;
            } while (attempts < 10);

            // Create topic
            const topic = await Topic.create({
                name,
                slug,
                description,
                iconEmoji: iconEmoji || '🏷️',
                category,
                creatorId: userId,
                inviteCode,
                isOfficial: false
            });

            // Auto-follow the topic creator
            await TopicFollow.create({
                userId,
                topicId: topic.id
            });

            // Update follower count
            await topic.update({ followerCount: 1 });

            // Fetch with creator info
            const topicWithCreator = await Topic.findByPk(topic.id, {
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });

            res.status(201).json({
                success: true,
                topic: topicWithCreator,
                shareableLinks: {
                    direct: `seeme.app/t/${slug}`,
                    invite: `seeme.app/invite/${inviteCode}`
                }
            });
        } catch (error) {
            logger.error('Error creating topic', { error });
            if ((error as any).name === 'SequelizeUniqueConstraintError') {
                res.status(400).json({ error: 'A topic with this name already exists' });
                return;
            }
            res.status(500).json({ error: 'Failed to create topic' });
        }
    }

    /**
     * POST /api/topics/:topicId/follow
     * Follow a topic
     */
    static async followTopic(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { topicId } = req.params;

            const topic = await Topic.findByPk(topicId);
            if (!topic || !topic.isActive) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            // Check if already following
            const existingFollow = await TopicFollow.findOne({
                where: { userId, topicId }
            });

            if (existingFollow) {
                res.status(400).json({ error: 'Already following this topic' });
                return;
            }

            // Create follow
            await TopicFollow.create({ userId, topicId });

            // Update follower count
            await topic.increment('followerCount');

            // Initialize user topic status as beginner
            await UserTopicStatus.findOrCreate({
                where: { userId, topicId },
                defaults: {
                    userId,
                    topicId,
                    isBeginner: true
                }
            });

            res.json({ success: true, isFollowing: true });
        } catch (error) {
            logger.error('Error following topic', { error });
            res.status(500).json({ error: 'Failed to follow topic' });
        }
    }

    /**
     * DELETE /api/topics/:topicId/follow
     * Unfollow a topic
     */
    static async unfollowTopic(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { topicId } = req.params;

            const follow = await TopicFollow.findOne({
                where: { userId, topicId }
            });

            if (!follow) {
                res.status(400).json({ error: 'Not following this topic' });
                return;
            }

            await follow.destroy();

            // Update follower count
            const topic = await Topic.findByPk(topicId);
            if (topic) {
                await topic.decrement('followerCount');
            }

            res.json({ success: true, isFollowing: false });
        } catch (error) {
            logger.error('Error unfollowing topic', { error });
            res.status(500).json({ error: 'Failed to unfollow topic' });
        }
    }

    /**
     * GET /api/topics/:topicId/beginners
     * Get beginners in a topic (for encouragement)
     */
    static async getTopicBeginners(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { topicId } = req.params;
            const { limit = 10 } = req.query;

            const beginners = await UserTopicStatus.findAll({
                where: {
                    topicId,
                    isBeginner: true
                },
                limit: Number(limit),
                order: [['lastPostAt', 'DESC']],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'activeAvatarId']
                }]
            });

            res.json({
                success: true,
                beginners: beginners.map(b => ({
                    user: b.user,
                    postCount: b.postCount,
                    coinsReceived: b.coinsReceived,
                    firstPostAt: b.firstPostAt
                }))
            });
        } catch (error) {
            logger.error('Error fetching topic beginners', { error });
            res.status(500).json({ error: 'Failed to fetch beginners' });
        }
    }

    /**
     * GET /api/topics/:topicId/share
     * Get shareable links for a topic
     */
    static async getShareableLinks(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { topicId } = req.params;

            const topic = await Topic.findByPk(topicId);
            if (!topic) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            res.json({
                success: true,
                links: {
                    direct: `seeme.app/t/${topic.slug}`,
                    invite: `seeme.app/invite/${topic.inviteCode}`
                }
            });
        } catch (error) {
            logger.error('Error getting shareable links', { error });
            res.status(500).json({ error: 'Failed to get shareable links' });
        }
    }

    /**
     * GET /api/topics/:topicId/leaderboard
     * Get leaderboard for a topic or global
     */
    static async getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { topicId } = req.params;
            const { type = 'givers', limit = 20 } = req.query;
            const sequelize = Topic.sequelize!;

            let leaderboard: any[] = [];

            if (type === 'givers') {
                const where: any = {
                    transactionType: { [Op.in]: ['encouragement', 'gift', 'post_reward'] }
                };

                // If topicId is provided and not 'global', filter by topic
                if (topicId && topicId !== 'global') {
                    where.topicId = topicId;
                }

                const results = await CoinTransaction.findAll({
                    attributes: [
                        'fromUserId',
                        [sequelize.fn('SUM', sequelize.col('amount')), 'totalGiven'],
                        [sequelize.fn('COUNT', sequelize.col('id')), 'giftCount']
                    ],
                    where,
                    group: ['fromUserId'],
                    order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
                    limit: Number(limit),
                    raw: true
                }) as any[];

                // Fetch user details
                const userIds = results.map(r => r.fromUserId).filter(Boolean);
                const users = await User.findAll({
                    where: { id: userIds },
                    attributes: ['id', 'username', 'activeAvatarId']
                });

                const userMap = new Map(users.map(u => [u.id, u]));

                leaderboard = results.map(r => ({
                    user: userMap.get(r.fromUserId),
                    totalGiven: parseInt(r.totalGiven) || 0,
                    giftCount: parseInt(r.giftCount) || 0
                })).filter(l => l.user);
            }

            res.json({
                success: true,
                leaderboard,
                type,
                topicId: topicId || 'global'
            });
        } catch (error) {
            logger.error('Error fetching leaderboard', { error });
            res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }

    /**
     * GET /api/topics/:topicId/posts
     * Get posts for a topic
     */
    static async getTopicPosts(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { topicId } = req.params;
            const { sort = 'recent', limit = 20, offset = 0 } = req.query;
            const currentUserId = req.user?.id;

            const postTopics = await PostTopic.findAll({
                where: { topicId },
                include: [{
                    model: Post,
                    as: 'post',
                    where: {
                        status: PostStatus.COMPLETED,
                        // Only show posts that should appear in topic feeds
                        visibility: {
                            [Op.in]: [PostVisibility.TOPICS_ONLY, PostVisibility.TOPICS_AND_FRIENDS]
                        }
                    },
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'activeAvatarId']
                    }]
                }],
                order: sort === 'recent'
                    ? [['createdAt', 'DESC']]
                    : [[{ model: Post, as: 'post' }, 'likesCount', 'DESC']],
                limit: Number(limit),
                offset: Number(offset)
            });

            const posts = postTopics
                .map(pt => pt.post)
                .filter(Boolean);

            // Get liked status for current user
            let likedPostIds: Set<string> = new Set();
            if (currentUserId && posts.length > 0) {
                const postIds = posts.map((p: any) => p.id);
                const likes = await Like.findAll({
                    where: {
                        userId: currentUserId,
                        postId: { [Op.in]: postIds }
                    },
                    attributes: ['postId']
                });
                likedPostIds = new Set(likes.map(l => l.postId));
            }

            // Add likedByMe field to each post
            const postsWithLikeStatus = posts.map((post: any) => ({
                ...post.toJSON(),
                likedByMe: likedPostIds.has(post.id)
            }));

            res.json({
                success: true,
                posts: postsWithLikeStatus
            });
        } catch (error) {
            logger.error('Error fetching topic posts', { error });
            res.status(500).json({ error: 'Failed to fetch posts' });
        }
    }
}

export default TopicController;
