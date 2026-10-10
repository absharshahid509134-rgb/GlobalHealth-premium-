import type { DoctorProfile } from '../components/doctor-portal/doctorPortalData';
import { getStoredToken } from './authClient';

/**
 * Server boundary for the Doctor Portal.
 *
 * The portal deliberately keeps only the opaque doctor session token in
 * sessionStorage. Doctor profile data and protected clinical data stay in
 * memory and are reloaded from the server after the session is validated.
 * This is important: a UI fixture must never be mistaken for an authorized
 * patient directory or durable clinical storage.
 */

const SESSION_KEY = 'doctor_portal_session_token_v2';

export interface ServerDoctor {
  doctorId: string;
  fullName: string;
  username?: string;
  email?: string;
  organization?: string;
  specialty?: string;
  role?: string;
  department?: string;
  registrationNo?: string;
  verificationStatus?: 'VERIFIED' | 'PENDING';
  sessionExpiresAt?: string;
}

export interface AuthorizedPatientSummary {
  patientUserId: string;
  patientName: string;
  patientIdentifier?: string;
  dataSource?: 'server' | 'development-seed';
  accessStatus: 'active' | 'expiring' | 'emergency' | 'expired' | 'revoked';
  grantedAt: string;
  expiresAt: string | null;
  scope: string[];
  canView: boolean;
  lastViewedAt: string | null;
  permissions: Record<string, boolean | string>;
  modificationAccess: 'PATIENT_APPROVAL_REQUIRED';
  pendingConsentCount: number;
  recordCategories: string[];
}

export interface ServerEhrResponse {
  success: boolean;
  dataSource?: 'server' | 'development-seed';
  viewAccess: 'ACTIVE';
  modificationAccess: 'PATIENT_APPROVAL_REQUIRED';
  emergency: boolean | null;
  emergencyExpiresAt: string | null;
  patient: {
    name: string;
    overview: {
      name?: string;
      allergies?: string[];
      currentMedications?: string[];
    };
    recordStatus: {
      viewAccess: string;
      modificationAccess: string;
      deletionAccess: string;
    };
  };
  grant: {
    scope: string[];
    grantedAt: string;
    expiresAt: string | null;
    status: string;
    permissions: Record<string, boolean | string>;
  };
  records: Array<{
    recordId: string;
    category: string;
    title: string;
    currentVersion: number;
    createdAt: string;
    latest?: string;
  }>;
}

export interface PrescriptionPreparationPayload {
  patientId: string;
  medications: Array<{
    medicationName: string;
    strength?: string;
    form?: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    route?: string;
    instructions?: string;
    quantity?: number;
    refills?: number;
  }>;
  allergyList?: string[];
}

export interface PrescriptionPreparationResponse {
  success: boolean;
  rxId: string;
  prescriptionId: string;
  preparedAt: string;
  itemCount: number;
  interactions: Array<{ severity: string; medication: string; reason: string }>;
  signingStatus: 'SIGNED' | 'UNSIGNED';
  digitalSignature: string | null;
  status: 'HELD_FOR_SIGNING' | 'HELD_FOR_CONFIRMATION' | 'READY_FOR_PHARMACY';
  message: string;
}

export interface ConsentRequestPayload {
  patientUserId: string;
  kind: 'access_grant' | 'add' | 'edit' | 'remove';
  recordCategory?: string;
  recordId?: string;
  title: string;
  summary?: string;
  reason: string;
  explanation?: string;
  proposedValue?: string;
  priority?: 'normal' | 'high';
  validityDays?: 1 | 3 | 7;
  requestedScope?: string[];
  accessDurationDays?: 30 | 90 | 365;
}

export interface DoctorNotification {
  id: string;
  doctorId: string;
  type: string;
  title: string;
  body: string;
  requestId?: string;
  patientName?: string;
  read: boolean;
  at: string;
}

export interface DoctorAuditEvent {
  auditId: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  actorName: string;
  eventType: string;
  result: string;
  resourceType?: string | null;
  resourceId?: string | null;
  patientId?: string | null;
  requestId?: string | null;
  recordCategory?: string | null;
  detail: string;
  accessPermission?: string | null;
  hash?: string | null;
  prevHash?: string | null;
}

