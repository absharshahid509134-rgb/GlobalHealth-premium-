import type { PlatformRole } from './platformRoles';

// Reserved identities shipped by older builds. This is a removal list, not an
// account catalog: no credentials or replacement demo accounts are created.
const RESERVED_IDS: Record<PlatformRole, ReadonlySet<string>> = {
  user: new Set(['usr-sarah-jenkins', 'usr-alex-turner']),
  doctor: new Set([
    'doc-1', 'doc-2', 'doc-alexandra-chen', 'doc-robert-harrison',
    'doc-priya-sharma', 'doc-marcus-vance',
    'doc-acc-001', 'doc-acc-002', 'doc-acc-003', 'doc-acc-004',
  ]),
  hospital: new Set([
    'ACC-HSP-001', 'ACC-HSP-002', 'ACC-HSP-003', 'ACC-HSP-004', 'ACC-HSP-005', 'ACC-HSP-006',
    'USR-ADM-001', 'USR-MED-002', 'USR-DOC-003', 'USR-NUR-004', 'USR-OWN-005',
    'USR-HOD-006', 'USR-FIN-007', 'USR-LAB-008', 'USR-BLD-009', 'USR-PHM-010',
    'USR-BME-011', 'USR-SUP-012', 'USR-CCAD-001', 'USR-CCAD-002', 'USR-CCAD-003',
    'USR-MAYO-001', 'USR-MAYO-002', 'USR-SGH-001',
  ]),
  pharmacy: new Set(['staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5', 'staff-6', 'staff-7']),
  news: new Set([
    'news-admin-1', 'news-admin-2', 'news-admin-3', 'news-admin-4',
    'news-admin-5', 'news-admin-6', 'news-admin-7',
    'staff-admin-1', 'staff-newsadmin-1', 'staff-editor-1', 'staff-reviewer-1',
    'staff-publisher-1', 'staff-author-1',
  ]),
};
const RESERVED_USERNAMES: Partial<Record<PlatformRole, ReadonlySet<string>>> = {
  doctor: new Set(['doc_alex_chen', 'doc_rob_harrison', 'doc_priya_sharma', 'doc_marcus_vance']),
  hospital: new Set([
    'apex_admin', 'cleveland_ad_admin', 'sgh_admin', 'mayo_admin',
    'stpeter_admin', 'metro_admin', 'aiims_admin', 'charite_admin',
  ]),
  pharmacy: new Set([
    'dr.ramanathan@apexhealth.org', 'rohan.m@apexhealth.org',
    'mumbai.depot@globalhealth.org', 'bangalore.pharmacy@apollocare.org',
    'hyderabad.hub@medpluscommunity.org',
  ]),
};

export function isLegacyDemoUserId(id: unknown): boolean {
  return typeof id === 'string' && (RESERVED_IDS.user.has(id) || id.startsWith('usr-demo-'));
}

export function isLegacyDemoSessionToken(token: unknown): boolean {
  return typeof token === 'string' && (token.startsWith('gh-demo-') || /^sess-(current|mobile)-demo$/.test(token));
}

/** Matches explicit markers/reserved identifiers, never a person's name or an
 * ordinary user's email. Explicitly provisioned News bootstrap admins survive. */
export function isLegacyDemoAccount(role: PlatformRole, value: unknown, key?: string): boolean {
  if (!value || typeof value !== 'object') return false;
  const account = value as Record<string, unknown>;
  if (account.isDemoAccount === true || account.isEphemeralDemo === true) return true;
  if (typeof account.email === 'string' && /@demo\.invalid$/i.test(account.email)) return true;
  const ids = [key, account.id, account.doctorId, account.adminId];
  if (ids.some(id => typeof id === 'string' && (
    RESERVED_IDS[role].has(id) ||
    (role === 'user' && isLegacyDemoUserId(id)) ||
    id.startsWith('demo-') ||
    id.startsWith(`${role}:demo-`) ||
    (id.startsWith(`${role}:`) && RESERVED_IDS[role].has(id.slice(role.length + 1)))
  ))) return true;
  return [key, account.username].some(username => typeof username === 'string' &&
    RESERVED_USERNAMES[role]?.has(username.toLowerCase()));
}

/** Previously issued fixture activation/recovery tokens must not create new
 * synthetic accounts through the legacy browser onboarding screens. */
export function isLegacyDemoOnboardingToken(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return [
    'ACT-DOC-2026-CHOWDHURY-88F9', 'ACT-DOC-EXPIRED-TEST-001', 'ACT-DOC-USED-TEST-002',
    'RST-DOC-98231-774B', 'ACT-STJUDE-2026-9F8A', 'RST-DEMO-2026-7B42',
  ].includes(String(record.token || '')) ||
    isLegacyDemoAccount('doctor', record) || isLegacyDemoAccount('hospital', record);
}

/** Preloaded approval records from legacy doctor/hospital prototypes. Their
 * reserved IDs are outside the ranges used for real application submissions. */
export function isLegacyDemoApplication(role: PlatformRole, value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const application = value as Record<string, unknown>;
  if (application.isDemoAccount === true) return true;
  const reserved = role === 'doctor'
    ? ['DOC-REQ-2026-0001', 'DOC-REQ-2026-0002', 'DOC-REQ-2026-0003', 'DOC-REQ-2026-0004', 'DOC-REQ-2026-0005', 'DOC-REQ-2026-0006']
    : role === 'hospital' ? ['APP-REQ-2026-0911', 'APP-REQ-2026-0842', 'APP-REQ-2026-0775'] : [];
  return reserved.includes(String(application.id || ''));
}
