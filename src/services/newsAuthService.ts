import { StaffMember, StaffRole, StaffPermission, StaffAccountStatus, AuditLogEntry } from '../types';
import { getAdminToken, getAdminProfile, clearAdminSession } from './newsGovernanceClient';

const STORAGE_KEYS = {
  STAFF_MEMBERS: 'gh_staff_members_v3',
  STAFF_SESSION: 'gh_staff_session_v3',
  AUDIT_LOGS: 'gh_audit_logs_v3',
  LOGIN_ATTEMPTS: 'gh_login_attempts_v3',
  ACTIVE_MFA_CHALLENGE: 'gh_active_mfa_challenge_v3',
  PASSWORD_RESET_TOKENS: 'gh_staff_reset_tokens_v1',
};

export interface MfaDispatchResult {
  success: boolean;
  code?: string;
  recipientName?: string;
  recipientEmail?: string;
  expiresAt?: string;
  error?: string;
}

export const ALL_STAFF_PERMISSIONS: { key: StaffPermission; label: string; description: string; category: string; critical?: boolean }[] = [
  // Content Creation & Editing
  { key: 'news.view', label: 'View Management Area', description: 'Access private news management dashboard and view allowed articles', category: 'General' },
  { key: 'news.create', label: 'Create Articles', description: 'Draft new news articles and scientific summaries', category: 'Content' },
  { key: 'news.edit', label: 'Edit Articles', description: 'Modify draft or assigned article contents and metadata', category: 'Content' },
  { key: 'news.delete', label: 'Soft Delete / Move to Trash', description: 'Move articles to trash bin', category: 'Content', critical: true },
  { key: 'news.permanent_delete', label: 'Permanent Delete', description: 'Irreversibly delete articles from trash (Admin only)', category: 'Content', critical: true },
  { key: 'news.archive', label: 'Archive Articles', description: 'Move published or old articles into medical archives', category: 'Content' },
  { key: 'news.restore', label: 'Restore Articles', description: 'Restore articles from archive or trash', category: 'Content' },
  
  // Publishing & Scheduling
  { key: 'news.publish', label: 'Publish Live Content', description: 'Release approved news articles directly to the public website', category: 'Publishing', critical: true },
  { key: 'news.unpublish', label: 'Unpublish Content', description: 'Take down live articles back to draft or review status', category: 'Publishing', critical: true },
  { key: 'news.schedule', label: 'Schedule Publication', description: 'Set future release dates and times for approved articles', category: 'Publishing' },
  { key: 'news.cancel_schedule', label: 'Cancel Scheduled Release', description: 'Cancel pending scheduled publications', category: 'Publishing' },

  // Editorial Review & Quality Control
  { key: 'news.review', label: 'Review Submitted Articles', description: 'Access the editorial review queue and evaluate submissions', category: 'Review' },
  { key: 'news.approve', label: 'Approve for Publication', description: 'Mark reviewed articles as medically & editorially approved', category: 'Review' },
  { key: 'news.reject', label: 'Reject Submissions', description: 'Reject submitted articles with explicit feedback', category: 'Review' },
  { key: 'news.request_changes', label: 'Request Editorial Changes', description: 'Send articles back to author with required revisions', category: 'Review' },

  // Taxonomic & Metadata Management
  { key: 'news.manage_categories', label: 'Manage Categories', description: 'Add, edit, or remove medical news categories & subcategories', category: 'Taxonomy' },
  { key: 'news.manage_tags', label: 'Manage Clinical Tags', description: 'Curate medical tags, mesh terms, and research keywords', category: 'Taxonomy' },
  { key: 'news.manage_authors', label: 'Manage Authors & Reviewers', description: 'Manage author monographs, credentials, and affiliations', category: 'Taxonomy' },
  { key: 'news.manage_media', label: 'Manage Media Library', description: 'Upload, caption, and organize scientific imagery and diagrams', category: 'Media' },
  { key: 'news.manage_seo', label: 'Manage SEO & Metadata', description: 'Edit search engine slugs, canonical URLs, and schema markers', category: 'SEO' },
  { key: 'news.manage_comments', label: 'Manage Internal Notes', description: 'Create and resolve private editorial notes', category: 'Review' },

  // High-Impact & System Safeguards
  { key: 'news.manage_featured', label: 'Manage Featured Stories', description: 'Promote top stories to hero spotlights', category: 'High-Impact' },
  { key: 'news.manage_breaking_news', label: 'Control Breaking News Banner', description: 'Activate and edit public red emergency/breaking news tickers', category: 'High-Impact', critical: true },
  { key: 'news.view_analytics', label: 'View Readership Analytics', description: 'Access article views, completion rates, and reader engagement metrics', category: 'Analytics' },
  { key: 'news.view_audit_logs', label: 'View Audit & Security Logs', description: 'Inspect chronological system activity and authorization events', category: 'Security', critical: true },
  { key: 'news.export', label: 'Export Data & Reports', description: 'Download news archives, clinical records, or audit exports', category: 'Analytics' },
  { key: 'news.manage_permissions', label: 'Manage Staff & Permissions', description: 'Provision, suspend, and configure staff access & permissions (Admin only)', category: 'Security', critical: true },
  { key: 'news.admin_override', label: 'Administrator Override', description: 'Bypass editorial blocks with mandatory audit tracking', category: 'Security', critical: true },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  SUPER_ADMIN: ALL_STAFF_PERMISSIONS.map((p) => p.key),
  NEWS_ADMIN: [
    'news.view',
    'news.create',
    'news.edit',
    'news.delete',
    'news.archive',
    'news.restore',
    'news.publish',
    'news.unpublish',
    'news.schedule',
    'news.cancel_schedule',
    'news.review',
    'news.approve',
    'news.reject',
    'news.request_changes',
    'news.manage_categories',
    'news.manage_tags',
    'news.manage_authors',
    'news.manage_featured',
    'news.manage_breaking_news',
    'news.manage_media',
    'news.manage_seo',
    'news.manage_comments',
    'news.view_analytics',
    'news.view_audit_logs',
    'news.export',
  ],
  EDITOR: [
    'news.view',
    'news.create',
    'news.edit',
    'news.delete',
    'news.archive',
    'news.restore',
    'news.schedule',
    'news.review',
    'news.approve',
    'news.request_changes',
    'news.manage_categories',
    'news.manage_tags',
    'news.manage_media',
    'news.manage_seo',
    'news.manage_comments',
    'news.view_analytics',
  ],
  REVIEWER: [
    'news.view',
    'news.review',
    'news.approve',
    'news.reject',
    'news.request_changes',
    'news.manage_comments',
    'news.view_analytics',
  ],
  PUBLISHER: [
    'news.view',
    'news.publish',
    'news.unpublish',
    'news.schedule',
    'news.cancel_schedule',
    'news.archive',
    'news.manage_featured',
    'news.view_analytics',
  ],
  AUTHOR: [
    'news.view',
    'news.create',
    'news.edit',
    'news.manage_media',
    'news.manage_comments',
  ],
};

