// backend/src/routes/wellbeing.ts

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { wellbeingTracker } from '../services/WellbeingTrackerService';
import { safetyPolicyService } from '../services/SafetyPolicyService';
import User from '../models/User';
import { AgeContentFlag } from '../types/safety';

const router = Router();

/**
 * Helper to get user age from database
 * Returns 18 as default if birthDate not set
 */
async function getUserAge(userId: string): Promise<number> {
  const user = await User.findByPk(userId);
  if (!user) return 18;

  // If user has birthDate field, calculate age
  // For now, default to 18 since birthDate isn't in the model yet
  return 18;
}

/**
 * Helper to ensure user is initialized in wellbeing tracker
 */
async function ensureUserInitialized(userId: string): Promise<void> {
  if (!wellbeingTracker.hasUser(userId)) {
    const age = await getUserAge(userId);
    wellbeingTracker.initializeUser(userId, age);
  }
}

/**
 * Record user activity
 * POST /api/wellbeing/activity
 */
router.post('/activity', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { type, data } = req.body;

    if (!type) {
      res.status(400).json({ error: 'Activity type is required' });
      return;
    }

    await ensureUserInitialized(userId);

    const result = wellbeingTracker.recordActivity(userId, { type, data });

    res.json({
      success: true,
      wellbeingScore: result.metrics.wellbeingScore,
      triggeredFlags: result.triggeredFlags.map(f => f.type),
      recommendation: result.recommendation ? {
        id: result.recommendation.id,
        type: result.recommendation.type,
        title: result.recommendation.title,
        message: result.recommendation.message,
        actions: result.recommendation.actions
      } : null
    });
  } catch (error) {
    console.error('Error recording activity:', error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

/**
 * Get user's wellbeing metrics
 * GET /api/wellbeing/metrics
 */
router.get('/metrics', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    await ensureUserInitialized(userId);

    const metrics = wellbeingTracker.getMetrics(userId);

    if (!metrics) {
      res.status(404).json({ error: 'Metrics not found' });
      return;
    }

    // Return safe subset for user
    res.json({
      wellbeingScore: metrics.wellbeingScore,
      engagementHealthScore: metrics.engagementHealthScore,
      socialConnectionScore: metrics.socialConnectionScore,
      comparisonRiskScore: metrics.comparisonRiskScore,
      moodTrend: metrics.moodTrend,
      lastMoodScore: metrics.lastMoodScore,
      avatarCustomizationSessions: metrics.avatarCustomizationSessions,
      timeSpentTodayMinutes: metrics.timeSpentTodayMinutes,
      sessionsToday: metrics.sessionsToday,
      postsCreatedToday: metrics.postsCreatedToday,
      activeFlags: metrics.activeFlags.map(f => ({
        id: f.id,
        type: f.type,
        severity: f.severity,
        acknowledged: f.acknowledged
      }))
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * Submit mood check-in
 * POST /api/wellbeing/mood
 */
router.post('/mood', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { score, emotions, context } = req.body;

    if (score === undefined || score < 1 || score > 10) {
      res.status(400).json({ error: 'Score must be 1-10' });
      return;
    }

    await ensureUserInitialized(userId);

    const result = wellbeingTracker.recordActivity(userId, {
      type: 'mood_checkin',
      data: { score, emotions: emotions || [], context }
    });

    res.json({
      success: true,
      moodTrend: result.metrics.moodTrend,
      lastMoodScore: result.metrics.lastMoodScore,
      recommendation: result.recommendation ? {
        id: result.recommendation.id,
        type: result.recommendation.type,
        title: result.recommendation.title,
        message: result.recommendation.message,
        actions: result.recommendation.actions
      } : null
    });
  } catch (error) {
    console.error('Error recording mood:', error);
    res.status(500).json({ error: 'Failed to record mood' });
  }
});

/**
 * Check if content is allowed for user's age
 * POST /api/wellbeing/check-content
 */
router.post('/check-content', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { contentType } = req.body;

    if (!contentType) {
      res.status(400).json({ error: 'Content type is required' });
      return;
    }

    const userAge = await getUserAge(userId);
    const hasParentalConsent = false; // Would need to check database

    const result = safetyPolicyService.checkAgeAppropriate(
      contentType as AgeContentFlag['contentType'],
      userAge,
      hasParentalConsent
    );

    res.json(result);
  } catch (error) {
    console.error('Error checking content:', error);
    res.status(500).json({ error: 'Failed to check content' });
  }
});

/**
 * Get user's content restrictions
 * GET /api/wellbeing/restrictions
 */
router.get('/restrictions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userAge = await getUserAge(userId);

    const restrictions = safetyPolicyService.getContentRestrictionsForAge(userAge);
    const usageLimits = safetyPolicyService.getUsageLimitsForAge(userAge);

    res.json({
      restrictions,
      usageLimits
    });
  } catch (error) {
    console.error('Error getting restrictions:', error);
    res.status(500).json({ error: 'Failed to get restrictions' });
  }
});

