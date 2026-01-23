// backend/src/types/safety.ts

export interface SafetyPolicy {
  id: string;
  name: string;
  description: string;
  rationale: string;                   // Why this policy exists (research basis)

  // Who it applies to
  appliesTo: {
    allUsers: boolean;
    ageRange?: { min: number; max?: number };
    userFlags?: string[];
  };

  // Enforcement configuration
  enforcement: {
    type: 'automated' | 'ml-assisted' | 'human-review' | 'hybrid';
    mlModelId?: string;
    confidenceThreshold?: number;      // 0-1 for ML
    checkFrequency: 'real-time' | 'per-session' | 'daily' | 'on-upload';
  };

  // Actions on violation
  violationActions: {
    severity: 'minor' | 'moderate' | 'severe' | 'critical';
    action: 'log' | 'warn' | 'filter' | 'remove' | 'restrict' | 'suspend' | 'ban';
    notifyUser: boolean;
    notifyParent: boolean;             // For users 15-17
    appealable: boolean;
    cooldownHours?: number;
    escalateTo?: string;
  }[];

  // Metrics
  isActive: boolean;
  createdAt: Date;
  lastUpdatedAt: Date;
  enforcements: number;
  appeals: number;
  overturned: number;
}

export interface AgeContentFlag {
  id: string;
  contentType:
    | 'mature-themes'
    | 'sensitive-topics'
    | 'external-links'
    | 'marketplace-purchases'
    | 'direct-messages'
    | 'location-sharing'
    | 'public-posting'
    | 'avatar-revealing';

  ageRestriction: {
    minimumAge: number;
    requiresParentalConsent?: boolean;
    parentalConsentAge?: number;
  };

  action: 'block' | 'warn' | 'filter' | 'require-consent' | 'log-only';
  warningMessage?: string;
  parentNotification: boolean;
}

export interface PolicyViolation {
  id: string;
  userId: string;
  policyId: string;
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  action: string;
  timestamp: Date;
  contentId?: string;
  contentType?: string;
  mlConfidence?: number;
  appealStatus?: 'none' | 'pending' | 'approved' | 'denied';
  appealedAt?: Date;
  appealResolvedAt?: Date;
  appealNotes?: string;
}

export interface ParentalConsentRecord {
  id: string;
  userId: string;
  parentEmail: string;
  consentType: AgeContentFlag['contentType'];
  grantedAt?: Date;
  expiresAt?: Date;
  status: 'pending' | 'granted' | 'denied' | 'revoked';
  verificationMethod?: 'email' | 'phone' | 'id-verification';
}