interface ApiErrorPayload {
  error?: string | { message?: string };
  code?: string;
}

let inMemoryToken: string | null = null;

function readSessionToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSessionToken(token: string) {
  inMemoryToken = token;
  try {
    window.sessionStorage.setItem(SESSION_KEY, token);
  } catch {
    // A browser may disable storage. The in-memory token is still usable for
    // the current page, but the session will not survive a reload.
  }
}

/**
 * The centralized professional sign-in issues the same opaque doctor session
 * token used by the dedicated Doctor Portal. The portal keeps a short-lived
 * sessionStorage copy for its API client, so a successful central sign-in must
 * explicitly adopt that already-validated token instead of showing a second
 * credential form. The identity is revalidated by the server before adoption.
 */
async function adoptGlobalDoctorSession(): Promise<boolean> {
  const globalToken = getStoredToken();
  if (!globalToken) return false;

  try {
    const response = await fetch('/api/auth/me', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${globalToken}` },
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const identity = await response.json() as { portalRole?: string; user?: { portalRole?: string } };
    const role = String(identity.portalRole || identity.user?.portalRole || '').toLowerCase();
    if (!response.ok || role !== 'doctor') return false;
    writeSessionToken(globalToken);
    return true;
  } catch {
    return false;
  }
}

export function clearDoctorSession() {
  inMemoryToken = null;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage failures
  }
}

export function getDoctorSessionToken(): string | null {
  return readSessionToken();
}

function errorMessage(payload: ApiErrorPayload, fallback: string): string {
  if (typeof payload.error === 'string') return payload.error;
  if (payload.error && typeof payload.error.message === 'string') return payload.error.message;
  return fallback;
}

async function request<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const auth = options.auth !== false;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? readSessionToken() : null;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
    });
  } catch {
    throw new Error('The Doctor Portal could not reach the GlobalHealth server. Please retry.');
  }

  let payload: T & ApiErrorPayload;
  try {
    payload = (await response.json()) as T & ApiErrorPayload;
  } catch {
    payload = {} as T & ApiErrorPayload;
  }

  if (response.status === 401) {
    if (token && token === readSessionToken()) clearDoctorSession();
    throw new Error('Your Doctor Portal session has expired. Please sign in again.');
  }
  if (!response.ok) {
    throw new Error(errorMessage(payload, 'The Doctor Portal request could not be completed.'));
  }
  return payload;
}

function mapDoctor(serverDoctor: ServerDoctor): DoctorProfile {
  const displayName = serverDoctor.fullName || 'Verified doctor';
  const specialty = serverDoctor.specialty || 'General Medicine';
  const now = new Date().toISOString();
  return {
    id: serverDoctor.doctorId,
    userId: `doctor:${serverDoctor.doctorId}`,
    displayName,
    fullName: displayName,
    professionalTitle: serverDoctor.role || 'Clinician',
    specialty,
    organization: serverDoctor.organization,
    subSpecialties: [],
    qualifications: [],
    bio: '',
    languages: [],
    yearsOfPractice: 0,
    areasOfPractice: [specialty],
    profilePhoto: undefined,
    workEmail: serverDoctor.email || '',
    phone: '',
    preferredContact: 'in_app',
    verificationStatus: serverDoctor.verificationStatus === 'VERIFIED' ? 'verified' : 'pending',
    verificationNextAction: serverDoctor.verificationStatus === 'VERIFIED' ? undefined : 'Credential review is required before clinical access.',
    profileCompleteness: 0,
    missingProfileFields: [],
    publicStatus: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export const doctorApi = {
  async login(identifier: string, password: string): Promise<{ success: true; doctor: DoctorProfile } | { success: false; error: string }> {
    try {
      const response = await request<{ success: boolean; token?: string; doctor?: ServerDoctor; error?: string }>('/api/doctor/auth/login', {
        method: 'POST',
        auth: false,
        body: { identifier: identifier.trim(), password },
      });
      if (!response.success || !response.token || !response.doctor) {
        return { success: false, error: response.error || 'Unable to sign in with those credentials.' };
      }
      writeSessionToken(response.token);
      return { success: true, doctor: mapDoctor(response.doctor) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unable to sign in.' };
    }
  },

  async restoreSession(): Promise<{ success: true; doctor: DoctorProfile } | { success: false }> {
    // The central session is authoritative whenever it exists. This prevents
    // an old dedicated sessionStorage token from surviving a role/account
    // switch and mounting the wrong clinician workspace after a reload.
    const globalToken = getStoredToken();
    if (globalToken) {
      clearDoctorSession();
      if (!(await adoptGlobalDoctorSession())) return { success: false };
    }
    if (!readSessionToken()) return { success: false };
    try {
      const response = await request<{ success: boolean; doctor?: ServerDoctor }>('/api/doctor/auth/me');
      return response.success && response.doctor ? { success: true, doctor: mapDoctor(response.doctor) } : { success: false };
    } catch {
      clearDoctorSession();
      return { success: false };
    }
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return request<{ success: boolean; message?: string; error?: string }>('/api/doctor/auth/change-password', {
      method: 'POST',
      body: { oldPassword, newPassword },
    });
  },

  async logout(): Promise<void> {
    try {
      if (readSessionToken()) await request('/api/doctor/auth/logout', { method: 'POST' });
    } catch {
      // The server may already have expired the session. Clearing the local
      // bearer token is still the safe outcome.
    } finally {
      clearDoctorSession();
    }
  },

  async requestPasswordReset(usernameOrEmail: string): Promise<{ success: boolean; message: string; demoResetToken?: string }> {
    try {
      return await request('/api/doctor/auth/request-reset', {
        method: 'POST',
        auth: false,
        body: { usernameOrEmail: usernameOrEmail.trim() },
      });
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unable to request a password reset.' };
    }
  },

  async completePasswordReset(resetToken: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await request<{ success: boolean; message?: string; error?: string }>('/api/doctor/auth/complete-reset', {
        method: 'POST',
        auth: false,
        body: { resetToken: resetToken.trim(), newPassword },
      });
      return response;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unable to reset password.' };
    }
  },

  /**
   * Public self-registration is intentionally a review request, not an account
   * activation. The server must provision a verified account; the browser can
   * never mark itself verified.
   */
  async submitApplication(payload: Record<string, unknown>): Promise<{ success: boolean; applicationId?: string; message?: string; error?: string }> {
    try {
      return await request('/api/doctor/auth/applications', { method: 'POST', auth: false, body: payload });
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unable to submit the verification request.' };
    }
  },

  async listAuthorizedPatients(): Promise<{ patients: AuthorizedPatientSummary[] }> {
    return request<{ patients: AuthorizedPatientSummary[] }>('/api/doctor/patients');
  },

  async getPatientEhr(patientUserId: string): Promise<ServerEhrResponse> {
    return request<ServerEhrResponse>(`/api/doctor/patients/${encodeURIComponent(patientUserId)}/ehr`);
  },

  async preparePrescription(payload: PrescriptionPreparationPayload) {
    return request<PrescriptionPreparationResponse>('/api/prescribe', {
      method: 'POST',
      body: payload,
    });
  },

  async createConsentRequest(payload: ConsentRequestPayload) {
    return request<{ success: boolean; request: Record<string, unknown> }>('/api/doctor/consent-requests', {
      method: 'POST',
      body: payload,
    });
  },

  async listConsentRequests() {
    return request<{ success: boolean; requests: Array<Record<string, unknown>> }>('/api/doctor/consent-requests');
  },

  async listNotifications() {
    return request<{ success: boolean; notifications: DoctorNotification[]; unreadCount: number }>('/api/doctor/notifications');
  },

  async markNotificationsRead() {
    return request<{ success: boolean }>('/api/doctor/notifications/read', { method: 'POST' });
  },

  async markNotificationRead(notificationId: string) {
    return request<{ success: boolean }>(`/api/doctor/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' });
  },

  async listAuditHistory() {
    return request<{ success: boolean; events: DoctorAuditEvent[] }>('/api/doctor/audit-history');
  },

  async activateEmergencyAccess(patientUserId: string, reason: string) {
    return request<{ success: boolean; grant: Record<string, unknown>; message: string }>('/api/doctor/emergency-access', {
      method: 'POST',
      body: { patientUserId, reason },
    });
  },
};

export function mapServerDoctor(serverDoctor: ServerDoctor): DoctorProfile {
  return mapDoctor(serverDoctor);
}
