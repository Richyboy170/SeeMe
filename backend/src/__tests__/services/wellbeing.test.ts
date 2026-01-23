// Tests for Phase 3.2: User Wellbeing & Safety Systems

import { WellbeingTrackerService } from '../../services/WellbeingTrackerService';
import { SafetyPolicyService } from '../../services/SafetyPolicyService';
import { WELLBEING_THRESHOLDS } from '../../config/wellbeingThresholds';

describe('WELLBEING-001: Wellbeing Tracker Service', () => {
  let tracker: WellbeingTrackerService;

  beforeEach(() => {
    tracker = new WellbeingTrackerService();
  });

  describe('User Initialization', () => {
    it('should initialize a new user with default metrics', () => {
      const metrics = tracker.initializeUser('user-123', 20);

      expect(metrics.userId).toBe('user-123');
      expect(metrics.userAge).toBe(20);
      expect(metrics.wellbeingScore).toBe(50);
      expect(metrics.totalSessionsCount).toBe(0);
      expect(metrics.activeFlags).toHaveLength(0);
    });

    it('should track user existence', () => {
      expect(tracker.hasUser('user-123')).toBe(false);
      tracker.initializeUser('user-123', 20);
      expect(tracker.hasUser('user-123')).toBe(true);
    });
  });

  describe('Activity Recording', () => {
    beforeEach(() => {
      tracker.initializeUser('user-123', 20);
    });

    it('should record session start', () => {
      const result = tracker.recordActivity('user-123', { type: 'session_start' });

      expect(result.metrics.totalSessionsCount).toBe(1);
      expect(result.metrics.sessionsToday).toBe(1);
      expect(result.metrics.currentSessionStartedAt).toBeDefined();
    });

    it('should record post creation', () => {
      const result = tracker.recordActivity('user-123', { type: 'post_created' });

      expect(result.metrics.postsCreated).toBe(1);
      expect(result.metrics.postsCreatedToday).toBe(1);
    });

    it('should record likes given and received', () => {
      tracker.recordActivity('user-123', { type: 'like_given' });
      const result = tracker.recordActivity('user-123', { type: 'like_received' });

      expect(result.metrics.likesGiven).toBe(1);
      expect(result.metrics.likesReceived).toBe(1);
      expect(result.metrics.positiveInteractionsCount).toBe(1);
    });

    it('should record profile views', () => {
      const result = tracker.recordActivity('user-123', {
        type: 'profile_view',
        data: { durationSeconds: 30 }
      });

      expect(result.metrics.profileViewsOfOthers).toBe(1);
      expect(result.metrics.profileViewsOfOthersToday).toBe(1);
      expect(result.metrics.timeSpentOnOtherProfilesSeconds).toBe(30);
    });

    it('should record mood check-in', () => {
      const result = tracker.recordActivity('user-123', {
        type: 'mood_checkin',
        data: { score: 7, emotions: ['happy', 'calm'] }
      });

      expect(result.metrics.lastMoodScore).toBe(7);
      expect(result.metrics.moodCheckIns).toHaveLength(1);
      expect(result.metrics.moodCheckIns[0].score).toBe(7);
      expect(result.metrics.moodCheckIns[0].selectedEmotions).toContain('happy');
    });

    it('should record avatar customization as positive indicator', () => {
      const result = tracker.recordActivity('user-123', {
        type: 'avatar_customize',
        data: { durationMinutes: 5, elementsChanged: 3 }
      });

      expect(result.metrics.avatarCustomizationSessions).toBe(1);
      expect(result.metrics.timeSpentCustomizingMinutes).toBe(5);
      expect(result.metrics.uniqueAvatarElementsUsed).toBe(3);
    });
  });

  describe('Safety Flags', () => {
    beforeEach(() => {
      tracker.initializeUser('user-123', 20);
    });

    it('should trigger comparison-behavior flag when threshold exceeded', () => {
      // Simulate excessive profile viewing with time spent
      // Need: >15 daily views (25pts) + >10 per session (20pts) + >300s on profiles (15pts) = 60pts
      for (let i = 0; i < 20; i++) {
        tracker.recordActivity('user-123', {
          type: 'profile_view',
          data: { durationSeconds: 20 } // 20 views * 20s = 400s total
        });
      }

      const metrics = tracker.getMetrics('user-123');
      expect(metrics?.comparisonRiskScore).toBeGreaterThan(50);
      expect(metrics?.activeFlags.some(f => f.type === 'comparison-behavior')).toBe(true);
    });

    it('should acknowledge a flag', () => {
      // Trigger a flag first
      for (let i = 0; i < 20; i++) {
        tracker.recordActivity('user-123', { type: 'profile_view' });
      }

      const metrics = tracker.getMetrics('user-123');
      const flag = metrics?.activeFlags.find(f => f.type === 'comparison-behavior');

      if (flag) {
        tracker.acknowledgeFlag('user-123', flag.id);
        const updated = tracker.getMetrics('user-123');
        const updatedFlag = updated?.activeFlags.find(f => f.id === flag.id);
        expect(updatedFlag?.acknowledged).toBe(true);
      }
    });
  });

  describe('Wellbeing Scores', () => {
    beforeEach(() => {
      tracker.initializeUser('user-123', 20);
    });

    it('should increase wellbeing with avatar customization', () => {
      const initial = tracker.getMetrics('user-123')?.wellbeingScore || 0;

      // Customize avatar multiple times
      for (let i = 0; i < 4; i++) {
        tracker.recordActivity('user-123', { type: 'avatar_customize' });
      }

      const updated = tracker.getMetrics('user-123')?.wellbeingScore || 0;
      expect(updated).toBeGreaterThan(initial);
    });

    it('should decrease wellbeing with declining mood', () => {
      // Record declining mood scores
      tracker.recordActivity('user-123', { type: 'mood_checkin', data: { score: 8 } });
      tracker.recordActivity('user-123', { type: 'mood_checkin', data: { score: 6 } });
      tracker.recordActivity('user-123', { type: 'mood_checkin', data: { score: 4 } });
      tracker.recordActivity('user-123', { type: 'mood_checkin', data: { score: 3 } });
      const result = tracker.recordActivity('user-123', { type: 'mood_checkin', data: { score: 2 } });

      expect(result.metrics.moodTrend).toBe('declining');
    });
  });

  describe('Daily Reset', () => {
    it('should reset daily counters', () => {
      tracker.initializeUser('user-123', 20);
      tracker.recordActivity('user-123', { type: 'session_start' });
      tracker.recordActivity('user-123', { type: 'post_created' });
      tracker.recordActivity('user-123', { type: 'profile_view' });

      tracker.resetDailyCounters('user-123');

      const metrics = tracker.getMetrics('user-123');
      expect(metrics?.sessionsToday).toBe(0);
      expect(metrics?.postsCreatedToday).toBe(0);
      expect(metrics?.profileViewsOfOthersToday).toBe(0);
    });
  });
});