/**
 * Acknowledge a safety flag
 * POST /api/wellbeing/acknowledge-flag
 */
router.post('/acknowledge-flag', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { flagId } = req.body;

    if (!flagId) {
      res.status(400).json({ error: 'Flag ID is required' });
      return;
    }

    await ensureUserInitialized(userId);

    wellbeingTracker.acknowledgeFlag(userId, flagId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging flag:', error);
    res.status(500).json({ error: 'Failed to acknowledge flag' });
  }
});

/**
 * Record intervention response
 * POST /api/wellbeing/intervention-response
 */
router.post('/intervention-response', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { recommendationId, response } = req.body;

    if (!recommendationId || !response) {
      res.status(400).json({ error: 'Recommendation ID and response are required' });
      return;
    }

    const validResponses = ['accepted', 'dismissed', 'ignored', 'clicked-resource'];
    if (!validResponses.includes(response)) {
      res.status(400).json({ error: 'Invalid response type' });
      return;
    }

    await ensureUserInitialized(userId);

    wellbeingTracker.recordInterventionResponse(userId, recommendationId, response);

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording intervention response:', error);
    res.status(500).json({ error: 'Failed to record intervention response' });
  }
});

/**
 * Start a session
 * POST /api/wellbeing/session/start
 */
router.post('/session/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await ensureUserInitialized(userId);

    const result = wellbeingTracker.recordActivity(userId, { type: 'session_start' });

    res.json({
      success: true,
      sessionsToday: result.metrics.sessionsToday,
      timeSpentTodayMinutes: result.metrics.timeSpentTodayMinutes
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * End a session
 * POST /api/wellbeing/session/end
 */
router.post('/session/end', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await ensureUserInitialized(userId);

    const result = wellbeingTracker.recordActivity(userId, { type: 'session_end' });

    res.json({
      success: true,
      totalTimeSpentMinutes: result.metrics.totalTimeSpentMinutes,
      averageSessionDurationMinutes: result.metrics.averageSessionDurationMinutes,
      recommendation: result.recommendation ? {
        id: result.recommendation.id,
        type: result.recommendation.type,
        title: result.recommendation.title,
        message: result.recommendation.message
      } : null
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

/**
 * Get safety policies applicable to user
 * GET /api/wellbeing/policies
 */
router.get('/policies', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userAge = await getUserAge(userId);

    const policies = safetyPolicyService.getPoliciesForUser(userAge);

    res.json({
      policies: policies.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        rationale: p.rationale,
        isActive: p.isActive
      }))
    });
  } catch (error) {
    console.error('Error getting policies:', error);
    res.status(500).json({ error: 'Failed to get policies' });
  }
});

/**
 * Admin: Get users needing attention
 * GET /api/wellbeing/admin/attention
 */
router.get('/admin/attention', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: Add admin role check

    const usersNeedingAttention = wellbeingTracker.getUsersNeedingAttention();

    res.json({
      users: usersNeedingAttention
    });
  } catch (error) {
    console.error('Error getting users needing attention:', error);
    res.status(500).json({ error: 'Failed to get users needing attention' });
  }
});

/**
 * Admin: Get system stats
 * GET /api/wellbeing/admin/stats
 */
router.get('/admin/stats', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: Add admin role check

    const stats = wellbeingTracker.getSystemStats();
    const policyMetrics = safetyPolicyService.getAllPolicyMetrics();

    res.json({
      wellbeing: stats,
      policies: policyMetrics
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get admin stats' });
  }
});

/**
 * Admin: Get transparency report
 * GET /api/wellbeing/admin/transparency-report
 */
router.get('/admin/transparency-report', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // TODO: Add admin role check

    const report = safetyPolicyService.getTransparencyReport();

    res.json(report);
  } catch (error) {
    console.error('Error getting transparency report:', error);
    res.status(500).json({ error: 'Failed to get transparency report' });
  }
});

export default router;
