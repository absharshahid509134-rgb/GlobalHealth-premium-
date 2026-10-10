import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_ACCOUNT_SPECS,
  DEMO_PASSWORD_MIN_LENGTH,
  applyDemoAccountSeed,
  demoConfigView,
  isDemoSeedRecord,
  resolveDemoPasswords,
  type DemoPasswords,
  type DemoSeedTargets,
} from './demoAccounts';
import { loadRuntimeConfig, DEMO_SESSION_IDLE_MS, SESSION_DEFAULTS } from './config';
import { isLegacyDemoAccount, isLegacyDemoUserId } from '../core/legacyDemoAccounts';
import { removeDemoDomainAccounts, removeDemoUserAccounts } from './accountMigration';
import { verifySecret } from './security';

const NOW = '2026-10-10T00:00:00.000Z';

function emptyTargets(overrides: Partial<DemoSeedTargets> = {}): DemoSeedTargets {
  return {
    users: new Map(),
    privateData: new Map(),
    doctors: new Map(),
    consentRequests: new Map(),
    doctorNotifications: new Map(),
    hospitalAccounts: new Map(),
    hospitalRegistry: new Map([['HSP-IN-DL-000125', { identity: { name: 'Apex Medical Center' } }]]),
    hospitalAudit: [],
    pharmacyAccounts: new Map(),
    inventoryAudit: [],
    newsAdmins: new Map(),
    removedDemoUserIds: new Set(),
    newsPermissions: ['news.view'],
    now: NOW,
    ...overrides,
  };
}

const passwordsFor = (): DemoPasswords => resolveDemoPasswords({});

test('one demo account is defined per portal role with unique, non-colliding identifiers', () => {
  assert.deepEqual(DEMO_ACCOUNT_SPECS.map(s => s.role), ['user', 'doctor', 'hospital', 'pharmacy', 'news']);
  const identifiers = DEMO_ACCOUNT_SPECS.map(s => s.identifier);
  const recordIds = DEMO_ACCOUNT_SPECS.map(s => s.recordId);
  assert.equal(new Set(identifiers).size, identifiers.length);
  assert.equal(new Set(recordIds).size, recordIds.length);
  for (const spec of DEMO_ACCOUNT_SPECS) {
    assert.match(spec.identifier, /@example\.test$/, 'reserved example domain only');
    // Seeded records must never be classified as retired legacy fixtures.
    assert.equal(isLegacyDemoAccount(spec.role, { id: spec.recordId, username: spec.identifier, email: spec.identifier }, spec.recordId), false, spec.role);
    assert.equal(spec.recordId.startsWith('demo-'), false);
  }
  assert.equal(isLegacyDemoUserId(DEMO_ACCOUNT_SPECS[0].recordId), false);
});

test('demo passwords default safely and accept only strong explicit overrides', () => {
  const defaults = resolveDemoPasswords({});
  for (const spec of DEMO_ACCOUNT_SPECS) assert.ok(defaults[spec.role].length >= DEMO_PASSWORD_MIN_LENGTH);
  assert.equal(new Set(Object.values(defaults)).size, 5, 'each account has a separate password');

  const overridden = resolveDemoPasswords({ GH_DEMO_PASSWORD_USER: 'Custom-Patient-123' });
  assert.equal(overridden.user, 'Custom-Patient-123');
  assert.equal(overridden.doctor, defaults.doctor);

  assert.throws(() => resolveDemoPasswords({ GH_DEMO_PASSWORD_NEWS: 'short' }), /GH_DEMO_PASSWORD_NEWS must be at least 8/);
});

test('demo mode is opt-in, never enabled in production, and keeps safe session defaults otherwise', () => {
  assert.equal(loadRuntimeConfig({ NODE_ENV: 'development' }).demo.enabled, false);
  assert.equal(loadRuntimeConfig({ NODE_ENV: 'development', GH_DEMO_MODE: 'true' }).demo.enabled, true);
  assert.equal(loadRuntimeConfig({ NODE_ENV: 'test', GH_DEMO_MODE: '1' }).demo.enabled, true);

  const prod = loadRuntimeConfig({ NODE_ENV: 'production', GH_DEMO_MODE: 'true' });
  assert.equal(prod.demo.enabled, false, 'production ignores demo mode');
  assert.ok(prod.warnings.some(w => w.includes('GH_DEMO_MODE is ignored in production')));

  assert.deepEqual(loadRuntimeConfig({}).sessionPolicy, { ...SESSION_DEFAULTS });
  assert.equal(loadRuntimeConfig({ GH_DEMO_MODE: 'true' }).sessionPolicy.userIdleMs, DEMO_SESSION_IDLE_MS);
  assert.equal(DEMO_SESSION_IDLE_MS, 365 * 24 * 60 * 60 * 1000, 'demo sessions last 365 days of inactivity');
});

