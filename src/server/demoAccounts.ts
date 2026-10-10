// Opt-in demo accounts (GH_DEMO_MODE=true, never in production).
//
// One primary account is provisioned per platform realm so every portal can be
// explored with sample data. Accounts are written into the same persisted
// stores that real registrations use and authenticate through the normal
// password verifiers; nothing here sets a session or bypasses credentials.
//
// Demo records carry `demoSeed: true`. The startup migration removes them when
// demo mode is off, and keeps them (idempotently refreshed) when it is on.
// Their identifiers avoid every legacy reserved/`demo-` prefix so they are never
// mistaken for the retired fixtures removed by accountMigration.ts.

import type { PlatformRole } from '../core/platformRoles';
import { ROLE_DESTINATIONS, ROLE_NAMES } from '../core/platformRoles';
import { hashSecret } from './security';

export const DEMO_SEED_MARKER = 'demoSeed' as const;
export const DEMO_PASSWORD_MIN_LENGTH = 8;

export interface DemoAccountSpec {
  role: PlatformRole;
  /** Stable server-side record ID (user ID, doctorId, username, adminId). */
  recordId: string;
  /** Email-style login identifier shown on the sign-in page. */
  identifier: string;
  displayName: string;
  description: string;
  /** Environment variable that overrides the development password. */
  passwordEnv: string;
  /** Development-only default. Ignored entirely outside demo mode. */
  defaultPassword: string;
}

export const DEMO_ACCOUNT_SPECS: readonly DemoAccountSpec[] = [
  {
    role: 'user',
    recordId: 'usr-gh-demo-patient',
    identifier: 'demo.user@example.test',
    displayName: 'Demo Patient',
    description: 'Personal health space with sample appointments, notifications and saved resources.',
    passwordEnv: 'GH_DEMO_PASSWORD_USER',
    defaultPassword: 'DemoPatient-2026!',
  },
  {
    role: 'doctor',
    recordId: 'doc-gh-demo-physician',
    identifier: 'demo.doctor@example.test',
    displayName: 'Dr. Demo Physician',
    description: 'Doctor portal with a pending patient access request and a sample notification.',
    passwordEnv: 'GH_DEMO_PASSWORD_DOCTOR',
    defaultPassword: 'DemoDoctor-2026!',
  },
  {
    role: 'hospital',
    recordId: 'demo.hospital@example.test',
    identifier: 'demo.hospital@example.test',
    displayName: 'Demo Hospital Administrator',
    description: 'Hospital portal for the seeded Delhi facility, with sample audit activity.',
    passwordEnv: 'GH_DEMO_PASSWORD_HOSPITAL',
    defaultPassword: 'DemoHospital-2026!',
  },
  {
    role: 'pharmacy',
    recordId: 'demo.pharmacy@example.test',
    identifier: 'demo.pharmacy@example.test',
    displayName: 'Demo Pharmacy Partner',
    description: 'Pharmacy partner workspace over a verified marketplace partner and its sample inventory.',
    passwordEnv: 'GH_DEMO_PASSWORD_PHARMACY',
    defaultPassword: 'DemoPharmacy-2026!',
  },
  {
    role: 'news',
    recordId: 'news-admin-demo',
    identifier: 'demo.news@example.test',
    displayName: 'Demo News Editor',
    description: 'News Management administrator. Sign-in requires the MFA code shown on the page in demo mode.',
    passwordEnv: 'GH_DEMO_PASSWORD_NEWS',
    defaultPassword: 'DemoNews-2026!',
  },
];

/** Verified marketplace partner and seeded hospital used by the demo accounts. */
export const DEMO_PHARMACY_PARTNER_ID = 'pharma-apex-01';
export const DEMO_PHARMACY_PARTNER_NAME = 'Apex Central Clinical Dispensary';
export const DEMO_HOSPITAL_ID = 'HSP-IN-DL-000125';
export const DEMO_PATIENT_USER_ID = 'usr-gh-demo-patient';
export const DEMO_DOCTOR_ID = 'doc-gh-demo-physician';

export type DemoPasswords = Record<PlatformRole, string>;

/**
 * Resolve per-account demo passwords from the environment. Overrides shorter
 * than the registration minimum are rejected so a weak value can never be
 * silently accepted.
 */
export function resolveDemoPasswords(env: NodeJS.ProcessEnv): DemoPasswords {
  const passwords = {} as DemoPasswords;
  for (const spec of DEMO_ACCOUNT_SPECS) {
    const override = (env[spec.passwordEnv] || '').trim();
    if (override && override.length < DEMO_PASSWORD_MIN_LENGTH) {
      throw new Error(`${spec.passwordEnv} must be at least ${DEMO_PASSWORD_MIN_LENGTH} characters when set.`);
    }
    passwords[spec.role] = override || spec.defaultPassword;
  }
  return passwords;
}

