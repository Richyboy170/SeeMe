// backend/src/types/wellbeing.ts

/**
 * Safety flag triggered by concerning user behavior
 */
export interface SafetyFlag {
  id: string;
  type:
    | 'comparison-behavior'      // Excessive profile browsing
    | 'excessive-usage'          // Too much time on app
    | 'isolation'                // No reciprocal connections
    | 'negative-interactions'    // Receiving/giving negative content
    | 'rapid-mood-decline'       // Quick drop in mood check-ins
    | 'crisis-language'          // Detected concerning language
    | 'screenshot-abuse';        // Excessive screenshot attempts
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggeredAt: Date;
  triggeredBy: string;           // Which metric triggered this
  threshold: number;             // What threshold was exceeded
  actualValue: number;           // User's actual value
  acknowledged: boolean;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolutionMethod?: string;
}

/**
 * Record of an intervention shown to user
 */
export interface InterventionRecord {
  id: string;
  type:
    | 'positive-reinforcement'   // "Great job customizing your avatar!"
    | 'gentle-nudge'             // "Focus on connection, not comparison"
    | 'break-suggestion'         // "Time for a break?"
    | 'resource-offer'           // "Would you like to see some resources?"
    | 'usage-limit'              // "You've been on for 3 hours"
    | 'cool-down'                // Temporary feature restriction
    | 'crisis-resource';         // Immediate crisis support
  triggeredAt: Date;
  triggeredBy: string;
  messageShown: string;
  userResponse?: 'accepted' | 'dismissed' | 'ignored' | 'clicked-resource';
  responseAt?: Date;
  followUpScheduled?: Date;
  effectivenessScore?: number;   // Did behavior improve? -1 to 1
}

/**
 * Mood check-in entry
 */
export interface MoodCheckIn {
  id: string;
  timestamp: Date;
  score: number;                 // 1-10
  selectedEmotions: string[];    // ['happy', 'anxious', 'calm', etc.]
  context?: string;              // Optional user note
  triggeredIntervention: boolean;
}

/**
 * Comprehensive user wellbeing metrics
 */
export interface UserWellbeingMetrics {
  userId: string;
  userAge: number;

  // Temporal data
  accountCreatedAt: Date;
  lastActiveAt: Date;
  currentSessionStartedAt?: Date;

  // Session metrics
  totalSessionsCount: number;
  totalTimeSpentMinutes: number;
  averageSessionDurationMinutes: number;
  longestSessionMinutes: number;
  sessionsToday: number;
  timeSpentTodayMinutes: number;

  // Engagement metrics
  postsCreated: number;
  postsCreatedToday: number;
  likesGiven: number;
  likesReceived: number;
  commentsGiven: number;
  commentsReceived: number;

  // Social graph
  followersCount: number;
  followingCount: number;
  reciprocalConnections: number;
  messagesSent: number;
  messagesReceived: number;

  // Avatar customization (positive indicator)
  avatarCustomizationSessions: number;
  avatarStyleChanges: number;
  uniqueAvatarElementsUsed: number;
  lastAvatarChangeAt?: Date;
  timeSpentCustomizingMinutes: number;

  // Comparison behavior (negative indicator)
  profileViewsOfOthers: number;
  profileViewsOfOthersToday: number;
  profileViewsPerSession: number;
  timeSpentOnOtherProfilesSeconds: number;
  feedScrollDepthAverage: number;
  screenshotAttempts: number;
  screenshotAttemptsToday: number;

  // Mood tracking
  moodCheckIns: MoodCheckIn[];
  lastMoodScore?: number;
  moodTrend: 'improving' | 'stable' | 'declining' | 'unknown';

  // Interaction quality
  positiveInteractionsCount: number;
  negativeInteractionsCount: number;
  positiveInteractionsRatio: number;

  // Computed scores (0-100)
  wellbeingScore: number;
  engagementHealthScore: number;
  comparisonRiskScore: number;
  socialConnectionScore: number;

  // Flags & interventions
  activeFlags: SafetyFlag[];
  flagHistory: SafetyFlag[];
  interventionHistory: InterventionRecord[];
  lastInterventionAt?: Date;
  interventionCooldownUntil?: Date;
}

/**
 * Wellbeing recommendation to display
 */
export interface WellbeingRecommendation {
  id: string;
  type: 'positive-reinforcement' | 'gentle-nudge' | 'concern' | 'intervention' | 'crisis';
  priority: number;              // 1-10, higher = more urgent
  title: string;
  message: string;
  actions?: {
    label: string;
    actionType: 'dismiss' | 'navigate' | 'external-link' | 'set-reminder' | 'contact-support';
    actionData?: string;
    isPrimary: boolean;
  }[];
  showAfterDismissHours?: number;
  requiresAcknowledgment: boolean;
  blocksAppUsage: boolean;
  researchRationale?: string;
}

/**
 * Activity types for recording
 */
export type UserActivityType =
  | 'session_start'
  | 'session_end'
  | 'post_created'
  | 'like_given'
  | 'like_received'
  | 'comment_given'
  | 'comment_received'
  | 'follow'
  | 'follower_gained'
  | 'profile_view'
  | 'avatar_customize'
  | 'avatar_style_change'
  | 'screenshot_attempt'
  | 'feed_scroll'
  | 'mood_checkin'
  | 'negative_interaction'
  | 'message_sent'
  | 'message_received';

export interface UserActivity {
  type: UserActivityType;
  data?: Record<string, unknown>;
}
