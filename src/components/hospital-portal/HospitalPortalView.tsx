import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useHospitalPortal } from '../../context/HospitalContext';
import { PortalCredentialForm } from '../portals/PortalCredentialForm';
import { TopBar } from './layout/TopBar';
import { Sidebar } from './layout/Sidebar';

// Views
import { DashboardView } from './views/DashboardView';
import { ProfileView } from './views/ProfileView';
import { OrganizationView } from './views/OrganizationView';
import { DoctorsView } from './views/DoctorsView';
import { StaffView } from './views/StaffView';
import { AppointmentsView } from './views/AppointmentsView';
import { CapacityBedsView } from './views/CapacityBedsView';
import { EmergencyView } from './views/EmergencyView';
import { AmbulanceView } from './views/AmbulanceView';
import { DiagnosticsView } from './views/DiagnosticsView';
import { BloodBankView } from './views/BloodBankView';
import { PharmacyView } from './views/PharmacyView';
import { EquipmentView } from './views/EquipmentView';
import { PricingFinanceView } from './views/PricingFinanceView';
import { InsuranceView } from './views/InsuranceView';
import { DocumentsVaultView } from './views/DocumentsVaultView';
import { ChangeManagementView } from './views/ChangeManagementView';
import { CommunicationView } from './views/CommunicationView';
import { AnalyticsView } from './views/AnalyticsView';
import { AuditLogsView } from './views/AuditLogsView';
import { SecurityView } from './views/SecurityView';
import { SettingsView } from './views/SettingsView';
import { SupportView } from './views/SupportView';
import { GlobalAdminView } from './views/GlobalAdminView';
import { AuthPage } from './views/AuthPage';
import { PublicProfileSyncView } from './views/PublicProfileSyncView';

// Modals
import { RegisterHospitalModal } from './modals/RegisterHospitalModal';
import { DoctorModal } from './modals/DoctorModal';
import { BedModal } from './modals/BedModal';
import { DispatchModal } from './modals/DispatchModal';
import { DraftModal } from './modals/DraftModal';
import { AppointmentBookingModal } from './modals/AppointmentBookingModal';
import { DepartmentModal } from './modals/DepartmentModal';
import { WingModal } from './modals/WingModal';
import { TariffModal } from './modals/TariffModal';
import { PackageModal } from './modals/PackageModal';
import { AmbulanceModal } from './modals/AmbulanceModal';

interface HospitalPortalViewProps {
  onBackToPublic?: () => void;
}

const HospitalPortalInner: React.FC<HospitalPortalViewProps> = ({ onBackToPublic }) => {
  const {
    currentView,
    currentUser,
    loginWithHospitalCredentials,
    sessionValidating,
    sessionExpired,
    dismissSessionExpired
  } = useHospitalPortal();

  // Login always comes first — the hospital workspace only renders after the
  // authority credential engine validates the submitted sign-in.
  const [signedInThisVisit, setSignedInThisVisit] = useState(false);

  // Pre-login account screens: null = compact sign-in card, 'apply' = register
  // a hospital (sign-up application), 'forgot' = password recovery. Both run
  // on the hospital authority AuthPage — the same engine used post sign-in.
  const [accountScreen, setAccountScreen] = useState<'apply' | 'forgot' | null>(null);

  if (!signedInThisVisit || !currentUser || currentView === 'auth') {
    // A persisted session is being validated server-side — never flash the
    // sign-in form (or private data) before the check completes.
    if (sessionValidating) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6FBF8] p-4">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#D8E6DF] border-t-[#008F68]" />
          <p className="text-xs font-semibold text-[#52635C]">Restoring your secure hospital session…</p>
        </div>
      );
    }

    if (accountScreen) {
      return (
        <div className="flex min-h-screen items-start justify-center overflow-y-auto bg-[#F6FBF8] p-4">
          <div className="w-full max-w-5xl">
            <AuthPage
              initialTab={accountScreen}
              onBackToPublic={() => setAccountScreen(null)}
              onLoginSuccess={() => setSignedInThisVisit(true)}
              backButtonLabel="Back to sign-in"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6FBF8] p-4">
        {sessionExpired && (
          <div
            role="alert"
            className="w-full max-w-md rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold leading-relaxed">Your session has expired. Please sign in again.</span>
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
          title="Hospital Authority Portal"
          subtitle="Inpatient bed telemetry, ambulance dispatch, staff & finance — GlobalHealth Enterprise."
          icon={<Building2 className="h-7 w-7" />}
          identifierLabel="Hospital admin username"
          identifierPlaceholder="e.g. apex_admin"
          accent={{
            iconWrap: 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white',
            button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
            chip: 'border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100',
          }}
          demoAccounts={[
            { id: 'apex', label: 'Apex Heart Institute', identifier: 'apex_admin', password: 'Password@123' },
            { id: 'mayo', label: 'Mayo Clinic Rochester', identifier: 'mayo_admin', password: 'Password@123' },
          ]}
          onValidate={async (identifier, password) => {
            const result = await loginWithHospitalCredentials(identifier, password);
            return { success: result.success, error: result.error };
          }}
          onSuccess={() => setSignedInThisVisit(true)}
          onBack={onBackToPublic}
          onForgotPassword={() => setAccountScreen('forgot')}
          onCreateAccount={() => setAccountScreen('apply')}
          createAccountLabel="Register your hospital (sign up)"
        />
      </div>
    );
  }

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'profile':
        return <ProfileView />;
      case 'public-sync':
        return <PublicProfileSyncView />;
      case 'organization':
        return <OrganizationView />;
      case 'doctors':
        return <DoctorsView />;
      case 'staff':
        return <StaffView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'capacity':
        return <CapacityBedsView />;
      case 'emergency':
        return <EmergencyView />;
      case 'ambulance':
        return <AmbulanceView />;
      case 'diagnostics':
        return <DiagnosticsView />;
      case 'blood-bank':
        return <BloodBankView />;
      case 'pharmacy':
        return <PharmacyView />;
      case 'equipment':
        return <EquipmentView />;
      case 'tariffs':
        return <PricingFinanceView />;
      case 'insurance':
        return <InsuranceView />;
      case 'documents':
        return <DocumentsVaultView />;
      case 'drafts':
        return <ChangeManagementView />;
      case 'communication':
        return <CommunicationView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'security':
        return <SecurityView />;
      case 'settings':
        return <SettingsView />;
      case 'support':
        return <SupportView />;
      case 'global-admin':
        return <GlobalAdminView />;
      default:
        return <DashboardView />;
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6FBF8] text-[#17221E] flex flex-col font-sans selection:bg-[#BDE4D5] selection:text-[#006B4F]">
      <TopBar
        onBackToPublic={onBackToPublic}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-53px)] pb-16">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Action Modals */}
      <RegisterHospitalModal />
      <DoctorModal />
      <BedModal />
      <DispatchModal />
      <DraftModal />
      <AppointmentBookingModal />
      <DepartmentModal />
      <WingModal />
      <TariffModal />
      <PackageModal />
      <AmbulanceModal />
    </div>
  );
};

export const HospitalPortalView: React.FC<HospitalPortalViewProps> = (props) => {
  return <HospitalPortalInner {...props} />;
};
