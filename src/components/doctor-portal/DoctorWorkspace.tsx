import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, CalendarDays, Clock3, CalendarClock, UserRound, BadgeCheck, Building2,
  Users, MessagesSquare, Bell, ArrowLeftRight, FileText, FolderLock, ShieldCheck, KeyRound,
  ScrollText, BarChart3, CircleHelp, LifeBuoy, LogOut, Activity, ChevronDown, Search,
  Stethoscope, ClipboardList, FlaskConical, ScanLine, IndianRupee, Globe2, Shield, Lock
} from 'lucide-react';
import { useDoctorPortal, WorkspaceView } from './doctorPortalData';
import { useClinicalWorkspace } from './doctorClinicalData';
import { DoctorSidebar } from './layout/DoctorSidebar';
import { PatientContextBar } from './layout/PatientContextBar';
import { DoctorDashboard } from './DoctorDashboard';
import { DoctorAppointments } from './DoctorAppointments';
import { DoctorAvailability } from './DoctorAvailability';
import { DoctorProfileView } from './DoctorProfile';
import { DoctorCredentials } from './DoctorCredentials';
import { DoctorAffiliations } from './DoctorAffiliations';
import { DoctorSecurity } from './DoctorSecurity';
import { DoctorCommunication } from './DoctorCommunication';
import { DoctorHelp } from './DoctorHelp';
import { DoctorPatients } from './DoctorPatients';
import { DoctorConsultations } from './DoctorConsultations';
import { DoctorPrescriptions } from './DoctorPrescriptions';
import { DoctorLabs } from './DoctorLabs';
import { DoctorImaging } from './DoctorImaging';
import { DoctorBilling } from './DoctorBilling';
import { DoctorAIAssistant } from './DoctorAIAssistant';
import { PermissionGate, AccessDenied } from '../portal/PermissionGate';

interface DoctorWorkspaceProps {
  onBackToGlobalHealth: () => void;
  onLogout: () => void;
}

interface NavItem {
  view: WorkspaceView;
  label: string;
  icon: React.ReactNode;
  group: string;
  clinicalOnly?: boolean;
}

const NAV: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, group: 'Main' },
  { view: 'patients', label: 'My Patients', icon: <Users className="h-4 w-4" />, group: 'Main' },
  { view: 'appointments', label: 'Appointments', icon: <CalendarClock className="h-4 w-4" />, group: 'Main' },
  { view: 'consultations', label: 'Consultations', icon: <Stethoscope className="h-4 w-4" />, group: 'Main' },
  { view: 'prescriptions', label: 'Prescriptions', icon: <ClipboardList className="h-4 w-4" />, group: 'Main' },
  { view: 'labs', label: 'Lab & Diagnostics', icon: <FlaskConical className="h-4 w-4" />, group: 'Main' },
  { view: 'imaging', label: 'Imaging', icon: <ScanLine className="h-4 w-4" />, group: 'Main' },
  { view: 'referrals', label: 'Referrals', icon: <ArrowLeftRight className="h-4 w-4" />, group: 'Main' },
  { view: 'messages', label: 'Messages', icon: <MessagesSquare className="h-4 w-4" />, group: 'Main' },
  { view: 'calendar', label: 'Schedule', icon: <CalendarDays className="h-4 w-4" />, group: 'Professional' },
  { view: 'availability', label: 'Availability', icon: <Clock3 className="h-4 w-4" />, group: 'Professional' },
  { view: 'insights', label: 'Clinical Analytics', icon: <BarChart3 className="h-4 w-4" />, group: 'Professional' },
  { view: 'billing', label: 'Billing', icon: <IndianRupee className="h-4 w-4" />, group: 'Professional' },
  { view: 'documents', label: 'Documents', icon: <FolderLock className="h-4 w-4" />, group: 'Professional' },
  { view: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" />, group: 'Professional' },
  { view: 'profile', label: 'Doctor Profile', icon: <UserRound className="h-4 w-4" />, group: 'Account' },
  { view: 'credentials', label: 'Credentials', icon: <BadgeCheck className="h-4 w-4" />, group: 'Account' },
  { view: 'affiliations', label: 'Practice Locations', icon: <Building2 className="h-4 w-4" />, group: 'Account' },
  { view: 'security', label: 'Security', icon: <ShieldCheck className="h-4 w-4" />, group: 'Account' },
  { view: 'sessions', label: 'Sessions', icon: <KeyRound className="h-4 w-4" />, group: 'Account' },
  { view: 'delegated', label: 'Delegated Access', icon: <Users className="h-4 w-4" />, group: 'Account' },
  { view: 'audit', label: 'Audit Log', icon: <ScrollText className="h-4 w-4" />, group: 'Account' },
  { view: 'help', label: 'Help Center', icon: <CircleHelp className="h-4 w-4" />, group: 'Account' },
  { view: 'support', label: 'Contact Support', icon: <LifeBuoy className="h-4 w-4" />, group: 'Account' },
];

