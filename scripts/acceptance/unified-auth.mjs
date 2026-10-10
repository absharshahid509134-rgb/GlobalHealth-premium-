// Run only against a development fixture server: npm run dev
// Never point fixture tests at a production deployment.
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const roles = ['user', 'doctor', 'hospital', 'pharmacy', 'news'];
async function request(path, token, body) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json(), cache: response.headers.get('cache-control') };
}
const demoCatalog = await request('/api/auth/demo-accounts');
assert.equal(demoCatalog.status, 200, 'development server should expose its demo account catalog');
assert.equal(demoCatalog.body.success, true);
assert.match(demoCatalog.cache, /no-store/);
assert.deepEqual(Object.keys(demoCatalog.body.accounts).sort(), [...roles].sort());
for (const role of roles) {
  assert.ok(Array.isArray(demoCatalog.body.accounts[role]) && demoCatalog.body.accounts[role].length > 0, `${role} demo account list`);
  assert.ok(demoCatalog.body.accounts[role].every((account) => account.identifier && account.password && account.label), `${role} demo credentials`);
}
const accounts = Object.fromEntries(roles.map((role) => {
  const firstDemo = demoCatalog.body.accounts[role][0];
  return [role, [firstDemo.identifier, firstDemo.password]];
}));
async function login(role, credentials = accounts[role], exerciseWrongMfa = true) {
  let result = await request(`/api/auth/portal/${role}/login`, null, { identifier: credentials[0], password: credentials[1], role: 'SUPER_ADMIN' });
  assert.equal(result.status, 200, JSON.stringify(result));
  if (result.body.stage === 'mfa') {
    assert.ok(result.body.challengeId);
    assert.equal(result.body.token, undefined, 'MFA must not issue an early session');
    assert.ok(result.body.demoDelivery?.code, 'development News demo sign-in should expose its simulated code');
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
const additionalDemoSessions = [];
try {
  for (const role of roles) {
    assert.equal((await request(`/api/portals/${role}/workspace`)).status, 401);
    sessions[role] = await login(role);
    const identity = await request('/api/auth/me', sessions[role]);
    assert.equal(identity.body.portalRole, role);
    assert.equal(identity.body.user.portalRole, role);
    assert.match(identity.cache, /no-store/);
    if (role === 'doctor') {
      // The central professional flow must be consumable by the existing
      // Doctor Portal entry point without a second credential prompt.
      const doctorSession = await request('/api/doctor/auth/me', sessions[role]);
      assert.equal(doctorSession.status, 200);
      assert.equal(doctorSession.body.doctor.doctorId, 'doc-1');
    }
    assert.ok(!JSON.stringify(identity.body).includes('passwordHash'));
    // Every seeded credential shown in the picker must be a working account,
    // not just a sample label. News accounts also complete simulated MFA.
    for (const demo of demoCatalog.body.accounts[role].slice(1)) {
      const demoToken = await login(role, [demo.identifier, demo.password], false);
      additionalDemoSessions.push(demoToken);
      const demoIdentity = await request('/api/auth/me', demoToken);
      assert.equal(demoIdentity.body.portalRole, role, `${role} demo account ${demo.identifier}`);
      if (role === 'doctor') {
        const doctorSession = await request('/api/doctor/auth/me', demoToken);
        assert.equal(doctorSession.status, 200, `Doctor Portal handoff for ${demo.identifier}`);
      }
    }
    // Every source role is tested against all five workspace destinations.
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
  const secondHospital = await login('hospital', ['stpeter_admin', 'Password@123']);
  try {
    const first = await request('/api/portals/hospital/workspace', sessions.hospital);
    const second = await request('/api/portals/hospital/workspace', secondHospital);
    assert.notEqual(first.body.accountId, second.body.accountId);
    assert.notEqual(first.body.profile.hospitalId, second.body.profile.hospitalId);
    assert.equal((await request(`/api/hospital-registry/${first.body.profile.hospitalId}/record`, secondHospital)).status, 403);
    assert.equal((await request('/api/pharmacy-partner/pharma-global-02/marketplace-inventory', sessions.pharmacy)).status, 403);
  } finally { await request('/api/auth/logout', secondHospital, {}); }
  for (const role of ['doctor', 'hospital']) {
    const result = await request(`/api/auth/portal/${role}/signup`, null, { username: 'attacker', password: 'Password123!', hospitalId: 'HSP-IN-DL-000125', fullName: 'Unverified Person', role: 'ADMIN' });
    assert.equal(result.status, 403, 'Public signup must not provision privileged roles');
  }
  // Request bodies cannot target another account's session for logout.
  await request('/api/auth/logout', null, { sessionId: sessions.hospital });
  assert.equal((await request('/api/auth/me', sessions.hospital)).status, 200);
  const badPassword = await request('/api/doctor/auth/change-password', sessions.doctor, { oldPassword: 'incorrect', newPassword: 'Unchanged123!' });
  assert.equal(badPassword.status, 400);
  assert.equal((await request('/api/auth/me', sessions.doctor)).status, 200);
  const legacyNews = await request('/api/news/admin/login', null, { identifier: accounts.news[0], password: accounts.news[1] });
  assert.equal(legacyNews.body.stage, 'mfa');
  assert.equal(legacyNews.body.token, undefined, 'Legacy endpoint must not bypass MFA');
  assert.equal((await request('/api/auth/portal/admin/login', null, {})).status, 400);
  assert.equal((await request('/api/auth/portal/user/constructor', null, {})).status, 400);
  const invalid = await request('/api/auth/me', 'invented-token');
  assert.equal(invalid.status, 401);
  console.log('PASS: all seeded demo accounts across five roles, Doctor Portal token handoff, 25 workspace checks, 25 domain checks, MFA, identity restoration, account isolation, provisioning, invalid tokens, no-store.');
} finally {
  for (const token of [...Object.values(sessions), ...additionalDemoSessions]) {
    assert.equal((await request('/api/auth/logout', token, {})).status, 200);
    assert.equal((await request('/api/auth/me', token)).status, 401);
  }
}
console.log('PASS: global logout revokes every tested role session.');
