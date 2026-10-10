// Acceptance: opt-in demo accounts (GH_DEMO_MODE=true) through the real HTTP API.
// Every sign-in uses the normal password verifiers; no test path creates a session.
// Runs entirely against isolated temporary runtime directories.
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { createRuntimeDirectory, startTestServer } from './test-server.mjs';

const ROLES = ['user', 'doctor', 'hospital', 'pharmacy', 'news'];
const DESTINATIONS = { user: 'dashboard', doctor: 'doctor-portal', hospital: 'hospital-portal', pharmacy: 'pharmacy-portal', news: 'news-management' };
const IDENTIFIERS = {
  user: 'demo.user@example.test', doctor: 'demo.doctor@example.test', hospital: 'demo.hospital@example.test',
  pharmacy: 'demo.pharmacy@example.test', news: 'demo.news@example.test',
};
const DEMO_ENV = { GH_DEMO_MODE: 'true' };
const results = [];
const pass = (name) => { results.push(name); console.log(`PASS: ${name}`); };

async function attemptLogin(server, role, password) {
  const account = (await server.request('/api/demo/config')).body.accounts.find(a => a.role === role);
  return server.request(`/api/auth/portal/${role}/login`, { body: { identifier: account.identifier, password } });
}

async function signIn(server, role) {
  const account = (await server.request('/api/demo/config')).body.accounts.find(a => a.role === role);
  const response = await attemptLogin(server, role, account.password);
  if (role !== 'news') return response;
  // News administrators always pass the MFA gate. Development builds show the code.
  assert.equal(response.body.stage, 'mfa', 'news requires the MFA stage');
  const code = response.body.demoDelivery?.code;
  assert.match(String(code), /^\d{6}$/, 'development MFA code is shown for the demo account');
  return server.request('/api/auth/portal/news/mfa', { body: { challengeId: response.body.challengeId, code } });
}

async function readStores(runtime) {
  const { readFile } = await import('node:fs/promises');
  const read = async name => JSON.parse(await readFile(path.join(runtime, name), 'utf8'));
  return { accounts: await read('account-store.json'), domain: await read('domain-store.json') };
}

const countDemo = (store) => ({
  users: (store.accounts.users || []).filter(u => u.demoSeed === true).length,
  doctors: (store.domain.doctors || []).filter(([, d]) => d.demoSeed === true).length,
  hospitals: (store.domain.hospitalAccounts || []).filter(([, a]) => a.demoSeed === true).length,
  pharmacies: (store.domain.pharmacyPartnerAccounts || []).filter(([, a]) => a.demoSeed === true).length,
  news: (store.domain.newsAdmins || []).filter(([, a]) => a.demoSeed === true).length,
});