/** Compact mobile bottom navigation — only the most important areas. */
const MOBILE_NAV: WorkspaceView[] = ['dashboard', 'patients', 'appointments', 'messages', 'notifications'];

export const DoctorWorkspace: React.FC<DoctorWorkspaceProps> = ({ onBackToGlobalHealth, onLogout }) => {
  const { doctor, notifications, messages } = useDoctorPortal();
  const { selectedPatientId, selectPatient, patients } = useClinicalWorkspace();
  const [view, setView] = useState<WorkspaceView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const organizationLabel = doctor.organization || 'Organization context unavailable';
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Browser time zone';
  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = messages.filter((m) => !m.read).length;
  const pendingLabsCount = patients.reduce(
    (acc, p) => acc + p.labs.filter((l) => l.status === 'available' || l.status === 'collected').length,
    0
  );

  const activePatient = selectedPatientId ? patients.find((p) => p.id === selectedPatientId) : null;

  // Global command shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const go = (v: WorkspaceView) => {
    setView(v);
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
  };

  const activeLabel = NAV.find((n) => n.view === view)?.label || 'Dashboard';

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[#E3E8EF] bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={onBackToGlobalHealth} className="flex cursor-pointer items-center gap-2 text-left">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#0B1F3A] text-white">
              <Activity className="h-4 w-4" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-extrabold leading-tight tracking-tight text-[#162235]">GlobalHealth</span>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-[#1769E0]">Doctor Workspace</span>
            </span>
          </button>

          <span className="mx-1 hidden h-5 w-px bg-slate-200 md:block" aria-hidden="true" />
          <h1 className="hidden text-sm font-bold text-[#607086] md:block">
            <span className="text-[#8A97A8]">Doctor Portal / </span>{activeLabel}
          </h1>

          {/* Only expose browser-derived context and the server session state; do not claim an unverified integration or transport badge. */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-[#607086] ml-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200/80 px-2 py-1">
              <Clock3 className="h-3.5 w-3.5 text-slate-400" />
              <span>{browserTimeZone}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200/80 px-2 py-1 text-slate-600">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Server session active</span>
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-medical-200 hover:text-medical-800"
              aria-label="Search your portal"
              title="Search (Press Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search portal…</span>
              <kbd className="hidden sm:inline-block rounded bg-slate-100 px-1 py-0.2 text-[9px] font-mono text-slate-500 border border-slate-200">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => go('notifications')}
              className="relative cursor-pointer rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-medical-200 hover:text-medical-800"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-medical-600 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E3E8EF] bg-white px-2 py-1.5 text-left transition hover:bg-slate-50"
                aria-expanded={profileOpen}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0B1F3A] text-[10px] font-bold text-white">
                  {doctor.displayName.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                </span>
                <span className="hidden sm:block">
                  <span className="block text-[11px] font-extrabold leading-tight text-[#162235]">{doctor.displayName}</span>
                  <span className="block text-[9px] font-bold text-teal-600">{doctor.verificationStatus === 'verified' ? 'Server-verified doctor' : 'Verification pending'}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#8A97A8]" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-2xl border border-[#E3E8EF] bg-white p-2 shadow-lift">
                  <div className="border-b border-[#E3E8EF] px-2 pb-2">
                    <p className="text-sm font-extrabold text-[#162235]">{doctor.displayName}</p>
                    <p className="text-[11px] text-[#607086]">{doctor.professionalTitle} · {doctor.specialty}</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                      <BadgeCheck className="h-3 w-3" /> {doctor.verificationStatus === 'verified' ? 'Server verification confirmed' : 'Verification pending'}
                    </p>
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    <button type="button" onClick={() => { go('profile'); setProfileOpen(false); }} className="w-full rounded-lg px-2 py-2 text-left text-xs font-bold text-[#162235] hover:bg-slate-50">View Profile</button>
                    <button type="button" onClick={() => { go('availability'); setProfileOpen(false); }} className="w-full rounded-lg px-2 py-2 text-left text-xs font-bold text-[#162235] hover:bg-slate-50">Availability</button>
                    <button type="button" onClick={() => { go('security'); setProfileOpen(false); }} className="w-full rounded-lg px-2 py-2 text-left text-xs font-bold text-[#162235] hover:bg-slate-50">Settings & Security</button>
                    <button type="button" onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer">
                      <LogOut className="h-3.5 w-3.5" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Organization context comes from the authenticated server response. There is no client-side facility switcher. */}
        <div className="border-t border-[#E3E8EF] px-4 py-1.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-400" /> Organization: {organizationLabel}
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Browser time zone: <span className="font-semibold text-slate-700">{browserTimeZone}</span>
          </span>
        </div>
      </header>

      {/* Persistent Patient Context Bar whenever a patient chart is active */}
      {activePatient && (
        <PatientContextBar
          patient={{
            id: activePatient.id,
            identifier: activePatient.identifier,
            name: activePatient.name,
            age: activePatient.age,
            gender: activePatient.sex,
            bloodGroup: activePatient.bloodGroup,
            consentStatus: activePatient.consentStatus,
            consentedScopes: activePatient.consentedScopes,
            accessExpiresAt: activePatient.accessExpiresAt || undefined,
            isEmergencyAccess: activePatient.accessStatus === 'emergency',
            facilityName: organizationLabel
          }}
          onRequestScopeExpansion={() => go('patients')}
          onViewAccessAudit={() => go('audit')}
          onCloseChart={() => selectPatient(null)}
        />
      )}

      {/* Global portal search (authorized resources only) */}
      {searchOpen && <PortalSearch onNavigate={go} onClose={() => setSearchOpen(false)} />}

      <div className="flex flex-1">
        {/* Modern Doctor Sidebar */}
        <DoctorSidebar
          currentView={view}
          onNavigate={go}
          onBackToGlobalHealth={onBackToGlobalHealth}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          unreadNotifications={unreadCount}
          unreadMessages={unreadMessagesCount}
          pendingReviewsCount={pendingLabsCount}
        />

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <PermissionGate permission="doctor.dashboard.view" fallback={<AccessDenied title="Doctor Workspace restricted" message="Your current role does not permit access to the Doctor Workspace. Contact your organization administrator." />}>
              <DoctorProfileBanner />
              {view === 'dashboard' && <DoctorDashboard onNavigate={go} />}
              {view === 'patients' && <PermissionGate permission="doctor.patient.read"><DoctorPatients onNavigate={go} /></PermissionGate>}
              {view === 'consultations' && <PermissionGate permission="doctor.consultation.create"><DoctorConsultations onNavigate={go} /></PermissionGate>}
              {view === 'prescriptions' && <PermissionGate permission="doctor.prescription.create"><DoctorPrescriptions /></PermissionGate>}
              {view === 'labs' && <PermissionGate permission="doctor.lab.order"><DoctorLabs /></PermissionGate>}
              {view === 'imaging' && <PermissionGate permission="doctor.imaging.order"><DoctorImaging /></PermissionGate>}
              {view === 'billing' && <PermissionGate permission="doctor.billing.read"><DoctorBilling /></PermissionGate>}
              {view === 'appointments' && <PermissionGate permission="doctor.appointment.manage"><DoctorAppointments /></PermissionGate>}
              {view === 'calendar' && <PermissionGate permission="doctor.schedule.manage"><DoctorAppointments calendarMode /></PermissionGate>}
              {view === 'availability' && <PermissionGate permission="doctor.schedule.manage"><DoctorAvailability /></PermissionGate>}
              {view === 'profile' && <PermissionGate permission="doctor.profile.manage"><DoctorProfileView /></PermissionGate>}
              {view === 'credentials' && <PermissionGate permission="doctor.profile.manage"><DoctorCredentials /></PermissionGate>}
              {view === 'affiliations' && <PermissionGate permission="doctor.profile.manage"><DoctorAffiliations /></PermissionGate>}
              {view === 'referrals' && <PermissionGate permission="doctor.referral.create"><DoctorCommunication section="referrals" /></PermissionGate>}
              {view === 'documents' && <PermissionGate permission="doctor.document.read"><DoctorCommunication section="documents" /></PermissionGate>}
              {view === 'messages' && <PermissionGate permission="doctor.messaging.send"><DoctorCommunication section="messages" /></PermissionGate>}
              {view === 'notifications' && <PermissionGate permission="doctor.notifications.read"><DoctorCommunication section="notifications" /></PermissionGate>}
              {view === 'insights' && <PermissionGate permission="doctor.analytics.view"><DoctorCommunication section="insights" /></PermissionGate>}
              {view === 'security' && <PermissionGate permission="doctor.security.manage"><DoctorSecurity section="security" /></PermissionGate>}
              {view === 'sessions' && <PermissionGate permission="doctor.security.manage"><DoctorSecurity section="sessions" /></PermissionGate>}
              {view === 'delegated' && <PermissionGate permission="doctor.security.manage"><DoctorSecurity section="delegated" /></PermissionGate>}
              {view === 'audit' && <PermissionGate permission="doctor.audit.read"><DoctorSecurity section="audit" /></PermissionGate>}
              {view === 'help' && <DoctorHelp section="help" />}
              {view === 'support' && <DoctorHelp section="support" />}
            </PermissionGate>
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — compact, most important areas only */}
      <nav className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden" aria-label="Mobile portal navigation">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((v) => {
            const item = NAV.find((n) => n.view === v)!;
            return (
              <button key={v} type="button" onClick={() => go(v)}
                className={`flex cursor-pointer flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${
                  view === v ? 'text-medical-700' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {item.icon} {v === 'notifications' && unreadCount > 0 ? `Notifications (${unreadCount})` : item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating clinical AI assistant — never interrupts a consultation. */}
      <DoctorAIAssistant />
    </div>
  );
};

/** Compact header strip: greeting + verification/profile state. */
const DoctorProfileBanner: React.FC = () => {
  const { doctor } = useDoctorPortal();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{greeting}, {doctor.displayName}</h2>
        <p className="text-xs text-slate-500">{doctor.professionalTitle} · {doctor.specialty}{doctor.organization ? ` · ${doctor.organization}` : ''}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
          doctor.verificationStatus === 'verified'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          {doctor.verificationStatus === 'verified' ? <BadgeCheck className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
          {doctor.verificationStatus === 'verified' ? 'Verified Professional' : 'Verification in progress'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
          <FileText className="h-3.5 w-3.5 text-medical-600" /> Profile {doctor.profileCompleteness}%
        </span>
      </div>
    </div>
  );
};

/** Authorized-resource search (never returns unauthorized records). */
const PortalSearch: React.FC<{ onNavigate: (v: WorkspaceView) => void; onClose: () => void }> = ({ onNavigate, onClose }) => {
  const { appointments, referrals, documents } = useDoctorPortal();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const results = query
    ? {
        appointments: appointments.filter((a) => a.patientIdentifier.toLowerCase().includes(query) || a.date.includes(query)).slice(0, 4),
        referrals: referrals.filter((r) => r.patientIdentifier.toLowerCase().includes(query) || r.specialty.toLowerCase().includes(query)).slice(0, 3),
        documents: documents.filter((d) => d.name.toLowerCase().includes(query)).slice(0, 3),
      }
    : { appointments: [], referrals: [], documents: [] };
  return (
    <div className="fixed inset-0 z-40 bg-slate-950/30 p-4 pt-16" onClick={onClose} role="dialog" aria-modal="true" aria-label="Portal search">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search appointments, patients, documents… (authorized records only)"
          className="w-full rounded-xl border border-medical-200 bg-medical-50/40 px-3 py-2.5 text-sm focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-500/20"
          aria-label="Search your portal"
        />
        {query && (
          <div className="mt-3 space-y-2 text-xs">
            {results.appointments.map((a) => (
              <button key={a.id} type="button" onClick={() => onNavigate('appointments')}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-medical-200">
                <span className="font-bold text-slate-700">{a.patientIdentifier} — {a.date} {a.startTime}</span>
                <span className="text-[10px] font-semibold text-slate-400">{a.type.replace('_', ' ')}</span>
              </button>
            ))}
            {results.referrals.map((r) => (
              <button key={r.id} type="button" onClick={() => onNavigate('referrals')}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-medical-200">
                <span className="font-bold text-slate-700">Referral · {r.patientIdentifier} → {r.specialty}</span>
                <span className="text-[10px] font-semibold capitalize text-slate-400">{r.status}</span>
              </button>
            ))}
            {results.documents.map((d) => (
              <button key={d.id} type="button" onClick={() => onNavigate('documents')}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-medical-200">
                <span className="font-bold text-slate-700">{d.name}</span>
                <span className="text-[10px] font-semibold text-slate-400">{d.sizeKB} KB</span>
              </button>
            ))}
            {!results.appointments.length && !results.referrals.length && !results.documents.length && (
              <p className="rounded-xl bg-slate-50 p-3 text-center text-[11px] text-slate-400">No authorized records match “{q}”.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


