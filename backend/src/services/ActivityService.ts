import crypto from 'crypto';
import axios from 'axios';
import { Op } from 'sequelize';
import { CommunityActivity } from '../models/CommunityActivity';
import { ActivityCompletion } from '../models/ActivityCompletion';
import { UserWheelSelection } from '../models/UserWheelSelection';
import { Topic } from '../models/Topic';
import { TopicFollow } from '../models/TopicFollow';
import { User } from '../models/User';
import { logger } from '../utils/logger';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ACTIVITIES_PER_GENERATION = 8;
const WHEEL_SIZE = 8;

/**
 * Deterministic seeded shuffle — same seed always produces the same order.
 * Uses a simple hash-based PRNG so the wheel is stable for a given user+date.
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = crypto.createHash('md5').update(seed).digest();
  let idx = 0;

  for (let i = result.length - 1; i > 0; i--) {
    // Get next pseudo-random byte from hash, regenerate if exhausted
    if (idx >= hash.length) {
      hash = crypto.createHash('md5').update(hash).digest();
      idx = 0;
    }
    const j = hash[idx] % (i + 1);
    idx++;
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

interface GeneratedActivity {
  title: string;
  description: string;
  researchBasis: string;
}

const TOPIC_INCLUDE = {
  model: Topic,
  as: 'topic',
  attributes: ['id', 'name', 'slug', 'iconEmoji', 'category'],
};

export class ActivityService {
  /**
   * Generate research-backed activities for a community using Claude API.
   * No fallback templates — all activities are AI-generated with real research.
   */
  static async generateActivitiesForTopic(topicId: string, excludeActivityIds: string[] = []): Promise<CommunityActivity[]> {
    const topic = await Topic.findByPk(topicId);
    if (!topic) throw new Error('Topic not found');

    // Count non-excluded active AI activities (excludeActivityIds = user's completed ones during refill)
    const countWhere: any = { topicId, source: 'ai_generated', isActive: true };
    if (excludeActivityIds.length > 0) {
      countWhere.id = { [Op.notIn]: excludeActivityIds };
    }
    const existingCount = await CommunityActivity.count({ where: countWhere });

    if (existingCount >= ACTIVITIES_PER_GENERATION) {
      logger.info(`Topic ${topic.name} already has ${existingCount} non-completed AI activities, skipping generation`);
      return CommunityActivity.findAll({ where: countWhere });
    }

    if (!ANTHROPIC_API_KEY) {
      logger.error('ANTHROPIC_API_KEY not set — cannot generate activities. Set the key in .env');
      return [];
    }

    try {
      const prompt = `You are generating INSTANT micro-actions for a social media community called "${topic.name}" (category: ${topic.category}).
${topic.description ? `Community description: ${topic.description}` : ''}

Generate exactly ${ACTIVITIES_PER_GENERATION} INSTANT actions that a user can do RIGHT NOW in under 2 minutes and post about.

CRITICAL — THESE MUST BE INSTANT ACTIONS:
- Each activity takes 30 seconds to 2 minutes MAX. Nothing longer.
- The user should be able to do it THE SECOND they see it — no planning, no prep, no waiting.
- Think: "do this ONE thing right now" — not projects, comparisons, research, or multi-step tasks.
- NO: "Compare X and Y", "Track your habits for a week", "Create a plan", "Research something"
- YES: "Take a photo of...", "Write 3 words that...", "Do 10 pushups right now", "Text a friend...", "Look out your window and..."
- Every action must be a single, concrete verb: take, write, draw, snap, send, do, hold, breathe, list, name, find, share
- The result should be immediately shareable as a post (photo, quick text, selfie)

RESEARCH GROUNDING:
- Ground each activity in real psychology, neuroscience, or behavioral science research
- Cite researcher name(s), year, and journal/institution when possible
- If no specific study, name the well-established principle and field
- Do NOT fabricate citations

ACTIVITY REQUIREMENTS:
- Relevant to the "${topic.name}" community
- Zero preparation, zero equipment, zero waiting
- Must produce something shareable in a post right away
- Varied: mix physical, expressive, reflective, social, creative actions
- Each title should start with an action verb

Return ONLY a JSON array with this exact format, no other text:
[
  {
    "title": "Action verb title (max 50 chars, e.g. 'Snap your current view')",
    "description": "1 sentence: the exact instant action to do and what to post",
    "researchBasis": "1-2 sentences: the research behind why this works"
  }
]`;

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const content = response.data.content[0]?.text || '';
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for activities', { content });
        return [];
      }

      const activities: GeneratedActivity[] = JSON.parse(jsonMatch[0]);

      const created: CommunityActivity[] = [];
      for (const activity of activities) {
        const record = await CommunityActivity.create({
          topicId,
          title: activity.title.substring(0, 200),
          description: activity.description,
          researchBasis: activity.researchBasis,
          source: 'ai_generated',
        });
        created.push(record);
      }

      logger.info(`Generated ${created.length} AI activities for topic "${topic.name}"`);
      return created;
    } catch (error) {
      logger.error('AI activity generation failed', { error, topicId, topicName: topic.name });
      return [];
    }
  }

  /**
   * Get activities for the spinning wheel.
   *
   * If user has wheel selections → return those (filtered by completed).
   * Otherwise → fall back to deterministic daily selection from joined communities.
   */
  static async getWheelActivities(userId: string): Promise<any[]> {
    // Check if user has curated selections (graceful if table missing)
    let selectedActivities: CommunityActivity[] = [];
    try {
      const selections = await UserWheelSelection.findAll({
        where: { userId },
        include: [{
          model: CommunityActivity,
          as: 'activity',
          where: { isActive: true },
          include: [TOPIC_INCLUDE],
        }],
      });

      selectedActivities = selections
        .map((s: any) => s.activity)
        .filter(Boolean);
    } catch (error) {
      logger.warn('UserWheelSelection query failed (table may not exist), falling back to default wheel', { error });
    }

    if (selectedActivities.length > 0) {
      // User has curated their wheel — use their selections
      const completions = await ActivityCompletion.findAll({
        where: { userId },
        attributes: ['activityId'],
        raw: true,
      });
      const completedIds = new Set(
        completions.map((c: any) => c.activityId || c.activity_id)
      );

      const remaining = selectedActivities.filter((a: CommunityActivity) => !completedIds.has(a.id));

      logger.info(`[Wheel] userId=${userId}, curated=${selectedActivities.length}, completed=${completedIds.size}, remaining=${remaining.length}`);
      return remaining.map((a: CommunityActivity) => ActivityService.formatActivity(a, true));
    }

    // No selections — fall back to deterministic daily selection
    return ActivityService.getDefaultWheelActivities(userId);
  }

  /**
   * Original deterministic daily selection from joined communities.
   */
  private static async getDefaultWheelActivities(userId: string): Promise<any[]> {
    const follows = await TopicFollow.findAll({
      where: { userId, status: 'active' },
      attributes: ['topicId'],
    });

    const topicIds = follows.map(f => f.topicId);
    if (topicIds.length === 0) return [];

    // Get all completions for this user
    const completions = await ActivityCompletion.findAll({
      where: { userId },
      attributes: ['activityId'],
      raw: true,
    });
    const completedActivityIds = new Set(
      completions.map((c: any) => c.activityId || c.activity_id)
    );

    const includeOpts = [TOPIC_INCLUDE];

    // Fetch ALL active activities (INCLUDING completed) — needed for stable deterministic selection
    const allWhere: any = {
      topicId: { [Op.in]: topicIds },
      isActive: true,
    };

    let allActivities = await CommunityActivity.findAll({
      where: allWhere,
      include: includeOpts,
      order: [['createdAt', 'ASC']],
    });

    // If no activities at all (brand new user), generate initial set
    if (allActivities.length === 0) {
      for (const topicId of topicIds) {
        const count = await CommunityActivity.count({ where: { topicId, isActive: true } });
        if (count === 0) {
          await ActivityService.generateActivitiesForTopic(topicId);
        }
      }
      allActivities = await CommunityActivity.findAll({
        where: allWhere,
        include: includeOpts,
        order: [['createdAt', 'ASC']],
      });
    }

    if (allActivities.length === 0) return [];

    // Deterministic daily selection: seed = userId + today's date
    const today = new Date().toISOString().slice(0, 10);
    const seed = `${userId}:${today}`;
    const shuffled = seededShuffle(allActivities, seed);

    const todaysSelection = shuffled.slice(0, WHEEL_SIZE);
    const remaining = todaysSelection.filter(a => !completedActivityIds.has(a.id));

    logger.info(`[Wheel] userId=${userId}, total=${allActivities.length}, selected=${todaysSelection.length}, completed=${completedActivityIds.size}, remaining=${remaining.length}`);

    return remaining.map(a => ActivityService.formatActivity(a, false));
  }

  private static formatActivity(a: CommunityActivity, isSelected: boolean): any {
    const topic = (a as any).topic;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      researchBasis: a.researchBasis,
      source: a.source,
      isSelected,
      topic: topic ? {
        id: topic.id,
        name: topic.name,
        slug: topic.slug,
        iconEmoji: topic.iconEmoji,
        category: topic.category,
      } : null,
    };
  }

  /**
   * Complete an activity — records completion and increments the activity score
   */
  static async completeActivity(
    activityId: string,
    userId: string,
    postId: string
  ): Promise<ActivityCompletion> {
    const activity = await CommunityActivity.findByPk(activityId);
    if (!activity) throw new Error('Activity not found');

    const completion = await ActivityCompletion.create({
      activityId,
      userId,
      postId,
    });

    // Increment completion count (the score that drives recommendations)
    await activity.increment('completionCount');

    logger.info(`User ${userId} completed activity "${activity.title}" (now ${activity.completionCount + 1} completions)`);
    return completion;
  }

  /**
   * Admin creates an activity for their community
   */
  static async createAdminActivity(
    topicId: string,
    title: string,
    description: string | null,
    researchBasis: string | null,
    adminUserId: string
  ): Promise<CommunityActivity> {
    return CommunityActivity.create({
      topicId,
      title,
      description,
      researchBasis,
      source: 'admin_assigned',
      createdByUserId: adminUserId,
    });
  }

  /**
   * Get all activities for a community
   */
  static async getCommunityActivities(topicId: string): Promise<CommunityActivity[]> {
    return CommunityActivity.findAll({
      where: { topicId, isActive: true },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username'],
        },
      ],
      order: [['completionCount', 'DESC']],
    });
  }

  // ===== Wheel Selection (user picks activities) =====

  /**
   * Get all available activities from user's joined communities,
   * with a flag showing which ones are currently on their wheel.
   */
  static async getAvailableActivities(userId: string): Promise<any[]> {
    const follows = await TopicFollow.findAll({
      where: { userId, status: 'active' },
      attributes: ['topicId'],
    });

    const topicIds = follows.map(f => f.topicId);
    if (topicIds.length === 0) return [];

    // Get user's current selections
    const selections = await UserWheelSelection.findAll({
      where: { userId },
      attributes: ['activityId'],
      raw: true,
    });
    const selectedIds = new Set(selections.map((s: any) => s.activityId || s.activity_id));

    // Get all active activities from joined communities
    const activities = await CommunityActivity.findAll({
      where: {
        topicId: { [Op.in]: topicIds },
        isActive: true,
      },
      include: [TOPIC_INCLUDE],
      order: [['completionCount', 'DESC']],
    });

    // Auto-generate if no activities exist
    if (activities.length === 0) {
      for (const topicId of topicIds) {
        const count = await CommunityActivity.count({ where: { topicId, isActive: true } });
        if (count === 0) {
          await ActivityService.generateActivitiesForTopic(topicId);
        }
      }
      const generated = await CommunityActivity.findAll({
        where: {
          topicId: { [Op.in]: topicIds },
          isActive: true,
        },
        include: [TOPIC_INCLUDE],
        order: [['completionCount', 'DESC']],
      });
      return generated.map(a => ({
        ...ActivityService.formatActivity(a, selectedIds.has(a.id)),
        onWheel: selectedIds.has(a.id),
      }));
    }

    return activities.map(a => ({
      ...ActivityService.formatActivity(a, selectedIds.has(a.id)),
      onWheel: selectedIds.has(a.id),
    }));
  }

  /**
   * Add an activity to the user's wheel.
   */
  static async addToWheel(userId: string, activityId: string): Promise<void> {
    const activity = await CommunityActivity.findByPk(activityId);
    if (!activity || !activity.isActive) throw new Error('Activity not found');

    // Check the user follows this activity's community
    const follows = await TopicFollow.findOne({
      where: { userId, topicId: activity.topicId, status: 'active' },
    });
    if (!follows) throw new Error('You must join this community first');

    // Check wheel limit
    const count = await UserWheelSelection.count({ where: { userId } });
    if (count >= WHEEL_SIZE) {
      throw new Error(`Your wheel is full (max ${WHEEL_SIZE}). Remove one first.`);
    }

    // Check not already selected
    const existing = await UserWheelSelection.findOne({
      where: { userId, activityId },
    });
    if (existing) throw new Error('Activity already on your wheel');

    await UserWheelSelection.create({ userId, activityId });
    logger.info(`User ${userId} added activity "${activity.title}" to wheel`);
  }

  /**
   * Remove an activity from the user's wheel.
   */
  static async removeFromWheel(userId: string, activityId: string): Promise<void> {
    const deleted = await UserWheelSelection.destroy({
      where: { userId, activityId },
    });
    if (deleted === 0) throw new Error('Activity not on your wheel');
    logger.info(`User ${userId} removed activity ${activityId} from wheel`);
  }

  /**
   * Get user's current wheel selections (for management UI).
   */
  static async getWheelSelections(userId: string): Promise<any[]> {
    const selections = await UserWheelSelection.findAll({
      where: { userId },
      include: [{
        model: CommunityActivity,
        as: 'activity',
        where: { isActive: true },
        include: [TOPIC_INCLUDE],
      }],
      order: [['createdAt', 'ASC']],
    });

    return selections
      .map((s: any) => s.activity)
      .filter(Boolean)
      .map((a: CommunityActivity) => ActivityService.formatActivity(a, true));
  }

  /**
   * Clear all wheel selections (reset to auto-generated).
   */
  static async clearWheelSelections(userId: string): Promise<void> {
    await UserWheelSelection.destroy({ where: { userId } });
    logger.info(`User ${userId} cleared wheel selections`);
  }
}
