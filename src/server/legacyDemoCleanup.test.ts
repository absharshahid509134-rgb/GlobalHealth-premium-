import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeDemoBrowserAccounts } from '../services/legacyDemoCleanup';

function storageFixture(initial: Record<string, unknown>) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  } as Storage;
  return { storage, values, read: (key: string) => JSON.parse(values.get(key) || 'null') };
}

test('retired central demo sessions are removed before providers restore them', () => {
  for (const user of [
    { id: 'usr-sarah-jenkins' }, { id: 'usr-demo-abc' }, { id: 'doctor:demo-abc' },
    { id: 'hospital:apex_admin', username: 'apex_admin' }, { id: 'news:news-admin-1' },
  ]) {
    const { storage } = storageFixture({ globalhealth_user_session: user, globalhealth_auth_token: 'old-session' });
    removeDemoBrowserAccounts(storage);
    assert.equal(storage.getItem('globalhealth_user_session'), null);
    assert.equal(storage.getItem('globalhealth_auth_token'), null);
  }
});

test('browser account cleanup preserves genuine accounts, primary sessions and unrelated data', () => {
  const realUser = { id: 'usr-real', username: 'doc_alex_chen', email: 'sarah.jenkins@example.com' };
  const realDoctor = { id: 'new-doctor', username: 'clinic-doctor' };
  const realHospital = { id: 'new-hospital-account', username: 'clinic-admin' };
  const realStaff = { id: 'staff-1780000000', email: 'new@clinic.example' };
  const { storage, read, values } = storageFixture({
    globalhealth_auth_token: 'real-session',
    globalhealth_user_session: realUser,
    doctor_portal_accounts_v2: [{ id: 'doc-acc-001', doctorId: 'doc-alexandra-chen' }, realDoctor],
    globalhealth_enterprise_state_v1_accounts: [{ username: 'apex_admin' }, realHospital],
    globalhealth_enterprise_state_v1_users: [{ id: 'USR-MED-002' }],
    gh_pharmacy_portal_staff: [{ id: 'staff-1' }, realStaff],
    gh_staff_members_v3: [{ id: 'staff-admin-1' }, { id: 'news-admin-bootstrap', email: 'admin@globalhealth.org' }],
    doctor_portal_applications_v2: [{ id: 'DOC-REQ-2026-0002' }, { id: 'DOC-REQ-2026-4821' }],
    globalhealth_enterprise_state_v1_applications: [{ id: 'APP-REQ-2026-0911' }, { id: 'APP-REQ-2026-9921' }],
    doctor_portal_activation_tokens_v2: [{ token: 'ACT-DOC-2026-CHOWDHURY-88F9' }, { token: 'real-activation' }],
    globalhealth_enterprise_state_v1_reset_tokens: [{ token: 'RST-DEMO-2026-7B42' }, { token: 'real-reset' }],
    medauth_doctors_list_v1: [{ id: 'doc-alexandra-chen', securityPassword: 'old-password', fullName: 'Directory profile' }],
    unrelated_setting: 'keep-me',
  });
  removeDemoBrowserAccounts(storage);
  assert.equal(storage.getItem('globalhealth_auth_token'), 'real-session');
  assert.deepEqual(read('globalhealth_user_session'), realUser);
  assert.deepEqual(read('doctor_portal_accounts_v2'), [realDoctor]);
  assert.deepEqual(read('globalhealth_enterprise_state_v1_accounts'), [realHospital]);
  assert.deepEqual(read('globalhealth_enterprise_state_v1_users'), []);
  assert.deepEqual(read('gh_pharmacy_portal_staff'), [realStaff]);
  assert.deepEqual(read('gh_staff_members_v3'), [{ id: 'news-admin-bootstrap', email: 'admin@globalhealth.org' }]);
  assert.deepEqual(read('doctor_portal_applications_v2'), [{ id: 'DOC-REQ-2026-4821' }]);
  assert.deepEqual(read('globalhealth_enterprise_state_v1_applications'), [{ id: 'APP-REQ-2026-9921' }]);
  assert.deepEqual(read('doctor_portal_activation_tokens_v2'), [{ token: 'real-activation' }]);
  assert.deepEqual(read('globalhealth_enterprise_state_v1_reset_tokens'), [{ token: 'real-reset' }]);
  assert.deepEqual(read('medauth_doctors_list_v1'), [{ id: 'doc-alexandra-chen', fullName: 'Directory profile' }]);
  assert.equal(storage.getItem('unrelated_setting'), 'keep-me');
  const afterFirstPass = [...values.entries()];
  removeDemoBrowserAccounts(storage);
  assert.deepEqual([...values.entries()], afterFirstPass, 'cleanup is idempotent');
});

test('legacy portal session caches tied to demo staff are cleared independently', () => {
  const { storage } = storageFixture({
    globalhealth_auth_token: 'real-session', globalhealth_user_session: { id: 'usr-real' },
    doctor_portal_active_account_v2: { id: 'doc-acc-001' }, doctor_portal_session_token_v1: 'doctor-session',
    globalhealth_enterprise_state_v1_current_user: { id: 'USR-ADM-001' }, hospital_portal_session_token_v1: 'hospital-session',
    gh_staff_session_v3: { staffId: 'staff-admin-1' },
    gh_pharmacy_portal_current_staff_id: JSON.stringify('staff-1'), gh_pharmacy_portal_auth_state: 'true',
  });
  removeDemoBrowserAccounts(storage);
  for (const key of ['doctor_portal_active_account_v2', 'doctor_portal_session_token_v1', 'globalhealth_enterprise_state_v1_current_user', 'hospital_portal_session_token_v1', 'gh_staff_session_v3', 'gh_pharmacy_portal_current_staff_id', 'gh_pharmacy_portal_auth_state']) {
    assert.equal(storage.getItem(key), null, key);
  }
  assert.equal(storage.getItem('globalhealth_auth_token'), 'real-session');
});