test('session lifetime can be configured explicitly and invalid values fall back with a warning', () => {
  const custom = loadRuntimeConfig({ GH_DEMO_MODE: 'true', SESSION_IDLE_TTL_HOURS: '48' });
  assert.equal(custom.sessionPolicy.userIdleMs, 48 * 3600 * 1000);
  assert.equal(custom.sessionPolicy.professionalIdleMs, 48 * 3600 * 1000);

  const invalid = loadRuntimeConfig({ SESSION_IDLE_TTL_HOURS: 'forever' });
  assert.deepEqual(invalid.sessionPolicy, { ...SESSION_DEFAULTS });
  assert.ok(invalid.warnings.some(w => w.includes('SESSION_IDLE_TTL_HOURS')));
});

test('disabled demo mode exposes no credentials', () => {
  const view = demoConfigView(false, passwordsFor());
  assert.equal(view.enabled, false);
  assert.deepEqual(view.accounts, []);
  assert.equal(JSON.stringify(view).includes('Demo'), false);
});

test('enabled demo mode lists one account per role with the configured password', () => {
  const passwords = resolveDemoPasswords({ GH_DEMO_PASSWORD_DOCTOR: 'Doctor-Override-1' });
  const view = demoConfigView(true, passwords);
  assert.equal(view.enabled, true);
  assert.deepEqual(view.accounts.map(a => a.role), ['user', 'doctor', 'hospital', 'pharmacy', 'news']);
  assert.equal(view.accounts.find(a => a.role === 'doctor')?.password, 'Doctor-Override-1');
  assert.equal(view.accounts.find(a => a.role === 'news')?.destination, 'news-management');
});

test('seeding provisions verifiable credentials, sample records and marks demo status', () => {
  const targets = emptyTargets();
  const passwords = passwordsFor();
  const result = applyDemoAccountSeed(targets, passwords);
  assert.deepEqual(result.seeded, ['user', 'doctor', 'hospital', 'pharmacy', 'news']);

  const patient = targets.users.get('usr-gh-demo-patient');
  assert.ok(verifySecret(patient.id, passwords.user, patient.passwordHash), 'user password verifies via the real verifier');
  assert.equal(verifySecret(patient.id, 'wrong-password', patient.passwordHash), false);
  assert.equal(isDemoSeedRecord(patient), true);
  assert.equal(targets.privateData.get('usr-gh-demo-patient').appointments.length, 1);

  const doctor = targets.doctors.get('doc-gh-demo-physician');
  assert.ok(verifySecret(doctor.doctorId, passwords.doctor, doctor.passwordHash));
  assert.equal(doctor.verificationStatus, 'VERIFIED');
  assert.equal(targets.consentRequests.get('usr-gh-demo-patient')?.length, 1);
  assert.equal(targets.doctorNotifications.get('doc-gh-demo-physician')?.length, 1);

  const hospital = targets.hospitalAccounts.get('demo.hospital@example.test');
  assert.ok(verifySecret(hospital.username, passwords.hospital, hospital.passwordHash));
  assert.equal(hospital.hospitalId, 'HSP-IN-DL-000125');
  assert.equal(hospital.hospitalName, 'Apex Medical Center');

  const pharmacy = targets.pharmacyAccounts.get('demo.pharmacy@example.test');
  assert.ok(verifySecret(pharmacy.username, passwords.pharmacy, pharmacy.passwordHash));
  assert.equal(pharmacy.status, 'VERIFIED');
  assert.equal(pharmacy.partnerId, 'pharma-apex-01');

  const news = targets.newsAdmins.get('news-admin-demo');
  assert.ok(verifySecret(news.adminId, passwords.news, news.passwordHash));
  assert.equal(news.mfaEnabled, true, 'News administrators keep the MFA gate');
  assert.equal(news.status, 'active');
});

