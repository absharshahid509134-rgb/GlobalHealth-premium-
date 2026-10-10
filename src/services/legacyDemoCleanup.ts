import type { PlatformRole } from '../core/platformRoles';
import { isLegacyDemoAccount, isLegacyDemoApplication, isLegacyDemoOnboardingToken, isLegacyDemoSessionToken } from '../core/legacyDemoAccounts';
import { GLOBAL_SESSION_KEYS } from './authClient';

const ACCOUNT_CACHES: [string, PlatformRole][] = [
  ['doctor_portal_accounts_v2', 'doctor'],
  ['globalhealth_enterprise_state_v1_accounts', 'hospital'],
  ['globalhealth_enterprise_state_v1_users', 'hospital'],
  ['gh_pharmacy_portal_staff', 'pharmacy'],
  ['gh_staff_members_v3', 'news'],
];
const TOKEN_CACHES = [
  'doctor_portal_activation_tokens_v2', 'doctor_portal_reset_tokens_v2',
  'globalhealth_enterprise_state_v1_activation_tokens', 'globalhealth_enterprise_state_v1_reset_tokens',
];
const REALMS: PlatformRole[] = ['user', 'doctor', 'hospital', 'pharmacy', 'news'];

/** Idempotently removes old browser fixtures before providers read them. It
 * never clears an entire storage namespace or any real account's data. */
export function removeDemoBrowserAccounts(storage: Storage): void {
  const read = (key: string): unknown => {
    const raw = storage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  };
  const remove = (keys: string[]) => keys.forEach(key => storage.removeItem(key));
  const centralUser = read('globalhealth_user_session') as Record<string, unknown> | null;
  const claim = String(centralUser?.portalRole || centralUser?.role || '').toLowerCase();
  const centralRole = REALMS.find(role => String(centralUser?.id || '').startsWith(`${role}:`)) ||
    REALMS.find(role => role === claim) || 'user';
  if (isLegacyDemoAccount(centralRole, centralUser) || isLegacyDemoSessionToken(storage.getItem('globalhealth_auth_token'))) {
    remove(GLOBAL_SESSION_KEYS);
  }
  for (const key of GLOBAL_SESSION_KEYS) {
    if (isLegacyDemoSessionToken(storage.getItem(key))) storage.removeItem(key);
  }
  for (const [key, role] of ACCOUNT_CACHES) {
    const accounts = read(key);
    if (!Array.isArray(accounts)) continue;
    const remaining = accounts.filter(account => !isLegacyDemoAccount(role, account));
    if (remaining.length !== accounts.length) storage.setItem(key, JSON.stringify(remaining));
  }
  for (const [key, role] of [
    ['doctor_portal_applications_v2', 'doctor'],
    ['globalhealth_enterprise_state_v1_applications', 'hospital'],
  ] as const) {
    const applications = read(key);
    if (!Array.isArray(applications)) continue;
    const remaining = applications.filter(application => !isLegacyDemoApplication(role, application));
    if (remaining.length !== applications.length) storage.setItem(key, JSON.stringify(remaining));
  }
  for (const key of TOKEN_CACHES) {
    const tokens = read(key);
    if (!Array.isArray(tokens)) continue;
    const remaining = tokens.filter(token => !isLegacyDemoOnboardingToken(token));
    if (remaining.length !== tokens.length) storage.setItem(key, JSON.stringify(remaining));
  }
  if (isLegacyDemoAccount('doctor', read('doctor_portal_active_account_v2')) || isLegacyDemoAccount('doctor', read('medauth_active_doctor_v1'))) {
    remove(['doctor_portal_active_account_v2', 'medauth_active_doctor_v1', 'doctor_portal_session_token_v1', 'doctor_portal_session_expiry_v1']);
  }
  if (isLegacyDemoAccount('hospital', read('globalhealth_enterprise_state_v1_current_user'))) {
    remove(['globalhealth_enterprise_state_v1_current_user', 'hospital_portal_session_token_v1', 'globalhealth_hospital_session', 'gh_hospital_session_token']);
  }
  const newsSession = read('gh_staff_session_v3') as { staffId?: string } | null;
  if (isLegacyDemoAccount('news', { id: newsSession?.staffId })) {
    remove(['gh_staff_session_v3', 'globalhealth_news_session', 'gh_news_session_token']);
  }
  if (isLegacyDemoAccount('pharmacy', { id: read('gh_pharmacy_portal_current_staff_id') })) {
    remove(['gh_pharmacy_portal_current_staff_id', 'gh_pharmacy_portal_auth_state', 'globalhealth_pharmacy_session', 'gh_pharmacy_session_token', 'globalhealth_partner_session']);
  }
  // Older profile mirrors sometimes stored plaintext practitioner passwords.
  const doctors = read('medauth_doctors_list_v1');
  if (Array.isArray(doctors) && doctors.some(doctor => doctor?.securityPassword !== undefined)) {
    storage.setItem('medauth_doctors_list_v1', JSON.stringify(doctors.map(({ securityPassword: _password, ...profile }) => profile)));
  }
}

export function cleanupLegacyDemoBrowserAccounts(): void {
  try { removeDemoBrowserAccounts(localStorage); } catch { /* storage may be unavailable */ }
  try { removeDemoBrowserAccounts(sessionStorage); } catch { /* storage may be unavailable */ }
}
