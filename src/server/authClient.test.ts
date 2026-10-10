import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, AuthError, getStoredToken, storeSession } from '../services/authClient';

function browserFixture() {
  const values = new Map<string, string>();
  const events: Event[] = [];
  const originals = Object.getOwnPropertyDescriptors(globalThis);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: (event: Event) => events.push(event) } });
  return { events, restore() {
    for (const key of ['localStorage', 'window', 'fetch']) {
      if (originals[key]) Object.defineProperty(globalThis, key, originals[key]);
      else Reflect.deleteProperty(globalThis, key);
    }
  } };
}

test('cross-role 403 does not clear or replace the unified session', async () => {
  const fixture = browserFixture();
  try {
    storeSession('doctor-session', { id: 'doctor:a' });
    globalThis.fetch = async (_url, init) => {
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer doctor-session');
      return new Response(JSON.stringify({ code: 'ACCESS_DENIED' }), { status: 403 });
    };
    await assert.rejects(apiFetch('/api/portals/hospital/workspace'), e => e instanceof AuthError && e.status === 403);
    assert.equal(getStoredToken(), 'doctor-session');
    assert.equal(fixture.events.length, 0);
  } finally { fixture.restore(); }
});

test('a late 401 for a previous identity cannot log out the new account', async () => {
  const fixture = browserFixture();
  try {
    storeSession('old-session', { id: 'old' });
    globalThis.fetch = async () => {
      storeSession('new-session', { id: 'new' });
      return new Response(JSON.stringify({ code: 'SESSION_EXPIRED' }), { status: 401 });
    };
    await assert.rejects(apiFetch('/api/auth/me'), e => e instanceof AuthError && e.status === 401);
    assert.equal(getStoredToken(), 'new-session');
    assert.equal(fixture.events.length, 0);
  } finally { fixture.restore(); }
});

test('an expired current session is removed', async () => {
  const fixture = browserFixture();
  try {
    storeSession('expired-session', { id: 'old' });
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 'SESSION_EXPIRED' }), { status: 401 });
    await assert.rejects(apiFetch('/api/auth/me'), e => e instanceof AuthError && e.code === 'SESSION_EXPIRED');
    assert.equal(getStoredToken(), null);
  } finally { fixture.restore(); }
});

test('an expired professional demo renews as the same portal, not as a User demo', async () => {
  const { renewDemoSession } = await import('../services/authClient');
  const fixture = browserFixture();
  try {
    storeSession('gh-demo-doctor-old', { id: 'doctor:demo-abc', email: 'demo-abc@demo.invalid' });
    let requestedBody = '';
    globalThis.fetch = async (_url, init) => {
      requestedBody = String(init?.body);
      return new Response(JSON.stringify({ success: true, token: 'gh-demo-doctor-new', user: { id: 'doctor:demo-def', email: 'demo-def@demo.invalid' } }), { status: 201 });
    };
    assert.equal(await renewDemoSession(), true);
    assert.deepEqual(JSON.parse(requestedBody), { role: 'doctor' });
    assert.equal(getStoredToken(), 'gh-demo-doctor-new');
    await new Promise((resolve) => setTimeout(resolve, 5));

    storeSession('gh-demo-old', { id: 'usr-demo-abc', email: 'usr-demo-abc@demo.invalid' });
    assert.equal(await renewDemoSession(), true);
    assert.deepEqual(JSON.parse(requestedBody), {}, 'User demo renewal is unchanged');
  } finally { fixture.restore(); }
});