// ---------------------------------------------------------------------------
// 1. Demo enabled: sign-in for every role, isolation, data and persistence.
// ---------------------------------------------------------------------------
const enabled = await createRuntimeDirectory();
let server = await startTestServer({ directory: enabled.directory, nodeEnv: 'test', env: DEMO_ENV });
try {
  const config = await server.request('/api/demo/config');
  assert.equal(config.status, 200);
  assert.equal(config.cache, 'no-store', 'demo configuration is never cached');
  assert.equal(config.body.enabled, true);
  assert.deepEqual(config.body.accounts.map(a => a.role), ROLES);
  for (const account of config.body.accounts) {
    assert.equal(account.identifier, IDENTIFIERS[account.role]);
    assert.ok(account.password.length >= 8, 'demo passwords meet the registration minimum');
    assert.equal(account.destination, DESTINATIONS[account.role]);
  }
  pass('demo configuration lists exactly one account per portal role');

  // Legacy and retired demo entry points stay removed even with demo mode on.
  assert.equal((await server.request('/api/auth/demo-accounts')).status, 404);
  assert.equal((await server.request('/api/auth/demo-login', { body: { role: 'user' } })).status, 404);
  pass('retired demo-login endpoints remain removed');

  const tokens = {};
  for (const role of ROLES) {
    const wrong = await attemptLogin(server, role, 'definitely-wrong-password');
    assert.equal(wrong.status, 401, `${role}: wrong password rejected`);
    assert.equal(wrong.body.token, undefined);

    const login = await signIn(server, role);
    assert.ok([200].includes(login.status), `${role}: demo sign-in succeeds (${login.status})`);
    assert.ok(login.body.token, `${role}: token issued by the real verifier`);
    tokens[role] = login.body.token;
  }
  pass('every demo account signs in with its configured password and rejects a wrong one');

  for (const role of ROLES) {
    const me = await server.request('/api/auth/me', { token: tokens[role] });
    assert.equal(me.status, 200, `${role}: identity restored from token`);
    assert.equal(me.body.portalRole, role);
    assert.equal(me.body.destination, DESTINATIONS[role]);
    const workspace = await server.request(`/api/portals/${role}/workspace`, { token: tokens[role] });
    assert.equal(workspace.status, 200, `${role}: own workspace`);
    assert.equal(workspace.body.role, role);
    assert.equal(workspace.body.demo, true, `${role}: workspace identifies sample data`);
    assert.match(String(workspace.cache), /no-store/, 'private workspace is not cacheable');
    for (const other of ROLES.filter(r => r !== role)) {
      const denied = await server.request(`/api/portals/${other}/workspace`, { token: tokens[role] });
      assert.equal(denied.status, 403, `${role} token denied ${other} workspace`);
    }
  }
  pass('each role resolves to its own destination and workspace; cross-role workspaces are denied');

  // Sample data is populated for the server-backed portal views.
  const patientData = await server.request('/api/me/appointments', { token: tokens.user });
  assert.equal(patientData.body.appointments.length, 1, 'patient has a sample appointment');
  const doctorWorkspace = await server.request('/api/portals/doctor/workspace', { token: tokens.doctor });
  assert.ok(doctorWorkspace.body.records.some(r => r.id === 'req-gh-demo-access-001'), 'doctor sees the sample consent request');
  assert.ok(doctorWorkspace.body.notifications.length >= 1, 'doctor sees a sample notification');
  const hospitalWorkspace = await server.request('/api/portals/hospital/workspace', { token: tokens.hospital });
  assert.equal(hospitalWorkspace.body.profile.hospitalId, 'HSP-IN-DL-000125');
  assert.ok(hospitalWorkspace.body.records.length >= 1 && hospitalWorkspace.body.activity.length >= 1, 'hospital sees its profile and sample activity');
  const pharmacyWorkspace = await server.request('/api/portals/pharmacy/workspace', { token: tokens.pharmacy });
  assert.ok(pharmacyWorkspace.body.records.length > 0, 'pharmacy sees its seeded inventory');
  pass('demo sample data is visible through each portal workspace and the patient API');

  // Cross-account isolation for patient-owned data.
  const doctorOnPatientRecords = await server.request('/api/me/health-records', { token: tokens.doctor });
  assert.equal(doctorOnPatientRecords.status, 403, 'a professional session cannot read patient records');
  assert.equal(doctorOnPatientRecords.body.code, 'ACCESS_DENIED');

  // Persistence: the patient session is created right before the restart, so
  // this also exercises the SIGTERM flush path.
  await server.stop();
  server = await startTestServer({ directory: enabled.directory, nodeEnv: 'test', env: DEMO_ENV });
  for (const role of ROLES) {
    const me = await server.request('/api/auth/me', { token: tokens[role] });
    assert.equal(me.status, 200, `${role}: session survives a normal restart`);
    assert.equal(me.body.portalRole, role);
  }
  pass('sessions created immediately before a normal restart survive it');

  // Idempotent seeding across restarts: one account per portal and no duplicated sample records.
  const stores = await readStores(enabled.runtime);
  assert.deepEqual(countDemo(stores), { users: 1, doctors: 1, hospitals: 1, pharmacies: 1, news: 1 });
  const requests = (stores.domain.consentRequests || []).find(([id]) => id === 'usr-gh-demo-patient')?.[1] || [];
  assert.equal(requests.filter(r => r.requestId === 'req-gh-demo-access-001').length, 1, 'no duplicated consent request');
  const notes = (stores.domain.doctorNotifications || []).find(([id]) => id === 'doc-gh-demo-physician')?.[1] || [];
  assert.equal(notes.filter(n => n.id === 'dntf-gh-demo-001').length, 1, 'no duplicated doctor notification');
  pass('restarting repeatedly keeps exactly one demo account per portal and no duplicate sample records');

  // A real, non-demo account created alongside demo data is left untouched.
  const registration = await server.request('/api/auth/signup', { body: {
    firstName: 'Real', lastName: 'Person', email: 'real.person@acceptance.invalid', password: 'Real-Person-2026!',
    confirmPassword: 'Real-Person-2026!', termsAccepted: true, termsVersion: '1.0', privacyVersion: '1.0',
  } });
  assert.equal(registration.status, 201, 'ordinary registration still works in demo mode');

  // Logout revokes every demo session immediately.
  for (const role of ROLES) {
    const logout = await server.request('/api/auth/logout', { token: tokens[role], body: {} });
    assert.equal(logout.status, 200, `${role}: logout accepted`);
    assert.equal((await server.request('/api/auth/me', { token: tokens[role] })).status, 401, `${role}: revoked session rejected`);
    assert.equal((await server.request(`/api/portals/${role}/workspace`, { token: tokens[role] })).status, 401, `${role}: workspace rejects revoked session`);
  }
  pass('global logout revokes every demo session across all portals');

  // Demo accounts sign back in after logout.
  for (const role of ROLES) assert.ok((await signIn(server, role)).body.token, `${role}: signs in again after logout`);
  pass('demo accounts can sign in again after logout');

  // Turning demo mode off removes the demo identities and their sessions.
  await server.stop();
  server = await startTestServer({ directory: enabled.directory, nodeEnv: 'test', env: { GH_DEMO_MODE: '' } });
  const off = await server.request('/api/demo/config');
  assert.equal(off.body.enabled, false);
  assert.deepEqual(off.body.accounts, []);
  for (const role of ROLES) {
    const attempt = await server.request(`/api/auth/portal/${role}/login`, { body: { identifier: IDENTIFIERS[role], password: 'DemoPatient-2026!' } });
    assert.equal(attempt.status, 401, `${role}: demo account unusable when demo mode is disabled`);
  }
  const afterOff = countDemo(await readStores(enabled.runtime));
  assert.deepEqual(afterOff, { users: 0, doctors: 0, hospitals: 0, pharmacies: 0, news: 0 }, 'demo records are pruned when demo mode is off');
  const real = await server.request('/api/auth/login', { body: { identifier: 'real.person@acceptance.invalid', password: 'Real-Person-2026!' } });
  // Unverified real accounts are told to verify (no token); the account is still found.
  assert.equal(real.status, 200, 'the real registration is not pruned with the demo accounts');
  assert.equal(real.body.verificationRequired, true);
  assert.equal(real.body.userId, registration.body.userId, 'the same real account is still stored');
  pass('disabling demo mode disables and prunes demo accounts while real registrations remain');
} finally {
  await server.stop();
  await rm(enabled.directory, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 2. Production isolation: demo mode can never be enabled.
// ---------------------------------------------------------------------------
const prod = await createRuntimeDirectory();
const production = await startTestServer({ directory: prod.directory, nodeEnv: 'production', env: { ...DEMO_ENV } });
try {
  const config = await production.request('/api/demo/config');
  assert.equal(config.body.enabled, false, 'production ignores GH_DEMO_MODE');
  assert.deepEqual(config.body.accounts, []);
  for (const role of ROLES) {
    const attempt = await production.request(`/api/auth/portal/${role}/login`, { body: { identifier: IDENTIFIERS[role], password: 'DemoPatient-2026!' } });
    assert.equal(attempt.status, 401, `${role}: no demo account exists in production`);
  }
  const stores = countDemo(await readStores(prod.runtime).catch(() => ({ accounts: {}, domain: {} })));
  assert.deepEqual(stores, { users: 0, doctors: 0, hospitals: 0, pharmacies: 0, news: 0 });
  pass('production never provisions or accepts demo accounts, even when GH_DEMO_MODE=true');
} finally {
  await production.stop();
  await rm(prod.directory, { recursive: true, force: true });
}

console.log(`\nAll ${results.length} demo account checks passed.`);
