import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { hashSecret } from '../../src/server/security.ts';
import { withTestServer } from './test-server.mjs';

const roles = ['user', 'doctor', 'hospital', 'pharmacy', 'news'];
const legacyCredentials = {
  user: [['sarah.jenkins@example.com', 'Password123!'], ['alex.turner@example.com', 'Password123!']],
  doctor: [['doc-1', 'Doctor123!'], ['doc-2', 'Doctor123!'], ['doc_alex_chen', 'chen123'], ['doc_rob_harrison', 'harr123'], ['doc_priya_sharma', 'priya123'], ['doc_marcus_vance', 'vance123']],
  hospital: ['apex_admin', 'cleveland_ad_admin', 'sgh_admin', 'mayo_admin', 'stpeter_admin', 'metro_admin', 'aiims_admin', 'charite_admin'].map(id => [id, 'Password@123']),
  pharmacy: ['dr.ramanathan@apexhealth.org', 'rohan.m@apexhealth.org', 'mumbai.depot@globalhealth.org', 'bangalore.pharmacy@apollocare.org', 'hyderabad.hub@medpluscommunity.org'].map(id => [id, 'Pharmacy@123']),
  news: ['admin@globalhealth.org', 'newsadmin@globalhealth.org', 'editor@globalhealth.org', 'reviewer@globalhealth.org', 'publisher@globalhealth.org', 'author@globalhealth.org', 'j.stone@globalhealth.org'].map(id => [id, 'Password123!']),
};
const retiredEnv = { PUBLIC_DEMO_ENABLED: 'true', DEMO_SESSION_SECRET: randomBytes(32).toString('hex') };

async function checkRemovedEntryPoints(request) {
  assert.equal((await request('/api/auth/demo-accounts')).status, 404);
  for (const role of roles) {
    assert.equal((await request('/api/auth/demo-login', { body: { role } })).status, 404, `${role}: no passwordless demo account creation`);
    const expired = await request('/api/portals/' + role + '/workspace', { token: `gh-demo-${role}-${'a'.repeat(32)}-${'b'.repeat(32)}` });
    assert.equal(expired.status, 401, `${role}: old demo tokens cannot restore accounts`);
    for (const [identifier, password] of legacyCredentials[role]) {
      const login = await request(`/api/auth/portal/${role}/login`, { body: { identifier, password } });
      assert.equal(login.status, 401, `${role}: retired credentials ${identifier}`);
      assert.equal(login.body.token, undefined);
    }
  }
  assert.equal((await request('/api/auth/me', { token: 'sess-current-demo' })).status, 401);
  assert.equal((await request('/api/auth/me', { token: `gh-demo-${'a'.repeat(32)}-${'b'.repeat(32)}` })).status, 401);
  assert.equal((await request('/api/portals/doctor/demo/items', { body: { sectionId: 'patients', title: 'Sample' } })).status, 404);
  assert.equal((await request('/api/portals/doctor/demo/items/old', { method: 'PATCH', body: { status: 'Active' } })).status, 404);
  assert.equal((await request('/api/portals/doctor/demo/items/old', { method: 'DELETE' })).status, 404);
}

