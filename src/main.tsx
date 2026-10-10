import React, { Component, ErrorInfo, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LocalizationProvider } from './context/LocalizationContext';
import { PatientEhrProvider } from './context/PatientEhrContext';
import { HospitalProvider } from './context/HospitalContext';
import { PharmacyProvider } from './context/PharmacyContext';
import { BiomedicalProvider } from './context/BiomedicalContext';
import { DiagnosticProvider } from './context/DiagnosticContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';
import { cleanupLegacyDemoBrowserAccounts } from './services/legacyDemoCleanup';

// Remove retired fixture accounts before any provider restores cached state.
cleanupLegacyDemoBrowserAccounts();

// Prevent a lazy route or third-party widget from taking down the entire
// application. Errors are shown as an actionable, accessible recovery screen;
// details are logged for diagnostics without exposing private health data.
class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GlobalHealth] Unhandled UI error', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft" role="alert">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600" aria-hidden="true">!</div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">We couldn’t load this workspace</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Your information is safe. Reload the page and try again. If the problem continues, contact GlobalHealth support.</p>
          <button type="button" onClick={this.handleReload} className="mt-6 rounded-xl bg-medical-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-medical-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-medical-500 focus-visible:ring-offset-2">Reload GlobalHealth</button>
        </section>
      </main>
    );
  }
}

// Wraps providers that hold user-private state and REMOUNTS them whenever the
// authenticated identity changes. This guarantees that on logout or account
// switch, every in-memory private state (EHR, pharmacy, diagnostics, etc.) is
// destroyed and rebuilt fresh for the new identity — no stale User A data can
// ever be rendered for User B or for a guest.
function IdentityScopedProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const scope = user ? user.id : 'guest';
  return (
    <PatientEhrProvider key={`ehr-${scope}`}>
      <HospitalProvider key={`hosp-${scope}`}>
        <DiagnosticProvider key={`diag-${scope}`}>
          <PharmacyProvider key={`pharm-${scope}`}>
            <BiomedicalProvider key={`bio-${scope}`}>{children}</BiomedicalProvider>
          </PharmacyProvider>
        </DiagnosticProvider>
      </HospitalProvider>
    </PatientEhrProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocalizationProvider>
      <AuthProvider>
        <IdentityScopedProviders>
          <AppErrorBoundary>
            <App />
          </AppErrorBoundary>
        </IdentityScopedProviders>
      </AuthProvider>
    </LocalizationProvider>
  </StrictMode>,
);
