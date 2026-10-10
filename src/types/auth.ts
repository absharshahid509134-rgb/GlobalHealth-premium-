export type PublicUserRole = 'PUBLIC_USER' | 'VERIFIED_USER' | 'DOCTOR' | 'HOSPITAL' | 'PHARMACY' | 'NEWS';

export type AccountStatus = 
  | 'ACTIVE'
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'PHONE_VERIFICATION_REQUIRED'
  | 'SUSPENDED'
  | 'DEACTIVATED'
  | 'LOCKED'
  | 'PENDING_SECURITY_REVIEW';

export type AuthSubView = 
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'verify-email'
  | 'verify-phone'
  | 'security'
  | 'logout-success';

export interface PublicUserSession {
  sessionId: string;
  userId: string;
  deviceName: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface TwoFactorState {
  enabled: boolean;
  method?: 'authenticator_app' | 'email_otp' | 'sms_otp';
  verifiedAt?: string;
  secretKey?: string;
  qrCodeUri?: string;
  backupCodes?: string[];
}

export interface SecurityAuditLogEntry {
  id: string;
  userId: string;
  event: string;
  timestamp: string;
  ipAddress: string;
  location?: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'warning';
  details: string;
}

export interface PublicUserAccount {
  portalRole?: import('../core/platformRoles').PlatformRole;
  id: string;
  username: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: PublicUserRole;
  accountStatus: AccountStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  country?: string;
  preferredLanguage?: string;
  avatarUrl?: string;
  twoFactor: TwoFactorState;
  createdAt: string;
  lastLoginAt: string;
  dietaryPreferences?: string[];
  healthGoals?: string[];
  marketingConsent?: boolean;
  /** Versioned consent record — which policy versions were accepted and when. */
  consent?: {
    termsVersion: string;
    privacyVersion: string;
    acceptedAt: string;
    jurisdiction?: string;
    method: 'signup_checkbox' | 'login_acknowledgement' | 'settings_reacceptance';
  };
  consentHistory?: {
    termsVersion: string;
    privacyVersion: string;
    acceptedAt: string;
    method: 'signup_checkbox' | 'login_acknowledgement' | 'settings_reacceptance';
  }[];
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  feedback: string[];
}