test('re-seeding is idempotent: no duplicated accounts, requests, notifications or audit rows', () => {
  const targets = emptyTargets();
  const passwords = passwordsFor();
  applyDemoAccountSeed(targets, passwords);
  const snapshot = () => [
    targets.users.size, targets.privateData.size, targets.doctors.size, targets.hospitalAccounts.size,
    targets.pharmacyAccounts.size, targets.newsAdmins.size,
    targets.consentRequests.get('usr-gh-demo-patient')?.length,
    targets.doctorNotifications.get('doc-gh-demo-physician')?.length,
    targets.hospitalAudit.length, targets.inventoryAudit.length,
  ];
  const before = snapshot();
  applyDemoAccountSeed(targets, passwords);
  applyDemoAccountSeed(targets, passwords);
  assert.deepEqual(snapshot(), before);
});

test('re-seeding keeps demo sample edits and never touches real accounts', () => {
  const targets = emptyTargets();
  const realUser = { id: 'usr-real-1', email: 'real@clinic.invalid', passwordHash: 'x', fullName: 'Real Person' };
  targets.users.set('usr-real-1', realUser);
  applyDemoAccountSeed(targets, passwordsFor());
  targets.privateData.get('usr-gh-demo-patient').appointments.push({ id: 'apt-edit' });
  applyDemoAccountSeed(targets, passwordsFor());
  assert.equal(targets.privateData.get('usr-gh-demo-patient').appointments.length, 2, 'sample edits persist across restarts');
  assert.deepEqual(targets.users.get('usr-real-1'), realUser);
});

test('seeding clears a stale removal manifest entry so the demo patient is not pruned again', () => {
  const targets = emptyTargets({ removedDemoUserIds: new Set(['usr-gh-demo-patient']) });
  applyDemoAccountSeed(targets, passwordsFor());
  assert.equal(targets.removedDemoUserIds.has('usr-gh-demo-patient'), false);
});

test('migration keeps seeded demo records only while demo mode is enabled', () => {
  const seeded = emptyTargets();
  applyDemoAccountSeed(seeded, passwordsFor());
  const userStore = {
    users: [...seeded.users.values()],
    sessions: [{ sessionId: 's1', userId: 'usr-gh-demo-patient' }],
    privateData: [{ userId: 'usr-gh-demo-patient', data: {} }],
  };
  const kept = removeDemoUserAccounts(userStore, { keepSeededDemo: true });
  assert.equal(kept.store.users.length, 1);
  assert.equal(kept.store.sessions.length, 1);
  assert.equal(kept.changed, false);

  const pruned = removeDemoUserAccounts(userStore, { keepSeededDemo: false });
  assert.equal(pruned.store.users.length, 0, 'disabling demo mode removes the demo patient');
  assert.equal(pruned.store.sessions.length, 0, 'and its sessions');
  assert.equal(pruned.store.privateData.length, 0);
  assert.ok(pruned.removedUserIds.has('usr-gh-demo-patient'));

  const domainStore = {
    doctors: [...seeded.doctors.entries()],
    doctorSessions: [['doc-session', { doctorId: 'doc-gh-demo-physician', expiresAt: Date.now() + 60_000 }]],
    hospitalAccounts: [...seeded.hospitalAccounts.entries()],
    newsAdmins: [...seeded.newsAdmins.entries()],
  };
  const domainKept = removeDemoDomainAccounts(domainStore, () => false, { keepSeededDemo: true });
  assert.equal(domainKept.store.doctors.length, 1);
  assert.equal(domainKept.store.doctorSessions.length, 1);
  const domainPruned = removeDemoDomainAccounts(domainStore, () => false, { keepSeededDemo: false });
  assert.equal(domainPruned.store.doctors.length, 0);
  assert.equal(domainPruned.store.doctorSessions.length, 0, 'sessions for pruned demo doctors are revoked');
  assert.equal(domainPruned.store.hospitalAccounts.length, 0);
  assert.equal(domainPruned.store.newsAdmins.length, 0);
});

test('demo migration defaults keep the existing no-demo behavior for ordinary records', () => {
  const real = { id: 'usr-real-2', email: 'person@clinic.invalid', passwordHash: 'x' };
  const result = removeDemoUserAccounts({ users: [real] });
  assert.deepEqual(result.store.users, [real]);
  assert.equal(result.changed, false);
});
