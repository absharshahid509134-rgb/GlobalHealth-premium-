import React, { useState } from 'react';
import { CheckCircle2, KeyRound, Lock, ScrollText, ShieldAlert, Smartphone } from 'lucide-react';
import { doctorApi } from '../../services/doctorPortalClient';
import { useDoctorPortal } from './doctorPortalData';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorSecurity: React.FC<{ section: 'security' | 'sessions' | 'delegated' | 'audit' }> = ({ section }) => {
  if (section === 'audit') return <AuditView />;
  if (section === 'sessions') return <DoctorUnavailable title="Session management unavailable" message="The server validates and terminates the current Doctor Portal bearer session, but a multi-session listing API is not connected to this UI." scope="No device, IP address, location, or session status is fabricated. Sign out to terminate the current session." />;
  if (section === 'delegated') return <DoctorUnavailable title="Delegated access unavailable" message="Delegated professional access is not connected to an approved server workflow." scope="No colleague, practice manager, or delegated scope is created in the browser." />;
  return <SecurityCenter />;
};

const SecurityCenter: React.FC = () => {
  const { doctor } = useDoctorPortal();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submitPassword = async () => {
    setError(''); setNotice('');
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    setBusy(true);
    try {
      const response = await doctorApi.changePassword(oldPassword, newPassword);
      if (!response.success) throw new Error(response.error || 'Password could not be changed.');
      setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setNotice(response.message || 'Password updated. Other server sessions were revoked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password could not be changed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Security Center</h2><p className="text-xs text-slate-500">Password changes are sent to the authenticated server session. Secrets are not stored in browser state after submission.</p></div>
      {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"><ShieldAlert className="h-4 w-4" />{error}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><KeyRound className="h-4 w-4 text-medical-600" /> Change password</h3><div className="mt-4 grid gap-3 sm:grid-cols-3"><PasswordField label="Current password" value={oldPassword} onChange={setOldPassword} /><PasswordField label="New password" value={newPassword} onChange={setNewPassword} /><PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} /></div><button type="button" onClick={() => void submitPassword()} disabled={busy || !oldPassword || !newPassword || !confirmPassword} className="mt-4 rounded-xl bg-medical-600 px-4 py-2 text-xs font-bold text-white hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Updating…' : 'Update password'}</button></section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="flex items-center gap-2 text-sm font-extrabold text-amber-900"><Smartphone className="h-4 w-4" /> Multi-factor authentication</h3><p className="mt-2 text-xs leading-relaxed text-amber-900/80">MFA enrollment is not exposed by the connected Doctor Portal APIs. It is not shown as enabled or disabled by this client.</p></section>
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"><p className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" /><span>Authenticated server doctor: <strong className="text-slate-800">{doctor.id}</strong>. Patient records are never included in account-security notifications or password requests.</span></p></section>
    </div>
  );
};

const PasswordField: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</span><input type="password" autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-500/20" /></label>;

const AuditView: React.FC = () => {
  const { auditEvents } = useDoctorPortal();
  return <div className="space-y-5"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Audit log</h2><p className="text-xs text-slate-500">Server-scoped, append-only events for this doctor and currently authorized relationships. Clinical payloads are redacted.</p></div><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Resource</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Outcome</th></tr></thead><tbody className="divide-y divide-slate-100">{auditEvents.map((event) => <tr key={event.id}><td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{event.date} {event.time}</td><td className="px-4 py-2.5 font-semibold text-slate-700">{event.actor}</td><td className="px-4 py-2.5 text-slate-600">{event.action}</td><td className="px-4 py-2.5 text-slate-600">{event.resource || 'Account event'}</td><td className="px-4 py-2.5 text-slate-500">{event.location}</td><td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${event.outcome === 'success' ? 'bg-emerald-50 text-emerald-700' : event.outcome === 'denied' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{event.outcome}</span></td></tr>)}</tbody></table></div>{auditEvents.length === 0 && <p className="p-8 text-center text-xs text-slate-500">No scoped audit events are available.</p>}</section><p className="flex items-center gap-1.5 text-[11px] text-slate-400"><ScrollText className="h-3.5 w-3.5 text-medical-500" /> Audit events are written server-side and cannot be altered from this UI.</p></div>;
};
