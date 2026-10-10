import React, { useEffect, useState } from 'react';
import { ShieldCheck, LayoutDashboard, Files, Settings, Bell, History, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PlatformRole, ROLE_NAMES } from '../../core/platformRoles';
import { apiFetch } from '../../services/authClient';

type Workspace = {
  accountId: string;
  role: PlatformRole;
  profile: Record<string, unknown>;
  records: { id: string; title: string; status: string }[];
  activity: { id: string; title: string; at: string }[];
  notifications: { id: string; title: string; body: string }[];
};
const TABS = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['records', 'Records', Files],
  ['activity', 'My activity', History],
  ['notifications', 'Notifications', Bell],
  ['settings', 'Account settings', Settings],
] as const;

/** Workspaces render only the signed-in account's server-scoped data. */
export function PrivatePortal({ role, onExit }: { role: PlatformRole; onExit: () => void }) {
  const { user, logout, sessionId } = useAuth();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<string>('dashboard');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    apiFetch<Workspace>(`/api/portals/${role}/workspace`).then(result => {
      if (cancelled) return;
      if (result.accountId !== user?.id || result.role !== role) throw new Error('The workspace identity could not be verified.');
      setData(result);
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [role, user?.id, sessionId]);

  const signOut = async () => { await logout(); onExit(); };
  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setBusy(true);
    setNotice('');
    try {
      if (fields.newPassword !== fields.confirmPassword) throw new Error('New passwords do not match.');
      const prefix = { doctor: '/api/doctor/auth', hospital: '/api/hospital-portal/auth', pharmacy: '/api/pharmacy-partner/auth', user: '/api/auth', news: '' }[role];
      await apiFetch(`${prefix}/change-password`, { method: 'POST', body: { ...fields, currentPassword: fields.oldPassword } });
      form.reset();
      setNotice('Password updated.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Unable to change password.');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div role="alert" className="p-10 text-center"><h2 className="text-xl font-bold">Workspace unavailable</h2><p className="mt-3">{error}</p><button onClick={onExit} className="mt-5 text-medical-700">Return to GlobalHealth</button></div>;
  if (!data) return <div role="status" className="p-16 text-center">Verifying your private workspace…</div>;

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-6 py-5">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-9 w-9 text-medical-700" />
        <div><p className="text-xs font-bold uppercase tracking-widest text-medical-700">GlobalHealth · Private workspace</p><h1 className="text-xl font-bold">{ROLE_NAMES[role]} Portal</h1></div>
      </div>
      <div className="flex items-center gap-4"><span className="text-sm">{user?.fullName}</span><button onClick={signOut} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><LogOut size={16} />Sign out</button></div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[220px_1fr] md:p-8">
      <nav aria-label={`${ROLE_NAMES[role]} workspace`} className="space-y-2">
        {TABS.map(([id, label, Icon]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setNotice(''); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${tab === id ? 'bg-medical-700 text-white' : 'text-slate-600 hover:bg-white'}`}><Icon size={18} />{label}</button>)}
        <p className="px-4 pt-6 text-xs leading-relaxed text-slate-500">Access is verified by the server for this account. No other role’s workspace is available in this session.</p>
      </nav>
      <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="mb-6 text-2xl font-bold">{tab === 'dashboard' ? `Welcome, ${user?.fullName}` : TABS.find(t => t[0] === tab)?.[1]}</h2>
        {tab === 'dashboard' && <>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">{[['Records', data.records.length], ['Notifications', data.notifications.length], ['Recent activities', data.activity.length]].map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{count}</p></div>)}</div>
          <h3 className="mb-4 font-bold">Your verified account</h3>
          <dl className="grid gap-4 sm:grid-cols-2">{Object.entries(data.profile).filter(([, value]) => typeof value === 'string' && value).map(([key, value]) => <div key={key} className="min-w-0 border-b pb-3"><dt className="text-xs uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="mt-1 break-words text-sm font-medium">{String(value)}</dd></div>)}</dl>
        </>}
        {tab === 'records' && <div className="space-y-3">{data.records.length ? data.records.map(r => <article key={r.id} className="flex items-center justify-between gap-4 rounded-xl border p-4"><div><h3 className="font-semibold">{r.title}</h3><p className="mt-1 text-xs text-slate-500">{r.id}</p></div><span className="rounded-lg bg-medical-50 px-3 py-1 text-xs text-medical-800">{r.status}</span></article>) : <p className="text-slate-500">No records belong to this account yet.</p>}</div>}
        {tab === 'activity' && <div className="space-y-3">{data.activity.length ? data.activity.map((a, i) => <article key={a.id || i} className="border-b py-3"><h3 className="text-sm font-semibold">{a.title}</h3><time className="text-xs text-slate-500">{a.at}</time></article>) : <p className="text-slate-500">No account activity to display.</p>}</div>}
        {tab === 'notifications' && <div className="space-y-3">{data.notifications.length ? data.notifications.map(n => <article key={n.id} className="rounded-xl border p-4"><h3 className="font-semibold">{n.title}</h3><p className="mt-2 text-sm text-slate-600">{n.body}</p></article>) : <p className="text-slate-500">You have no notifications.</p>}</div>}
        {tab === 'settings' && <div className="max-w-md space-y-5">
          <p className="text-sm text-slate-600">Signed in as {user?.email || user?.username}. Your role is managed by your organization and cannot be changed here.</p>
          {role === 'news' ? <p className="text-sm text-slate-600">To recover your password, sign out and choose Recover on the centralized authentication page.</p> : <form onSubmit={changePassword} className="space-y-4">
            <h3 className="font-bold">Change password</h3>
            {([['oldPassword', 'Current password'], ['newPassword', 'New password'], ['confirmPassword', 'Confirm new password']] as const).map(([name, label]) => <label key={name} className="block text-sm font-semibold">{label}<input name={name} type="password" required minLength={name === 'oldPassword' ? 1 : 8} autoComplete={name === 'oldPassword' ? 'current-password' : 'new-password'} className="mt-2 w-full rounded-xl border px-4 py-3" /></label>)}
            <button disabled={busy} className="rounded-xl bg-medical-700 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Updating…' : 'Update password'}</button>
          </form>}
          {notice && <p role="status" className="text-sm text-medical-700">{notice}</p>}
        </div>}
      </main>
    </div>
  </div>;
}
