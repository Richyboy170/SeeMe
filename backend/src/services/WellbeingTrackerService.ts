// backend/src/services/WellbeingTrackerService.ts

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import {
  UserWellbeingMetrics,
  SafetyFlag,
  InterventionRecord,
  WellbeingRecommendation,
  UserActivity,
  MoodCheckIn
} from '../types/wellbeing';
import { WELLBEING_THRESHOLDS, getAdjustedThreshold } from '../config/wellbeingThresholds';

export class WellbeingTrackerService extends EventEmitter {
  private metrics: Map<string, UserWellbeingMetrics> = new Map();

  /**
   * Initialize tracking for a new user
   */
  initializeUser(userId: string, userAge: number): UserWellbeingMetrics {
    const now = new Date();

    const metrics: UserWellbeingMetrics = {
      userId,
      userAge,
      accountCreatedAt: now,
      lastActiveAt: now,

      // Session metrics
      totalSessionsCount: 0,
      totalTimeSpentMinutes: 0,
      averageSessionDurationMinutes: 0,
      longestSessionMinutes: 0,
      sessionsToday: 0,
      timeSpentTodayMinutes: 0,

      // Engagement
      postsCreated: 0,
      postsCreatedToday: 0,
      likesGiven: 0,
      likesReceived: 0,
      commentsGiven: 0,
      commentsReceived: 0,

      // Social
      followersCount: 0,
      followingCount: 0,
      reciprocalConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,

      // Avatar (positive)
      avatarCustomizationSessions: 0,
      avatarStyleChanges: 0,
      uniqueAvatarElementsUsed: 0,
      timeSpentCustomizingMinutes: 0,

      // Comparison (negative)
      profileViewsOfOthers: 0,
      profileViewsOfOthersToday: 0,
      profileViewsPerSession: 0,
      timeSpentOnOtherProfilesSeconds: 0,
      feedScrollDepthAverage: 0,
      screenshotAttempts: 0,
      screenshotAttemptsToday: 0,

      // Mood
      moodCheckIns: [],
      moodTrend: 'unknown',

      // Interactions
      positiveInteractionsCount: 0,
      negativeInteractionsCount: 0,
      positiveInteractionsRatio: 1.0,

      // Scores
      wellbeingScore: 50,
      engagementHealthScore: 50,
      comparisonRiskScore: 0,
      socialConnectionScore: 50,

      // Flags
      activeFlags: [],
      flagHistory: [],
      interventionHistory: [],
    };

    this.metrics.set(userId, metrics);
    this.emit('user-initialized', { userId, metrics });

    return metrics;
  }

  /**
   * Record user activity and update metrics
   */
  recordActivity(
    userId: string,
    activity: UserActivity
  ): {
    metrics: UserWellbeingMetrics;
    triggeredFlags: SafetyFlag[];
    recommendation?: WellbeingRecommendation
  } {
    let metrics = this.metrics.get(userId);
    if (!metrics) {
      throw new Error(`User ${userId} not initialized`);
    }

    const previousMetrics = { ...metrics };
    metrics.lastActiveAt = new Date();

    // Process the activity
    this.processActivity(metrics, activity);

    // Recalculate scores
    this.recalculateScores(metrics);

    // Check for safety flags
    const triggeredFlags = this.evaluateSafetyFlags(metrics, previousMetrics);

    // Generate recommendation if needed
    const recommendation = this.generateRecommendation(metrics, triggeredFlags);

    this.metrics.set(userId, metrics);

    // Emit events
    if (triggeredFlags.length > 0) {
      triggeredFlags.forEach(flag => {
        this.emit('safety-flag-triggered', { userId, flag, metrics });
      });
    }

    if (recommendation) {
      this.emit('recommendation-generated', { userId, recommendation, metrics });
    }

    return { metrics, triggeredFlags, recommendation };
  }