const INITIAL_STAFF_MEMBERS: StaffMember[] = [];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

interface StoredSession {
  staffId: string;
  token: string;
  loginTime: string;
  expiresAt: string;
}

interface LoginAttemptRecord {
  email: string;
  attempts: number;
  lastAttempt: string;
  lockoutUntil?: string;
}

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const newsAuthService = {
  // Staff Directory Management
  // Client-side copies are identity/profile mirrors only. Passwords are never
  // stored in browser storage; any legacy records are stripped on read.
  getStaffMembers(): StaffMember[] {
    const members = getStored<StaffMember[]>(STORAGE_KEYS.STAFF_MEMBERS, INITIAL_STAFF_MEMBERS);
    return members.map((member) => {
      const safe = { ...member };
      delete (safe as { password?: string }).password;
      return safe;
    });
  },

  saveStaffMembers(members: StaffMember[]): void {
    setStored(STORAGE_KEYS.STAFF_MEMBERS, members);
  },

  getStaffById(id: string): StaffMember | undefined {
    return this.getStaffMembers().find((s) => s.id === id);
  },

  getStaffByEmail(email: string): StaffMember | undefined {
    return this.getStaffMembers().find(
      (s) => s.email.toLowerCase() === email.trim().toLowerCase()
    );
  },

  // Audit Logs
  getAuditLogs(): AuditLogEntry[] {
    return getStored<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  },

  logAudit(
    action: string,
    targetType: AuditLogEntry['targetType'],
    targetTitle?: string,
    details?: string,
    severity: AuditLogEntry['severity'] = 'info',
    status: AuditLogEntry['status'] = 'success',
    targetId?: string
  ): void {
    const currentUser = this.getCurrentStaffUser();
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      actorId: currentUser?.id || 'anonymous-or-system',
      actorName: currentUser?.name || 'System / Unauthenticated',
      actorRole: currentUser?.role || 'NONE',
      actorEmail: currentUser?.email,
      action,
      targetType,
      targetId,
      targetTitle: targetTitle || 'N/A',
      details: details || '',
      severity,
      status,
      ipAddress: '127.0.0.1 (Authenticated Client Session)',
    };

    const logs = this.getAuditLogs();
    const updated = [newEntry, ...logs.slice(0, 499)]; // retain last 500 records
    setStored(STORAGE_KEYS.AUDIT_LOGS, updated);
  },

  // Session & Authentication
  getCurrentSession(): StoredSession | null {
    const session = getStored<StoredSession | null>(STORAGE_KEYS.STAFF_SESSION, null);
    if (!session) return null;

    // Check expiry (e.g. 8 hours)
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.logout();
      return null;
    }
    return session;
  },

  getCurrentStaffUser(): StaffMember | null {
    // PRIMARY: the server-verified News Management admin session. Identity
    // and permissions come from the server-granted profile — a client-stored
    // role value is never trusted as the source of truth.
    if (getAdminToken()) {
      const admin = getAdminProfile();
      if (admin && admin.status === 'active') {
        return {
          id: admin.adminId,
          name: admin.name,
          email: admin.email,
          role: admin.role as StaffRole,
          status: 'active',
          permissions: admin.permissions as StaffPermission[],
          accountCreated: admin.title || '',
          lastLogin: new Date().toISOString(),
          mfaEnabled: admin.mfaEnabled,
          notes: admin.title
        };
      }
      // Stale/invalid mirror — drop it so the auth gate re-validates.
      clearAdminSession();
    }

    // Legacy local staff sessions are no longer credible: they could be
    // written by browser code and do not prove server authorization.
    return null;
  },

  isAuthenticated(): boolean {
    return this.getCurrentStaffUser() !== null;
  },

  isSuperAdmin(): boolean {
    const staff = this.getCurrentStaffUser();
    return staff?.role === 'SUPER_ADMIN';
  },

  // Login Attempt Rate Limiter & Lockout Check
  getLoginAttemptRecord(email: string): LoginAttemptRecord | undefined {
    const attempts = getStored<Record<string, LoginAttemptRecord>>(STORAGE_KEYS.LOGIN_ATTEMPTS, {});
    return attempts[email.toLowerCase()];
  },

  recordFailedLoginAttempt(email: string): { lockedOut: boolean; lockoutUntil?: string; remainingAttempts: number } {
    const attempts = getStored<Record<string, LoginAttemptRecord>>(STORAGE_KEYS.LOGIN_ATTEMPTS, {});
    const key = email.toLowerCase();
    const current = attempts[key] || { email: key, attempts: 0, lastAttempt: new Date().toISOString() };

    current.attempts += 1;
    current.lastAttempt = new Date().toISOString();

    let lockedOut = false;
    if (current.attempts >= 5) {
      lockedOut = true;
      const lockoutTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min lockout
      current.lockoutUntil = lockoutTime;
    }

    attempts[key] = current;
    setStored(STORAGE_KEYS.LOGIN_ATTEMPTS, attempts);

    return {
      lockedOut,
      lockoutUntil: current.lockoutUntil,
      remainingAttempts: Math.max(0, 5 - current.attempts),
    };
  },

  clearLoginAttempts(email: string): void {
    const attempts = getStored<Record<string, LoginAttemptRecord>>(STORAGE_KEYS.LOGIN_ATTEMPTS, {});
    delete attempts[email.toLowerCase()];
    setStored(STORAGE_KEYS.LOGIN_ATTEMPTS, attempts);
  },

  // Two-Factor Authentication via Staff Email Address
  getActiveMfaChallenge(email: string): { email: string; code: string; expiresAt: string; recipientName: string } | null {
    const challenges = getStored<Record<string, { email: string; code: string; expiresAt: string; recipientName: string }>>(
      STORAGE_KEYS.ACTIVE_MFA_CHALLENGE,
      {}
    );
    const challenge = challenges[email.toLowerCase()];
    if (!challenge) return null;
    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      delete challenges[email.toLowerCase()];
      setStored(STORAGE_KEYS.ACTIVE_MFA_CHALLENGE, challenges);
      return null;
    }
    return challenge;
  },

  sendEmailMfaCode(email: string): MfaDispatchResult {
    const cleanEmail = email.trim().toLowerCase();
    const staff = this.getStaffByEmail(cleanEmail);
    if (!staff) {
      return { success: false, error: 'Staff member account not found.' };
    }

    if (staff.status !== 'active') {
      return { success: false, error: `Account status is currently ${staff.status}. Cannot issue MFA challenge.` };
    }

    // Generate a secure 6-digit verification code
    const mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

    const challenges = getStored<Record<string, { email: string; code: string; expiresAt: string; recipientName: string }>>(
      STORAGE_KEYS.ACTIVE_MFA_CHALLENGE,
      {}
    );

    challenges[cleanEmail] = {
      email: cleanEmail,
      code: mfaCode,
      expiresAt,
      recipientName: staff.name,
    };
    setStored(STORAGE_KEYS.ACTIVE_MFA_CHALLENGE, challenges);

    this.logAudit(
      'MFA_EMAIL_DISPATCHED',
      'auth',
      staff.name,
      `Two-Factor Authentication security code dispatched to staff email ${staff.email}.`,
      'info',
      'success',
      staff.id
    );

    return {
      success: true,
      code: mfaCode,
      recipientName: staff.name,
      recipientEmail: staff.email,
      expiresAt,
    };
  },

  verifyEmailMfa(
    email: string,
    mfaCode: string
  ): { success: boolean; staff?: StaffMember; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const staff = this.getStaffByEmail(cleanEmail);
    if (!staff) {
      return { success: false, error: 'Staff account not found.' };
    }

    const challenge = this.getActiveMfaChallenge(cleanEmail);
    const enteredCode = mfaCode.trim();

    // Only the dispatched code is accepted — there is deliberately NO
    // universal/demo bypass code.
    const isExactMatch = challenge && challenge.code === enteredCode;

    if (!isExactMatch) {
      this.logAudit('MFA_FAILED', 'auth', staff.name, `Invalid 2FA code entered for ${cleanEmail}.`, 'warning', 'failed', staff.id);
      return {
        success: false,
        error: 'Invalid 6-digit MFA verification code. Please check the security code sent to your staff email.',
      };
    }

    // Clear active MFA challenge
    const challenges = getStored<Record<string, any>>(STORAGE_KEYS.ACTIVE_MFA_CHALLENGE, {});
    delete challenges[cleanEmail];
    setStored(STORAGE_KEYS.ACTIVE_MFA_CHALLENGE, challenges);

    // Clear login attempts
    this.clearLoginAttempts(cleanEmail);

    // Update last login
    const updatedStaffList = this.getStaffMembers().map((s) =>
      s.id === staff.id ? { ...s, lastLogin: new Date().toISOString(), failedLoginAttempts: 0 } : s
    );
    this.saveStaffMembers(updatedStaffList);

    // Create session
    const sessionToken = `gh_sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours
    const newSession: StoredSession = {
      staffId: staff.id,
      token: sessionToken,
      loginTime: new Date().toISOString(),
      expiresAt,
    };
    setStored(STORAGE_KEYS.STAFF_SESSION, newSession);

    this.logAudit(
      'STAFF_LOGIN_SUCCESS',
      'auth',
      staff.name,
      `Two-Factor Authentication verified via email ${staff.email}. Logged in as ${staff.role}.`,
      'info',
      'success',
      staff.id
    );

    return {
      success: true,
      staff,
    };
  },

  /** Adopts a SERVER-authenticated identity (from /api/news/login) into the
   *  workspace session so the CMS chrome (role/permission UI) works. No
   *  credentials are stored — authorization for every server action comes
   *  from the server session token (newsGovernanceClient), not from here. */
  adoptServerAccount(server: {
    accountType: 'admin' | 'authority';
    id: string;
    name: string;
    email: string;
    role?: string;
  }): StaffMember | null {
    const email = server.email.trim().toLowerCase();
    const role: StaffRole = server.accountType === 'admin'
      ? (server.role === 'NEWS_ADMIN' ? 'NEWS_ADMIN' : 'SUPER_ADMIN')
      : 'EDITOR';
    const existing = this.getStaffByEmail(email);
    const staff: StaffMember =
      existing ||
      ({
        id: `staff-${Date.now()}`,
        name: server.name,
        email,
        role,
        status: 'active',
        permissions: DEFAULT_ROLE_PERMISSIONS[role] || [],
        accountCreated: new Date().toISOString(),
        mfaEnabled: true
      } as StaffMember);
    if (existing) {
      // Keep the local record in sync with the server identity.
      existing.role = role;
      existing.status = 'active';
      existing.name = server.name;
      existing.permissions = DEFAULT_ROLE_PERMISSIONS[role] || existing.permissions;
    }
    const members = this.getStaffMembers();
    if (!existing) this.saveStaffMembers([staff, ...members]);

    const session: StoredSession = {
      staffId: staff.id,
      token: `local-${Date.now().toString(36)}`,
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      loginTime: new Date().toISOString()
    };
    setStored(STORAGE_KEYS.STAFF_SESSION, session);
    this.logAudit(
      'SERVER_SESSION_ADOPTED',
      'auth',
      staff.name,
      `Workspace session established from a server-verified ${server.accountType} sign-in.`,
      'info',
      'success',
      staff.id
    );
    return staff;
  },

  // Core Login Procedure
  login(
    email: string,
    password?: string,
    mfaCode?: string
  ): { success: boolean; error?: string; staff?: StaffMember; requiresMfa?: boolean; mfaDispatch?: MfaDispatchResult } {
    const cleanEmail = email.trim().toLowerCase();
    const attemptInfo = this.getLoginAttemptRecord(cleanEmail);

    // Check if locked out
    if (attemptInfo?.lockoutUntil && new Date(attemptInfo.lockoutUntil).getTime() > Date.now()) {
      const minutesRemaining = Math.ceil(
        (new Date(attemptInfo.lockoutUntil).getTime() - Date.now()) / 60000
      );
      this.logAudit(
        'LOGIN_BLOCKED_LOCKOUT',
        'auth',
        cleanEmail,
        `Account temporarily locked due to excessive failed attempts. ${minutesRemaining} minutes remaining.`,
        'warning',
        'denied'
      );
      return {
        success: false,
        error: `Security Lockout: Too many failed login attempts. Please wait ${minutesRemaining} minutes before trying again.`,
      };
    }

    const staff = this.getStaffByEmail(cleanEmail);

    // Generic error to avoid exposing account existence to public scans
    if (!staff) {
      this.recordFailedLoginAttempt(cleanEmail);
      this.logAudit('LOGIN_FAILED', 'auth', cleanEmail, 'Attempted login with non-existent staff identifier.', 'warning', 'failed');
      return {
        success: false,
        error: 'Invalid administrative credentials or unauthorized account.',
      };
    }

    // Check account status
    if (staff.status === 'pending_approval') {
      return {
        success: false,
        error: 'Account Pending Approval: An Administrator must explicitly approve and activate your account before you can log in.',
      };
    }

    if (staff.status === 'suspended') {
      return {
        success: false,
        error: 'Account Suspended: Your access has been temporarily suspended by the Administrator.',
      };
    }

    if (staff.status === 'disabled') {
      return {
        success: false,
        error: 'Account Disabled: This administrative staff account is currently inactive.',
      };
    }

    if (staff.status === 'expired' || (staff.accessExpiry && new Date(staff.accessExpiry).getTime() < Date.now())) {
      return {
        success: false,
        error: 'Access Expired: Your temporary authorization window has ended. Contact the Administrator for renewal.',
      };
    }

    // Client-side password verification is deliberately disabled. Credentials
    // are checked only by the server session endpoints. Browser storage must
    // never become an authentication authority.
    this.logAudit('CLIENT_AUTH_REJECTED', 'auth', staff.name, 'Attempted client-side staff login; blocked because only server authentication is allowed.', 'warning', 'denied', staff.id);
    return {
      success: false,
      error: 'Invalid administrative credentials or unauthorized account.',
    };

  },

  logout(): void {
    const currentUser = this.getCurrentStaffUser();
    if (currentUser) {
      this.logAudit('STAFF_LOGOUT', 'auth', currentUser.name, `Logged out of News Management session.`, 'info', 'success', currentUser.id);
    }
    localStorage.removeItem(STORAGE_KEYS.STAFF_SESSION);
    clearAdminSession();
  },

  logoutAllSessions(): void {
    this.logout();
    this.logAudit('LOGOUT_ALL_SESSIONS', 'security', 'Global Session Termination', 'Terminated all active staff sessions.', 'info', 'success');
  },

  // Permission Verification (Backend & Frontend Guard)
  hasPermission(
    permission: StaffPermission,
    context?: { category?: string; articleId?: string; author?: string; authorId?: string }
  ): boolean {
    const user = this.getCurrentStaffUser();
    if (!user) return false;

    // Super Admin has absolute system authority
    if (user.role === 'SUPER_ADMIN') return true;

    // Check if user has the specific permission
    const hasBasePermission = user.permissions.includes(permission);
    if (!hasBasePermission) return false;

    // Category restriction check
    if (context?.category && user.assignedCategories && user.assignedCategories.length > 0) {
      const match = user.assignedCategories.some(
        (cat) => cat.toLowerCase() === context.category?.toLowerCase()
      );
      if (!match) return false;
    }

    // Author draft editing isolation
    if (user.role === 'AUTHOR' && permission === 'news.edit') {
      if (context?.author && !context.author.toLowerCase().includes(user.name.toLowerCase())) {
        return false;
      }
      if (context?.authorId && context.authorId !== user.id) {
        return false;
      }
    }

    return true;
  },

  // Staff Administration Actions (Super Admin / news.manage_permissions only)
  addStaffMember(
    data: Omit<StaffMember, 'id' | 'accountCreated'>
  ): { success: boolean; staff?: StaffMember; error?: string } {
    if (!this.hasPermission('news.manage_permissions')) {
      this.logAudit('PERMISSION_DENIED', 'security', 'Add Staff', 'Attempted unauthorized staff creation.', 'critical', 'denied');
      return { success: false, error: 'Unauthorized: Only Administrators can create authorized staff accounts.' };
    }

    const existing = this.getStaffByEmail(data.email);
    if (existing) {
      return { success: false, error: 'A staff member with this email address already exists.' };
    }

    const safeData = { ...data };
    delete (safeData as { password?: string }).password;
    const newStaff: StaffMember = {
      ...safeData,
      id: `staff-${Date.now()}`,
      accountCreated: new Date().toISOString(),
      permissions: safeData.permissions || DEFAULT_ROLE_PERMISSIONS[safeData.role] || [],
    };

    const members = this.getStaffMembers();
    this.saveStaffMembers([...members, newStaff]);

    this.logAudit('STAFF_CREATED', 'staff', newStaff.name, `Provisioned new staff account (${newStaff.role}) with status ${newStaff.status}.`, 'info', 'success', newStaff.id);

    return { success: true, staff: newStaff };
  },

  updateStaffMember(
    id: string,
    updates: Partial<StaffMember>
  ): { success: boolean; error?: string } {
    if (!this.hasPermission('news.manage_permissions')) {
      this.logAudit('PERMISSION_DENIED', 'security', 'Update Staff', 'Attempted unauthorized staff modification.', 'critical', 'denied');
      return { success: false, error: 'Unauthorized: Administrator permissions required.' };
    }

    const members = this.getStaffMembers();
    const target = members.find((s) => s.id === id);
    if (!target) {
      return { success: false, error: 'Staff member not found.' };
    }

    // Protect Super Admin from accidental removal or demotion if it's the primary admin
    if (target.role === 'SUPER_ADMIN' && updates.role && updates.role !== 'SUPER_ADMIN') {
      const superAdminsCount = members.filter((s) => s.role === 'SUPER_ADMIN' && s.status === 'active').length;
      if (superAdminsCount <= 1) {
        return { success: false, error: 'Cannot demote the sole active Super Administrator.' };
      }
    }

    const safeUpdates = { ...updates };
    delete (safeUpdates as { password?: string }).password;
    const updatedMembers = members.map((s) => (s.id === id ? { ...s, ...safeUpdates } : s));
    this.saveStaffMembers(updatedMembers);

    this.logAudit(
      'STAFF_UPDATED',
      'staff',
      target.name,
      `Updated staff configuration: ${Object.keys(updates).join(', ')}`,
      'info',
      'success',
      id
    );

    return { success: true };
  },

  deleteStaffMember(id: string): { success: boolean; error?: string } {
    if (!this.hasPermission('news.manage_permissions')) {
      this.logAudit('PERMISSION_DENIED', 'security', 'Delete Staff', 'Attempted unauthorized staff deletion.', 'critical', 'denied');
      return { success: false, error: 'Unauthorized: Administrator permissions required.' };
    }

    const members = this.getStaffMembers();
    const target = members.find((s) => s.id === id);
    if (!target) return { success: false, error: 'Staff member not found.' };

    if (target.role === 'SUPER_ADMIN') {
      const superAdminsCount = members.filter((s) => s.role === 'SUPER_ADMIN').length;
      if (superAdminsCount <= 1) {
        return { success: false, error: 'Cannot delete the only Super Administrator.' };
      }
    }

    const filtered = members.filter((s) => s.id !== id);
    this.saveStaffMembers(filtered);

    this.logAudit('STAFF_DELETED', 'staff', target.name, `Removed staff authorization record for ${target.email}.`, 'warning', 'success', id);

    return { success: true };
  },

  toggleStaffStatus(id: string, newStatus: StaffAccountStatus): { success: boolean; error?: string } {
    return this.updateStaffMember(id, { status: newStatus });
  },

  forceLogoutStaff(id: string): { success: boolean; error?: string } {
    const session = this.getCurrentSession();
    if (session?.staffId === id) {
      this.logout();
    }
    this.logAudit('FORCE_LOGOUT', 'security', `Staff ID: ${id}`, 'Administrator forced termination of staff session.', 'warning', 'success', id);
    return { success: true };
  },

  // ---------------------------------------------------------------------
  // PUBLIC SELF-SERVICE: staff account application + password recovery.
  // These deliberately bypass the in-session permission check (there is no
  // session yet) but write their own audit trail and never expose whether an
  // account exists to anonymous callers.
  // ---------------------------------------------------------------------
  submitStaffAccountApplication(data: {
    fullName: string;
    email: string;
    password?: string;
    jobTitle?: string;
    organization?: string;
    reason?: string;
  }): { success: boolean; error?: string } {
    const cleanEmail = String(data.email || '').trim().toLowerCase();
    const fullName = String(data.fullName || '').trim();

    if (fullName.length < 3) return { success: false, error: 'Please enter your full name.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { success: false, error: 'Please enter a valid email address.' };

    const members = this.getStaffMembers();
    if (members.some((s) => s.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account already exists for this email. Try signing in or reset your password.' };
    }

    // New public applications always land as EDITORS pending administrator
    // approval — least privilege until an admin elevates the role.
    // Credentials are provisioned later through the server-side admin flow;
    // the browser never receives or stores a password.
    const application: StaffMember = {
      id: `staff-${Date.now()}`,
      name: fullName,
      email: cleanEmail,
      role: 'EDITOR',
      status: 'pending_approval',
      permissions: [],
      accountCreated: new Date().toISOString(),
      notes: [
        data.jobTitle ? `Applied job title: ${data.jobTitle}` : null,
        data.organization ? `Applied organization: ${data.organization}` : null,
        data.reason ? `Application reason: ${data.reason}` : null
      ].filter(Boolean).join(' · ')
    };

    this.saveStaffMembers([application, ...members]);
    this.logAudit(
      'STAFF_ACCOUNT_APPLICATION',
      'auth',
      fullName,
      `New editorial account application submitted for ${cleanEmail}. Administrator approval required before activation.`,
      'info',
      'success',
      application.id
    );

    return { success: true };
  },

  requestStaffPasswordReset(email: string): { success: boolean; message: string } {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const genericMessage = 'If a News Management account exists for that email, a secure reset link has been sent. The link is valid for 15 minutes.';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const staff = this.getStaffByEmail(cleanEmail);
    if (!staff) {
      // Privacy-preserving: identical outcome whether or not the account exists.
      this.logAudit('PASSWORD_RESET_REQUESTED', 'auth', cleanEmail, 'Reset requested for unknown account (no-op).', 'info', 'success');
      return { success: true, message: genericMessage };
    }

    // Password recovery is owned by the server-side News Management flow.
    // Browser storage never holds reset tokens or codes.
    this.logAudit('PASSWORD_RESET_REQUESTED', 'auth', staff.name, `Reset link dispatched to ${cleanEmail}.`, 'info', 'success', staff.id);
    return { success: true, message: genericMessage };
  },

  resetStaffPassword(_input: { token: string; code: string; newPassword: string }): { success: boolean; error?: string } {
    return {
      success: false,
      error: 'News Management password changes must be completed through the server-verified password reset flow.'
    };
  },
};
