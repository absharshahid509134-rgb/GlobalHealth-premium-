import React, { useCallback, useEffect, useState } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  Lock,
  Loader2,
  LogIn,
  LogOut,
  Users,
  FilePlus2,
  FileEdit,
  FileMinus2,
  KeyRound,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Bell,
  Siren,
  History,
  Paperclip,
  Ban,
  MessageCircleQuestion,
  ShieldQuestion,
  Inbox,
  CalendarClock,
  FileText,
  Layers
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const DOC_TOKEN_KEY = 'globalhealth_doctor_token';

interface DoctorInfo {
  doctorId: string;
  fullName: string;
  organization: string;
  specialty: string;
  registrationNo: string;
  verificationStatus: string;
}
interface PatientRow {
  patientUserId: string;
  patientName: string;
  accessStatus: string;
  scope: string[];
  pendingConsentCount: number;
  recordCategories: string[];
  grantedAt: string;
  expiresAt: string | null;
  lastViewedAt: string | null;
  canView: boolean;
  permissions: Record<string, any>;
}
interface EhrRecord {
  recordId: string;
  category: string;
  title: string;
  currentVersion: number;
  createdAt: string;
  latest: string;
}
interface EhrPatient {
  patient: { name: string; overview?: any; recordStatus?: any };
  viewAccess: string;
  modificationAccess: string;
  emergency: boolean | null;
  emergencyExpiresAt: string | null;
  grant: { scope: string[]; grantedAt: string; expiresAt: string | null; status: string; permissions: Record<string, any> };
  records: EhrRecord[];
}
interface DocRequest {
  requestId: string;
  patientUserId: string;
  patientName?: string;
  kind: string;
  title: string;
  reason: string;
  recordCategory?: string;
  recordId?: string;
  deletionType?: string;
  priority: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  reviewedAt?: string;
  executedAt?: string;
  versionNumber?: number;
  baseVersionNumber?: number;
  scope?: string[];
  accessDurationDays?: number;
  clarifications?: { id: string; from: string; message: string; at: string }[];
}
interface DocNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  requestId?: string;
  patientName?: string;
  read: boolean;
  at: string;
}
interface VersionRow {
  versionId: string;
  versionNumber: number;
  data: string;
  createdBy: string;
  sourceRequestId: string | null;
  createdAt: string;
}

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Awaiting patient' },
  approved: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Approved' },
  executed: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
  rejected: { cls: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rejected' },
  expired: { cls: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Expired' },
  cancelled: { cls: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Cancelled' },
  failed: { cls: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Failed' },
  conflict: { cls: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Needs re-review' }
};

const KIND_LABEL: Record<string, string> = {
  add: 'Add to EHR',
  edit: 'Edit record',
  remove: 'Remove record',
  access_grant: 'Request access'
};

const fmt = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

export const DoctorConsentConsole: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  // ONE GLOBAL SESSION RULE: the Verified Doctor console is reachable from the
  // User Portal, so it never asks a guest for doctor credentials. It requires
  // the same GlobalHealth account first, then verifies the doctor role for the
  // permission check. Logging out of GlobalHealth also destroys this token.
  const { isAuthenticated, requireAuth, user: globalUser } = useAuth();
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [notifications, setNotifications] = useState<DocNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ehr, setEhr] = useState<(EhrPatient & { patientUserId: string }) | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [composer, setComposer] = useState<{ patientUserId: string; kind: string; record?: EhrRecord } | null>(null);
  const [versions, setVersions] = useState<{ record: EhrRecord; list: VersionRow[] } | null>(null);
  const [requestDetail, setRequestDetail] = useState<DocRequest | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const token = () => localStorage.getItem(DOC_TOKEN_KEY) || '';

  const authHeaders = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }),
    []
  );

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/doctor/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.error || 'Sign-in failed.');
      localStorage.setItem(DOC_TOKEN_KEY, res.token);
      setDoctor(res.doctor);
    } catch (err: any) {
      setError(err.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(DOC_TOKEN_KEY);
    setDoctor(null);
    setPatients([]);
    setRequests([]);
    setEhr(null);
    setNotifications([]);
  };

  const loadData = useCallback(async () => {
    try {
      const [p, r, n] = await Promise.all([
        fetch('/api/doctor/patients', { headers: authHeaders() }).then((x) => x.json()),
        fetch('/api/doctor/consent-requests', { headers: authHeaders() }).then((x) => x.json()),
        fetch('/api/doctor/notifications', { headers: authHeaders() }).then((x) => x.json())
      ]);
      // Session invalid (suspended/verification removed) → sign the doctor out.
      if ((p && p.success === false) || (r && r.success === false) || (n && n.success === false)) {
        logout();
        return;
      }
      setPatients(p.patients || []);
      setRequests(r.requests || []);
      setNotifications(n.notifications || []);
    } catch {
      logout();
    }
  }, [authHeaders]);

  useEffect(() => {
    if (doctor) loadData();
    // Poll for patient decisions while the console is open.
    const iv = doctor ? setInterval(loadData, 15000) : null;
    return () => { if (iv) clearInterval(iv); };
  }, [doctor, loadData]);

  const markNotifsRead = async () => {
    await fetch('/api/doctor/notifications/read', { method: 'POST', headers: authHeaders() }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const viewEhr = async (patientUserId: string) => {
    setEhr(null);
    setAccessDenied(false);
    try {
      const res = await fetch(`/api/doctor/patients/${patientUserId}/ehr`, { headers: authHeaders() }).then((x) => x.json());
      if (res.success) setEhr({ ...res, patientUserId });
      else {
        setAccessDenied(true);
        setError(res.error || 'Access restricted.');
      }
    } catch {
      setAccessDenied(true);
      setError('Access restricted.');
    }
  };

  const openVersions = async (patientUserId: string, record: EhrRecord) => {
    try {
      const res = await fetch(`/api/doctor/patients/${patientUserId}/records/${record.recordId}/versions`, {
        headers: authHeaders()
      }).then((x) => x.json());
      if (res.success) setVersions({ record, list: res.record.versions });
      else setError(res.error || 'Could not load version history.');
    } catch {
      setError('Could not load version history.');
    }
  };

  const cancelRequest = async (r: DocRequest) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/doctor/consent-requests/${r.requestId}/cancel`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({})
      }).then((x) => x.json());
      if (res.success) {
        setRequestDetail(null);
        setNotice('The request was cancelled. The patient has been informed.');
      } else setError(res.error || 'Could not cancel the request.');
      await loadData();
    } finally {
      setBusy(false);
    }
  };

  const replyClarification = async (r: DocRequest, message: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/doctor/consent-requests/${r.requestId}/reply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message })
      }).then((x) => x.json());
      if (res.success) {
        setRequestDetail(res.request);
        setNotice('Your answer was sent to the patient.');
      } else setError(res.error || 'Could not send the answer.');
      await loadData();
    } finally {
      setBusy(false);
    }
  };

  // ---------------- GLOBAL HEALTH ACCOUNT GATE ----------------
  // The User Portal uses ONE GlobalHealth account. This is a role-based
  // workspace, so it still requires the GlobalHealth user session before any
  // doctor credential verification can be shown.
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Verified Doctor Portal</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            This is a secure role-based workspace. Sign in with your GlobalHealth account first; after
            that we verify your verified-doctor credentials and load authorized patient records.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => requireAuth({ feature: 'open the Verified Doctor consent console' }, 'login')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <LogIn className="h-4 w-4" /> Log In / Sign Up
            </button>
            <button onClick={onExit} className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300">
              ← Back to GlobalHealth
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- DOCTOR ROLE CREDENTIAL CHECK ----------------
  if (!doctor) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
              <Stethoscope className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">Verified Doctor Portal</h1>
            <p className="mt-1 text-sm text-slate-500">
              GlobalHealth session active as <strong>{globalUser?.fullName || globalUser?.username || 'user'}</strong>. Verify your doctor credentials to continue.
            </p>
          </div>
          {error && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <form onSubmit={login} className="space-y-3">
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Doctor ID / Registration No." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:bg-white" />
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign in
            </button>
          </form>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> Only verified healthcare professionals can request patient data.
          </p>
          <button onClick={onExit} className="mt-4 w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700">← Back to GlobalHealth</button>
        </div>
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read).length;

  // ---------------- CONSOLE ----------------
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-teal-950/20 bg-teal-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Stethoscope className="h-5 w-5" /></div>
            <div>
              <div className="flex items-center gap-2 font-bold">
                {doctor.fullName}
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/30 px-2 py-0.5 text-[10px] font-bold ring-1 ring-teal-300/40">
                  <ShieldCheck className="h-3 w-3" /> Verified Healthcare Professional
                </span>
              </div>
              <div className="text-xs text-teal-100/80">{doctor.specialty} · {doctor.organization} · {doctor.registrationNo}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markNotifsRead(); }}
                className="relative rounded-xl border border-white/20 p-2 hover:bg-white/10"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold">{unread}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-extrabold">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {notifications.length === 0 && <p className="text-xs text-slate-400">No notifications yet.</p>}
                    {notifications.map((n) => (
                      <div key={n.id} className={`rounded-xl border p-2.5 text-xs ${n.read ? 'border-slate-100 bg-slate-50/50' : 'border-teal-200 bg-teal-50/50'}`}>
                        <div className="font-bold">{n.title}</div>
                        <p className="mt-0.5 text-slate-500">{n.body}</p>
                        <div className="mt-1 text-[10px] text-slate-400">{fmt(n.at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={onExit} className="hidden rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10 sm:block">GlobalHealth</button>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-4 flex items-start justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}
        {notice && (
          <div className="mb-4 flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} className="text-emerald-400 hover:text-emerald-600">✕</button>
          </div>
        )}

        {/* READ-ONLY DEFAULT — the two permissions, kept visually distinct (spec 4) */}
        <div className="mb-6 grid gap-3 lg:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 lg:col-span-1">
            <Eye className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <div className="text-sm font-extrabold text-emerald-800">View Access: Active</div>
              <div className="text-xs text-emerald-700">You may review permitted records for authorized patients only.</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 lg:col-span-2">
            <Lock className="h-6 w-6 shrink-0 text-amber-600" />
            <div className="flex-1">
              <div className="text-sm font-extrabold text-amber-800">Modification Access: Patient Approval Required</div>
              <div className="mt-1.5 grid gap-1 text-[11px] font-semibold text-amber-700 sm:grid-cols-2">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> View Patient Record — Allowed</span>
                <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Add New Record — Approval required</span>
                <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Edit Existing Record — Approval required</span>
                <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Delete Existing Record — Approval required</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency (break-glass) access — separate, view-only, audited */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Siren className="h-5 w-5 text-rose-600" />
            <div>
              <div className="text-sm font-bold text-slate-800">Emergency (break-glass) access</div>
              <div className="text-xs text-slate-500">Time-limited, view-only access for genuine emergencies. Heavily audited and the patient is alerted immediately.</div>
            </div>
          </div>
          <button
            onClick={() => setEmergencyOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
          >
            <ShieldQuestion className="h-3.5 w-3.5" /> Activate emergency access
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* My Patients */}
          <section className="lg:col-span-1">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><Users className="h-4 w-4 text-teal-700" /> My Patients</h2>
            {patients.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                No authorized patients yet. Patients appear here after they approve your access request.
              </div>
            )}
            <div className="space-y-2">
              {patients.map((p) => (
                <div key={p.patientUserId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800">{p.patientName}</div>
                      <div className="text-[10px] text-slate-400">ID: {p.patientUserId}</div>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        p.accessStatus === 'emergency'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : p.accessStatus === 'expiring'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {p.accessStatus === 'emergency' ? 'Emergency (view-only)' : p.accessStatus === 'expiring' ? 'Access expiring' : 'Access active'}
                    </span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5"><Eye className="h-3 w-3 text-emerald-600" /> View: {p.canView ? 'Permitted' : 'Not permitted'}</div>
                    <div className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-amber-600" /> Changes: Patient approval required</div>
                    <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Expires: {fmt(p.expiresAt)}</div>
                    {p.lastViewedAt && <div className="flex items-center gap-1.5"><History className="h-3 w-3" /> Last viewed: {fmt(p.lastViewedAt)}</div>}
                    {p.pendingConsentCount > 0 && (
                      <div className="flex items-center gap-1.5 font-bold text-amber-700"><Clock className="h-3 w-3" /> {p.pendingConsentCount} request(s) awaiting the patient</div>
                    )}
                    <div className="pt-1 text-slate-400">Categories: {p.recordCategories.join(', ') || 'none yet'}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button onClick={() => viewEhr(p.patientUserId)} className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-teal-800">
                      <Eye className="h-3 w-3" /> View Authorized Record
                    </button>
                    <button
                      disabled={p.accessStatus === 'emergency'}
                      onClick={() => setComposer({ patientUserId: p.patientUserId, kind: 'add' })}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                    >
                      <FilePlus2 className="h-3 w-3" /> Request Add
                    </button>
                    <button
                      disabled={p.accessStatus === 'emergency'}
                      onClick={() => setComposer({ patientUserId: p.patientUserId, kind: 'remove' })}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
                    >
                      <FileMinus2 className="h-3 w-3" /> Request Removal
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <NewPatientRequest onSubmitted={loadData} headers={authHeaders} onError={(m) => setError(m)} />
          </section>

          {/* EHR view + requests */}
          <section className="space-y-6 lg:col-span-2">
            {accessDenied && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                <ShieldQuestion className="mx-auto h-8 w-8 text-rose-500" />
                <h3 className="mt-2 text-sm font-extrabold text-rose-800">Access Restricted</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-rose-700">
                  You do not currently have permission to access this patient’s protected health information.
                  This attempt has been recorded for security review.
                </p>
                <button onClick={() => setAccessDenied(false)} className="mt-3 rounded-xl bg-white px-4 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                  Back to my patients
                </button>
              </div>
            )}

            {ehr && !accessDenied && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {ehr.emergency && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    <Siren className="h-4 w-4" />
                    EMERGENCY VIEW ACCESS — view-only, expires {fmt(ehr.emergencyExpiresAt)}. No modification requests are possible under emergency access.
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-extrabold text-slate-900">Patient Record — {ehr.patient.name}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <Eye className="h-3 w-3" /> View Access: {ehr.viewAccess}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                      <Lock className="h-3 w-3" /> Modification: {ehr.modificationAccess}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Access {ehr.grant.status} · granted {fmt(ehr.grant.grantedAt)} · expires {fmt(ehr.grant.expiresAt)} · scope: {ehr.grant.scope.join(', ')}
                </p>

                {ehr.records.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No active records visible under your access scope. You may request to add information — the patient must approve it first.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {ehr.records.map((rec) => (
                      <div key={rec.recordId} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-slate-800">{rec.title}</div>
                            <div className="text-[11px] text-slate-500">{rec.category} · Version {rec.currentVersion}</div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => openVersions(ehr.patientUserId, rec)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50">
                              <Layers className="h-3 w-3" /> Versions
                            </button>
                            <button onClick={() => setComposer({ patientUserId: ehr.patientUserId, kind: 'edit', record: rec })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
                              <FileEdit className="h-3 w-3" /> Request Edit
                            </button>
                            <button onClick={() => setComposer({ patientUserId: ehr.patientUserId, kind: 'remove', record: rec })} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100">
                              <FileMinus2 className="h-3 w-3" /> Request Removal
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{rec.latest}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My requests */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 font-extrabold text-slate-900">
                <Inbox className="h-4 w-4 text-teal-700" /> My consent requests
                <span className="text-[10px] font-semibold text-slate-400">— view request status</span>
              </h3>
              {requests.length === 0 && <p className="text-sm text-slate-500">You haven’t submitted any requests yet.</p>}
              <div className="space-y-2">
                {requests.map((r) => {
                  const meta = STATUS_PILL[r.status] || STATUS_PILL.pending;
                  const openQ = (r.clarifications || []).filter((c) => c.from === 'PATIENT').length;
                  return (
                    <button
                      key={r.requestId}
                      onClick={() => setRequestDetail(r)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-left transition hover:border-teal-200 hover:bg-teal-50/40"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800">{r.title}</div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {r.requestId} · {KIND_LABEL[r.kind] || r.kind}
                          {r.patientName ? ` · ${r.patientName}` : ''}
                        </div>
                        {r.status === 'pending' && <div className="text-[10px] text-amber-600">Expires {fmt(r.expiresAt)}{openQ > 0 ? ` · ${openQ} patient question(s)` : ''}</div>}
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                        {r.status === 'pending' ? <Clock className="h-3 w-3" /> : r.status === 'rejected' || r.status === 'failed' ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* MODALS */}
      {composer && (
        <ConsentComposer
          doctor={doctor}
          patientName={patients.find((p) => p.patientUserId === composer.patientUserId)?.patientName}
          initial={composer}
          headers={authHeaders}
          onClose={() => setComposer(null)}
          onSubmitted={() => { setComposer(null); setNotice('Your consent request was sent. The patient must approve it before any change is made.'); loadData(); }}
        />
      )}
      {versions && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" onClick={() => setVersions(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Version history — {versions.record.title}</h3>
                <p className="text-[11px] text-slate-400">{versions.record.category} · every version is preserved and linked to its approval</p>
              </div>
              <button onClick={() => setVersions(null)} aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <ol className="relative space-y-2 border-l-2 border-teal-100 pl-4">
              {[...versions.list].reverse().map((v) => (
                <li key={v.versionId} className="relative rounded-xl border border-slate-200 p-3">
                  <span className="absolute -left-[21px] top-3 h-3 w-3 rounded-full bg-teal-500 ring-4 ring-white" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-teal-700">Version {v.versionNumber}{v.versionNumber === versions.list.length ? ' (current)' : ''}</span>
                    <span className="text-[10px] text-slate-400">{fmt(v.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-xs text-slate-600">{v.data}</p>
                  <div className="mt-1 text-[10px] text-slate-400">
                    By {v.createdBy}{v.sourceRequestId ? ` · Request ${v.sourceRequestId}` : ' · original record'}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      {requestDetail && (
        <RequestDetailModal
          req={requestDetail}
          busy={busy}
          onClose={() => setRequestDetail(null)}
          onCancel={cancelRequest}
          onReply={replyClarification}
        />
      )}
      {emergencyOpen && (
        <EmergencyAccessModal
          onClose={() => setEmergencyOpen(false)}
          headers={authHeaders}
          onDone={() => { setEmergencyOpen(false); setNotice('Emergency view access is now active (2 hours, view-only). Every view is recorded.'); loadData(); }}
        />
      )}
    </div>
  );
};

// ------------------------------------------------------------ subparts ----
const SCOPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'clinical', label: 'Clinical records' },
  { id: 'medications', label: 'Medications' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'labs', label: 'Lab reports' },
  { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'imaging', label: 'Imaging' },
  { id: 'documents', label: 'Documents' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'emergency', label: 'Emergency info' }
];
export const SCOPE_LABEL = (s: string) => SCOPE_OPTIONS.find((o) => o.id === s)?.label || s;

const NewPatientRequest: React.FC<{ headers: () => Record<string, string>; onSubmitted: () => void; onError: (m: string) => void }> = ({ headers, onSubmitted, onError }) => {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('Establish a doctor-patient access relationship to review your health information during care.');
  const [scope, setScope] = useState<string[]>(['profile', 'clinical', 'medications', 'allergies', 'labs', 'prescriptions', 'documents']);
  const [duration, setDuration] = useState<'30' | '90' | '365'>('365');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const toggleScope = (id: string) => setScope((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  const submit = async () => {
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/doctor/consent-requests', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        patientEmail: email,
        kind: 'access_grant',
        title: 'Request access to your health record',
        summary: `Requested view access: ${scope.map(SCOPE_LABEL).join(', ')} for ${duration} days.`,
        reason,
        requestedScope: scope,
        accessDurationDays: Number(duration)
      })
    }).then((r) => r.json());
    setBusy(false);
    if (res.success) { setMsg('Access request sent. The patient must approve it.'); onSubmitted(); }
    else { setMsg(res.error || 'Could not send request.'); if (res.code !== 'DUPLICATE_REQUEST') onError(res.error || ''); }
  };
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><KeyRound className="h-4 w-4 text-teal-700" /> Request access to a patient</div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Patient’s GlobalHealth email" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
      <div className="mt-3">
        <div className="mb-1.5 text-[11px] font-bold text-slate-500">Requested information</div>
        <div className="grid grid-cols-2 gap-1.5">
          {SCOPE_OPTIONS.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
              <input type="checkbox" checked={scope.includes(o.id)} onChange={() => toggleScope(o.id)} className="accent-teal-600" />
              {o.label}
            </label>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-500">Requested duration</span>
          <select value={duration} onChange={(e) => setDuration(e.target.value as any)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-teal-500">
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-500">Reason</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-teal-500" />
        </label>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">The patient decides. Viewing access never includes the ability to change records.</p>
      <button
        onClick={submit}
        disabled={busy || !email.trim() || scope.length === 0 || reason.trim().length < 10}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Review &amp; send access request
      </button>
      {msg && <p className="mt-2 text-[11px] text-slate-500">{msg}</p>}
    </div>
  );
};

const EmergencyAccessModal: React.FC<{ onClose: () => void; headers: () => Record<string, string>; onDone: () => void }> = ({ onClose, headers, onDone }) => {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true);
    setError('');
    const res = await fetch('/api/doctor/emergency-access', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ patientEmail: email, reason })
    }).then((r) => r.json());
    setBusy(false);
    if (res.success) onDone();
    else setError(res.error || 'Emergency access could not be activated.');
  };
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-rose-700">
          <Siren className="h-6 w-6" />
          <h3 className="text-lg font-extrabold">Emergency (break-glass) access</h3>
        </div>
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          This is a time-limited (2 hour), VIEW-ONLY access for genuine emergencies. It cannot be used to request any changes.
          Activation is recorded immediately in the patient’s security history and they are notified by email.
        </div>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">Patient’s GlobalHealth email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">Clinical reason (required)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Describe the emergency and why record review is needed now." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-400" />
          </label>
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            disabled={busy || !email.trim() || reason.trim().length < 15}
            onClick={submit}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />} Activate (view-only)
          </button>
        </div>
      </div>
    </div>
  );
};

const RequestDetailModal: React.FC<{
  req: DocRequest;
  busy: boolean;
  onClose: () => void;
  onCancel: (r: DocRequest) => void;
  onReply: (r: DocRequest, message: string) => void;
}> = ({ req, busy, onClose, onCancel, onReply }) => {
  const [reply, setReply] = useState('');
  const meta = STATUS_PILL[req.status] || STATUS_PILL.pending;
  const patientQuestions = (req.clarifications || []).filter((c) => c.from === 'PATIENT');
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
            <h3 className="mt-2 text-base font-extrabold text-slate-900">{req.title}</h3>
            <div className="mt-0.5 font-mono text-[11px] text-slate-400">{req.requestId} · {KIND_LABEL[req.kind] || req.kind}{req.patientName ? ` · ${req.patientName}` : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><div className="font-bold text-slate-400">Category</div><div className="text-slate-700">{req.recordCategory || '—'}</div></div>
            <div><div className="font-bold text-slate-400">Priority</div><div className="capitalize text-slate-700">{req.priority}</div></div>
            <div><div className="font-bold text-slate-400">Submitted</div><div className="text-slate-700">{fmt(req.createdAt)}</div></div>
            <div><div className="font-bold text-slate-400">Expires</div><div className="text-slate-700">{fmt(req.expiresAt)}</div></div>
            {req.reviewedAt && <div><div className="font-bold text-slate-400">Reviewed</div><div className="text-slate-700">{fmt(req.reviewedAt)}</div></div>}
            {req.versionNumber && <div><div className="font-bold text-slate-400">Applied as</div><div className="text-slate-700">Version {req.versionNumber}</div></div>}
            {req.deletionType && <div><div className="font-bold text-slate-400">Removal type</div><div className="text-slate-700">{req.deletionType}</div></div>}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-slate-400">Reason</div>
            <p className="text-slate-700">{req.reason}</p>
          </div>
          {req.status === 'conflict' && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
              <strong>Needs re-review.</strong> The patient approved this request, but the record changed
              after you created it. No change was applied. Re-issue the request against the current record.
            </div>
          )}
          {(req.clarifications || []).length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 text-[11px] font-bold uppercase text-slate-400">Questions &amp; answers</div>
              <div className="space-y-2">
                {(req.clarifications || []).map((c) => (
                  <div key={c.id} className={`rounded-lg p-2 text-xs ${c.from === 'PATIENT' ? 'bg-slate-50' : 'bg-teal-50'}`}>
                    <div className="mb-0.5 text-[10px] font-bold text-slate-400">{c.from === 'PATIENT' ? 'Patient' : 'You'} · {fmt(c.at)}</div>
                    <p className="text-slate-700">{c.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {req.status === 'pending' && patientQuestions.length > 0 && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800"><MessageCircleQuestion className="h-4 w-4" /> The patient asked a question</div>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Answer the patient’s question…" className="mt-2 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs outline-none focus:border-teal-500" />
              <button
                disabled={busy || reply.trim().length < 5}
                onClick={() => onReply(req, reply.trim())}
                className="mt-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                Send answer
              </button>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            {req.status === 'pending' && (
              <button
                disabled={busy}
                onClick={() => { if (window.confirm('Cancel this pending request? The patient will be informed. No change will be made.')) onCancel(req); }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                <Ban className="h-4 w-4" /> Cancel request
              </button>
            )}
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConsentComposer: React.FC<{
  doctor: DoctorInfo;
  patientName?: string;
  initial: { patientUserId: string; kind: string; record?: EhrRecord };
  headers: () => Record<string, string>;
  onClose: () => void;
  onSubmitted: () => void;
}> = ({ doctor, patientName, initial, headers, onClose, onSubmitted }) => {
  const [title, setTitle] = useState(initial.record?.title || '');
  const [category, setCategory] = useState(initial.record?.category || 'Clinical Note');
  const [proposed, setProposed] = useState(initial.kind === 'edit' ? initial.record?.latest || '' : '');
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [validity, setValidity] = useState<'1' | '3' | '7'>('7');
  const [deletionType, setDeletionType] = useState<'archive' | 'permanent'>('archive');
  const [attachment, setAttachment] = useState<{ name: string; dataUrl: string } | null>(null);
  const [confirmStage, setConfirmStage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const kindLabel = KIND_LABEL[initial.kind] || initial.kind;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(f.type)) { setError('Attachment type not allowed. Permitted: PDF, PNG, JPEG, WEBP.'); return; }
    if (f.size > 2 * 1024 * 1024) { setError('Attachment too large (maximum 2 MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: f.name, dataUrl: String(reader.result) });
    reader.readAsDataURL(f);
    setError('');
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/doctor/consent-requests', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          patientUserId: initial.patientUserId,
          kind: initial.kind,
          recordId: initial.record?.recordId,
          recordCategory: category,
          title,
          summary: `Requested ${kindLabel.toLowerCase()}: ${title}`,
          reason,
          explanation: explanation || undefined,
          currentValue: initial.record?.latest,
          proposedValue: initial.kind === 'remove' ? undefined : proposed,
          priority,
          validityDays: Number(validity),
          deletionType: initial.kind === 'remove' ? deletionType : undefined,
          attachmentDataUrl: attachment?.dataUrl,
          attachmentName: attachment?.name
        })
      }).then((r) => r.json());
      if (res.success) onSubmitted();
      else if (res.code === 'DUPLICATE_REQUEST') {
        setError(`A similar request for this patient record is already pending (${res.requestId}). Review it in “My consent requests” instead.`);
      } else setError(res.error || 'Could not submit the request.');
    } catch {
      setError('Network error — the request was not submitted.');
    } finally {
      setBusy(false);
      setConfirmStage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {!confirmStage ? (
          <>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-extrabold text-slate-900">Request Patient Approval — {kindLabel}</h3>
            </div>
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 border border-amber-200">
              This change will <strong>not</strong> be applied until the patient reviews and approves it in their GlobalHealth account.
            </p>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 block sm:col-span-1">
                  <span className="mb-1 block text-xs font-bold text-slate-500">Record title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500" />
                </label>
                <label className="col-span-2 block sm:col-span-1">
                  <span className="mb-1 block text-xs font-bold text-slate-500">Category</span>
                  <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500" />
                </label>
              </div>
              {initial.record && (
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                  <div className="mb-1 text-[11px] font-bold uppercase text-rose-600">Current record (unchanged while pending)</div>
                  <p className="whitespace-pre-line text-slate-700">{initial.record.latest}</p>
                </div>
              )}
              {initial.kind !== 'remove' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500">{initial.kind === 'edit' ? 'Proposed (new) value' : 'Information to add'}</span>
                  <textarea value={proposed} onChange={(e) => setProposed(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500" />
                </label>
              )}
              {initial.kind === 'remove' && (
                <div className="space-y-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <strong>Retention notice:</strong> Removing or archiving clinical information may affect the patient’s medical history.
                    Patient authorization and applicable record-retention rules must be followed.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDeletionType('archive')}
                      className={`rounded-xl border p-3 text-left text-xs ${deletionType === 'archive' ? 'border-teal-500 bg-teal-50' : 'border-slate-200'}`}
                    >
                      <div className="font-extrabold">Archive / mark inactive</div>
                      <div className="mt-0.5 text-slate-500">Recommended. Hidden from active records; history preserved.</div>
                    </button>
                    <button
                      onClick={() => setDeletionType('permanent')}
                      className={`rounded-xl border p-3 text-left text-xs ${deletionType === 'permanent' ? 'border-rose-500 bg-rose-50' : 'border-slate-200'}`}
                    >
                      <div className="font-extrabold text-rose-700">Permanent deletion</div>
                      <div className="mt-0.5 text-slate-500">Restricted. Removed from the active EHR; an audit copy is retained.</div>
                    </button>
                  </div>
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">Reason / clinical context (required)</span>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="What will change and why — clearly and completely." className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">Additional explanation to the patient (optional)</span>
                <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} placeholder="Anything the patient should know." className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-teal-500" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500">Priority</span>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-teal-500">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-500"><CalendarClock className="h-3.5 w-3.5" /> Request validity</span>
                  <select value={validity} onChange={(e) => setValidity(e.target.value as any)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-teal-500">
                    <option value="1">24 hours</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                  </select>
                </label>
              </div>
              <div>
                <span className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-500"><Paperclip className="h-3.5 w-3.5" /> Supporting attachment (optional, PDF/PNG/JPEG ≤ 2 MB)</span>
                {attachment ? (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-700">{attachment.name}</span>
                    <button onClick={() => setAttachment(null)} className="text-rose-600 hover:underline">Remove</button>
                  </div>
                ) : (
                  <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={onFile} className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-teal-700 hover:file:bg-teal-100" />
                )}
              </div>
              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                disabled={busy || !title.trim() || reason.trim().length < 10 || (initial.kind !== 'remove' && !proposed.trim())}
                onClick={() => setConfirmStage(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                <FileText className="h-4 w-4" /> Review summary
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-700" />
              <h3 className="text-lg font-extrabold text-slate-900">Confirm your request</h3>
            </div>
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 border border-amber-200">
              Patient approval required: <strong>Yes</strong>. Nothing changes until the patient approves.
            </p>
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <SummaryRow label="Patient" value={patientName || initial.patientUserId} />
              <SummaryRow label="Action" value={kindLabel} />
              <SummaryRow label="Record" value={`${category} — ${title}`} />
              {initial.record && <SummaryRow label="Current value" value={initial.record.latest} />}
              {initial.kind !== 'remove' && <SummaryRow label="Proposed value" value={proposed || '—'} />}
              {initial.kind === 'remove' && <SummaryRow label="Removal type" value={deletionType === 'permanent' ? 'Permanent deletion (audit copy retained)' : 'Archive / mark inactive'} />}
              <SummaryRow label="Reason" value={reason} />
              {explanation && <SummaryRow label="Note to patient" value={explanation} />}
              <SummaryRow label="Requested by" value={`${doctor.fullName} · ${doctor.organization}`} />
              <SummaryRow label="Priority / valid until" value={`${priority} · ${validity} day(s) from now`} />
              {attachment && <SummaryRow label="Attachment" value={attachment.name} />}
            </div>
            {error && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}
            <div className="mt-5 flex gap-2">
              <button disabled={busy} onClick={() => setConfirmStage(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Back</button>
              <button disabled={busy} onClick={submit} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Submit Consent Request
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
    <div className="whitespace-pre-line text-slate-700">{value}</div>
  </div>
);