  /**
   * Process activity and update metrics
   */
  private processActivity(metrics: UserWellbeingMetrics, activity: UserActivity): void {
    switch (activity.type) {
      case 'session_start':
        metrics.totalSessionsCount++;
        metrics.sessionsToday++;
        metrics.currentSessionStartedAt = new Date();
        metrics.profileViewsPerSession = 0;
        break;

      case 'session_end':
        if (metrics.currentSessionStartedAt) {
          const duration = (Date.now() - metrics.currentSessionStartedAt.getTime()) / 60000;
          metrics.totalTimeSpentMinutes += duration;
          metrics.timeSpentTodayMinutes += duration;
          metrics.averageSessionDurationMinutes =
            metrics.totalTimeSpentMinutes / metrics.totalSessionsCount;
          if (duration > metrics.longestSessionMinutes) {
            metrics.longestSessionMinutes = duration;
          }
          metrics.currentSessionStartedAt = undefined;
        }
        break;

      case 'post_created':
        metrics.postsCreated++;
        metrics.postsCreatedToday++;
        break;

      case 'like_given':
        metrics.likesGiven++;
        break;

      case 'like_received':
        metrics.likesReceived++;
        metrics.positiveInteractionsCount++;
        break;

      case 'comment_given':
        metrics.commentsGiven++;
        break;

      case 'comment_received':
        metrics.commentsReceived++;
        metrics.positiveInteractionsCount++;
        break;

      case 'follow':
        metrics.followingCount++;
        break;

      case 'follower_gained':
        metrics.followersCount++;
        if (activity.data?.isReciprocal) {
          metrics.reciprocalConnections++;
        }
        break;

      case 'profile_view':
        metrics.profileViewsOfOthers++;
        metrics.profileViewsOfOthersToday++;
        metrics.profileViewsPerSession++;
        if (activity.data?.durationSeconds) {
          metrics.timeSpentOnOtherProfilesSeconds += activity.data.durationSeconds as number;
        }
        break;

      case 'avatar_customize':
        metrics.avatarCustomizationSessions++;
        metrics.lastAvatarChangeAt = new Date();
        if (activity.data?.durationMinutes) {
          metrics.timeSpentCustomizingMinutes += activity.data.durationMinutes as number;
        }
        if (activity.data?.elementsChanged) {
          metrics.uniqueAvatarElementsUsed += activity.data.elementsChanged as number;
        }
        break;

      case 'avatar_style_change':
        metrics.avatarStyleChanges++;
        break;

      case 'screenshot_attempt':
        metrics.screenshotAttempts++;
        metrics.screenshotAttemptsToday++;
        break;

      case 'feed_scroll':
        if (activity.data?.depth) {
          const depth = activity.data.depth as number;
          const count = metrics.totalSessionsCount || 1;
          metrics.feedScrollDepthAverage =
            (metrics.feedScrollDepthAverage * (count - 1) + depth) / count;
        }
        break;

      case 'mood_checkin':
        const moodCheckIn: MoodCheckIn = {
          id: randomUUID(),
          timestamp: new Date(),
          score: activity.data?.score as number || 5,
          selectedEmotions: activity.data?.emotions as string[] || [],
          context: activity.data?.context as string,
          triggeredIntervention: false
        };
        metrics.moodCheckIns.push(moodCheckIn);
        metrics.lastMoodScore = moodCheckIn.score;
        this.calculateMoodTrend(metrics);
        break;

      case 'negative_interaction':
        metrics.negativeInteractionsCount++;
        break;

      case 'message_sent':
        metrics.messagesSent++;
        break;

      case 'message_received':
        metrics.messagesReceived++;
        break;
    }

    // Update positive interaction ratio
    const totalInteractions = metrics.positiveInteractionsCount + metrics.negativeInteractionsCount;
    if (totalInteractions > 0) {
      metrics.positiveInteractionsRatio = metrics.positiveInteractionsCount / totalInteractions;
    }
  }

