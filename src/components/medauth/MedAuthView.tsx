import React, { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { DoctorAuthProvider, useDoctorAuth } from '../../context/DoctorAuthContext';
import { PatientEhrProvider } from '../../context/PatientEhrContext';
import { MedAuthNavbar } from './MedAuthNavbar';
import { ProfessionalDashboard } from './ProfessionalDashboard';
import { PortalCredentialForm } from '../portals/PortalCredentialForm';
import { DoctorAuthPage, DoctorAuthTab } from './views/DoctorAuthPage';

interface MedAuthViewProps {
  onBackToGlobalHealth?: () => void;
}

const MedAuthInnerView: React.FC<MedAuthViewProps> = ({ onBackToGlobalHealth }) => {
  const {
    activeDoctorProfile,
    allDoctors,
    doctorLogin,
    doctorLogout,
    updateActiveDoctorProfile,
    sessionExpired,
    dismissSessionExpired,
    sessionValidating
  } = useDoctorAuth();

  // Login always comes first — the physician workspace is only rendered
  // after the BACKEND validates the submitted credentials and issues a
  // server-side session token.
  const [signedInThisVisit, setSignedInThisVisit] = useState(false);

  // Which account-management screen the pre-login gate shows. null = the
  // compact sign-in card; 'request-access' = create-account application;
  // 'forgot-password' = password recovery. Both run on the same verified
  // DoctorAuth engine used by the registry.
  const [accountScreen, setAccountScreen] = useState<DoctorAuthTab | null>(null);

  if (!signedInThisVisit || !activeDoctorProfile) {
    if (accountScreen === 'request-access' || accountScreen === 'forgot-password') {
      return (
        <DoctorAuthPage
          initialTab={accountScreen}
          onLoginSuccess={() => setSignedInThisVisit(true)}
          onBackToGlobalHealth={() => setAccountScreen(null)}
          backButtonLabel="Back to sign-in"
        />
      );
    }

    // A persisted session is being validated against the server — never flash
    // the sign-in form (or private data) before the check completes.
    if (sessionValidating) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-4 text-slate-900 antialiased">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
          <p className="text-xs font-semibold text-slate-500">Restoring your secure doctor session…</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        {sessionExpired && (
          <div
            role="alert"
            className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold leading-relaxed">
                Your session has expired. Please sign in again.
              </span>
              <button
                type="button"
                onClick={dismissSessionExpired}
                aria-label="Dismiss"
                className="shrink-0 rounded-lg px-2 py-0.5 font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        )}
        <PortalCredentialForm
          demoRole="doctor"
          title="Doctor Portal — MedAuth Engine™"
          subtitle="State Board Registry & private physician workspace. Sign in with your registered doctor credentials."
          icon={<Stethoscope className="h-7 w-7" />}
          identifierLabel="Username or official email"
          identifierPlaceholder="e.g. doc_alex_chen"
          accent={{
            iconWrap: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
            button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
            chip: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
          }}
          onValidate={async (identifier, password) => {
            const result = await doctorLogin(identifier, password);
            return { success: result.success, error: result.success ? undefined : result.message };
          }}
          onSuccess={() => setSignedInThisVisit(true)}
          onBack={onBackToGlobalHealth}
          onForgotPassword={() => setAccountScreen('forgot-password')}
          onCreateAccount={() => setAccountScreen('request-access')}
          createAccountLabel="Request practitioner access (sign up)"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Top Bar with Authenticated Doctor Identity & Security Status */}
      <MedAuthNavbar
        verifiedCount={allDoctors.filter((d) => d.status === 'VERIFIED').length}
        activeDoctor={activeDoctorProfile}
        allDoctors={allDoctors}
        onLogout={() => {
          setSignedInThisVisit(false);
          doctorLogout();
        }}
        onBackToGlobalHealth={onBackToGlobalHealth}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <ProfessionalDashboard
          doctor={activeDoctorProfile}
          allDoctors={allDoctors}
          onUpdateDoctor={updateActiveDoctorProfile}
          onLockSession={() => {
            setSignedInThisVisit(false);
            doctorLogout();
          }}
        />
      </div>
    </div>
  );
};

export const MedAuthView: React.FC<MedAuthViewProps> = (props) => {
  return (
    <DoctorAuthProvider>
      <PatientEhrProvider>
        <MedAuthInnerView {...props} />
      </PatientEhrProvider>
    </DoctorAuthProvider>
  );
};
