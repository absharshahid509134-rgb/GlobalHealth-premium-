import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeDemoUserAccounts, removeDemoDomainAccounts } from './accountMigration';
import { isLegacyDemoAccount, isLegacyDemoUserId } from '../core/legacyDemoAccounts';
import { initialDoctorAccounts, initialDoctorActivationTokens, initialDoctorApplications } from '../data/doctorInitialData';
import { INITIAL_USERS, INITIAL_HOSPITAL_ACCOUNTS, INITIAL_ACTIVATION_TOKENS, INITIAL_RESET_TOKENS } from '../data/hospitalInitialData';
import { DEFAULT_STAFF } from '../data/pharmacyPortalData';

test('all browser account and activation defaults are empty', () => {
  for (const defaults of [initialDoctorAccounts, initialDoctorActivationTokens, initialDoctorApplications, INITIAL_USERS, INITIAL_HOSPITAL_ACCOUNTS, INITIAL_ACTIVATION_TOKENS, INITIAL_RESET_TOKENS, DEFAULT_STAFF]) {
    assert.deepEqual(defaults, []);
  }
});

test('public migration removes reserved, marked and synthetic users without matching real names/emails', () => {
  const realUser = { id: 'usr-real', email: 'sarah.jenkins@example.com', fullName: 'Sarah Jenkins' };
  const users = [realUser, { id: 'usr-sarah-jenkins' }, { id: 'usr-alex-turner' },
    { id: 'usr-demo-abc' }, { id: 'old-marked-user', isDemoAccount: true },
    { id: 'old-ephemeral-user', isEphemeralDemo: true }, { id: 'old-synthetic-user', email: 'old@demo.invalid' }];
  const input = {
    users,
    sessions: users.map(user => ({ userId: user.id, sessionId: `session-${user.id}` })).concat([
      { userId: realUser.id, sessionId: 'gh-demo-doctor-abc' },
      { userId: realUser.id, sessionId: 'legacy-demo', isDemoSession: true } as any,
    ]),
    privateData: users.map(user => ({ userId: user.id, data: { ownerId: user.id } })),
    customMetadata: 'preserved',
  };
  const migration = removeDemoUserAccounts(input);
  assert.equal(migration.changed, true);
  assert.deepEqual(migration.store.users, [realUser]);
  assert.deepEqual(migration.store.sessions, [{ userId: realUser.id, sessionId: 'session-usr-real' }]);
  assert.deepEqual(migration.store.privateData, [{ userId: realUser.id, data: { ownerId: realUser.id } }]);
  assert.equal(migration.store.customMetadata, 'preserved');
  assert.equal(migration.removedUserIds.has('old-marked-user'), true);
  assert.equal(input.users.length, 7, 'migration never mutates the source');
  assert.equal(removeDemoUserAccounts(migration.store).changed, false, 'migration is idempotent');
});

test('all professional fixture accounts, sessions and reset capabilities are removed in every realm', () => {
  const realms = [
    ['doctor', 'doctors', 'doctorSessions', 'doctorResetTokens', 'doctorId', 'doc-1'],
    ['hospital', 'hospitalAccounts', 'hospitalSessions', 'hospitalResetTokens', 'username', 'apex_admin'],
    ['pharmacy', 'pharmacyPartnerAccounts', 'pharmacyPartnerSessions', 'pharmacyPartnerResetTokens', 'username', 'dr.ramanathan@apexhealth.org'],
    ['news', 'newsAdmins', 'newsAdminSessions', '', 'adminId', 'news-admin-1'],
  ] as const;
  for (const [role, accountsKey, sessionsKey, resetsKey, field, reservedId] of realms) {
    const realId = role === 'news' ? 'news-admin-bootstrap' : `real-${role}`;
    const realAccount = { [field]: realId, email: 'admin@globalhealth.org' };
    const input: Record<string, any> = {
      [accountsKey]: [[reservedId, { [field]: reservedId }], [realId, realAccount], ['marked', { [field]: 'marked', isDemoAccount: true }]],
      [sessionsKey]: [['demo-session', { [field]: reservedId }], ['real-session', { [field]: realId }], ['marked-session', { [field]: 'marked' }]],
      ...(resetsKey ? { [resetsKey]: [['demo-reset', { [field]: reservedId }], ['real-reset', { [field]: realId }]] } : {}),
    };
    const { store, changed } = removeDemoDomainAccounts(input);
    assert.equal(changed, true, role);
    assert.deepEqual(store[accountsKey], [[realId, realAccount]], role);
    assert.deepEqual(store[sessionsKey], [['real-session', { [field]: realId }]], role);
    if (resetsKey) assert.deepEqual(store[resetsKey], [['real-reset', { [field]: realId }]], role);
    assert.equal(removeDemoDomainAccounts(store).changed, false, role);
  }
});

