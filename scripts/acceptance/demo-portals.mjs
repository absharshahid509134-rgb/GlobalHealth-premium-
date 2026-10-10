// Run against a single-process server with PUBLIC_DEMO_ENABLED=true:
//   npm run dev
//   npm run accept:demo-portals
// Covers the passwordless Doctor, Hospital, Pharmacy and News Management demos.
// It creates synthetic visitor sessions only and touches no real account data.
import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const ROLES = ['doctor', 'hospital', 'pharmacy', 'news'];

async function request(path, { token, body, method } = {}) {
  const response = await fetch(base + path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, body: json, cache: response.headers.get('cache-control') };
}

const catalog = await request('/api/auth/demo-accounts');
assert.equal(catalog.status, 200);
assert.equal(catalog.body.demoSessionAvailable, true);
assert.deepEqual(catalog.body.demoRoles, ['user', 'doctor', 'hospital', 'pharmacy', 'news']);

const bad = await request('/api/auth/demo-login', { body: { role: 'admin' } });
assert.equal(bad.status, 400, 'unknown demo roles are rejected');
assert.equal((await request('/api/auth/demo-login', { body: { role: '__proto__' } })).status, 400);

const sessions = {};
for (const role of ROLES) {
  const start = await request('/api/auth/demo-login', { body: { role } });
  assert.equal(start.status, 201, `${role}: ${JSON.stringify(start.body)}`);
  assert.equal(start.body.success, true);
  assert.equal(start.body.user.isDemoAccount, true);
  assert.equal(start.body.user.portalRole, role);
  assert.equal(start.body.user.passwordHash, undefined);
  assert.match(start.body.token, new RegExp(`^gh-demo-${role}-[0-9a-f]{32}-[0-9a-f]{32}$`));
  assert.match(start.cache || '', /no-store/);
  sessions[role] = { token: start.body.token, user: start.body.user };

  const me = await request('/api/auth/me', { token: start.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.portalRole, role);
  assert.equal(me.body.user.id, start.body.user.id);
  assert.equal(me.body.destination, { doctor: 'doctor-portal', hospital: 'hospital-portal', pharmacy: 'pharmacy-portal', news: 'news-management' }[role]);

  const workspace = await request(`/api/portals/${role}/workspace`, { token: start.body.token });
  assert.equal(workspace.status, 200);
  assert.equal(workspace.body.demo, true);
  assert.equal(workspace.body.accountId, start.body.user.id);
  assert.ok(workspace.body.sections.length >= 3, `${role} has sample sections`);
  assert.ok(workspace.body.records.length >= 5);
  assert.match(workspace.cache || '', /no-store/);
}

// A demo token is bound to its own role and only unlocks the sandbox.
assert.equal((await request('/api/portals/hospital/workspace', { token: sessions.doctor.token })).status, 403);
assert.equal((await request('/api/portals/doctor/demo/items', { token: sessions.pharmacy.token, body: { sectionId: 'patients', title: 'x' } })).status, 403);
assert.equal((await request('/api/me/dashboard', { token: sessions.doctor.token })).status, 403, 'demo professionals have no User Portal access');
assert.equal((await request('/api/doctor/auth/me', { token: sessions.doctor.token })).status, 401, 'not a real doctor session');
assert.equal((await request('/api/hospital-portal/auth/me', { token: sessions.hospital.token })).status, 401, 'not a real hospital session');
assert.equal((await request('/api/pharmacy-marketplace/orders', { token: sessions.pharmacy.token, body: { items: [{ id: 'x', quantity: 1 }] } })).status, 403, 'marketplace orders stay disabled');

// Forged / tampered / unsigned tokens are rejected.
const t = sessions.news.token;
assert.equal((await request('/api/auth/me', { token: t.slice(0, -4) + (t.endsWith('0000') ? '1111' : '0000') })).status, 401);
assert.equal((await request('/api/auth/me', { token: `gh-demo-news-${'a'.repeat(32)}-${'b'.repeat(32)}` })).status, 401);
assert.equal((await request('/api/auth/me', { token: t.replace('gh-demo-news-', 'gh-demo-doctor-') })).status, 401);

// Sandbox edits: isolated between visitors, validated, and bounded.
const secondDoctor = (await request('/api/auth/demo-login', { body: { role: 'doctor' } })).body;
assert.notEqual(secondDoctor.user.id, sessions.doctor.user.id);
const before = (await request('/api/portals/doctor/workspace', { token: secondDoctor.token })).body.records.length;

const add = await request('/api/portals/doctor/demo/items', { token: sessions.doctor.token, body: { sectionId: 'patients', title: 'Taylor Example', detail: 'Synthetic' } });
assert.equal(add.status, 201, JSON.stringify(add.body));
const itemId = add.body.item.id;
const afterAdd = await request('/api/portals/doctor/workspace', { token: sessions.doctor.token });
assert.ok(afterAdd.body.records.some((r) => r.id === itemId));
assert.equal((await request('/api/portals/doctor/workspace', { token: secondDoctor.token })).body.records.length, before, "another visitor's sandbox is unchanged");
assert.equal((await request(`/api/portals/doctor/demo/items/${itemId}`, { token: secondDoctor.token, method: 'PATCH', body: { status: 'Discharged' } })).status, 404, "cannot edit another visitor's item");

assert.equal((await request('/api/portals/doctor/demo/items', { token: sessions.doctor.token, body: { sectionId: 'patients', title: '   ' } })).status, 400);
assert.equal((await request('/api/portals/doctor/demo/items', { token: sessions.doctor.token, body: { sectionId: 'missing', title: 'x' } })).status, 404);
assert.equal((await request(`/api/portals/doctor/demo/items/${itemId}`, { token: sessions.doctor.token, method: 'PATCH', body: { status: 'Hacked' } })).status, 400);
const patched = await request(`/api/portals/doctor/demo/items/${itemId}`, { token: sessions.doctor.token, method: 'PATCH', body: { status: 'Discharged' } });
assert.equal(patched.status, 200);
assert.equal(patched.body.item.status, 'Discharged');
assert.equal((await request(`/api/portals/doctor/demo/items/${itemId}`, { token: sessions.doctor.token, method: 'DELETE' })).status, 200);
assert.equal((await request(`/api/portals/doctor/demo/items/${itemId}`, { token: sessions.doctor.token, method: 'DELETE' })).status, 404);
assert.equal((await request('/api/portals/doctor/demo/items', { body: { sectionId: 'patients', title: 'x' } })).status, 401, 'anonymous writes rejected');

// Logout ends the sandbox permanently; its signed token cannot self-heal.
for (const [role, session] of Object.entries(sessions)) {
  const out = await request('/api/auth/logout', { token: session.token, body: {} });
  assert.equal(out.status, 200, role);
  assert.equal((await request('/api/auth/me', { token: session.token })).status, 401, `${role} token is dead after logout`);
  assert.equal((await request(`/api/portals/${role}/workspace`, { token: session.token })).status, 401);
}
await request('/api/auth/logout', { token: secondDoctor.token, body: {} });

console.log('Professional demo portal acceptance checks passed.');