for (const nodeEnv of ['development', 'test', 'production']) {
  await withTestServer({ nodeEnv, env: retiredEnv }, async ({ request, readRuntime }) => {
    await checkRemovedEntryPoints(request);
    // Force a normal persistence write before testing a fresh registration.
    await request('/api/auth/logout', { token: 'nonexistent-session', body: {} });
    const emptyAccounts = await readRuntime('account-store.json');
    assert.deepEqual(emptyAccounts.users, []);
    assert.deepEqual(emptyAccounts.sessions, []);
    const emptyDomain = await readRuntime('domain-store.json');
    for (const key of ['doctors', 'hospitalAccounts', 'pharmacyPartnerAccounts', 'newsAdmins']) assert.deepEqual(emptyDomain[key], [], key);

    const password = `Registered-${randomBytes(16).toString('hex')}!`;
    const email = `registered-${randomBytes(6).toString('hex')}@acceptance.invalid`;
    const signup = await request('/api/auth/signup', { body: {
      firstName: 'Registered', lastName: 'Patient', email, password, confirmPassword: password,
      termsAccepted: true, termsVersion: '1.0', privacyVersion: '1.0',
    } });
    assert.equal(signup.status, 201, 'normal registration still works');
    assert.equal(signup.body.verificationRequired, true);
    // The test owns this isolated store; contact codes are not exposed by APIs.
    const registered = (await readRuntime('account-store.json')).users.find(user => user.id === signup.body.userId);
    const verify = await request('/api/auth/verify-code', { body: { userId: registered.id, code: registered.verificationCode.code, type: 'email' } });
    assert.equal(verify.status, 200);
    const login = await request('/api/auth/login', { body: { identifier: email, password } });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);
    assert.notEqual(login.body.user.isDemoAccount, true);
    const token = login.body.token;
    assert.equal((await request('/api/auth/me', { token })).body.user.email, email);
    assert.deepEqual((await request('/api/me/health-records', { token })).body.records, [], 'new accounts do not get demo health records');
    assert.deepEqual((await request('/api/me/appointments', { token })).body.appointments, [], 'new accounts do not get demo appointments');
    await request('/api/auth/logout', { token, body: {} });
    assert.equal((await request('/api/auth/me', { token })).status, 401);
  });
  console.log(`PASS: ${nodeEnv} starts without demo accounts, rejects every old credential/token and preserves verified registration.`);
}