test('legacy identifiers and markers are recognized without deleting explicitly configured administrators', () => {
  for (const id of ['doc-1', 'doc-2', 'doc-alexandra-chen', 'doc-robert-harrison', 'doc-priya-sharma', 'doc-marcus-vance']) {
    assert.equal(isLegacyDemoAccount('doctor', { doctorId: id }), true);
  }
  for (const username of ['apex_admin', 'cleveland_ad_admin', 'sgh_admin', 'mayo_admin', 'stpeter_admin', 'metro_admin', 'aiims_admin', 'charite_admin']) {
    assert.equal(isLegacyDemoAccount('hospital', { username }), true);
  }
  for (const username of ['dr.ramanathan@apexhealth.org', 'rohan.m@apexhealth.org', 'mumbai.depot@globalhealth.org', 'bangalore.pharmacy@apollocare.org', 'hyderabad.hub@medpluscommunity.org']) {
    assert.equal(isLegacyDemoAccount('pharmacy', { username }), true);
  }
  for (let i = 1; i <= 7; i++) assert.equal(isLegacyDemoAccount('news', { adminId: `news-admin-${i}` }), true);
  assert.equal(isLegacyDemoAccount('news', { adminId: 'news-admin-bootstrap', email: 'admin@globalhealth.org' }), false);
  assert.equal(isLegacyDemoAccount('user', { id: 'usr-real', username: 'doc_alex_chen', email: 'alex.turner@example.com' }), false);
  assert.equal(isLegacyDemoAccount('doctor', { id: 'doctor:demo-abc' }), true);
});

test('demo consent capabilities are removed while real health records and public catalogs are preserved', () => {
  const realEhr = [{ recordId: 'historic-real-record', versions: [{ createdBy: 'doc-1', data: 'Keep real patient history' }] }];
  const input = {
    consentRequests: [
      ['usr-sarah-jenkins', [{ requestId: 'demo-request', attachment: { attachmentId: 'demo-attachment' } }]],
      ['marked-patient', [{ requestId: 'marked-request' }]],
      ['usr-real', [{ requestId: 'real-request', doctorId: 'real-doctor' }, { requestId: 'fixture-doctor-request', doctorId: 'doc-1' }]],
    ],
    doctorAccess: [['usr-real', [{ doctorId: 'real-doctor' }, { doctorId: 'doc-1' }]], ['usr-demo-abc', [{ doctorId: 'doc-1' }]]],
    ehrRecords: [['usr-real', realEhr], ['usr-sarah-jenkins', [{ recordId: 'demo-record' }]]],
    retentionArchive: [['usr-real', realEhr], ['marked-patient', []]],
    attachments: [['demo-attachment', {}], ['real-attachment', { name: 'Real record' }]],
    doctorNotifications: [['real-doctor', [{ requestId: 'real-request' }, { requestId: 'demo-request' }, { patientUserId: 'marked-patient' }]], ['doc-1', []]],
    decidedRequests: [['demo-request', 'done'], ['real-request', 'done']],
    marketInventory: [['public-inventory', { stock: 10 }]],
    hospitalRegistry: [['public-hospital', { name: 'Hospital' }]],
  };
  const removedUser = (id: unknown) => isLegacyDemoUserId(id) || id === 'marked-patient';
  const { store } = removeDemoDomainAccounts(input, removedUser);
  assert.deepEqual(store.consentRequests, [['usr-real', [{ requestId: 'real-request', doctorId: 'real-doctor' }]]]);
  assert.deepEqual(store.doctorAccess, [['usr-real', [{ doctorId: 'real-doctor' }]]]);
  assert.deepEqual(store.ehrRecords, [['usr-real', realEhr]]);
  assert.deepEqual(store.retentionArchive, [['usr-real', realEhr]]);
  assert.deepEqual(store.attachments, [['real-attachment', { name: 'Real record' }]]);
  assert.deepEqual(store.doctorNotifications, [['real-doctor', [{ requestId: 'real-request' }]]]);
  assert.deepEqual(store.decidedRequests, [['real-request', 'done']]);
  assert.deepEqual(store.marketInventory, input.marketInventory);
  assert.deepEqual(store.hospitalRegistry, input.hospitalRegistry);
});

test('marked user removal remains known after restart, allowing interrupted related-data cleanup to retry', () => {
  const first = removeDemoUserAccounts({ users: [{ id: 'marked-uuid', isDemoAccount: true }, { id: 'real-uuid' }] });
  const restarted = removeDemoUserAccounts(first.store);
  assert.equal(restarted.removedUserIds.has('marked-uuid'), true);
  assert.deepEqual(restarted.store.users, [{ id: 'real-uuid' }]);
  assert.equal(restarted.changed, false);
});

test('unexpected legacy store shapes do not prevent startup', () => {
  for (const value of [null, undefined, [], 'invalid', 42]) {
    assert.deepEqual(removeDemoUserAccounts(value).store, {});
    assert.deepEqual(removeDemoDomainAccounts(value).store, {});
  }
});
