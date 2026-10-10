// Run against a single-process server with PUBLIC_DEMO_ENABLED=true:
//   npm run dev
//   npm run accept:demo
// This test creates synthetic visitor sessions and only touches demo-owned data.
import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

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
assert.equal(catalog.status, 200, 'demo catalog endpoint should be available');
assert.equal(catalog.body.demoSessionAvailable, true);
assert.match(catalog.cache || '', /no-store/);

const startDemo = async () => {
  const result = await request('/api/auth/demo-login', { body: {} });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.success, true);
  assert.ok(result.body.token);
  assert.equal(result.body.user.isDemoAccount, true);
  assert.equal(result.body.user.passwordHash, undefined);
  assert.equal(result.body.user.isEphemeralDemo, undefined, 'private lifecycle flag must not be exposed');
  assert.match(result.body.token, /^gh-demo-/);
  assert.match(result.cache || '', /no-store/);
  return { token: result.body.token, user: result.body.user };
};

const visitorA = await startDemo();
const visitorB = await startDemo();
try {
  assert.notEqual(visitorA.token, visitorB.token, 'each demo visitor needs a unique opaque session');
  assert.notEqual(visitorA.user.id, visitorB.user.id, 'each demo visitor needs a unique synthetic user');

  const identityA = await request('/api/auth/me', { token: visitorA.token });
  const identityB = await request('/api/auth/me', { token: visitorB.token });
  assert.equal(identityA.status, 200);
  assert.equal(identityA.body.user.id, visitorA.user.id);
  assert.equal(identityB.body.user.id, visitorB.user.id);

  const dashboard = await request('/api/me/dashboard', { token: visitorA.token });
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.summary.recentRecords >= 3, 'demo dashboard should include synthetic sample records');
  assert.ok(dashboard.body.summary.upcomingAppointments >= 1, 'demo dashboard should include an appointment');

  const ehr = await request('/api/me/ehr', { token: visitorA.token });
  assert.equal(ehr.status, 200);
  assert.equal(ehr.body.ehr.patientName, 'Jordan Sample');
  const ehrRecords = await request('/api/me/health-records', { token: visitorA.token });
  assert.equal(ehrRecords.status, 200);
  assert.ok(ehrRecords.body.records.length >= 3);
  const consentRequests = await request('/api/me/consent-requests', { token: visitorA.token });
  assert.equal(consentRequests.status, 200);
  assert.equal(consentRequests.body.requests.length, 1, 'demo should contain a synthetic consent example');

  const initialA = await request('/api/me/appointments', { token: visitorA.token });
  const initialB = await request('/api/me/appointments', { token: visitorB.token });
  assert.equal(initialA.body.appointments.length, 1);
  assert.equal(initialB.body.appointments.length, 1);
  const booking = await request('/api/me/appointments', {
    token: visitorA.token,
    body: {
      ownerId: visitorB.user.id,
      doctorName: 'Dr. Demo Physician',
      specialty: 'General Medicine',
      facility: 'GlobalHealth Demo Clinic',
      date: '2030-01-15',
      time: '11:00',
      reason: 'Temporary sandbox acceptance check'
    }
  });
  assert.equal(booking.status, 201);
  assert.equal(booking.body.appointment.ownerId, visitorA.user.id, 'owner must be server-derived');
  const afterA = await request('/api/me/appointments', { token: visitorA.token });
  const afterB = await request('/api/me/appointments', { token: visitorB.token });
  assert.equal(afterA.body.appointments.length, 2);
  assert.equal(afterB.body.appointments.length, 1, 'one visitor must not see another visitor’s appointment');

  await request('/api/me/saved-library', { token: visitorA.token });
  const save = await request('/api/me/saved-library', {
    token: visitorA.token,
    body: { category: 'articles', itemId: 'demo-acceptance-article', action: 'add' }
  });
  assert.equal(save.status, 200);
  const savedA = await request('/api/me/saved-library', { token: visitorA.token });
  const savedB = await request('/api/me/saved-library', { token: visitorB.token });
  assert.ok(savedA.body.savedLibrary.articles.includes('demo-acceptance-article'));
  assert.ok(!savedB.body.savedLibrary.articles.includes('demo-acceptance-article'));

  const aiConversation = await request('/api/ai/conversations', {
    token: visitorA.token,
    body: { title: 'Temporary demo chat', messages: [{ role: 'user', content: 'Sample demo question' }] }
  });
  assert.equal(aiConversation.status, 201);
  const aiListA = await request('/api/ai/conversations', { token: visitorA.token });
  const aiListB = await request('/api/ai/conversations', { token: visitorB.token });
  assert.ok(aiListA.body.conversations.some((conversation) => conversation.id === aiConversation.body.conversation.id));
  assert.equal(aiListB.body.conversations.length, 0, 'AI conversations must be isolated per visitor');
  const aiShare = await request(`/api/ai/conversations/${encodeURIComponent(aiConversation.body.conversation.id)}/share`, {
    token: visitorA.token,
    body: {}
  });
  assert.equal(aiShare.status, 201);

  const ehrShare = await request('/api/ehr/consent-share', {
    token: visitorA.token,
    body: { granteeName: 'Demo clinician', granteeType: 'Physician', scopes: ['Labs'], durationDays: 7 }
  });
  assert.equal(ehrShare.status, 201);

  const blockedOrder = await request('/api/pharmacy-marketplace/orders', {
    token: visitorA.token,
    body: { items: [{ productId: 'nonexistent-demo-item', pharmacyId: 'demo-pharmacy', quantity: 1 }], deliveryFee: 0 }
  });
  assert.equal(blockedOrder.status, 403);
  assert.equal(blockedOrder.body.code, 'DEMO_ACTION_BLOCKED', 'demo checkout must be rejected before inventory validation/mutation');

  const logoutA = await request('/api/auth/logout', { token: visitorA.token, body: {} });
  assert.equal(logoutA.status, 200);
  assert.equal((await request('/api/auth/me', { token: visitorA.token })).status, 401, 'logout must destroy the demo session');
  assert.equal((await request('/api/auth/me', { token: visitorB.token })).status, 200, 'logging out one visitor must not affect another');

  const logoutB = await request('/api/auth/logout', { token: visitorB.token, body: {} });
  assert.equal(logoutB.status, 200);
  assert.equal((await request('/api/auth/me', { token: visitorB.token })).status, 401);
  console.log('PASS: public demo login, unique identities, synthetic dashboard/EHR/consent data, private mutations and AI, temporary logout cleanup, and blocked live orders.');
} finally {
  // Keep the script safe when an assertion fails partway through.
  for (const visitor of [visitorA, visitorB]) {
    await request('/api/auth/logout', { token: visitor.token, body: {} }).catch(() => {});
  }
}