/** Public, credential-bearing view used only when demo mode is enabled. */
export function demoConfigView(enabled: boolean, passwords: DemoPasswords) {
  if (!enabled) return { enabled: false as const, accounts: [] as never[] };
  return {
    enabled: true as const,
    accounts: DEMO_ACCOUNT_SPECS.map(spec => ({
      role: spec.role,
      roleName: ROLE_NAMES[spec.role],
      displayName: spec.displayName,
      description: spec.description,
      identifier: spec.identifier,
      password: passwords[spec.role],
      destination: ROLE_DESTINATIONS[spec.role],
    })),
  };
}

export interface DemoSeedTargets {
  users: Map<string, any>;
  privateData: Map<string, any>;
  doctors: Map<string, any>;
  consentRequests: Map<string, any[]>;
  doctorNotifications: Map<string, any[]>;
  hospitalAccounts: Map<string, any>;
  hospitalRegistry: Map<string, any>;
  hospitalAudit: any[];
  pharmacyAccounts: Map<string, any>;
  inventoryAudit: any[];
  newsAdmins: Map<string, any>;
  removedDemoUserIds: Set<string>;
  newsPermissions: string[];
  now: string;
}

export interface DemoSeedResult {
  seeded: PlatformRole[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const upsertKeyed = (map: Map<string, any>, key: string, value: any) => {
  const existing = map.get(key);
  // Refresh only the demo account's own configuration; keep anything else.
  map.set(key, existing && typeof existing === 'object' ? { ...existing, ...value } : value);
};

/**
 * Idempotently provision the demo accounts and their sample records. Running it
 * repeatedly never duplicates an account, record, notification or audit entry.
 */
export function applyDemoAccountSeed(targets: DemoSeedTargets, passwords: DemoPasswords): DemoSeedResult {
  const spec = (role: PlatformRole) => DEMO_ACCOUNT_SPECS.find(s => s.role === role)!;
  const seeded: PlatformRole[] = [];

  // --- User (patient) ---------------------------------------------------------
  const patient = spec('user');
  upsertKeyed(targets.users, patient.recordId, {
    id: patient.recordId,
    username: 'demo.patient',
    fullName: 'Demo Patient',
    firstName: 'Demo',
    lastName: 'Patient',
    email: patient.identifier,
    passwordHash: hashSecret(patient.recordId, passwords.user),
    role: 'PUBLIC_USER',
    accountStatus: 'ACTIVE',
    isEmailVerified: true,
    isPhoneVerified: false,
    country: 'IN',
    preferredLanguage: 'English',
    twoFactor: { enabled: false },
    createdAt: targets.now,
    lastLoginAt: targets.now,
    [DEMO_SEED_MARKER]: true,
  });
  targets.removedDemoUserIds.delete(patient.recordId);
  if (!targets.privateData.has(patient.recordId)) {
    targets.privateData.set(patient.recordId, {
      ehr: {
        ownerId: patient.recordId, patientName: 'Demo Patient', mrn: 'MRN-DEMO0001', bloodGroup: 'B+',
        allergies: ['Penicillin (sample)'], chronicConditions: ['Seasonal allergies (sample)'], immunizations: [],
        updatedAt: targets.now,
      },
      healthRecords: [],
      appointments: [{
        id: 'apt-gh-demo-001', ownerId: patient.recordId, doctorName: 'Dr. Demo Physician', specialty: 'General Medicine',
        facility: 'Apex Medical Center (sample)', date: new Date(Date.parse(targets.now) + 7 * DAY_MS).toISOString().slice(0, 10),
        time: '10:30', reason: 'Follow-up consultation (sample data)', status: 'upcoming',
      }],
      orders: [],
      savedLibrary: { medicines: [], doctors: [], hospitals: [DEMO_HOSPITAL_ID], articles: [], guides: [], posts: [] },
      notifications: [{
        id: 'ntf-gh-demo-001', title: 'Sample appointment reminder', body: 'Demo data: your follow-up is scheduled in one week.',
        read: false, at: targets.now,
      }],
      community: { joinedGroups: [], followedUsers: [], posts: [], likes: [] },
      messages: [],
    });
  }
  seeded.push('user');

  // --- Doctor -----------------------------------------------------------------
  const doctor = spec('doctor');
  upsertKeyed(targets.doctors, doctor.recordId, {
    doctorId: doctor.recordId,
    fullName: doctor.displayName,
    organization: 'GlobalHealth Demo Clinic',
    specialty: 'General Medicine',
    registrationNo: 'DEMO-REG-000001',
    passwordHash: hashSecret(doctor.recordId, passwords.doctor),
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    username: doctor.identifier,
    email: doctor.identifier,
    role: 'Physician',
    department: 'General Medicine',
    [DEMO_SEED_MARKER]: true,
  });
  const requests = targets.consentRequests.get(DEMO_PATIENT_USER_ID) || [];
  if (!requests.some(r => r?.requestId === 'req-gh-demo-access-001')) {
    requests.push({
      requestId: 'req-gh-demo-access-001', patientUserId: DEMO_PATIENT_USER_ID, doctorId: doctor.recordId,
      kind: 'access_grant', title: 'Request to review recent lab results (sample)',
      summary: 'Demo data: follow-up review of recent laboratory results.',
      reason: 'Follow-up consultation (sample data)', priority: 'normal', clarifications: [],
      scope: ['Labs', 'Vitals'], accessDurationDays: 7, status: 'pending',
      createdAt: targets.now, expiresAt: new Date(Date.parse(targets.now) + 30 * DAY_MS).toISOString(),
    });
    targets.consentRequests.set(DEMO_PATIENT_USER_ID, requests);
  }
  const doctorNotes = targets.doctorNotifications.get(doctor.recordId) || [];
  if (!doctorNotes.some(n => n?.id === 'dntf-gh-demo-001')) {
    doctorNotes.unshift({
      id: 'dntf-gh-demo-001', doctorId: doctor.recordId, type: 'CONSENT_REQUEST',
      title: 'New access request (sample)', body: 'Demo data: a patient access request is awaiting review.',
      requestId: 'req-gh-demo-access-001', patientName: 'Demo Patient', patientUserId: DEMO_PATIENT_USER_ID,
      read: false, at: targets.now,
    });
    targets.doctorNotifications.set(doctor.recordId, doctorNotes);
  }
  seeded.push('doctor');

  // --- Hospital -----------------------------------------------------------------
  const hospital = spec('hospital');
  const hospitalName = targets.hospitalRegistry.get(DEMO_HOSPITAL_ID)?.identity?.name || 'Demo Hospital';
  upsertKeyed(targets.hospitalAccounts, hospital.recordId, {
    username: hospital.recordId,
    hospitalId: DEMO_HOSPITAL_ID,
    hospitalName,
    email: hospital.identifier,
    role: 'Hospital Administrator',
    passwordHash: hashSecret(hospital.recordId, passwords.hospital),
    status: 'ACTIVE',
    [DEMO_SEED_MARKER]: true,
  });
  if (!targets.hospitalAudit.some(a => a?.userId === hospital.recordId && a?.reason === 'Demo sample activity')) {
    targets.hospitalAudit.unshift({
      id: `hsp-aud-gh-demo-${targets.now}`, hospitalId: DEMO_HOSPITAL_ID, hospitalName, userId: hospital.recordId,
      userName: hospital.recordId, userRole: 'Hospital Administrator', section: 'auth', changes: [],
      changedAt: targets.now, publicationStatus: 'PUBLISHED', syncStatus: 'SYNCED', source: 'HOSPITAL_PORTAL',
      result: 'SUCCESS', reason: 'Demo sample activity',
    });
  }
  seeded.push('hospital');

  // --- Pharmacy partner ---------------------------------------------------------
  const pharmacy = spec('pharmacy');
  const partnerName = DEMO_PHARMACY_PARTNER_NAME;
  upsertKeyed(targets.pharmacyAccounts, pharmacy.identifier, {
    username: pharmacy.identifier,
    partnerId: DEMO_PHARMACY_PARTNER_ID,
    pharmacyName: partnerName,
    contactName: 'Demo Pharmacy Partner',
    licenseNumber: 'DEMO-LIC-000001',
    phone: '+91 11 0000 0000',
    passwordHash: hashSecret(pharmacy.identifier, passwords.pharmacy),
    status: 'VERIFIED',
    createdAt: targets.now,
    [DEMO_SEED_MARKER]: true,
  });
  if (!targets.inventoryAudit.some(a => a?.actorId === pharmacy.identifier && a?.reason === 'Demo sample activity')) {
    targets.inventoryAudit.unshift({
      id: `inv-aud-gh-demo-${targets.now}`, pharmacyId: DEMO_PHARMACY_PARTNER_ID, pharmacyName: partnerName,
      actorId: pharmacy.identifier, actorName: 'Demo Pharmacy Partner', medicineId: 'n/a', medicineName: 'n/a',
      previousStockQuantity: 0, newStockQuantity: 0, previousStatus: 'NOT_LISTED', newStatus: 'NOT_LISTED',
      changedAt: targets.now, changeSource: 'PARTNER_WORKSPACE', result: 'SUCCESS', reason: 'Demo sample activity',
    });
  }
  seeded.push('pharmacy');

  // --- News administrator -------------------------------------------------------
  const news = spec('news');
  upsertKeyed(targets.newsAdmins, news.recordId, {
    adminId: news.recordId,
    name: news.displayName,
    email: news.identifier,
    passwordHash: hashSecret(news.recordId, passwords.news),
    role: 'NEWS_ADMIN',
    title: 'Demo News Administrator',
    status: 'active',
    mfaEnabled: true,
    permissions: [...targets.newsPermissions],
    [DEMO_SEED_MARKER]: true,
  });
  seeded.push('news');

  return { seeded };
}

/** True when a persisted record was created by the demo seeder. */
export function isDemoSeedRecord(value: unknown): boolean {
  return !!value && typeof value === 'object' && (value as Record<string, unknown>)[DEMO_SEED_MARKER] === true;
}
