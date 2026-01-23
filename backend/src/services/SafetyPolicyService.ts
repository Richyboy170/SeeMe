// backend/src/services/SafetyPolicyService.ts

import { SafetyPolicy, AgeContentFlag, PolicyViolation } from '../types/safety';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export class SafetyPolicyService extends EventEmitter {
  private policies: Map<string, SafetyPolicy> = new Map();
  private ageContentFlags: Map<string, AgeContentFlag> = new Map();
  private violations: PolicyViolation[] = [];

  constructor() {
    super();
    this.initializePolicies();
    this.initializeAgeContentFlags();
  }

  /**
   * Initialize core safety policies
   */
  private initializePolicies(): void {
    const policies: SafetyPolicy[] = [
      // NO REAL FACES
      {
        id: 'no-real-faces',
        name: 'No Real Faces Policy',
        description: 'Real human faces cannot be posted. All content must use avatars.',
        rationale: 'Research: r=0.454 correlation between appearance comparison and body image harm.',
        appliesTo: { allUsers: true },
        enforcement: {
          type: 'ml-assisted',
          mlModelId: 'face-detection-v2',
          confidenceThreshold: 0.95,
          checkFrequency: 'on-upload'
        },
        violationActions: [
          { severity: 'minor', action: 'filter', notifyUser: true, notifyParent: false, appealable: true },
          { severity: 'moderate', action: 'remove', notifyUser: true, notifyParent: true, appealable: true },
          { severity: 'severe', action: 'restrict', notifyUser: true, notifyParent: true, appealable: true, cooldownHours: 24 }
        ],
        isActive: true,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        enforcements: 0,
        appeals: 0,
        overturned: 0
      },

      // AGE VERIFICATION
      {
        id: 'age-verification-15plus',
        name: 'Age Requirement (15+)',
        description: 'Users must be at least 15 years old.',
        rationale: 'U.S. Surgeon General: Youth most vulnerable to social media harm.',
        appliesTo: { allUsers: true },
        enforcement: {
          type: 'hybrid',
          checkFrequency: 'real-time'
        },
        violationActions: [
          { severity: 'critical', action: 'suspend', notifyUser: true, notifyParent: true, appealable: false }
        ],
        isActive: true,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        enforcements: 0,
        appeals: 0,
        overturned: 0
      },

      // MINOR USAGE LIMITS
      {
        id: 'minor-usage-limits',
        name: 'Usage Limits for 15-17',
        description: 'Daily usage limits and break reminders for minor users.',
        rationale: 'Research: >3 hours/day doubles depression risk. Stricter for minors.',
        appliesTo: {
          allUsers: false,
          ageRange: { min: 15, max: 17 }
        },
        enforcement: {
          type: 'automated',
          checkFrequency: 'real-time'
        },
        violationActions: [
          { severity: 'minor', action: 'warn', notifyUser: true, notifyParent: false, appealable: false },
          { severity: 'moderate', action: 'restrict', notifyUser: true, notifyParent: true, appealable: false, cooldownHours: 12 }
        ],
        isActive: true,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        enforcements: 0,
        appeals: 0,
        overturned: 0
      },

      // CRISIS LANGUAGE DETECTION
      {
        id: 'crisis-language-detection',
        name: 'Crisis Language Detection',
        description: 'Detect and respond to crisis or self-harm language.',
        rationale: 'Early intervention is crucial for mental health support.',
        appliesTo: { allUsers: true },
        enforcement: {
          type: 'ml-assisted',
          mlModelId: 'crisis-language-detector',
          confidenceThreshold: 0.7,
          checkFrequency: 'real-time'
        },
        violationActions: [
          { severity: 'critical', action: 'log', notifyUser: false, notifyParent: false, appealable: false, escalateTo: 'crisis-response-team' }
        ],
        isActive: true,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        enforcements: 0,
        appeals: 0,
        overturned: 0
      },

      // PHOTO DELETION
      {
        id: 'photo-deletion',
        name: 'Original Photo Deletion',
        description: 'Original photos deleted after avatar processing.',
        rationale: 'Privacy-first approach. Users control their data.',
        appliesTo: { allUsers: true },
        enforcement: {
          type: 'automated',
          checkFrequency: 'real-time'
        },
        violationActions: [],
        isActive: true,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        enforcements: 0,
        appeals: 0,
        overturned: 0
      },

      // ANTI-HARASSMENT
      {
        id: 'anti-harassment',
        name: 'Anti-Harassment Policy',
        description: 'Zero tolerance for bullying, harassment, or hate speech.',
        rationale: 'Healthy communities require safe interactions.',
        appliesTo: { allUsers: true },
        enforcement: {
          type: 'hybrid',
          mlModelId: 'toxicity-detector',
          confidenceThreshold: 0.8,
          checkFrequency: 'real-time'
        },
        violationActions: [
          { severity: 'minor', action: 'warn', notifyUser: true, notifyParent: false, appealable: true },
          { severity: 'moderate', action: 'remove', notifyUser: true, notifyParent: true, appealable: true },
          { severity: 'severe', action: 'restrict', notifyUser: true, notifyParent: true, appealable: true, cooldownHours: 48 },
          { severity: 'critical', action: 'suspend', notifyUser: true, notifyParent: true, appealable: true, cooldownHours: 168 }
        ],
        isActive: true,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        enforcements: 0,
        appeals: 0,
        overturned: 0
      },

      // SCREENSHOT PROTECTION
      {
        id: 'screenshot-protection',
        name: 'Screenshot Protection Policy',
        description: 'Excessive screenshot attempts are monitored and may be restricted.',
        rationale: 'Protect user privacy and prevent content misuse.',
        appliesTo: { allUsers: true },
        enforcement: {
          type: 'automated',
          checkFrequency: 'real-time'
        },
        violationActions: [
          { severity: 'minor', action: 'warn', notifyUser: true, notifyParent: false, appealable: false },
          { severity: 'moderate', action: 'restrict', notifyUser: true, notifyParent: true, appealable: false, cooldownHours: 24 }
        ],
        isActive: true,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        enforcements: 0,
        appeals: 0,
        overturned: 0
      }
    ];

    policies.forEach(policy => this.policies.set(policy.id, policy));
  }

  /**
   * Initialize age-appropriate content flags
   */
  private initializeAgeContentFlags(): void {
    const flags: AgeContentFlag[] = [
      {
        id: 'mature-themes',
        contentType: 'mature-themes',
        ageRestriction: { minimumAge: 18, requiresParentalConsent: true, parentalConsentAge: 17 },
        action: 'block',
        warningMessage: 'This content is not available for users under 18.',
        parentNotification: true
      },
      {
        id: 'sensitive-topics',
        contentType: 'sensitive-topics',
        ageRestriction: { minimumAge: 15 },
        action: 'warn',
        warningMessage: 'This content discusses sensitive topics. Continue?',
        parentNotification: false
      },
      {
        id: 'external-links',
        contentType: 'external-links',
        ageRestriction: { minimumAge: 15, requiresParentalConsent: true, parentalConsentAge: 16 },
        action: 'warn',
        warningMessage: 'This link will take you outside SeeMe.',
        parentNotification: true
      },
      {
        id: 'marketplace-purchases',
        contentType: 'marketplace-purchases',
        ageRestriction: { minimumAge: 15, requiresParentalConsent: true, parentalConsentAge: 18 },
        action: 'require-consent',
        warningMessage: 'Purchases require parental consent for users under 18.',
        parentNotification: true
      },
      {
        id: 'dm-non-friends',
        contentType: 'direct-messages',
        ageRestriction: { minimumAge: 15 },
        action: 'filter',
        warningMessage: 'Message requests from non-friends are filtered.',
        parentNotification: false
      },
      {
        id: 'location-sharing',
        contentType: 'location-sharing',
        ageRestriction: { minimumAge: 18, requiresParentalConsent: true, parentalConsentAge: 18 },
        action: 'block',
        warningMessage: 'Location sharing is not available for users under 18.',
        parentNotification: true
      },
      {
        id: 'public-posting',
        contentType: 'public-posting',
        ageRestriction: { minimumAge: 15, requiresParentalConsent: true, parentalConsentAge: 16 },
        action: 'require-consent',
        warningMessage: 'Public posts are visible to all SeeMe users.',
        parentNotification: true
      },
      {
        id: 'revealing-avatar',
        contentType: 'avatar-revealing',
        ageRestriction: { minimumAge: 18 },
        action: 'block',
        warningMessage: 'Some avatar options are only available for users 18+.',
        parentNotification: false
      }
    ];

    flags.forEach(flag => this.ageContentFlags.set(flag.id, flag));
  }

  /**
   * Get policies applicable to a user
   */
  getPoliciesForUser(userAge: number, userFlags?: string[]): SafetyPolicy[] {
    return Array.from(this.policies.values()).filter(policy => {
      if (!policy.isActive) return false;
      if (policy.appliesTo.allUsers) return true;
      if (policy.appliesTo.ageRange) {
        const { min, max } = policy.appliesTo.ageRange;
        if (userAge < min) return false;
        if (max && userAge > max) return false;
      }
      if (policy.appliesTo.userFlags && userFlags) {
        const hasRequiredFlag = policy.appliesTo.userFlags.some(f => userFlags.includes(f));
        if (!hasRequiredFlag) return false;
      }
      return true;
    });
  }

  /**
   * Check content against age-appropriate flags
   */
  checkAgeAppropriate(
    contentType: AgeContentFlag['contentType'],
    userAge: number,
    hasParentalConsent: boolean = false
  ): {
    allowed: boolean;
    action: AgeContentFlag['action'];
    warningMessage?: string;
    requiresParentNotification: boolean;
  } {
    const flag = Array.from(this.ageContentFlags.values())
      .find(f => f.contentType === contentType);

    if (!flag) {
      return { allowed: true, action: 'log-only', requiresParentNotification: false };
    }

    const { minimumAge, requiresParentalConsent, parentalConsentAge } = flag.ageRestriction;

    // Under minimum age - blocked
    if (userAge < minimumAge) {
      return {
        allowed: false,
        action: 'block',
        warningMessage: flag.warningMessage,
        requiresParentNotification: flag.parentNotification
      };
    }

    // Needs parental consent
    if (requiresParentalConsent &&
      parentalConsentAge &&
      userAge < parentalConsentAge &&
      !hasParentalConsent) {
      return {
        allowed: false,
        action: 'require-consent',
        warningMessage: flag.warningMessage,
        requiresParentNotification: flag.parentNotification
      };
    }

    // Allowed (may need warning)
    return {
      allowed: true,
      action: flag.action,
      warningMessage: flag.action === 'warn' ? flag.warningMessage : undefined,
      requiresParentNotification: false
    };
  }

  /**
   * Get content restrictions summary for an age
   */
  getContentRestrictionsForAge(userAge: number): {
    blocked: string[];
    requiresConsent: string[];
    warned: string[];
    allowed: string[];
  } {
    const result = {
      blocked: [] as string[],
      requiresConsent: [] as string[],
      warned: [] as string[],
      allowed: [] as string[]
    };

    this.ageContentFlags.forEach(flag => {
      const check = this.checkAgeAppropriate(flag.contentType, userAge, false);

      if (!check.allowed && check.action === 'block') {
        result.blocked.push(flag.contentType);
      } else if (!check.allowed && check.action === 'require-consent') {
        result.requiresConsent.push(flag.contentType);
      } else if (check.allowed && check.action === 'warn') {
        result.warned.push(flag.contentType);
      } else {
        result.allowed.push(flag.contentType);
      }
    });

    return result;
  }

  /**
   * Get usage limits for an age
   */
  getUsageLimitsForAge(userAge: number): {
    dailyTimeLimitMinutes?: number;
    sessionTimeLimitMinutes?: number;
    breakReminders: boolean;
    parentalNotifications: boolean;
  } {
    if (userAge >= 18) {
      return {
        breakReminders: true,
        parentalNotifications: false
      };
    } else if (userAge >= 15) {
      return {
        dailyTimeLimitMinutes: 120,        // 2 hours for minors
        sessionTimeLimitMinutes: 60,       // 1 hour sessions
        breakReminders: true,
        parentalNotifications: true
      };
    } else {
      // Shouldn't happen (15+ requirement)
      return {
        dailyTimeLimitMinutes: 60,
        sessionTimeLimitMinutes: 30,
        breakReminders: true,
        parentalNotifications: true
      };
    }
  }

  /**
   * Record policy violation
   */
  recordViolation(
    userId: string,
    policyId: string,
    severity: PolicyViolation['severity'],
    contentId?: string,
    contentType?: string,
    mlConfidence?: number
  ): PolicyViolation {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const violationAction = policy.violationActions.find(v => v.severity === severity);
    const action = violationAction?.action || 'log';

    const violation: PolicyViolation = {
      id: randomUUID(),
      userId,
      policyId,
      severity,
      action,
      timestamp: new Date(),
      contentId,
      contentType,
      mlConfidence,
      appealStatus: violationAction?.appealable ? 'none' : undefined
    };

    this.violations.push(violation);
    this.recordEnforcement(policyId, 'enforce');

    this.emit('violation-recorded', { violation, policy });

    return violation;
  }

  /**
   * Record policy enforcement
   */
  recordEnforcement(policyId: string, action: 'enforce' | 'appeal' | 'overturn'): void {
    const policy = this.policies.get(policyId);
    if (!policy) return;

    switch (action) {
      case 'enforce': policy.enforcements++; break;
      case 'appeal': policy.appeals++; break;
      case 'overturn': policy.overturned++; break;
    }
    policy.lastUpdatedAt = new Date();
  }

  /**
   * Submit appeal for a violation
   */
  submitAppeal(violationId: string, notes?: string): boolean {
    const violation = this.violations.find(v => v.id === violationId);
    if (!violation) return false;

    const policy = this.policies.get(violation.policyId);
    if (!policy) return false;

    const violationAction = policy.violationActions.find(v => v.severity === violation.severity);
    if (!violationAction?.appealable) return false;

    violation.appealStatus = 'pending';
    violation.appealedAt = new Date();
    violation.appealNotes = notes;

    this.recordEnforcement(violation.policyId, 'appeal');
    this.emit('appeal-submitted', { violation, policy });

    return true;
  }

  /**
   * Resolve an appeal
   */
  resolveAppeal(violationId: string, approved: boolean, notes?: string): boolean {
    const violation = this.violations.find(v => v.id === violationId);
    if (!violation || violation.appealStatus !== 'pending') return false;

    violation.appealStatus = approved ? 'approved' : 'denied';
    violation.appealResolvedAt = new Date();
    if (notes) violation.appealNotes = (violation.appealNotes || '') + '\n\nResolution: ' + notes;

    if (approved) {
      this.recordEnforcement(violation.policyId, 'overturn');
    }

    this.emit('appeal-resolved', { violation, approved });

    return true;
  }

  /**
   * Get violations for a user
   */
  getUserViolations(userId: string): PolicyViolation[] {
    return this.violations.filter(v => v.userId === userId);
  }

  /**
   * Get pending appeals
   */
  getPendingAppeals(): PolicyViolation[] {
    return this.violations.filter(v => v.appealStatus === 'pending');
  }

  /**
   * Get policy metrics
   */
  getPolicyMetrics(policyId: string): {
    enforcements: number;
    appeals: number;
    appealRate: number;
    overturnRate: number;
  } | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    return {
      enforcements: policy.enforcements,
      appeals: policy.appeals,
      appealRate: policy.enforcements > 0 ? policy.appeals / policy.enforcements : 0,
      overturnRate: policy.appeals > 0 ? policy.overturned / policy.appeals : 0
    };
  }

  /**
   * Get all policy metrics for dashboard
   */
  getAllPolicyMetrics(): {
    policyId: string;
    name: string;
    enforcements: number;
    appeals: number;
    appealRate: number;
    overturnRate: number;
  }[] {
    return Array.from(this.policies.values()).map(policy => ({
      policyId: policy.id,
      name: policy.name,
      enforcements: policy.enforcements,
      appeals: policy.appeals,
      appealRate: policy.enforcements > 0 ? policy.appeals / policy.enforcements : 0,
      overturnRate: policy.appeals > 0 ? policy.overturned / policy.appeals : 0
    }));
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): SafetyPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): SafetyPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get all age content flags
   */
  getAgeContentFlags(): AgeContentFlag[] {
    return Array.from(this.ageContentFlags.values());
  }

  /**
   * Check if user can perform action based on restrictions
   */
  canUserPerformAction(
    userAge: number,
    actionType: AgeContentFlag['contentType'],
    hasParentalConsent: boolean = false
  ): { allowed: boolean; reason?: string } {
    const check = this.checkAgeAppropriate(actionType, userAge, hasParentalConsent);

    if (check.allowed) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: check.warningMessage || `This action is not available for your age group.`
    };
  }

  /**
   * Get transparency report data
   */
  getTransparencyReport(): {
    totalEnforcements: number;
    totalAppeals: number;
    overallOverturnRate: number;
    byPolicy: {
      policyId: string;
      name: string;
      enforcements: number;
      appeals: number;
      overturned: number;
    }[];
    byAge: {
      ageGroup: string;
      violations: number;
    }[];
  } {
    let totalEnforcements = 0;
    let totalAppeals = 0;
    let totalOverturned = 0;

    const byPolicy = Array.from(this.policies.values()).map(policy => {
      totalEnforcements += policy.enforcements;
      totalAppeals += policy.appeals;
      totalOverturned += policy.overturned;

      return {
        policyId: policy.id,
        name: policy.name,
        enforcements: policy.enforcements,
        appeals: policy.appeals,
        overturned: policy.overturned
      };
    });

    // This would need actual user data to be accurate
    const byAge = [
      { ageGroup: '15-17', violations: 0 },
      { ageGroup: '18-24', violations: 0 },
      { ageGroup: '25+', violations: 0 }
    ];

    return {
      totalEnforcements,
      totalAppeals,
      overallOverturnRate: totalAppeals > 0 ? totalOverturned / totalAppeals : 0,
      byPolicy,
      byAge
    };
  }
}

// Singleton export
export const safetyPolicyService = new SafetyPolicyService();
