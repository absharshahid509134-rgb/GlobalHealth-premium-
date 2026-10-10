import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { DoctorPortalProvider, useDoctorPortal, DoctorProfile, seedDoctor, doctorPortalApi } from './doctorPortalData';
import { ClinicalWorkspaceProvider } from './doctorClinicalData';
import { PortalRoleProvider } from '../portal/PermissionGate';
import { getStoredToken } from '../../services/authClient';
import { getDoctorSessionToken } from '../../services/doctorPortalClient';
import { DoctorAuth } from './DoctorAuth';
import { DoctorOnboarding } from './DoctorOnboarding';
import { DoctorWorkspace } from './DoctorWorkspace';

interface DoctorPortalAppProps {
  onBackToGlobalHealth: () => void;
  /** Clears the central GlobalHealth session when this portal owns it. */
  onGlobalLogout?: () => Promise<void> | void;
}

type Phase = 'restoring' | 'auth' | 'onboarding' | 'application_submitted' | 'workspace';

interface SignupDraft {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const SessionRestore: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4">
    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft" role="status" aria-live="polite">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#0B1F3A] text-white"><Activity className="h-6 w-6" /></span>
      <h1 className="mt-4 text-lg font-extrabold text-slate-900">Validating secure session</h1>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">Protected clinical information will remain hidden until the GlobalHealth server confirms this Doctor Portal session.</p>
      <span className="mx-auto mt-5 block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1769E0]" aria-label="Loading" />
    </div>
  </div>
);

const ApplicationSubmitted: React.FC<{ applicationId?: string; onBack: () => void }> = ({ applicationId, onBack }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-10">
    <section className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-soft">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-7 w-7" /></span>
      <h1 className="mt-4 text-xl font-extrabold text-slate-900">Verification request submitted</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Your organization must review the professional details and credential documents before an account can be activated. No clinical access has been granted.</p>
      {applicationId && <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">Application reference: {applicationId}</p>}
      <button type="button" onClick={onBack} className="mt-6 rounded-xl bg-[#1769E0] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#145bbf]">Return to sign in</button>
    </section>
  </div>
);

const Inner: React.FC<DoctorPortalAppProps> = ({ onBackToGlobalHealth, onGlobalLogout }) => {
  const { doctor, setDoctor } = useDoctorPortal();
  const [phase, setPhase] = useState<Phase>('restoring');
  const [signupDraft, setSignupDraft] = useState<SignupDraft | null>(null);
  const [applicationId, setApplicationId] = useState<string>();

  useEffect(() => {
    let active = true;
    doctorPortalApi.restoreSession().then((result) => {
      if (!active) return;
      if (result.success) {
        setDoctor(result.doctor);
        setPhase('workspace');
      } else {
        setPhase('auth');
      }
    });
    return () => { active = false; };
  }, [setDoctor]);

  const enterWorkspace = (d: DoctorProfile) => {
    setDoctor(d);
    setPhase('workspace');
  };

  const startOnboarding = (draft: SignupDraft) => {
    setSignupDraft(draft);
    setPhase('onboarding');
  };

  if (phase === 'restoring') return <SessionRestore />;
  if (phase === 'auth') {
    return (
      <DoctorAuth
        initialPhase="login"
        onBackToGlobalHealth={onBackToGlobalHealth}
        onLoginSuccess={enterWorkspace}
        onStartOnboarding={startOnboarding}
        onVerified={startOnboarding.bind(null, { fullName: '', email: '', phone: '', password: '' })}
      />
    );
  }
  if (phase === 'onboarding') {
    return (
      <DoctorOnboarding
        workEmail={signupDraft?.email || ''}
        fullName={signupDraft?.fullName || ''}
        phone={signupDraft?.phone || ''}
        password={signupDraft?.password || ''}
        onSubmitted={(id) => { setApplicationId(id); setPhase('application_submitted'); }}
        onBack={() => setPhase('auth')}
      />
    );
  }
  if (phase === 'application_submitted') {
    return <ApplicationSubmitted applicationId={applicationId} onBack={() => setPhase('auth')} />;
  }
  return (
    <ClinicalWorkspaceProvider>
      <DoctorWorkspace
        onBackToGlobalHealth={onBackToGlobalHealth}
        onLogout={async () => {
          // A central professional sign-in and the dedicated Doctor Portal
          // intentionally share one server-issued token. Destroy both the
          // doctor session and the central session when this is that token;
          // direct standalone doctor sessions keep their existing local flow.
          const centralToken = getStoredToken();
          const doctorToken = getDoctorSessionToken();
          const ownsGlobalSession = Boolean(onGlobalLogout && centralToken && doctorToken && centralToken === doctorToken);
          await doctorPortalApi.logout();
          if (ownsGlobalSession) {
            await onGlobalLogout?.();
            onBackToGlobalHealth();
          } else {
            setPhase('auth');
          }
        }}
      />
    </ClinicalWorkspaceProvider>
  );
};

export const DoctorPortalApp: React.FC<DoctorPortalAppProps> = ({ onBackToGlobalHealth, onGlobalLogout }) => {
  return (
    <DoctorPortalProvider initialDoctor={seedDoctor}>
      <PortalRoleProvider role="DOCTOR">
        <Inner onBackToGlobalHealth={onBackToGlobalHealth} onGlobalLogout={onGlobalLogout} />
      </PortalRoleProvider>
    </DoctorPortalProvider>
  );
};
