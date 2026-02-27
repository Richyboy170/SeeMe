import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Fuse from 'fuse.js';
import { Topic, TopicFollow, TopicAdmin, PostTopic, UserTopicStatus, User, Post, CoinTransaction, Like } from '../models';
import { PostStatus } from '../models/Post';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class TopicController {
    /**
     * Check if user is a topic admin (creator or assigned admin)
     */
    static async isTopicAdmin(topicId: string, userId: string): Promise<boolean> {
        const topic = await Topic.findByPk(topicId);
        if (!topic) return false;
        if (topic.creatorId === userId) return true;
        try {
            const adminEntry = await TopicAdmin.findOne({
                where: { topicId, userId }
            });
            return !!adminEntry;
        } catch {
            // topic_admins table may not exist yet
            return false;
        }
    }

    /**
     * Get how many posts a user has made in each topic.
     * Returns Map<topicId, postCount>.
     */
    private static async getUserTopicActivity(userId: string): Promise<Map<string, number>> {
        const sequelize = Topic.sequelize!;
        const [rows] = await sequelize.query(
            `SELECT pt.topic_id AS "topicId", COUNT(*) AS "postCount"
             FROM post_topics pt
             JOIN posts p ON p.id = pt.post_id
             WHERE p.user_id = :userId
             GROUP BY pt.topic_id`,
            { replacements: { userId } }
        ) as [Array<{ topicId: string; postCount: string }>, unknown];

        const map = new Map<string, number>();
        for (const row of rows) {
            map.set(row.topicId, parseInt(row.postCount, 10));
        }
        return map;
    }

    /**
     * Fetch engagement stats for all active topics in one query.
     * Returns weekly posts, weekly likes, and total posts per topic.
     */
    private static async getTopicEngagementStats(): Promise<Map<string, {
        weeklyPostCount: number;
        weeklyLikes: number;
        totalPostCount: number;
    }>> {
        const sequelize = Topic.sequelize!;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [rows] = await sequelize.query(
            `SELECT pt.topic_id AS "topicId",
                    COUNT(*) AS "totalPostCount",
                    COUNT(CASE WHEN p.created_at >= :weekAgo THEN 1 END) AS "weeklyPostCount",
                    COALESCE(SUM(CASE WHEN p.created_at >= :weekAgo THEN p.likes_count ELSE 0 END), 0) AS "weeklyLikes"
             FROM post_topics pt
             JOIN posts p ON p.id = pt.post_id
             WHERE p.status = 'completed'
             GROUP BY pt.topic_id`,
            { replacements: { weekAgo } }
        ) as [Array<{ topicId: string; totalPostCount: string; weeklyPostCount: string; weeklyLikes: string }>, unknown];

        const map = new Map<string, { weeklyPostCount: number; weeklyLikes: number; totalPostCount: number }>();
        for (const row of rows) {
            map.set(row.topicId, {
                weeklyPostCount: parseInt(row.weeklyPostCount, 10),
                weeklyLikes: parseInt(row.weeklyLikes, 10),
                totalPostCount: parseInt(row.totalPostCount, 10),
            });
        }
        return map;
    }

    /**
     * Rank topics by community engagement.
     * Score = weighted sum of recent posting activity, engagement (likes),
     * member count, and growth momentum.
     */
    private static rankByEngagement(
        topics: Topic[],
        engagement: Map<string, { weeklyPostCount: number; weeklyLikes: number; totalPostCount: number }>
    ): Topic[] {
        // Find maxes for normalization
        let maxFollowers = 1;
        let maxWeeklyPosts = 1;
        let maxWeeklyLikes = 1;
        let maxTotalPosts = 1;

        for (const topic of topics) {
            if (topic.followerCount > maxFollowers) maxFollowers = topic.followerCount;
            const stats = engagement.get(topic.id);
            if (stats) {
                if (stats.weeklyPostCount > maxWeeklyPosts) maxWeeklyPosts = stats.weeklyPostCount;
                if (stats.weeklyLikes > maxWeeklyLikes) maxWeeklyLikes = stats.weeklyLikes;
                if (stats.totalPostCount > maxTotalPosts) maxTotalPosts = stats.totalPostCount;
            }
        }

        const scored = topics.map(topic => {
            const stats = engagement.get(topic.id) || { weeklyPostCount: 0, weeklyLikes: 0, totalPostCount: 0 };

            // 1. Recent posting activity (0-35) — heaviest weight, communities that post win
            const recentPostScore = 35 * Math.min(1, stats.weeklyPostCount / maxWeeklyPosts);

            // 2. Recent engagement / likes (0-25) — buzzing communities with reactions
            const engagementScore = 25 * Math.min(1, stats.weeklyLikes / maxWeeklyLikes);

            // 3. Community size (0-15) — larger communities get a boost
            const sizeScore = 15 * Math.min(1, topic.followerCount / maxFollowers);

            // 4. Content depth (0-10) — communities with history of content
            const depthScore = 10 * Math.min(1, stats.totalPostCount / maxTotalPosts);

            // 5. Activity-per-member ratio (0-15) — small but active > large but dead
            const postsPerMember = topic.followerCount > 0
                ? stats.weeklyPostCount / topic.followerCount
                : 0;
            const ratioScore = 15 * Math.min(1, postsPerMember / 0.5); // 0.5 posts/member/week = max

            const totalScore = recentPostScore + engagementScore + sizeScore + depthScore + ratioScore;

            return { topic, score: totalScore };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.map(s => s.topic);
    }

    /**
     * Score and sort topics for a user based on their posting activity
     * AND community engagement. Returns topics sorted by combined score.
     */
    private static scoreTopicsForUser(
        topics: Topic[],
        userActivity: Map<string, number>,
        followedTopicIds: string[],
        engagement: Map<string, { weeklyPostCount: number; weeklyLikes: number; totalPostCount: number }>
    ): Topic[] {
        // Build category frequency map and keyword set from user's active topics
        const categoryPostCounts = new Map<string, number>();
        const userKeywords = new Set<string>();
        let totalUserPosts = 0;

        const topicById = new Map(topics.map(t => [t.id, t]));

        for (const [topicId, postCount] of userActivity) {
            totalUserPosts += postCount;
            const topic = topicById.get(topicId);
            if (!topic) continue;

            categoryPostCounts.set(
                topic.category,
                (categoryPostCounts.get(topic.category) || 0) + postCount
            );

            if (topic.searchKeywords) {
                for (const kw of topic.searchKeywords.split(',')) {
                    const trimmed = kw.trim().toLowerCase();
                    if (trimmed) userKeywords.add(trimmed);
                }
            }
        }

        // Find maxes for normalization
        let maxFollowerCount = 1;
        let maxWeeklyPosts = 1;
        let maxWeeklyLikes = 1;
        for (const topic of topics) {
            if (topic.followerCount > maxFollowerCount) maxFollowerCount = topic.followerCount;
            const stats = engagement.get(topic.id);
            if (stats) {
                if (stats.weeklyPostCount > maxWeeklyPosts) maxWeeklyPosts = stats.weeklyPostCount;
                if (stats.weeklyLikes > maxWeeklyLikes) maxWeeklyLikes = stats.weeklyLikes;
            }
        }

        const followedSet = new Set(followedTopicIds);

        const scored = topics.map(topic => {
            const userPostsInTopic = userActivity.get(topic.id) || 0;
            const stats = engagement.get(topic.id) || { weeklyPostCount: 0, weeklyLikes: 0, totalPostCount: 0 };

            // --- Personal relevance (0-45) ---
            // 1. Direct activity (0-25)
            const directScore = 25 * Math.min(1, userPostsInTopic / 5);

            // 2. Category affinity (0-12)
            const categoryPosts = categoryPostCounts.get(topic.category) || 0;
            const categoryScore = totalUserPosts > 0
                ? 12 * (categoryPosts / totalUserPosts)
                : 0;

            // 3. Keyword overlap (0-8)
            let keywordScore = 0;
            if (topic.searchKeywords && userKeywords.size > 0) {
                const topicKeywords = topic.searchKeywords
                    .split(',')
                    .map(kw => kw.trim().toLowerCase())
                    .filter(Boolean);
                if (topicKeywords.length > 0) {
                    const overlap = topicKeywords.filter(kw => userKeywords.has(kw)).length;
                    keywordScore = 8 * (overlap / topicKeywords.length);
                }
            }

            // --- Community engagement (0-55) ---
            // 4. Recent posting activity (0-25)
            const recentPostScore = 25 * Math.min(1, stats.weeklyPostCount / maxWeeklyPosts);

            // 5. Recent likes/engagement (0-15)
            const engagementScore = 15 * Math.min(1, stats.weeklyLikes / maxWeeklyLikes);

            // 6. Community size (0-8)
            const popularityScore = 8 * Math.min(1, topic.followerCount / maxFollowerCount);

            // 7. Activity-per-member ratio (0-7)
            const postsPerMember = topic.followerCount > 0
                ? stats.weeklyPostCount / topic.followerCount
                : 0;
            const ratioScore = 7 * Math.min(1, postsPerMember / 0.5);

            // --- Adjustments ---
            const followDemotion = (followedSet.has(topic.id) && userPostsInTopic === 0) ? -5 : 0;

            const totalScore = directScore + categoryScore + keywordScore
                + recentPostScore + engagementScore + popularityScore + ratioScore
                + followDemotion;

            return { topic, score: totalScore };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.map(s => s.topic);
    }

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
                            attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
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

            // Filter by topic type if provided
            const { type: topicType } = req.query;
            if (topicType && ['community', 'private', 'broadcast'].includes(topicType as string)) {
                where.type = topicType;
            }

            // Fetch all topics and engagement stats up front so we can rank by engagement
            const [allTopics, engagementStats] = await Promise.all([
                Topic.findAll({
                    where,
                    include: [{
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                    }]
                }),
                TopicController.getTopicEngagementStats()
            ]);

            let topics: Topic[];
            let followedTopicIds: string[] = [];

            if (search) {
                // Fuzzy search with Fuse.js, then re-rank by engagement
                const fuse = new Fuse(allTopics.map(t => t.toJSON()), {
                    keys: [
                        { name: 'name', weight: 0.4 },
                        { name: 'searchKeywords', weight: 0.35 },
                        { name: 'description', weight: 0.2 },
                        { name: 'category', weight: 0.05 },
                    ],
                    threshold: 0.45,
                    ignoreLocation: true,
                    distance: 200,
                    minMatchCharLength: 2,
                });

                const fuseResults = fuse.search(search as string);
                const idToModel = new Map(allTopics.map(t => [t.id, t]));
                topics = fuseResults
                    .map(r => idToModel.get(r.item.id))
                    .filter((t): t is Topic => !!t);
            } else if (sort === 'newest') {
                // Newest sort — purely chronological
                topics = [...allTopics].sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
            } else {
                // Default / popular / active — rank by engagement + personalization
                const shouldPersonalize = !!userId;

                if (shouldPersonalize) {
                    const [userActivity, follows] = await Promise.all([
                        TopicController.getUserTopicActivity(userId!),
                        TopicFollow.findAll({
                            where: { userId },
                            attributes: ['topicId']
                        })
                    ]);

                    followedTopicIds = follows.map(f => f.topicId);

                    topics = TopicController.scoreTopicsForUser(
                        allTopics, userActivity, followedTopicIds, engagementStats
                    );
                } else {
                    // Anonymous users — pure engagement ranking
                    topics = TopicController.rankByEngagement(allTopics, engagementStats);
                }
            }

            // Paginate
            const totalCount = topics.length;
            topics = topics.slice(Number(offset), Number(offset) + Number(limit));
            const hasMore = Number(offset) + Number(limit) < totalCount;

            // Fetch followed topic IDs if not already fetched
            if (userId && followedTopicIds.length === 0) {
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
                // Get top 5 posts for each topic ordered by likes (most attractive)
                for (const topicId of topicIds) {
                    try {
                        const postTopics = await PostTopic.findAll({
                            where: { topicId },
                            include: [{
                                model: Post,
                                as: 'post',
                                where: {
                                    status: PostStatus.COMPLETED
                                },
                                attributes: ['id', 'processedImageUrl', 'originalImageUrl', 'likesCount'],
                                required: true
                            }],
                            limit: 10 // Fetch more, then sort in JS
                        });

                        // Sort by likesCount in JS and take top 5
                        const posts = postTopics
                            .map(pt => pt.post)
                            .filter(Boolean)
                            .map((post: any) => post.toJSON ? post.toJSON() : post)
                            .sort((a: any, b: any) => (b?.likesCount || 0) - (a?.likesCount || 0))
                            .slice(0, 5);

                        previewPostsMap.set(topicId, posts);
                    } catch (err) {
                        // If error fetching posts for this topic, just set empty array
                        logger.error('Error fetching preview posts for topic', { topicId, error: err });
                        previewPostsMap.set(topicId, []);
                    }
                }
            }

            const topicsWithFollowStatus = topics.map(topic => {
                const stats = engagementStats.get(topic.id) || { weeklyPostCount: 0, weeklyLikes: 0, totalPostCount: 0 };
                return {
                    ...topic.toJSON(),
                    postCount: stats.totalPostCount,
                    weeklyPostCount: stats.weeklyPostCount,
                    isFollowing: followedTopicIds.includes(topic.id),
                    previewPosts: previewPostsMap.get(topic.id) || []
                };
            });

            res.json({
                success: true,
                topics: topicsWithFollowStatus,
                hasMore,
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
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                }]
            });

            if (!topic) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            let isFollowing = false;
            let autoJoined = false;
            if (userId) {
                const follow = await TopicFollow.findOne({
                    where: { userId, topicId: topic.id }
                });
                if (follow && follow.status === 'active') {
                    isFollowing = true;
                } else if (!follow && topic.type === 'private') {
                    // Auto-approve join via invite code for private groups
                    await TopicFollow.create({ userId, topicId: topic.id, status: 'active' });
                    await topic.increment('followerCount');
                    await topic.increment('memberCount');
                    isFollowing = true;
                    autoJoined = true;
                }
            }

            res.json({
                success: true,
                topic: {
                    ...topic.toJSON(),
                    isFollowing,
                    autoJoined,
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
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                }]
            });

            if (!topic) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            let isFollowing = false;
            let isPendingRequest = false;
            let isBroadcaster = false;
            let isMember = false;
            let userStatus = null;
            let isAdmin = false;

            if (userId) {
                const follow = await TopicFollow.findOne({
                    where: { userId, topicId: topic.id }
                });
                if (follow) {
                    if (follow.status === 'active') {
                        isFollowing = true;
                        isMember = true;
                    } else if (follow.status === 'pending') {
                        isPendingRequest = true;
                    }
                }

                userStatus = await UserTopicStatus.findOne({
                    where: { userId, topicId: topic.id }
                });

                // Check admin status - gracefully handle if table doesn't exist yet
                try {
                    isAdmin = await TopicController.isTopicAdmin(topic.id, userId);
                } catch {
                    isAdmin = topic.creatorId === userId;
                }

                // Check broadcaster status for broadcast channels
                if (topic.type === 'broadcast') {
                    try {
                        const broadcasterEntry = await TopicAdmin.findOne({
                            where: { topicId: topic.id, userId, role: 'broadcaster' }
                        });
                        isBroadcaster = !!broadcasterEntry || isAdmin;
                    } catch {
                        isBroadcaster = isAdmin;
                    }
                }
            }

            // Get recent members (only active for private groups)
            const followWhere: any = { topicId: topic.id };
            if (topic.type === 'private') {
                followWhere.status = 'active';
            }
            const recentFollowers = await TopicFollow.findAll({
                where: followWhere,
                limit: 10,
                order: [['createdAt', 'DESC']],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                }]
            });

            // Get admins - gracefully handle if table doesn't exist yet
            let topicAdmins: any[] = [];
            try {
                topicAdmins = await TopicAdmin.findAll({
                    where: { topicId: topic.id },
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                    }]
                });
            } catch {
                // topic_admins table may not exist yet
            }

            // Get post count this week
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weeklyPosts = await PostTopic.count({
                where: {
                    topicId: topic.id,
                    createdAt: { [Op.gte]: weekAgo }
                }
            });

            // Count pending requests for admins of private groups
            let pendingRequestCount = 0;
            if (isAdmin && topic.type === 'private') {
                pendingRequestCount = await TopicFollow.count({
                    where: { topicId: topic.id, status: 'pending' }
                });
            }

            res.json({
                success: true,
                topic: {
                    ...topic.toJSON(),
                    isFollowing,
                    isMember,
                    isPendingRequest,
                    isBroadcaster,
                    isAdmin,
                    userStatus,
                    weeklyPosts,
                    pendingRequestCount,
                    recentMembers: recentFollowers.map(f => f.user),
                    admins: topicAdmins.map(a => ({
                        ...a.user?.toJSON(),
                        role: a.role
                    }))
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
            const { name, description, iconEmoji, iconImageUrl, category, adminIds, type } = req.body;

            if (!name || name.length < 2) {
                res.status(400).json({ error: 'Topic name must be at least 2 characters' });
                return;
            }

            if (!category) {
                res.status(400).json({ error: 'Category is required' });
                return;
            }

            // Validate type
            const topicType = type && ['community', 'private', 'broadcast'].includes(type) ? type : 'community';

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

            // Create topic with type-specific defaults
            const topic = await Topic.create({
                name,
                slug,
                description,
                iconEmoji: iconEmoji || '🏷️',
                iconImageUrl: iconImageUrl || null,
                category,
                creatorId: userId,
                inviteCode,
                isOfficial: false,
                type: topicType,
                requireApproval: topicType === 'private',
                isDiscoverable: topicType !== 'private',
            });

            // Create TopicAdmin entry for the creator (non-blocking)
            try {
                await TopicAdmin.create({
                    topicId: topic.id,
                    userId,
                    role: 'creator'
                });
            } catch (err) {
                logger.error('Could not create TopicAdmin entry (table may not exist yet)', { error: err });
            }

            // Note: For broadcast channels, the creator (with role 'creator') implicitly
            // has broadcaster privileges — no separate broadcaster entry needed.

            // Auto-follow the topic creator
            await TopicFollow.create({
                userId,
                topicId: topic.id,
                status: 'active'
            });

            let followerCount = 1;

            // Add co-admins if provided
            if (adminIds && Array.isArray(adminIds) && adminIds.length > 0) {
                for (const adminId of adminIds) {
                    if (adminId === userId) continue; // Skip creator
                    try {
                        await TopicAdmin.create({
                            topicId: topic.id,
                            userId: adminId,
                            role: 'admin'
                        });
                    } catch (err) {
                        logger.error('Error adding admin during topic creation', { adminId, error: err });
                    }
                    try {
                        // Auto-follow admin
                        await TopicFollow.findOrCreate({
                            where: { userId: adminId, topicId: topic.id },
                            defaults: { userId: adminId, topicId: topic.id }
                        });
                        followerCount++;
                    } catch (err) {
                        logger.error('Error auto-following admin', { adminId, error: err });
                    }
                }
            }

            // Update follower count
            await topic.update({ followerCount });

            // Fetch with creator info
            const topicWithCreator = await Topic.findByPk(topic.id, {
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
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
                if (existingFollow.status === 'active') {
                    res.status(400).json({ error: 'Already following this topic' });
                    return;
                }
                if (existingFollow.status === 'pending') {
                    res.status(400).json({ error: 'Join request already pending' });
                    return;
                }
                // If rejected, allow re-request
                if (existingFollow.status === 'rejected') {
                    await existingFollow.update({ status: topic.type === 'private' ? 'pending' : 'active' });
                    if (topic.type !== 'private') {
                        await topic.increment('followerCount');
                        await topic.increment('memberCount');
                    }
                    res.json({
                        success: true,
                        isFollowing: topic.type !== 'private',
                        isPending: topic.type === 'private'
                    });
                    return;
                }
            }

            // For private groups with require_approval, create as pending
            const status = topic.type === 'private' ? 'pending' : 'active';
            await TopicFollow.create({ userId, topicId, status });

            if (status === 'active') {
                // Update follower count
                await topic.increment('followerCount');
                await topic.increment('memberCount');

                // Initialize user topic status as beginner
                await UserTopicStatus.findOrCreate({
                    where: { userId, topicId },
                    defaults: {
                        userId,
                        topicId,
                        isBeginner: true
                    }
                });
            }

            res.json({
                success: true,
                isFollowing: status === 'active',
                isPending: status === 'pending'
            });
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

            const wasActive = follow.status === 'active';
            await follow.destroy();

            // Update counts only if the follow was active (not pending/rejected)
            if (wasActive) {
                const topic = await Topic.findByPk(topicId);
                if (topic) {
                    await topic.decrement('followerCount');
                    await topic.decrement('memberCount');
                }
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
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
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
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
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

            // Check if topic is private and user is an active member
            const topic = await Topic.findByPk(topicId);
            if (topic && topic.type === 'private') {
                if (!currentUserId) {
                    res.status(403).json({ error: 'You must be a member to view posts in this group' });
                    return;
                }
                const membership = await TopicFollow.findOne({
                    where: { userId: currentUserId, topicId, status: 'active' }
                });
                if (!membership) {
                    const isAdmin = await TopicController.isTopicAdmin(topicId, currentUserId);
                    if (!isAdmin) {
                        res.status(403).json({ error: 'You must be a member to view posts in this group' });
                        return;
                    }
                }
            }

            const postTopics = await PostTopic.findAll({
                where: { topicId },
                include: [{
                    model: Post,
                    as: 'post',
                    where: {
                        status: PostStatus.COMPLETED
                    },
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
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

    /**
     * PUT /api/topics/:topicId
     * Update a topic (only by creator/admin)
     */
    static async updateTopic(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { topicId } = req.params;
            const { name, description, iconEmoji, iconImageUrl, coverImageUrl } = req.body;

            const topic = await Topic.findByPk(topicId);
            if (!topic) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            // Check if user is the creator or an admin
            const hasAccess = await TopicController.isTopicAdmin(topicId, userId);
            if (!hasAccess) {
                res.status(403).json({ error: 'Only community admins can edit this community' });
                return;
            }

            // Build update object
            const updates: any = {};
            if (name !== undefined) updates.name = name;
            if (description !== undefined) updates.description = description;
            if (iconEmoji !== undefined) updates.iconEmoji = iconEmoji;
            if (iconImageUrl !== undefined) updates.iconImageUrl = iconImageUrl;
            if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;

            await topic.update(updates);

            // Fetch updated topic with creator
            const updatedTopic = await Topic.findByPk(topicId, {
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                }]
            });

            res.json({
                success: true,
                topic: updatedTopic
            });
        } catch (error) {
            logger.error('Error updating topic', { error });
            res.status(500).json({ error: 'Failed to update topic' });
        }
    }

    /**
     * GET /api/topics/:topicId/members
     * Get all members (followers) of a topic with pagination
     */
    static async getTopicMembers(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { topicId } = req.params;
            const { limit = 50, offset = 0, search } = req.query;
            const topic = await Topic.findByPk(topicId);
            if (!topic || !topic.isActive) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            // Build user where clause for search
            const userWhere: any = {};
            if (search) {
                userWhere.username = { [Op.like]: `%${search}%` };
            }

            const followers = await TopicFollow.findAndCountAll({
                where: { topicId },
                limit: Number(limit),
                offset: Number(offset),
                order: [['createdAt', 'DESC']],
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId'],
                    where: Object.keys(userWhere).length > 0 ? userWhere : undefined
                }]
            });

            // Get user stats in this community
            const userIds = followers.rows.map(f => f.user?.id).filter(Boolean) as string[];

            // Only query user statuses if there are users
            let statusMap = new Map<string, any>();
            if (userIds.length > 0) {
                const userStatuses = await UserTopicStatus.findAll({
                    where: {
                        topicId,
                        userId: { [Op.in]: userIds }
                    }
                });
                statusMap = new Map(userStatuses.map(s => [s.userId, s]));
            }

            const members = followers.rows
                .filter(f => f.user)
                .map(f => {
                    const status = statusMap.get(f.user!.id);
                    return {
                        user: f.user,
                        joinedAt: f.createdAt,
                        postCount: status?.postCount || 0,
                        coinsReceived: status?.coinsReceived || 0,
                        isBeginner: status?.isBeginner ?? true,
                        isCreator: f.user!.id === topic.creatorId
                    };
                });

            const total = followers.count || 0;
            res.json({
                success: true,
                members,
                total,
                hasMore: Number(offset) + Number(limit) < total
            });
        } catch (error) {
            logger.error('Error fetching topic members', { error });
            res.status(500).json({ error: 'Failed to fetch members' });
        }
    }
    /**
     * GET /api/topics/:topicId/admins
     * Get all admins for a topic
     */
    static async getTopicAdmins(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { topicId } = req.params;

            const admins = await TopicAdmin.findAll({
                where: { topicId },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                }],
                order: [['createdAt', 'ASC']]
            });

            res.json({
                success: true,
                admins: admins.map(a => ({
                    ...a.user?.toJSON(),
                    role: a.role,
                    addedAt: a.createdAt
                }))
            });
        } catch (error) {
            logger.error('Error fetching topic admins', { error });
            res.status(500).json({ error: 'Failed to fetch admins' });
        }
    }

    /**
     * POST /api/topics/:topicId/admins
     * Add an admin to a topic (creator-only)
     */
    static async addTopicAdmin(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { topicId } = req.params;
            const { userId: adminUserId } = req.body;

            if (!adminUserId) {
                res.status(400).json({ error: 'userId is required' });
                return;
            }

            const topic = await Topic.findByPk(topicId);
            if (!topic) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            // Only creator can add admins
            if (topic.creatorId !== userId) {
                res.status(403).json({ error: 'Only the community creator can add admins' });
                return;
            }

            // Check if already admin
            const existing = await TopicAdmin.findOne({
                where: { topicId, userId: adminUserId }
            });
            if (existing) {
                res.status(400).json({ error: 'User is already an admin' });
                return;
            }

            await TopicAdmin.create({
                topicId,
                userId: adminUserId,
                role: 'admin'
            });

            // Auto-follow the admin
            await TopicFollow.findOrCreate({
                where: { userId: adminUserId, topicId },
                defaults: { userId: adminUserId, topicId }
            });

            res.json({ success: true });
        } catch (error) {
            logger.error('Error adding topic admin', { error });
            res.status(500).json({ error: 'Failed to add admin' });
        }
    }

    /**
     * DELETE /api/topics/:topicId/admins/:userId
     * Remove an admin from a topic (creator-only)
     */
    static async removeTopicAdmin(req: AuthRequest, res: Response): Promise<void> {
        try {
            const currentUserId = req.user!.id;
            const { topicId, userId: targetUserId } = req.params;

            const topic = await Topic.findByPk(topicId);
            if (!topic) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            // Only creator can remove admins
            if (topic.creatorId !== currentUserId) {
                res.status(403).json({ error: 'Only the community creator can remove admins' });
                return;
            }

            // Cannot remove the creator
            if (targetUserId === topic.creatorId) {
                res.status(400).json({ error: 'Cannot remove the community creator' });
                return;
            }

            const admin = await TopicAdmin.findOne({
                where: { topicId, userId: targetUserId }
            });

            if (!admin) {
                res.status(404).json({ error: 'Admin not found' });
                return;
            }

            await admin.destroy();

            res.json({ success: true });
        } catch (error) {
            logger.error('Error removing topic admin', { error });
            res.status(500).json({ error: 'Failed to remove admin' });
        }
    }

    // ── Private Group: Join Requests ─────────────────────────────────

    /**
     * POST /api/topics/:topicId/request-join
     * Request to join a private group
     */
    static async requestJoin(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { topicId } = req.params;

            const topic = await Topic.findByPk(topicId);
            if (!topic || !topic.isActive) {
                res.status(404).json({ error: 'Topic not found' });
                return;
            }

            if (topic.type !== 'private') {
                res.status(400).json({ error: 'This is not a private group. Use follow instead.' });
                return;
            }

            const existingFollow = await TopicFollow.findOne({
                where: { userId, topicId }
            });

            if (existingFollow) {
                if (existingFollow.status === 'active') {
                    res.status(400).json({ error: 'Already a member' });
                    return;
                }
                if (existingFollow.status === 'pending') {
                    res.status(400).json({ error: 'Request already pending' });
                    return;
                }
                // Re-request after rejection
                await existingFollow.update({ status: 'pending' });
                res.json({ success: true, status: 'pending' });
                return;
            }

            await TopicFollow.create({ userId, topicId, status: 'pending' });

            res.json({ success: true, status: 'pending' });
        } catch (error) {
            logger.error('Error requesting to join topic', { error });
            res.status(500).json({ error: 'Failed to request join' });
        }
    }

    /**
     * GET /api/topics/:topicId/pending-requests
     * Admin: list pending join requests
     */
    static async getPendingRequests(req: AuthRequest, res: Response): Promise<void> {
        try {
            const userId = req.user!.id;
            const { topicId } = req.params;

            const isAdmin = await TopicController.isTopicAdmin(topicId, userId);
            if (!isAdmin) {
                res.status(403).json({ error: 'Only admins can view pending requests' });
                return;
            }

            const pendingFollows = await TopicFollow.findAll({
                where: { topicId, status: 'pending' },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                }],
                order: [['createdAt', 'ASC']]
            });

            res.json({
                success: true,
                requests: pendingFollows.map(f => ({
                    id: f.id,
                    user: f.user,
                    requestedAt: f.createdAt,
                }))
            });
        } catch (error) {
            logger.error('Error fetching pending requests', { error });
            res.status(500).json({ error: 'Failed to fetch pending requests' });
        }
    }

    /**
     * POST /api/topics/:topicId/handle-request
     * Admin: approve or reject a join request
     */
    static async handleRequest(req: AuthRequest, res: Response): Promise<void> {
        try {
            const currentUserId = req.user!.id;
            const { topicId } = req.params;
            const { userId: targetUserId, action } = req.body;

            if (!targetUserId || !['approve', 'reject'].includes(action)) {
                res.status(400).json({ error: 'userId and action (approve/reject) are required' });
                return;
            }

            const isAdmin = await TopicController.isTopicAdmin(topicId, currentUserId);
            if (!isAdmin) {
                res.status(403).json({ error: 'Only admins can handle requests' });
                return;
            }

            const follow = await TopicFollow.findOne({
                where: { topicId, userId: targetUserId, status: 'pending' }
            });

            if (!follow) {
                res.status(404).json({ error: 'Pending request not found' });
                return;
            }

            if (action === 'approve') {
                await follow.update({ status: 'active' });

                const topic = await Topic.findByPk(topicId);
                if (topic) {
                    await topic.increment('followerCount');
                    await topic.increment('memberCount');
                }

                // Initialize user topic status
                await UserTopicStatus.findOrCreate({
                    where: { userId: targetUserId, topicId },
                    defaults: {
                        userId: targetUserId,
                        topicId,
                        isBeginner: true
                    }
                });
            } else {
                await follow.update({ status: 'rejected' });
            }

            res.json({ success: true, status: follow.status });
        } catch (error) {
            logger.error('Error handling join request', { error });
            res.status(500).json({ error: 'Failed to handle request' });
        }
    }

    // ── Broadcast Channel: Broadcaster Management ────────────────────

    /**
     * GET /api/topics/:topicId/broadcasters
     * List broadcasters for a channel
     */
    static async getBroadcasters(req: AuthRequest, res: Response): Promise<void> {
        try {
            const { topicId } = req.params;

            const broadcasters = await TopicAdmin.findAll({
                where: { topicId, role: 'broadcaster' },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                }]
            });

            // Also include admins and creator as they can broadcast too
            const admins = await TopicAdmin.findAll({
                where: { topicId, role: { [Op.in]: ['creator', 'admin'] } },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatarUrl', 'activeAvatarId']
                }]
            });

            res.json({
                success: true,
                broadcasters: broadcasters.map(b => ({
                    ...b.user?.toJSON(),
                    role: 'broadcaster'
                })),
                admins: admins.map(a => ({
                    ...a.user?.toJSON(),
                    role: a.role
                }))
            });
        } catch (error) {
            logger.error('Error fetching broadcasters', { error });
            res.status(500).json({ error: 'Failed to fetch broadcasters' });
        }
    }

    /**
     * POST /api/topics/:topicId/broadcasters
     * Admin: add a broadcaster
     */
    static async addBroadcaster(req: AuthRequest, res: Response): Promise<void> {
        try {
            const currentUserId = req.user!.id;
            const { topicId } = req.params;
            const { userId: targetUserId } = req.body;

            if (!targetUserId) {
                res.status(400).json({ error: 'userId is required' });
                return;
            }

            const isAdmin = await TopicController.isTopicAdmin(topicId, currentUserId);
            if (!isAdmin) {
                res.status(403).json({ error: 'Only admins can add broadcasters' });
                return;
            }

            // Check if already a broadcaster
            const existing = await TopicAdmin.findOne({
                where: { topicId, userId: targetUserId, role: 'broadcaster' }
            });
            if (existing) {
                res.status(400).json({ error: 'User is already a broadcaster' });
                return;
            }

            await TopicAdmin.create({
                topicId,
                userId: targetUserId,
                role: 'broadcaster'
            });

            res.json({ success: true });
        } catch (error) {
            logger.error('Error adding broadcaster', { error });
            res.status(500).json({ error: 'Failed to add broadcaster' });
        }
    }

    /**
     * DELETE /api/topics/:topicId/broadcasters/:userId
     * Admin: remove a broadcaster
     */
    static async removeBroadcaster(req: AuthRequest, res: Response): Promise<void> {
        try {
            const currentUserId = req.user!.id;
            const { topicId, userId: targetUserId } = req.params;

            const isAdmin = await TopicController.isTopicAdmin(topicId, currentUserId);
            if (!isAdmin) {
                res.status(403).json({ error: 'Only admins can remove broadcasters' });
                return;
            }

            const broadcaster = await TopicAdmin.findOne({
                where: { topicId, userId: targetUserId, role: 'broadcaster' }
            });

            if (!broadcaster) {
                res.status(404).json({ error: 'Broadcaster not found' });
                return;
            }

            await broadcaster.destroy();

            res.json({ success: true });
        } catch (error) {
            logger.error('Error removing broadcaster', { error });
            res.status(500).json({ error: 'Failed to remove broadcaster' });
        }
    }
}

export default TopicController;
