import React from 'react';
import { BadgeCheck, Bell, CalendarClock, ClipboardList, Lock, ShieldAlert, Users } from 'lucide-react';
import { useDoctorPortal, WorkspaceView } from './doctorPortalData';
import { useClinicalWorkspace } from './doctorClinicalData';

export const DoctorDashboard: React.FC<{ onNavigate: (v: WorkspaceView) => void }> = ({ onNavigate }) => {
  const { doctor, notifications } = useDoctorPortal();
  const { patients, loading, error } = useClinicalWorkspace();
  const unread = notifications.filter((n) => !n.read).length;
  const pendingConsent = patients.reduce((count, patient) => count + (patient.pendingConsentCount || 0), 0);
  const verified = doctor.verificationStatus === 'verified';

  return (
    <div className="space-y-5">
      <section className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${verified ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {verified ? <BadgeCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
        </span>
        <div className="flex-1">
          <p className={`text-sm font-bold ${verified ? 'text-emerald-900' : 'text-amber-900'}`}>{verified ? 'Server verification confirmed' : 'Verification is not complete'}</p>
          <p className={`text-xs ${verified ? 'text-emerald-800/90' : 'text-amber-800/90'}`}>{doctor.verificationNextAction || 'Clinical access is still governed by server-side verification and patient grants.'}</p>
        </div>
        {!verified && <button type="button" onClick={() => onNavigate('credentials')} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700">View status</button>}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Authorized patients" value={loading ? '…' : String(patients.length)} sub="server relationship" icon={<Users className="h-4 w-4" />} onClick={() => onNavigate('patients')} />
        <Kpi label="Pending consent" value={String(pendingConsent)} sub="patient decision required" icon={<Lock className="h-4 w-4" />} onClick={() => onNavigate('patients')} />
        <Kpi label="Notifications" value={String(unread)} sub="server feed" icon={<Bell className="h-4 w-4" />} onClick={() => onNavigate('notifications')} />
        <Kpi label="Appointments" value="—" sub="scheduling API not connected" icon={<CalendarClock className="h-4 w-4" />} onClick={() => onNavigate('appointments')} />
      </div>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Connected clinical access</h2>
            <p className="mt-1 text-xs text-slate-500">Only patients returned by the server-authorized relationship endpoint appear here. Opening a chart triggers a fresh grant check.</p>
          </div>
          <button type="button" onClick={() => onNavigate('patients')} className="rounded-xl bg-medical-600 px-4 py-2 text-xs font-bold text-white hover:bg-medical-700">Open patient access</button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {patients.slice(0, 4).map((patient) => (
            <button key={patient.id} type="button" onClick={() => onNavigate('patients')} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left hover:border-medical-200">
              <p className="text-xs font-bold text-slate-800">{patient.name}</p>
              <p className="mt-1 text-[10px] text-slate-500">{patient.identifier} · {patient.accessStatus || 'server-scoped access'}</p>
              {patient.accessExpiresAt && <p className="mt-1 text-[10px] text-slate-500">Access expires {new Date(patient.accessExpiresAt).toLocaleDateString()}</p>}
            </button>
          ))}
          {!loading && patients.length === 0 && <p className="sm:col-span-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No authorized patient relationship is available for this account.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="flex items-start gap-2"><ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-medical-600" /><span><strong className="text-slate-800">High-impact actions are fail-closed.</strong> Prescriptions, clinical notes, orders, billing, messages, and schedule changes are not reported as completed unless an approved server integration is available.</span></p>
      </section>
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; sub: string; icon: React.ReactNode; onClick: () => void }> = ({ label, value, sub, icon, onClick }) => (
  <button type="button" onClick={onClick} className="rounded-2xl border border-[#E3E8EF] bg-white p-4 text-left shadow-soft transition hover:border-[#1769E0]/40 hover:bg-[#1769E0]/5">
    <div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97A8]">{label}</p><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#0B1F3A] text-white">{icon}</span></div>
    <p className="mt-2 text-2xl font-extrabold tracking-tight text-[#162235]">{value}</p>
    <p className="text-[10px] font-semibold text-[#607086]">{sub}</p>
  </button>
);