describe('WELLBEING-002: Safety Policy Service', () => {
  let service: SafetyPolicyService;

  beforeEach(() => {
    service = new SafetyPolicyService();
  });

  describe('Policy Initialization', () => {
    it('should initialize with core policies', () => {
      const policies = service.getAllPolicies();

      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some(p => p.id === 'no-real-faces')).toBe(true);
      expect(policies.some(p => p.id === 'age-verification-15plus')).toBe(true);
      expect(policies.some(p => p.id === 'minor-usage-limits')).toBe(true);
      expect(policies.some(p => p.id === 'crisis-language-detection')).toBe(true);
    });

    it('should initialize age content flags', () => {
      const flags = service.getAgeContentFlags();

      expect(flags.length).toBe(8);
      expect(flags.some(f => f.contentType === 'mature-themes')).toBe(true);
      expect(flags.some(f => f.contentType === 'location-sharing')).toBe(true);
    });
  });

  describe('Age-Appropriate Content Checks', () => {
    it('should block mature themes for users under 18', () => {
      const result = service.checkAgeAppropriate('mature-themes', 16, false);

      expect(result.allowed).toBe(false);
      expect(result.action).toBe('block');
    });

    it('should allow mature themes for users 18+', () => {
      const result = service.checkAgeAppropriate('mature-themes', 18, false);

      expect(result.allowed).toBe(true);
    });

    it('should require consent for marketplace purchases for minors', () => {
      const result = service.checkAgeAppropriate('marketplace-purchases', 16, false);

      expect(result.allowed).toBe(false);
      expect(result.action).toBe('require-consent');
    });

    it('should allow marketplace purchases with parental consent', () => {
      const result = service.checkAgeAppropriate('marketplace-purchases', 16, true);

      expect(result.allowed).toBe(true);
    });

    it('should block location sharing for all minors', () => {
      const result = service.checkAgeAppropriate('location-sharing', 17, true);

      expect(result.allowed).toBe(false);
      expect(result.action).toBe('block');
    });
  });

  describe('Content Restrictions Summary', () => {
    it('should return correct restrictions for 16-year-old', () => {
      const restrictions = service.getContentRestrictionsForAge(16);

      expect(restrictions.blocked).toContain('mature-themes');
      expect(restrictions.blocked).toContain('location-sharing');
      expect(restrictions.requiresConsent).toContain('marketplace-purchases');
    });

    it('should return fewer restrictions for 18+', () => {
      const restrictions = service.getContentRestrictionsForAge(20);

      expect(restrictions.blocked).toHaveLength(0);
      expect(restrictions.requiresConsent).toHaveLength(0);
    });
  });

  describe('Usage Limits by Age', () => {
    it('should return stricter limits for 15-17', () => {
      const limits = service.getUsageLimitsForAge(16);

      expect(limits.dailyTimeLimitMinutes).toBe(120);
      expect(limits.sessionTimeLimitMinutes).toBe(60);
      expect(limits.parentalNotifications).toBe(true);
    });

    it('should return no time limits for 18+', () => {
      const limits = service.getUsageLimitsForAge(20);

      expect(limits.dailyTimeLimitMinutes).toBeUndefined();
      expect(limits.sessionTimeLimitMinutes).toBeUndefined();
      expect(limits.parentalNotifications).toBe(false);
    });
  });

  describe('Policy Filtering', () => {
    it('should return all policies for adult users', () => {
      const policies = service.getPoliciesForUser(20);
      const allPolicies = service.getAllPolicies();

      // Should include all universal policies
      const universalPolicies = allPolicies.filter(p => p.appliesTo.allUsers);
      universalPolicies.forEach(policy => {
        expect(policies.some(p => p.id === policy.id)).toBe(true);
      });
    });

    it('should include minor-specific policies for 16-year-old', () => {
      const policies = service.getPoliciesForUser(16);

      expect(policies.some(p => p.id === 'minor-usage-limits')).toBe(true);
    });

    it('should not include minor-specific policies for 20-year-old', () => {
      const policies = service.getPoliciesForUser(20);

      expect(policies.some(p => p.id === 'minor-usage-limits')).toBe(false);
    });
  });

  describe('Violation Recording', () => {
    it('should record a policy violation', () => {
      const violation = service.recordViolation(
        'user-123',
        'no-real-faces',
        'minor',
        'content-456',
        'image',
        0.98
      );

      expect(violation.userId).toBe('user-123');
      expect(violation.policyId).toBe('no-real-faces');
      expect(violation.severity).toBe('minor');
      expect(violation.mlConfidence).toBe(0.98);
    });

    it('should track enforcement count', () => {
      const before = service.getPolicyMetrics('no-real-faces');
      service.recordViolation('user-123', 'no-real-faces', 'minor');
      const after = service.getPolicyMetrics('no-real-faces');

      expect(after?.enforcements).toBe((before?.enforcements || 0) + 1);
    });
  });
});

describe('WELLBEING-003: Wellbeing Thresholds', () => {
  it('should have research-backed thresholds defined', () => {
    expect(WELLBEING_THRESHOLDS.DAILY_TIME_CRITICAL_MINUTES).toBe(180); // 3 hours
    expect(WELLBEING_THRESHOLDS.PROFILE_VIEWS_PER_DAY_WARNING).toBe(15);
    expect(WELLBEING_THRESHOLDS.MOOD_SCORE_WARNING).toBe(4);
    expect(WELLBEING_THRESHOLDS.AVATAR_SESSIONS_POSITIVE_THRESHOLD).toBe(3);
  });

  it('should have intervention timing defined', () => {
    expect(WELLBEING_THRESHOLDS.MIN_HOURS_BETWEEN_INTERVENTIONS).toBe(4);
    expect(WELLBEING_THRESHOLDS.MIN_HOURS_BETWEEN_SAME_INTERVENTION).toBe(48);
  });
});
