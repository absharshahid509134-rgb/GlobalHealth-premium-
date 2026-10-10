// Uses explicitly provisioned test identities in an isolated, disposable
// runtime directory. No public demo endpoint or application seed is required.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { hashSecret } from '../../src/server/security.ts';
import { withTestServer } from './test-server.mjs';

const suffix = randomBytes(6).toString('hex');
const password = `Acceptance-${randomBytes(16).toString('hex')}!`;
const userId = `usr-acceptance-${suffix}`;
const doctorId = `doctor-acceptance-${suffix}`;
const hospitalUsername = `hospital-acceptance-${suffix}`;
const secondHospitalUsername = `second-hospital-${suffix}`;
const pharmacyUsername = `pharmacy-${suffix}@acceptance.invalid`;
const newsId = `news-acceptance-${suffix}`;
const userEmail = `user-${suffix}@acceptance.invalid`;
const newsEmail = `news-${suffix}@acceptance.invalid`;
const now = new Date().toISOString();
const hospital = (username, hospitalId) => [username, {
  username, hospitalId, hospitalName: 'Acceptance Hospital', email: `${username}@acceptance.invalid`,
  role: 'Hospital Administrator', status: 'ACTIVE', passwordHash: hashSecret(username, password),
}];
const files = {
  'account-store.json': { users: [{
    id: userId, username: `patient-${suffix}`, fullName: 'Acceptance Patient', firstName: 'Acceptance', lastName: 'Patient',
    email: userEmail, passwordHash: hashSecret(userId, password), role: 'PUBLIC_USER', accountStatus: 'ACTIVE',
    isEmailVerified: true, isPhoneVerified: false, country: 'India', preferredLanguage: 'English', twoFactor: { enabled: false }, createdAt: now, lastLoginAt: now,
  }], sessions: [], privateData: [] },
  'domain-store.json': {
    doctors: [[doctorId, {
      doctorId, username: doctorId, fullName: 'Acceptance Physician', organization: 'Acceptance Clinic',
      specialty: 'Internal Medicine', registrationNo: `LICENSE-${suffix}`, email: `doctor-${suffix}@acceptance.invalid`,
      passwordHash: hashSecret(doctorId, password), verificationStatus: 'VERIFIED', status: 'ACTIVE',
    }]],
    hospitalAccounts: [hospital(hospitalUsername, 'HSP-IN-DL-000125'), hospital(secondHospitalUsername, 'hosp-1')],
    pharmacyPartnerAccounts: [[pharmacyUsername, {
      username: pharmacyUsername, partnerId: 'pharma-apex-01', pharmacyName: 'Acceptance Pharmacy', contactName: 'Acceptance Pharmacist',
      licenseNumber: `LICENSE-${suffix}`, phone: '', passwordHash: hashSecret(pharmacyUsername, password), status: 'VERIFIED', createdAt: now,
    }]],
    newsAdmins: [[newsId, {
      adminId: newsId, name: 'Acceptance Editor', email: newsEmail, passwordHash: hashSecret(newsId, password),
      role: 'NEWS_ADMIN', title: 'Acceptance Editor', status: 'active', mfaEnabled: true, permissions: ['news.view'],
    }]],
  },
};
const roles = ['user', 'doctor', 'hospital', 'pharmacy', 'news'];
const accounts = { user: [userEmail, password], doctor: [doctorId, password], hospital: [hospitalUsername, password], pharmacy: [pharmacyUsername, password], news: [newsEmail, password] };

