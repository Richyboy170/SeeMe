// backend/src/config/wellbeingThresholds.ts

/**
 * Research-backed thresholds for concerning behavior
 *
 * Sources:
 * - U.S. Surgeon General Advisory (2023): >3 hours/day doubles depression risk
 * - Body Image Journal (2024): r=0.454 correlation comparison -> body image harm
 * - Computers in Human Behavior (2020): Avatar customization -> self-affirmation
 */
export const WELLBEING_THRESHOLDS = {
  // === COMPARISON BEHAVIOR ===
  // Research: Appearance comparison is primary harm mechanism
  PROFILE_VIEWS_PER_DAY_WARNING: 15,
  PROFILE_VIEWS_PER_DAY_CRITICAL: 30,
  PROFILE_VIEWS_PER_SESSION_WARNING: 10,
  TIME_ON_OTHER_PROFILES_WARNING_SECONDS: 300,   // 5 min per session
  TIME_ON_OTHER_PROFILES_CRITICAL_SECONDS: 600,  // 10 min per session

  // === USAGE PATTERNS ===
  // Research: >3 hours/day = double risk of depression symptoms
  SESSION_DURATION_WARNING_MINUTES: 90,
  SESSION_DURATION_CRITICAL_MINUTES: 180,        // 3 hours
  DAILY_TIME_WARNING_MINUTES: 120,
  DAILY_TIME_CRITICAL_MINUTES: 180,
  SESSIONS_PER_DAY_WARNING: 10,

  // === POSTING BEHAVIOR ===
  POSTS_PER_DAY_WARNING: 10,
  POSTS_PER_DAY_CRITICAL: 20,

  // === SOCIAL HEALTH ===
  RECIPROCAL_RATIO_HEALTHY: 0.3,                 // 30%+ mutual follows
  POSITIVE_INTERACTION_RATIO_WARNING: 0.5,

  // === AVATAR CUSTOMIZATION (POSITIVE) ===
  // Research: Customization = self-affirmation
  AVATAR_SESSIONS_POSITIVE_THRESHOLD: 3,

  // === MOOD ===
  MOOD_SCORE_WARNING: 4,                         // Out of 10
  MOOD_SCORE_CRITICAL: 2,
  MOOD_DECLINE_THRESHOLD: 3,                     // Points dropped over 3 check-ins

  // === SCREENSHOT BEHAVIOR ===
  SCREENSHOTS_PER_DAY_WARNING: 5,
  SCREENSHOTS_PER_DAY_CRITICAL: 15,

  // === INTERVENTION TIMING ===
  MIN_HOURS_BETWEEN_INTERVENTIONS: 4,
  MIN_HOURS_BETWEEN_SAME_INTERVENTION: 48,
} as const;

/**
 * Age-specific threshold adjustments
 * Stricter limits for younger users (15-17)
 */
export const AGE_THRESHOLD_MULTIPLIERS = {
  '15-17': {
    DAILY_TIME_CRITICAL_MINUTES: 0.67,           // 2 hours instead of 3
    SESSION_DURATION_CRITICAL_MINUTES: 0.67,
    PROFILE_VIEWS_PER_DAY_WARNING: 0.67,
    MOOD_SCORE_WARNING: 1.25,                    // More sensitive (5 instead of 4)
  },
  '18+': {
    // Default thresholds apply
  }
} as const;

export type WellbeingThresholdKey = keyof typeof WELLBEING_THRESHOLDS;
export type AgeGroup = keyof typeof AGE_THRESHOLD_MULTIPLIERS;

/**
 * Get adjusted threshold based on user age
 */
export function getAdjustedThreshold(
  threshold: WellbeingThresholdKey,
  userAge: number
): number {
  const baseValue = WELLBEING_THRESHOLDS[threshold];

  if (userAge >= 15 && userAge <= 17) {
    const multipliers = AGE_THRESHOLD_MULTIPLIERS['15-17'];
    const multiplier = multipliers[threshold as keyof typeof multipliers];
    if (multiplier !== undefined) {
      return baseValue * multiplier;
    }
  }

  return baseValue;
}