  /**
   * Calculate mood trend from recent check-ins
   */
  private calculateMoodTrend(metrics: UserWellbeingMetrics): void {
    const recentCheckIns = metrics.moodCheckIns.slice(-5);

    if (recentCheckIns.length < 3) {
      metrics.moodTrend = 'unknown';
      return;
    }

    const scores = recentCheckIns.map(c => c.score);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 1) metrics.moodTrend = 'improving';
    else if (diff < -1) metrics.moodTrend = 'declining';
    else metrics.moodTrend = 'stable';
  }

  /**
   * Recalculate all wellbeing scores
   */
  private recalculateScores(metrics: UserWellbeingMetrics): void {
    const T = WELLBEING_THRESHOLDS;

    // === ENGAGEMENT HEALTH SCORE (0-100) ===
    let engagementScore = 50;

    const daysSinceSignup = Math.max(1,
      Math.ceil((Date.now() - metrics.accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    const postsPerDay = metrics.postsCreated / daysSinceSignup;

    // Moderate posting is healthy
    if (postsPerDay >= 0.5 && postsPerDay <= 3) engagementScore += 15;
    else if (postsPerDay > T.POSTS_PER_DAY_WARNING) engagementScore -= 15;
    else if (postsPerDay > T.POSTS_PER_DAY_CRITICAL) engagementScore -= 25;

    // Giving engagement is prosocial
    if (metrics.likesGiven > 0 && metrics.likesGiven >= metrics.likesReceived * 0.5) {
      engagementScore += 10;
    }

    // Commenting shows deeper engagement
    if (metrics.commentsGiven > 5) engagementScore += 10;

    // Excessive usage is concerning
    if (metrics.timeSpentTodayMinutes > T.DAILY_TIME_WARNING_MINUTES) engagementScore -= 15;
    if (metrics.timeSpentTodayMinutes > T.DAILY_TIME_CRITICAL_MINUTES) engagementScore -= 15;

    metrics.engagementHealthScore = Math.max(0, Math.min(100, engagementScore));

    // === COMPARISON RISK SCORE (0-100, higher = worse) ===
    let comparisonScore = 0;

    if (metrics.profileViewsOfOthersToday > T.PROFILE_VIEWS_PER_DAY_WARNING) comparisonScore += 25;
    if (metrics.profileViewsOfOthersToday > T.PROFILE_VIEWS_PER_DAY_CRITICAL) comparisonScore += 25;
    if (metrics.profileViewsPerSession > T.PROFILE_VIEWS_PER_SESSION_WARNING) comparisonScore += 20;
    if (metrics.timeSpentOnOtherProfilesSeconds > T.TIME_ON_OTHER_PROFILES_WARNING_SECONDS) {
      comparisonScore += 15;
    }
    if (metrics.screenshotAttemptsToday > T.SCREENSHOTS_PER_DAY_WARNING) comparisonScore += 15;

    metrics.comparisonRiskScore = Math.min(100, comparisonScore);

    // === SOCIAL CONNECTION SCORE (0-100) ===
    let socialScore = 50;

    if (metrics.followingCount > 0) {
      const reciprocalRatio = metrics.reciprocalConnections / metrics.followingCount;
      if (reciprocalRatio >= T.RECIPROCAL_RATIO_HEALTHY) socialScore += 20;
      else if (reciprocalRatio < 0.1) socialScore -= 15;
    }

    if (metrics.messagesSent > 0 && metrics.messagesReceived > 0) socialScore += 15;

    if (metrics.positiveInteractionsRatio >= 0.8) socialScore += 15;
    else if (metrics.positiveInteractionsRatio < T.POSITIVE_INTERACTION_RATIO_WARNING) {
      socialScore -= 20;
    }

    metrics.socialConnectionScore = Math.max(0, Math.min(100, socialScore));

    // === OVERALL WELLBEING SCORE (0-100) ===
    let wellbeing = 50;

    // Avatar customization is positive (research: self-affirmation)
    if (metrics.avatarCustomizationSessions >= T.AVATAR_SESSIONS_POSITIVE_THRESHOLD) {
      wellbeing += 15;
    }

    // Factor in other scores
    wellbeing += (metrics.engagementHealthScore - 50) * 0.25;
    wellbeing += (metrics.socialConnectionScore - 50) * 0.25;
    wellbeing -= metrics.comparisonRiskScore * 0.3;

    // Mood factor
    if (metrics.lastMoodScore !== undefined) {
      if (metrics.lastMoodScore >= 7) wellbeing += 10;
      else if (metrics.lastMoodScore <= T.MOOD_SCORE_WARNING) wellbeing -= 15;
      else if (metrics.lastMoodScore <= T.MOOD_SCORE_CRITICAL) wellbeing -= 25;
    }

    if (metrics.moodTrend === 'improving') wellbeing += 5;
    else if (metrics.moodTrend === 'declining') wellbeing -= 15;

    metrics.wellbeingScore = Math.max(0, Math.min(100, wellbeing));
  }

  /**
   * Evaluate and trigger safety flags
   */
  private evaluateSafetyFlags(
    metrics: UserWellbeingMetrics,
    _previousMetrics: UserWellbeingMetrics
  ): SafetyFlag[] {
    const newFlags: SafetyFlag[] = [];
    const now = new Date();
    const T = WELLBEING_THRESHOLDS;

    const hasActiveFlag = (type: SafetyFlag['type']) =>
      metrics.activeFlags.some(f => f.type === type && !f.resolvedAt);

    // Comparison behavior
    if (metrics.comparisonRiskScore > 50 && !hasActiveFlag('comparison-behavior')) {
      const severity = metrics.comparisonRiskScore > 80 ? 'high' : 'medium';
      const flag: SafetyFlag = {
        id: randomUUID(),
        type: 'comparison-behavior',
        severity,
        triggeredAt: now,
        triggeredBy: 'comparisonRiskScore',
        threshold: 50,
        actualValue: metrics.comparisonRiskScore,
        acknowledged: false
      };
      newFlags.push(flag);
      metrics.activeFlags.push(flag);
    }

    // Excessive usage (age-adjusted threshold)
    const adjustedDailyTimeLimit = getAdjustedThreshold('DAILY_TIME_CRITICAL_MINUTES', metrics.userAge);
    if (metrics.timeSpentTodayMinutes > adjustedDailyTimeLimit &&
      !hasActiveFlag('excessive-usage')) {
      const flag: SafetyFlag = {
        id: randomUUID(),
        type: 'excessive-usage',
        severity: 'high',
        triggeredAt: now,
        triggeredBy: 'timeSpentTodayMinutes',
        threshold: adjustedDailyTimeLimit,
        actualValue: metrics.timeSpentTodayMinutes,
        acknowledged: false
      };
      newFlags.push(flag);
      metrics.activeFlags.push(flag);
    }

    // Isolation
    if (metrics.followingCount > 10 &&
      metrics.reciprocalConnections === 0 &&
      !hasActiveFlag('isolation')) {
      const flag: SafetyFlag = {
        id: randomUUID(),
        type: 'isolation',
        severity: 'medium',
        triggeredAt: now,
        triggeredBy: 'reciprocalConnections',
        threshold: 1,
        actualValue: 0,
        acknowledged: false
      };
      newFlags.push(flag);
      metrics.activeFlags.push(flag);
    }

    // Negative interactions
    if (metrics.positiveInteractionsRatio < T.POSITIVE_INTERACTION_RATIO_WARNING &&
      metrics.negativeInteractionsCount > 5 &&
      !hasActiveFlag('negative-interactions')) {
      const flag: SafetyFlag = {
        id: randomUUID(),
        type: 'negative-interactions',
        severity: 'medium',
        triggeredAt: now,
        triggeredBy: 'positiveInteractionsRatio',
        threshold: T.POSITIVE_INTERACTION_RATIO_WARNING,
        actualValue: metrics.positiveInteractionsRatio,
        acknowledged: false
      };
      newFlags.push(flag);
      metrics.activeFlags.push(flag);
    }

    // Mood decline
    if (metrics.moodTrend === 'declining' &&
      metrics.lastMoodScore !== undefined &&
      metrics.lastMoodScore <= T.MOOD_SCORE_WARNING &&
      !hasActiveFlag('rapid-mood-decline')) {
      const severity = metrics.lastMoodScore <= T.MOOD_SCORE_CRITICAL ? 'critical' : 'high';
      const flag: SafetyFlag = {
        id: randomUUID(),
        type: 'rapid-mood-decline',
        severity,
        triggeredAt: now,
        triggeredBy: 'moodTrend + lastMoodScore',
        threshold: T.MOOD_SCORE_WARNING,
        actualValue: metrics.lastMoodScore,
        acknowledged: false
      };
      newFlags.push(flag);
      metrics.activeFlags.push(flag);
    }

    // Screenshot abuse
    if (metrics.screenshotAttemptsToday > T.SCREENSHOTS_PER_DAY_CRITICAL &&
      !hasActiveFlag('screenshot-abuse')) {
      const flag: SafetyFlag = {
        id: randomUUID(),
        type: 'screenshot-abuse',
        severity: 'high',
        triggeredAt: now,
        triggeredBy: 'screenshotAttemptsToday',
        threshold: T.SCREENSHOTS_PER_DAY_CRITICAL,
        actualValue: metrics.screenshotAttemptsToday,
        acknowledged: false
      };
      newFlags.push(flag);
      metrics.activeFlags.push(flag);
    }

    return newFlags;
  }

  /**
   * Generate appropriate recommendation
   */
  private generateRecommendation(
    metrics: UserWellbeingMetrics,
    triggeredFlags: SafetyFlag[]
  ): WellbeingRecommendation | undefined {
    const T = WELLBEING_THRESHOLDS;

    // Check cooldown
    if (metrics.interventionCooldownUntil && new Date() < metrics.interventionCooldownUntil) {
      return undefined;
    }

    // CRISIS (highest priority)
    const criticalFlag = triggeredFlags.find(f => f.severity === 'critical');
    if (criticalFlag || metrics.wellbeingScore < 20) {
      return {
        id: randomUUID(),
        type: 'crisis',
        priority: 10,
        title: "We're Here For You",
        message: "It seems like you might be going through a difficult time. Support is available.",
        actions: [
          { label: 'Talk to Someone', actionType: 'external-link', actionData: 'crisis-resources', isPrimary: true },
          { label: "I'm Okay", actionType: 'dismiss', isPrimary: false }
        ],
        requiresAcknowledgment: true,
        blocksAppUsage: false,
        researchRationale: 'Early intervention is crucial for mental health support.'
      };
    }

    // COMPARISON BEHAVIOR
    const comparisonFlag = triggeredFlags.find(f => f.type === 'comparison-behavior');
    if (comparisonFlag) {
      return {
        id: randomUUID(),
        type: comparisonFlag.severity === 'high' ? 'concern' : 'gentle-nudge',
        priority: comparisonFlag.severity === 'high' ? 7 : 5,
        title: 'Focus on Connection',
        message: "You've been browsing lots of profiles. SeeMe is for connection, not comparison.",
        actions: [
          { label: "See Friends' Posts", actionType: 'navigate', actionData: 'feed', isPrimary: true },
          { label: 'Got It', actionType: 'dismiss', isPrimary: false }
        ],
        showAfterDismissHours: 48,
        requiresAcknowledgment: false,
        blocksAppUsage: false,
        researchRationale: 'r=0.454 correlation between comparison and body image harm.'
      };
    }

    // EXCESSIVE USAGE
    const usageFlag = triggeredFlags.find(f => f.type === 'excessive-usage');
    if (usageFlag) {
      const hours = Math.round(metrics.timeSpentTodayMinutes / 60);
      return {
        id: randomUUID(),
        type: 'concern',
        priority: 6,
        title: 'Time for a Break?',
        message: `You've been on SeeMe for ${hours}+ hours. Taking breaks is important for wellbeing.`,
        actions: [
          { label: 'Set Break Reminder', actionType: 'set-reminder', actionData: '30', isPrimary: true },
          { label: 'Continue', actionType: 'dismiss', isPrimary: false }
        ],
        showAfterDismissHours: 24,
        requiresAcknowledgment: false,
        blocksAppUsage: false,
        researchRationale: '>3 hours/day doubles risk of depression symptoms.'
      };
    }

    // ISOLATION
    const isolationFlag = triggeredFlags.find(f => f.type === 'isolation');
    if (isolationFlag) {
      return {
        id: randomUUID(),
        type: 'gentle-nudge',
        priority: 4,
        title: 'Make a Connection',
        message: "Connection is a two-way street! Try reaching out to some of the people you follow.",
        actions: [
          { label: 'See Suggestions', actionType: 'navigate', actionData: 'suggestions', isPrimary: true },
          { label: 'Later', actionType: 'dismiss', isPrimary: false }
        ],
        showAfterDismissHours: 72,
        requiresAcknowledgment: false,
        blocksAppUsage: false,
        researchRationale: 'Reciprocal relationships are key to social wellbeing.'
      };
    }

    // NEGATIVE INTERACTIONS
    const negativeFlag = triggeredFlags.find(f => f.type === 'negative-interactions');
    if (negativeFlag) {
      return {
        id: randomUUID(),
        type: 'concern',
        priority: 5,
        title: 'Your Experience Matters',
        message: "We noticed some challenging interactions. Remember, you can always block or report users.",
        actions: [
          { label: 'Safety Settings', actionType: 'navigate', actionData: 'safety-settings', isPrimary: true },
          { label: 'Dismiss', actionType: 'dismiss', isPrimary: false }
        ],
        showAfterDismissHours: 48,
        requiresAcknowledgment: false,
        blocksAppUsage: false,
        researchRationale: 'User control over interactions improves platform experience.'
      };
    }

    // SCREENSHOT ABUSE
    const screenshotFlag = triggeredFlags.find(f => f.type === 'screenshot-abuse');
    if (screenshotFlag) {
      return {
        id: randomUUID(),
        type: 'intervention',
        priority: 7,
        title: 'Respect Privacy',
        message: "SeeMe protects user privacy. Excessive screenshot attempts go against our community values.",
        actions: [
          { label: 'Learn More', actionType: 'navigate', actionData: 'community-guidelines', isPrimary: true },
          { label: 'Understood', actionType: 'dismiss', isPrimary: false }
        ],
        requiresAcknowledgment: true,
        blocksAppUsage: false,
        researchRationale: 'Privacy protection is fundamental to user safety.'
      };
    }

    // POSITIVE REINFORCEMENT (avatar customization)
    if (metrics.avatarCustomizationSessions >= T.AVATAR_SESSIONS_POSITIVE_THRESHOLD &&
      metrics.avatarCustomizationSessions <= T.AVATAR_SESSIONS_POSITIVE_THRESHOLD + 1) {
      return {
        id: randomUUID(),
        type: 'positive-reinforcement',
        priority: 2,
        title: 'Great Self-Expression!',
        message: "Customizing your avatar boosts wellbeing through self-affirmation!",
        actions: [
          { label: 'Awesome!', actionType: 'dismiss', isPrimary: true }
        ],
        requiresAcknowledgment: false,
        blocksAppUsage: false,
        researchRationale: 'Avatar customization -> self-affirmation (Computers in Human Behavior, 2020)'
      };
    }

    return undefined;
  }

  /**
   * Record an intervention response
   */
  recordInterventionResponse(
    userId: string,
    recommendationId: string,
    response: InterventionRecord['userResponse']
  ): void {
    const metrics = this.metrics.get(userId);
    if (!metrics) return;

    // Set intervention cooldown
    const cooldownHours = WELLBEING_THRESHOLDS.MIN_HOURS_BETWEEN_INTERVENTIONS;
    metrics.interventionCooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);
    metrics.lastInterventionAt = new Date();

    // Record the intervention
    const intervention: InterventionRecord = {
      id: recommendationId,
      type: 'gentle-nudge', // Will be updated based on actual type
      triggeredAt: new Date(),
      triggeredBy: 'recommendation-system',
      messageShown: '',
      userResponse: response,
      responseAt: new Date()
    };

    metrics.interventionHistory.push(intervention);
    this.emit('intervention-response', { userId, recommendationId, response });
  }

  /**
   * Acknowledge a safety flag
   */
  acknowledgeFlag(userId: string, flagId: string): void {
    const metrics = this.metrics.get(userId);
    if (!metrics) return;

    const flag = metrics.activeFlags.find(f => f.id === flagId);
    if (flag) {
      flag.acknowledged = true;
      flag.acknowledgedAt = new Date();
      this.emit('flag-acknowledged', { userId, flagId, flag });
    }
  }

  /**
   * Resolve a safety flag
   */
  resolveFlag(userId: string, flagId: string, resolutionMethod: string): void {
    const metrics = this.metrics.get(userId);
    if (!metrics) return;

    const flagIndex = metrics.activeFlags.findIndex(f => f.id === flagId);
    if (flagIndex !== -1) {
      const flag = metrics.activeFlags[flagIndex];
      flag.resolvedAt = new Date();
      flag.resolutionMethod = resolutionMethod;

      // Move to history
      metrics.flagHistory.push(flag);
      metrics.activeFlags.splice(flagIndex, 1);

      this.emit('flag-resolved', { userId, flagId, flag });
    }
  }

  /**
   * Get metrics for a user
   */
  getMetrics(userId: string): UserWellbeingMetrics | undefined {
    return this.metrics.get(userId);
  }

  /**
   * Check if user exists in tracker
   */
  hasUser(userId: string): boolean {
    return this.metrics.has(userId);
  }

  /**
   * Load metrics for an existing user (from database)
   */
  loadUserMetrics(metrics: UserWellbeingMetrics): void {
    this.metrics.set(metrics.userId, metrics);
  }

  /**
   * Reset daily counters (call at midnight)
   */
  resetDailyCounters(userId: string): void {
    const metrics = this.metrics.get(userId);
    if (!metrics) return;

    metrics.sessionsToday = 0;
    metrics.timeSpentTodayMinutes = 0;
    metrics.postsCreatedToday = 0;
    metrics.profileViewsOfOthersToday = 0;
    metrics.screenshotAttemptsToday = 0;

    this.emit('daily-counters-reset', { userId });
  }

  /**
   * Reset daily counters for all users
   */
  resetAllDailyCounters(): void {
    this.metrics.forEach((_, userId) => {
      this.resetDailyCounters(userId);
    });
  }

  /**
   * Get users needing attention (admin dashboard)
   */
  getUsersNeedingAttention(): { userId: string; reason: string; wellbeingScore: number }[] {
    const results: { userId: string; reason: string; wellbeingScore: number }[] = [];

    this.metrics.forEach((metrics, userId) => {
      if (metrics.wellbeingScore < 30) {
        results.push({ userId, reason: 'Low wellbeing score', wellbeingScore: metrics.wellbeingScore });
      } else if (metrics.activeFlags.some(f => f.severity === 'critical' || f.severity === 'high')) {
        results.push({ userId, reason: 'High severity flag', wellbeingScore: metrics.wellbeingScore });
      } else if (metrics.moodTrend === 'declining' && metrics.lastMoodScore && metrics.lastMoodScore <= 3) {
        results.push({ userId, reason: 'Declining mood', wellbeingScore: metrics.wellbeingScore });
      }
    });

    return results.sort((a, b) => a.wellbeingScore - b.wellbeingScore);
  }

  /**
   * Get summary statistics for admin dashboard
   */
  getSystemStats(): {
    totalUsers: number;
    averageWellbeingScore: number;
    usersWithActiveFlags: number;
    criticalFlags: number;
    highFlags: number;
  } {
    let totalWellbeing = 0;
    let usersWithFlags = 0;
    let criticalCount = 0;
    let highCount = 0;

    this.metrics.forEach(metrics => {
      totalWellbeing += metrics.wellbeingScore;

      if (metrics.activeFlags.length > 0) {
        usersWithFlags++;
        metrics.activeFlags.forEach(f => {
          if (f.severity === 'critical') criticalCount++;
          if (f.severity === 'high') highCount++;
        });
      }
    });

    const totalUsers = this.metrics.size;

    return {
      totalUsers,
      averageWellbeingScore: totalUsers > 0 ? totalWellbeing / totalUsers : 0,
      usersWithActiveFlags: usersWithFlags,
      criticalFlags: criticalCount,
      highFlags: highCount
    };
  }
}

// Singleton export
export const wellbeingTracker = new WellbeingTrackerService();