await withTestServer({ files }, async ({ request: api }) => {
  const request = (path, token, body) => api(path, { token, body });
  async function login(role, credentials = accounts[role], exerciseWrongMfa = true) {
    let result = await request(`/api/auth/portal/${role}/login`, null, { identifier: credentials[0], password: credentials[1], role: 'SUPER_ADMIN' });
    assert.equal(result.status, 200, JSON.stringify(result));
    if (result.body.stage === 'mfa') {
      assert.ok(result.body.challengeId);
      assert.equal(result.body.token, undefined, 'MFA must not issue an early session');
      assert.ok(result.body.demoDelivery?.code, 'test-mode simulated delivery provides the verification code');
      if (exerciseWrongMfa) {
        const wrong = await request('/api/auth/portal/news/mfa', null, { challengeId: result.body.challengeId, code: 'not-a-code' });
        assert.equal(wrong.status, 401);
      }
      result = await request('/api/auth/portal/news/mfa', null, { challengeId: result.body.challengeId, code: result.body.demoDelivery.code });
    }
    const token = result.body.token || result.body.sessionId;
    assert.ok(token, JSON.stringify(result.body));
    return token;
  }
  const sessions = {};
  try {
    assert.equal((await request('/api/auth/demo-accounts')).status, 404);
    for (const role of roles) {
      assert.equal((await request(`/api/portals/${role}/workspace`)).status, 401);
      sessions[role] = await login(role);
      const identity = await request('/api/auth/me', sessions[role]);
      assert.equal(identity.body.portalRole, role);
      assert.equal(identity.body.user.portalRole, role);
      assert.notEqual(identity.body.user.isDemoAccount, true);
      assert.match(identity.cache, /no-store/);
      assert.ok(!JSON.stringify(identity.body).includes('passwordHash'));
      if (role === 'doctor') {
        const doctorSession = await request('/api/doctor/auth/me', sessions[role]);
        assert.equal(doctorSession.status, 200);
        assert.equal(doctorSession.body.doctor.doctorId, doctorId);
      }
      for (const destination of roles) {
        const result = await request(`/api/portals/${destination}/workspace?accountId=another-account`, sessions[role]);
        assert.equal(result.status, role === destination ? 200 : 403, `${role} → ${destination}`);
        if (role === destination) assert.equal(result.body.accountId, identity.body.user.id);
        else { assert.equal(result.body.profile, undefined); assert.equal(result.body.records, undefined); }
      }
      assert.equal((await request('/api/auth/me', sessions[role])).status, 200, 'Denied navigation must not invalidate the session');
    }
    const domainRoutes = { user: '/api/me/ehr', doctor: '/api/doctor/patients', hospital: '/api/hospital-registry/HSP-IN-DL-000125/record', pharmacy: '/api/pharmacy-partner/pharma-apex-01/marketplace-inventory', news: '/api/news/admin/me' };
    for (const role of roles) for (const destination of roles) {
      const result = await request(domainRoutes[destination], sessions[role]);
      assert.equal(result.status, role === destination ? 200 : 403, `domain API: ${role} → ${destination}`);
    }
    const secondHospital = await login('hospital', [secondHospitalUsername, password]);
    try {
      const first = await request('/api/portals/hospital/workspace', sessions.hospital);
      const second = await request('/api/portals/hospital/workspace', secondHospital);
      assert.notEqual(first.body.accountId, second.body.accountId);
      assert.notEqual(first.body.profile.hospitalId, second.body.profile.hospitalId);
      assert.equal((await request(`/api/hospital-registry/${first.body.profile.hospitalId}/record`, secondHospital)).status, 403);
      assert.equal((await request('/api/pharmacy-partner/pharma-global-02/marketplace-inventory', sessions.pharmacy)).status, 403);
    } finally { await request('/api/auth/logout', secondHospital, {}); }
    for (const role of ['doctor', 'hospital']) {
      const result = await request(`/api/auth/portal/${role}/signup`, null, { username: 'attacker', password, hospitalId: 'HSP-IN-DL-000125', fullName: 'Unverified Person', role: 'ADMIN' });
      assert.equal(result.status, 403, 'Public signup must not provision privileged roles');
    }
    await request('/api/auth/logout', null, { sessionId: sessions.hospital });
    assert.equal((await request('/api/auth/me', sessions.hospital)).status, 200, 'Bodies cannot target another account for logout');
    assert.equal((await request('/api/doctor/auth/change-password', sessions.doctor, { oldPassword: 'incorrect', newPassword: password })).status, 400);
    assert.equal((await request('/api/auth/me', sessions.doctor)).status, 200);
    const legacyNews = await request('/api/news/admin/login', null, { identifier: newsEmail, password });
    assert.equal(legacyNews.body.stage, 'mfa');
    assert.equal(legacyNews.body.token, undefined, 'Legacy endpoint must not bypass MFA');
    assert.equal((await request('/api/auth/portal/admin/login', null, {})).status, 400);
    assert.equal((await request('/api/auth/portal/user/constructor', null, {})).status, 400);
    assert.equal((await request('/api/auth/me', 'invented-token')).status, 401);
    console.log('PASS: provisioned accounts across five roles, 25 workspace checks, 25 domain checks, Doctor Portal handoff, MFA, isolation, provisioning, invalid tokens and no-store.');
  } finally {
    for (const token of Object.values(sessions)) {
      assert.equal((await request('/api/auth/logout', token, {})).status, 200);
      assert.equal((await request('/api/auth/me', token)).status, 401);
    }
  }
  console.log('PASS: global logout revokes every tested role session. Test accounts are removed with the temporary runtime.');
});