const fixturePassword = `Fixture-${randomBytes(16).toString('hex')}!`;
const realId = `usr-real-${randomBytes(6).toString('hex')}`;
const realToken = `sess-real-${randomBytes(16).toString('hex')}`;
const markedId = 'legacy-marked-patient';
const now = new Date().toISOString();
const user = (id, email, extra = {}) => ({
  id, email, username: id, fullName: 'Registered Patient', firstName: 'Registered', lastName: 'Patient',
  passwordHash: hashSecret(id, fixturePassword), role: 'PUBLIC_USER', accountStatus: 'ACTIVE', isEmailVerified: true,
  isPhoneVerified: false, country: '', preferredLanguage: 'English', twoFactor: { enabled: false }, createdAt: now, lastLoginAt: now, ...extra,
});
const files = {
  'account-store.json': {
    users: [user(realId, 'registered@clinic.invalid'), user('usr-sarah-jenkins', 'sarah.jenkins@example.com'), user(markedId, 'sample@clinic.invalid', { isDemoAccount: true })],
    sessions: [{ sessionId: realToken, userId: realId, lastActive: now }, { sessionId: 'old-demo-session', userId: 'usr-sarah-jenkins', lastActive: now }, { sessionId: 'marked-session', userId: markedId, lastActive: now }],
    privateData: [{ userId: realId, data: { healthRecords: [{ id: 'genuine-record' }] } }, { userId: markedId, data: {} }],
  },
  'domain-store.json': {
    doctors: [['doc-1', { doctorId: 'doc-1', status: 'ACTIVE', verificationStatus: 'VERIFIED', passwordHash: hashSecret('doc-1', 'Doctor123!') }]],
    doctorSessions: [['old-doctor-session', { doctorId: 'doc-1', expiresAt: Date.now() + 60_000 }]],
    doctorResetTokens: [['old-doctor-reset', { doctorId: 'doc-1' }]],
    hospitalAccounts: [['apex_admin', { username: 'apex_admin', hospitalId: 'HSP-IN-DL-000125', status: 'ACTIVE', passwordHash: hashSecret('apex_admin', 'Password@123') }]],
    hospitalSessions: [['old-hospital-session', { username: 'apex_admin', hospitalId: 'HSP-IN-DL-000125', expiresAt: Date.now() + 60_000 }]],
    pharmacyPartnerAccounts: [['dr.ramanathan@apexhealth.org', { username: 'dr.ramanathan@apexhealth.org', partnerId: 'pharma-apex-01', status: 'VERIFIED', passwordHash: hashSecret('dr.ramanathan@apexhealth.org', 'Pharmacy@123') }]],
    pharmacyPartnerSessions: [['old-pharmacy-session', { username: 'dr.ramanathan@apexhealth.org', partnerId: 'pharma-apex-01', expiresAt: Date.now() + 60_000 }]],
    newsAdmins: [['news-admin-1', { adminId: 'news-admin-1', email: 'admin@globalhealth.org', status: 'active', passwordHash: hashSecret('news-admin-1', 'Password123!') }]],
    newsAdminSessions: [['old-news-session', { adminId: 'news-admin-1', lastActive: now }]],
    ehrRecords: [[markedId, [{ recordId: 'sample-record' }]], [realId, [{ recordId: 'genuine-record' }]]],
  },
  'ai-conversations.json': [{ id: 'sample-chat', userId: markedId, messages: [] }, { id: 'real-chat', userId: realId, messages: [] }],
  'ai-share-links.json': [{ token: 'sample-share', conversationId: 'sample-chat', userId: markedId }, { token: 'real-share', conversationId: 'real-chat', userId: realId }],
  'ehr-consent-shares.json': [{ token: 'sample-ehr-share', userId: markedId }, { token: 'real-ehr-share', userId: realId }],
};
for (const nodeEnv of ['development', 'test', 'production']) {
  await withTestServer({ nodeEnv, files, env: {
    ...retiredEnv, NEWS_ADMIN_BOOTSTRAP_EMAIL: 'configured-admin@clinic.invalid', NEWS_ADMIN_BOOTSTRAP_PASSWORD: fixturePassword,
  } }, async ({ request, readRuntime }) => {
    for (const token of ['old-demo-session', 'marked-session', 'old-doctor-session', 'old-hospital-session', 'old-pharmacy-session', 'old-news-session']) {
      assert.equal((await request('/api/auth/me', { token })).status, 401, token);
    }
    assert.equal((await request('/api/auth/me', { token: realToken })).body.user.id, realId);
    assert.deepEqual((await request('/api/me/health-records', { token: realToken })).body.records, [{ id: 'genuine-record' }]);
    const accounts = await readRuntime('account-store.json');
    assert.deepEqual(accounts.users.map(account => account.id), [realId]);
    assert.deepEqual(accounts.sessions.map(session => session.sessionId), [realToken]);
    const domain = await readRuntime('domain-store.json');
    for (const key of ['doctors', 'doctorSessions', 'doctorResetTokens', 'hospitalAccounts', 'hospitalSessions', 'pharmacyPartnerAccounts', 'pharmacyPartnerSessions', 'newsAdminSessions']) assert.deepEqual(domain[key], [], key);
    assert.ok(domain.newsAdmins.every(([id]) => id === 'news-admin-bootstrap'), 'no legacy News accounts are persisted');
    assert.deepEqual(domain.ehrRecords, [[realId, [{ recordId: 'genuine-record' }]]]);
    assert.deepEqual((await readRuntime('ai-conversations.json')).map(chat => chat.id), ['real-chat']);
    assert.deepEqual((await readRuntime('ai-share-links.json')).map(share => share.token), ['real-share']);
    assert.deepEqual((await readRuntime('ehr-consent-shares.json')).map(share => share.token), ['real-ehr-share']);
    const bootstrap = await request('/api/news/login', { body: { identifier: 'configured-admin@clinic.invalid', password: fixturePassword } });
    assert.equal(bootstrap.status, 200, 'explicitly configured administrators still sign in');
    assert.equal(bootstrap.body.stage, 'mfa', 'bootstrap account keeps its MFA gate');
  });
  console.log(`PASS: ${nodeEnv} immediately removes persisted demo identities and related data, retaining real users, records, sessions and configured administrators.`);
}
