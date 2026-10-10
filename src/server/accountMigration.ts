import type { PlatformRole } from '../core/platformRoles';
import { isLegacyDemoAccount, isLegacyDemoSessionToken, isLegacyDemoUserId } from '../core/legacyDemoAccounts';
import { DEMO_SEED_MARKER } from './demoAccounts';

type Store = Record<string, any>;

export interface DemoMigrationOptions {
  /** True when GH_DEMO_MODE is enabled: records created by the demo seeder are
   * retained (and refreshed). When false they are removed like any other demo. */
  keepSeededDemo?: boolean;
}
const isSeededDemo = (value: unknown, options: DemoMigrationOptions) =>
  !options.keepSeededDemo && !!value && typeof value === 'object' && (value as Record<string, unknown>)[DEMO_SEED_MARKER] === true;
const asStore = (value: unknown): Store => value && typeof value === 'object' && !Array.isArray(value) ? value as Store : {};
const list = (value: unknown): any[] => Array.isArray(value) ? value : [];
const entries = (value: unknown): [string, any][] => list(value)
  .filter(entry => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string');

/** Pure, idempotent migration of older disk-backed user fixtures. Real users
 * (including people with the same name/email as a fixture) are left intact. */
export function removeDemoUserAccounts(value: unknown, options: DemoMigrationOptions = {}) {
  const input = asStore(value);
  // Keep a removal manifest so interrupted cross-file cleanup can be retried
  // on the next startup even after marked users have left the account file.
  const removedUserIds = new Set<string>([
    ...list(input.removedDemoUserIds).filter(id => typeof id === 'string'),
    ...list(input.users)
    .filter(user => isLegacyDemoAccount('user', user) || isSeededDemo(user, options))
    .map(user => user.id).filter(id => typeof id === 'string'),
  ]);
  const removed = (id: unknown) => isLegacyDemoUserId(id) || (typeof id === 'string' && removedUserIds.has(id));
  const store = { ...input };
  if (removedUserIds.size) store.removedDemoUserIds = [...removedUserIds];
  if (Array.isArray(input.users)) store.users = input.users.filter(user =>
    !removed(user?.id) && !isLegacyDemoAccount('user', user) && !isSeededDemo(user, options));
  if (Array.isArray(input.sessions)) store.sessions = input.sessions.filter(session =>
    !removed(session?.userId) && !session?.isDemoSession && !isLegacyDemoSessionToken(session?.sessionId));
  if (Array.isArray(input.privateData)) store.privateData = input.privateData.filter(entry => !removed(entry?.userId));
  return { store, removedUserIds, changed: JSON.stringify(store) !== JSON.stringify(input) };
}

/** Removes only reserved/marked professional fixtures and their capabilities.
 * Public directories, inventory, and real patients' historical EHRs survive. */
export function removeDemoDomainAccounts(
  value: unknown,
  removedUser: (id: unknown) => boolean = isLegacyDemoUserId,
  options: DemoMigrationOptions = {},
) {
  const input = asStore(value);
  const store = { ...input };
  const pruneRealm = (role: PlatformRole, accountsKey: string, sessionKeys: string[], idField: string) => {
    const removedIds = new Set<string>();
    const accounts = entries(input[accountsKey]);
    for (const [key, account] of accounts) {
      if (isLegacyDemoAccount(role, account, key) || isSeededDemo(account, options)) {
        removedIds.add(key);
        if (typeof account?.[idField] === 'string') removedIds.add(account[idField]);
      }
    }
    if (Array.isArray(input[accountsKey])) store[accountsKey] = accounts.filter(([key]) => !removedIds.has(key));
    const isRemovedId = (id: unknown) => typeof id === 'string' &&
      (removedIds.has(id) || isLegacyDemoAccount(role, {}, id));
    for (const sessionKey of sessionKeys) {
      if (Array.isArray(input[sessionKey])) store[sessionKey] = entries(input[sessionKey]).filter(([token, session]) =>
        !isLegacyDemoSessionToken(token) && !session?.isDemoSession && !isRemovedId(session?.[idField]));
    }
    return isRemovedId;
  };
  const removedDoctor = pruneRealm('doctor', 'doctors', ['doctorSessions', 'doctorResetTokens'], 'doctorId');
  pruneRealm('hospital', 'hospitalAccounts', ['hospitalSessions', 'hospitalResetTokens'], 'username');
  pruneRealm('pharmacy', 'pharmacyPartnerAccounts', ['pharmacyPartnerSessions', 'pharmacyPartnerResetTokens'], 'username');
  pruneRealm('news', 'newsAdmins', ['newsAdminSessions'], 'adminId');
  pruneRealm('news', 'authorities', ['authoritySessions'], 'authorityId');

  const removedRequestIds = new Set<string>();
  const removedAttachmentIds = new Set<string>();
  const requests = entries(input.consentRequests);
  for (const [patientId, patientRequests] of requests) {
    for (const request of list(patientRequests)) {
      if (removedUser(patientId) || removedDoctor(request?.doctorId)) {
        if (typeof request?.requestId === 'string') removedRequestIds.add(request.requestId);
        if (typeof request?.attachment?.attachmentId === 'string') removedAttachmentIds.add(request.attachment.attachmentId);
      }
    }
  }
  if (Array.isArray(input.consentRequests)) store.consentRequests = requests
    .filter(([patientId]) => !removedUser(patientId))
    .map(([patientId, patientRequests]) => [patientId, list(patientRequests).filter(request => !removedRequestIds.has(request?.requestId))]);
  if (Array.isArray(input.doctorAccess)) store.doctorAccess = entries(input.doctorAccess)
    .filter(([patientId]) => !removedUser(patientId))
    .map(([patientId, grants]) => [patientId, list(grants).filter(grant => !removedDoctor(grant?.doctorId))]);
  for (const key of ['ehrRecords', 'retentionArchive']) {
    if (Array.isArray(input[key])) store[key] = entries(input[key]).filter(([patientId]) => !removedUser(patientId));
  }
  if (Array.isArray(input.attachments)) store.attachments = entries(input.attachments).filter(([id]) => !removedAttachmentIds.has(id));
  if (Array.isArray(input.decidedRequests)) store.decidedRequests = entries(input.decidedRequests).filter(([id]) => !removedRequestIds.has(id));
  if (Array.isArray(input.doctorNotifications)) store.doctorNotifications = entries(input.doctorNotifications)
    .filter(([doctorId]) => !removedDoctor(doctorId))
    .map(([doctorId, notifications]) => [doctorId, list(notifications).filter(notification =>
      !removedUser(notification?.patientUserId) && !removedRequestIds.has(notification?.requestId))]);

  return { store, changed: JSON.stringify(store) !== JSON.stringify(input) };
}
