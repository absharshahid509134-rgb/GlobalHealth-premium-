import React, { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, FileText, FlaskConical, Lock, LockOpen, RefreshCw, ScanLine, Search, ShieldAlert, ShieldCheck, Stethoscope, UserRound } from 'lucide-react';
import { useClinicalWorkspace, ConsentedScope, PatientClinical } from './doctorClinicalData';
import { WorkspaceView, useDoctorPortal } from './doctorPortalData';

interface DoctorPatientsProps { onNavigate: (view: WorkspaceView) => void; }

export const DoctorPatients: React.FC<DoctorPatientsProps> = ({ onNavigate }) => {
  const { patients, selectedPatientId, selectPatient, loading, error, refreshPatients } = useClinicalWorkspace();
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return patients.filter((patient) => !normalized || patient.name.toLowerCase().includes(normalized) || patient.identifier.toLowerCase().includes(normalized));
  }, [patients, query]);
  const active = selectedPatientId ? patients.find((patient) => patient.id === selectedPatientId) : null;

  if (active) return <AuthorizedPatientWorkspace patient={active} onBack={() => selectPatient(null)} onNavigate={onNavigate} />;

  return (
    <div className="space-y-5">
      {error && <ServerNotice message={error} onRetry={refreshPatients} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-lg font-extrabold tracking-tight text-[#162235]">My authorized patients</h2><p className="text-xs text-[#607086]">Only active server-side doctor–patient relationships are listed. This is not a global patient directory.</p></div>
        <button type="button" onClick={() => void refreshPatients()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh access</button>
      </div>
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search only your authorized patients" aria-label="Search authorized patients" className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-500/20" /></div>
      {loading && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">Loading the server-authorized patient relationship…</p>}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
        <table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50"><tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="px-4 py-3">Patient</th><th className="px-3 py-3">Identifier</th><th className="px-3 py-3">Access</th><th className="px-3 py-3">Expires</th><th className="px-3 py-3">Server scopes</th><th className="px-3 py-3 text-right">Action</th></tr></thead><tbody>
          {filtered.map((patient) => <tr key={patient.id} className="border-b border-slate-50"><td className="px-4 py-3"><p className="font-bold text-slate-800">{patient.name}</p><p className="text-[10px] text-slate-400">{patient.dataSource === 'server' ? 'Server relationship' : 'Unavailable source'}</p></td><td className="px-3 py-3 font-mono text-slate-600">{patient.identifier}</td><td className="px-3 py-3"><AccessBadge patient={patient} /></td><td className="px-3 py-3 text-slate-600">{patient.accessExpiresAt ? new Date(patient.accessExpiresAt).toLocaleString() : 'No expiry returned'}</td><td className="max-w-[220px] px-3 py-3 text-slate-600">{patient.consentedScopes.length ? patient.consentedScopes.join(', ') : 'None returned'}</td><td className="px-3 py-3 text-right"><button type="button" onClick={() => selectPatient(patient.id)} className="rounded-xl bg-medical-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-medical-700">Open authorized chart</button></td></tr>)}
          {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-500">{patients.length ? 'No authorized patient matches this search.' : 'No authorized patient relationship is available for this account.'}</td></tr>}
        </tbody></table>
      </section>
      <p className="flex items-start gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />Patient identifiers are displayed only after the server returns an active relationship. Denied lookups are not converted into search results.</p>
    </div>
  );
};

const AuthorizedPatientWorkspace: React.FC<{ patient: PatientClinical; onBack: () => void; onNavigate: (view: WorkspaceView) => void }> = ({ patient, onBack, onNavigate }) => {
  const { requestConsent, loading, error, refreshPatients } = useClinicalWorkspace();
  const { doctor } = useDoctorPortal();
  const [consentOpen, setConsentOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [scopes, setScopes] = useState<ConsentedScope[]>([]);
  const toggleScope = (scope: ConsentedScope) => setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  const submitConsent = () => {
    if (!reason.trim() || scopes.length === 0) return;
    void requestConsent(patient.id, reason.trim(), scopes);
    setConsentOpen(false); setReason(''); setScopes([]);
  };
  const hasProtectedData = patient.notes.length > 0 || patient.labs.length > 0 || patient.medications.length > 0 || patient.allergies.length > 0;

  return (
    <div className="space-y-4">
      {error && <ServerNotice message={error} onRetry={refreshPatients} />}
      <button type="button" onClick={onBack} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">← Back to authorized patients</button>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0B1F3A] text-white"><UserRound className="h-6 w-6" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-slate-900">{patient.name}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">{patient.identifier}</span></div><p className="mt-1 text-xs text-slate-500">{patient.dataSource === 'development-seed' ? 'Development seed returned by the server' : patient.dataSource === 'server' ? 'Loaded from the authorized patient endpoint' : 'Protected source unavailable'}</p><div className="mt-2 flex flex-wrap gap-2"><AccessBadge patient={patient} />{patient.accessExpiresAt && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"><Clock3 className="h-3 w-3" /> Expires {new Date(patient.accessExpiresAt).toLocaleString()}</span>}</div></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setConsentOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-medical-600 px-3 py-2 text-xs font-bold text-medical-700 hover:bg-medical-50"><LockOpen className="h-3.5 w-3.5" /> Request scope</button><button type="button" onClick={() => onNavigate('prescriptions')} className="inline-flex items-center gap-1.5 rounded-xl bg-medical-600 px-3 py-2 text-xs font-bold text-white hover:bg-medical-700"><Stethoscope className="h-3.5 w-3.5" /> Prescription gateway</button></div></div>
        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 px-5 py-4 md:grid-cols-3"><InfoCard label="Access permissions" value={permissionSummary(patient)} /><InfoCard label="Record categories" value={patient.dataSource === 'server' && patient.notes.length + patient.labs.length > 0 ? `${patient.notes.length + patient.labs.length} server record summary(ies)` : 'Not loaded yet'} /><InfoCard label="Modification" value="Patient approval required" /></div>
      </section>

      {loading && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">Rechecking protected record access with the server…</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-extrabold text-slate-900">Authorized record summaries</h3><p className="text-xs text-slate-500">Only fields returned by the scoped EHR endpoint are shown. Full record writes are not available here.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"><Lock className="h-3 w-3" /> View access only</span></div>{!hasProtectedData ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No protected clinical summary fields were returned by the server for this grant.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{patient.allergies.length > 0 && <RecordCard title="Allergies" icon={<ShieldAlert className="h-4 w-4 text-rose-600" />} value={patient.allergies.join(', ')} />}{patient.medications.length > 0 && <RecordCard title="Current medications" icon={<FileText className="h-4 w-4 text-medical-600" />} value={patient.medications.map((item) => item.name).join(', ')} />}{patient.notes.map((note) => <RecordCard key={note.id} title={note.title} icon={<FileText className="h-4 w-4 text-slate-500" />} value={note.body} />)}{patient.labs.map((lab) => <RecordCard key={lab.id} title={lab.test} icon={<FlaskConical className="h-4 w-4 text-amber-600" />} value={`${lab.category} · ${lab.clinicalNote || 'Structured result values not returned by endpoint.'}`} />)}</div>}</section>
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"><p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" /><span>Viewed by {doctor.fullName}. Each protected read is re-authorized and recorded server-side. Adding, editing, removing, or approving clinical data requires the patient consent workflow.</span></p></section>

      {consentOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-lg font-extrabold text-slate-900">Request additional patient scope</h3><p className="mt-1 text-xs text-slate-500">The patient must decide in the authenticated User workspace. This action does not grant access immediately.</p></div><button type="button" onClick={() => setConsentOpen(false)} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">×</button></div><label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">Clinical reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="Explain why additional access is needed" /></label><p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Requested scopes</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{(['basic', 'appointments', 'history', 'labs', 'imaging', 'prescriptions', 'documents'] as ConsentedScope[]).map((scope) => <button key={scope} type="button" onClick={() => toggleScope(scope)} className={`rounded-xl border px-3 py-2 text-xs font-bold capitalize ${scopes.includes(scope) ? 'border-medical-600 bg-medical-50 text-medical-700' : 'border-slate-200 text-slate-600'}`}>{scope}</button>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConsentOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="button" disabled={!reason.trim() || scopes.length === 0} onClick={submitConsent} className="rounded-xl bg-medical-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Send patient request</button></div></div></div>}
    </div>
  );
};

const AccessBadge: React.FC<{ patient: PatientClinical }> = ({ patient }) => {
  const emergency = patient.accessStatus === 'emergency';
  const expired = patient.accessStatus === 'expired' || patient.accessStatus === 'revoked';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${emergency ? 'bg-rose-50 text-rose-700' : expired ? 'bg-slate-100 text-slate-500' : patient.accessStatus === 'expiring' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{emergency ? 'Emergency view-only' : expired ? 'Access inactive' : patient.accessStatus === 'expiring' ? 'Access expiring' : 'Active view access'}</span>;
};

const permissionSummary = (patient: PatientClinical) => {
  const permissions = patient.accessPermissions || {};
  if (patient.accessStatus === 'emergency') return 'View only · no modifications';
  if (permissions.MODIFY_EHR === 'CONSENT_REQUIRED') return 'View · request changes with patient approval';
  return 'Server permission details unavailable';
};

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-slate-700">{value}</p></div>;
const RecordCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => <article className="rounded-xl border border-slate-200 bg-white p-3"><p className="flex items-center gap-2 text-xs font-bold text-slate-800">{icon}{title}</p><p className="mt-2 text-xs leading-relaxed text-slate-600">{value}</p></article>;
const ServerNotice: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950" role="alert"><span>{message}</span><button type="button" onClick={onRetry} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-100">Retry</button></div>;
