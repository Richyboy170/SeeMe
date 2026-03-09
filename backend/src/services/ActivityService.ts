import crypto from 'crypto';
import axios from 'axios';
import { Op } from 'sequelize';
import { CommunityActivity } from '../models/CommunityActivity';
import { ActivityCompletion } from '../models/ActivityCompletion';
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
      const prompt = `You are a research scientist generating micro-activities for a social media community called "${topic.name}" (category: ${topic.category}).
${topic.description ? `Community description: ${topic.description}` : ''}

Generate exactly ${ACTIVITIES_PER_GENERATION} quick activities (5-30 minutes each) that members can do right now and post about.

RESEARCH REQUIREMENTS — THIS IS CRITICAL:
- Every activity MUST be grounded in a real, published study or well-established finding
- Cite the actual researcher(s) by name, the year, and the journal or institution
- Describe the specific finding — what was measured, what was found, with numbers when available
- Draw from: peer-reviewed journals, meta-analyses, randomized controlled trials, longitudinal studies
- Fields: psychology, neuroscience, behavioral science, health science, cognitive science, exercise physiology
- Do NOT fabricate citations. Only cite research you are confident is real.
- If you cannot find a specific study for an activity, ground it in a well-established principle and name the field

ACTIVITY REQUIREMENTS:
- 5-30 minutes max, zero preparation, no special equipment
- Must produce a shareable result (photo, written reflection, screenshot, selfie, creation)
- Specific and actionable — tell people exactly what to do, not vague suggestions
- Relevant to the "${topic.name}" community's interests
- Genuinely beneficial — activities should actually improve wellbeing, not be gimmicky
- Varied: mix physical, reflective, creative, and social activities relevant to the community

Return ONLY a JSON array with this exact format, no other text:
[
  {
    "title": "Short actionable title (max 50 chars)",
    "description": "1-2 sentences: exactly what to do and what to share in your post",
    "researchBasis": "2-3 sentences: the specific research finding with researcher name(s), year, journal/institution, and what was discovered. Be precise."
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
   * Get activities for the spinning wheel — deterministic daily selection.
   *
   * How it works:
   * 1. Fetch ALL active activities from user's joined communities (including completed ones)
   * 2. Use a seeded shuffle (userId + today's date) to deterministically pick 8
   * 3. Filter out the ones the user already completed → wheel shrinks
   * 4. At midnight, the date changes → new seed → new set of 8 (excluding all-time completions)
   */
  static async getWheelActivities(userId: string): Promise<any[]> {
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

    const includeOpts = [
      {
        model: Topic,
        as: 'topic',
        attributes: ['id', 'name', 'slug', 'iconEmoji', 'category'],
      },
    ];

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
    // Same seed = same shuffle = same 8 picked, every time the user opens the wheel today
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const seed = `${userId}:${today}`;
    const shuffled = seededShuffle(allActivities, seed);

    // Pick today's 8 from the full pool (including completed ones in the selection)
    const todaysSelection = shuffled.slice(0, WHEEL_SIZE);

    // Now filter out completed — this makes the wheel shrink when activities are done
    const remaining = todaysSelection.filter(a => !completedActivityIds.has(a.id));

    logger.info(`[Wheel] userId=${userId}, total=${allActivities.length}, selected=${todaysSelection.length}, completed=${completedActivityIds.size}, remaining=${remaining.length}`);

    return remaining.map(a => ActivityService.formatActivity(a));
  }

  private static formatActivity(a: CommunityActivity): any {
    const topic = (a as any).topic;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      researchBasis: a.researchBasis,
      source: a.source,
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
}
