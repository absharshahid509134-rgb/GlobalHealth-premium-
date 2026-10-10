import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_MAX_ITEMS_PER_SECTION,
  DEMO_PORTAL_ROLES,
  DEMO_SESSION_TTL_MS,
  DemoPortalStore,
  cleanDemoText,
  isDemoPortalRole,
} from './demoPortal';

const SECRET = 'unit-test-secret-0123456789abcdef';
const fixture = () => {
  let now = 1_800_000_000_000;
  const store = new DemoPortalStore(SECRET, () => now);
  return { store, advance: (ms: number) => { now += ms; } };
};

test('only the four professional roles are demo portal roles', () => {
  assert.deepEqual([...DEMO_PORTAL_ROLES], ['doctor', 'hospital', 'pharmacy', 'news']);
  for (const bad of ['user', 'admin', 'SUPER_ADMIN', '', null, undefined, '__proto__', ['doctor']]) {
    assert.equal(isDemoPortalRole(bad), false);
  }
});

test('each role receives a unique synthetic identity with seeded private data', () => {
  const { store } = fixture();
  for (const role of DEMO_PORTAL_ROLES) {
    const a = store.start(role);
    const b = store.start(role);
    assert.notEqual(a.token, b.token);
    assert.match(a.token, new RegExp(`^gh-demo-${role}-[0-9a-f]{32}-[0-9a-f]{32}$`));
    const identity = store.identity(a);
    assert.equal(identity.role, role);
    assert.equal(identity.user.isDemoAccount, true);
    assert.equal(identity.user.portalRole, role);
    assert.match(String(identity.user.email), /@demo\.invalid$/);
    assert.notEqual(identity.user.id, store.identity(b).user.id);
    assert.equal((identity.user as any).passwordHash, undefined);
    const workspace = store.workspace(a);
    assert.ok(workspace.sections.length >= 3, `${role} has several sections`);
    assert.ok(workspace.records.length >= 5, `${role} has sample records`);
    assert.ok(workspace.notifications.length >= 2);
    assert.equal(workspace.accountId, identity.user.id);
  }
});

test('sandboxes are isolated: edits in one never appear in another', () => {
  const { store } = fixture();
  const a = store.start('pharmacy');
  const b = store.start('pharmacy');
  const before = store.workspace(b).records.length;
  const added = store.addItem(a, 'inventory', 'Ibuprofen 200 mg', 'Added by visitor A');
  assert.equal(added.ok, true);
  assert.equal(store.workspace(a).records.length, before + 1);
  assert.equal(store.workspace(b).records.length, before);
  assert.equal(store.setStatus(b, added.ok ? added.value.id : '', 'Low stock').ok, false, 'B cannot touch A items');
});

test('tampered, unsigned, cross-role and malformed tokens are rejected', () => {
  const { store } = fixture();
  const session = store.start('doctor');
  assert.ok(store.resolve(session.token));
  const flipped = session.token.slice(0, -1) + (session.token.endsWith('0') ? '1' : '0');
  assert.equal(store.resolve(flipped), null);
  assert.equal(store.resolve(session.token.replace('gh-demo-doctor-', 'gh-demo-hospital-')), null);
  assert.equal(store.resolve(`gh-demo-doctor-${'a'.repeat(32)}-${'b'.repeat(32)}`), null);
  assert.equal(store.resolve('gh-demo-' + 'a'.repeat(32) + '-' + 'b'.repeat(32)), null, 'user demo tokens are not portal tokens');
  for (const bad of ['', 'doc-sess-abc', undefined, null, 42, {}]) assert.equal(store.resolve(bad), null);
  assert.throws(() => new DemoPortalStore('short'));
  assert.equal(new DemoPortalStore('another-secret-0123456789abcdef').resolve(session.token), null, 'signature depends on the secret');
});

test('logout discards data and permanently ends the token', () => {
  const { store } = fixture();
  const session = store.start('news');
  assert.equal(store.size, 1);
  assert.equal(store.end(session.token), true);
  assert.equal(store.size, 0);
  assert.equal(store.resolve(session.token), null, 'an ended token must not self-heal');
  assert.equal(store.end('nonsense'), false);
});

test('sandboxes expire after four hours idle and slide while in use', () => {
  const { store, advance } = fixture();
  const session = store.start('hospital');
  advance(DEMO_SESSION_TTL_MS - 60_000);
  assert.ok(store.resolve(session.token), 'still alive just before the limit');
  advance(DEMO_SESSION_TTL_MS - 60_000);
  assert.ok(store.resolve(session.token), 'activity extended the window');
  advance(DEMO_SESSION_TTL_MS + 1);
  assert.equal(store.resolve(session.token), null, 'idle for over four hours');
  assert.equal(store.size, 0);

  const idle = store.start('doctor');
  advance(DEMO_SESSION_TTL_MS + 1);
  assert.equal(store.sweep(), 1);
  assert.equal(store.resolve(idle.token), null);
});

test('a signed token survives a restart with fresh sample data', () => {
  const { store } = fixture();
  const original = store.start('pharmacy');
  store.addItem(original, 'inventory', 'Temporary item', '');
  const restarted = new DemoPortalStore(SECRET);
  const restored = restarted.resolve(original.token);
  assert.ok(restored);
  assert.equal(restored!.accountKey, original.accountKey);
  assert.ok(!restarted.workspace(restored!).records.some((r) => r.title === 'Temporary item'));
});

test('add, update and remove validate input and are bounded', () => {
  const { store } = fixture();
  const s = store.start('doctor');
  assert.equal(store.addItem(s, 'nope', 'x', '').ok, false);
  const blank = store.addItem(s, 'patients', '   \u0007  ', '');
  assert.deepEqual(blank.ok ? null : blank.code, 'INVALID');
  const ok = store.addItem(s, 'patients', '  Taylor\n  Example  ', 'x'.repeat(1000), 'Not a status');
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.value.title, 'Taylor Example');
  assert.ok(ok.value.detail.length <= 240);
  assert.equal(ok.value.status, 'Active', 'unknown status falls back to the first allowed status');
  assert.equal(store.setStatus(s, ok.value.id, 'Hacked').ok, false);
  assert.equal(store.setStatus(s, ok.value.id, 'Discharged').ok, true);
  assert.equal(store.workspace(s).activity[0].title.includes('Discharged'), true);
  assert.equal(store.removeItem(s, ok.value.id).ok, true);
  assert.equal(store.removeItem(s, ok.value.id).ok, false);
  for (let i = 0; i < 40; i += 1) store.addItem(s, 'appointments', `Slot ${i}`, '');
  const full = store.addItem(s, 'appointments', 'One too many', '');
  assert.equal(full.ok ? null : full.code, 'LIMIT_REACHED');
  assert.equal(store.workspace(s).sections.find((x) => x.id === 'appointments')!.items.length, DEMO_MAX_ITEMS_PER_SECTION);
});

test('cleanDemoText strips control characters and bounds length', () => {
  assert.equal(cleanDemoText('a\u0000b\tc\n', 10), 'a b c');
  assert.equal(cleanDemoText(123, 10), '');
  assert.equal(cleanDemoText('abcdef', 3), 'abc');
});
