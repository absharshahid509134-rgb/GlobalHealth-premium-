import { PLATFORM_ROLES, ROLE_NAMES, type PlatformRole } from '../core/platformRoles';
import { ProfessionalAuthForm } from './auth/ProfessionalAuthForm';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Calendar,
  Bookmark,
  Shield
} from 'lucide-react';
import { AuthSubView, PublicUserAccount } from '../types/auth';
import { LoginForm } from './auth/LoginForm';
import { SignUpForm } from './auth/SignUpForm';
import { ForgotPasswordForm } from './auth/ForgotPasswordForm';
import { ResetPasswordForm } from './auth/ResetPasswordForm';
import { VerifyEmailPhoneForm } from './auth/VerifyEmailPhoneForm';
import { AccountSecurityView } from './auth/AccountSecurityView';
import { LogoutSuccessView } from './auth/LogoutSuccessView';
import { AuthHelpModal } from './auth/AuthHelpModal';
import { DoctorAvatar, AvatarExpression } from './auth/DoctorAvatar';

interface AuthPageProps {
  initialView?: AuthSubView;
  initialRole?: PlatformRole;
  currentUser: PublicUserAccount | null;
  onLoginSuccess: (user: PublicUserAccount, token?: string) => void;
  onLogout: () => void;
  onUpdateUser: (user: PublicUserAccount) => void;
  onReturnToHome: () => void;
  onNavigateToDashboard: () => void;
  /** Open a full legal page (Terms / Privacy Policy). */
  onOpenLegalPage?: (tab: 'terms' | 'privacy-policy') => void;
}

interface AvatarState {
  expression: AvatarExpression;
  message: string | null | undefined;
}

/** The avatar's default mood for each authentication sub-view. */
function avatarStateFor(view: AuthSubView): AvatarState {
  switch (view) {
    case 'signup':
      return { expression: 'signup', message: 'Let’s get your GlobalHealth account ready.' };
    case 'forgot-password':
      return { expression: 'recover', message: 'No worries. We’ll help you recover your account securely.' };
    case 'reset-password':
      return { expression: 'recover', message: 'One last step — create your new password.' };
    case 'verify-email':
    case 'verify-phone':
      return { expression: 'verifying', message: 'Almost there — let’s verify your account.' };
    case 'logout-success':
      return { expression: 'idle', message: 'You’re safely signed out. See you soon!' };
    case 'security':
      return { expression: 'idle', message: null };
    default:
      return { expression: 'login', message: null };
  }
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialView = 'login',
  initialRole = 'user',
  currentUser,
  onLoginSuccess,
  onLogout,
  onUpdateUser,
  onReturnToHome,
  onNavigateToDashboard,
  onOpenLegalPage
}) => {
  const [selectedRole, setSelectedRole] = useState<PlatformRole>(initialRole);
  useEffect(() => setSelectedRole(initialRole), [initialRole]);
  const [activeSubView, setActiveSubView] = useState<AuthSubView>(initialView);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>(() => avatarStateFor(activeSubView));

  // Verification state handover
  const [verificationData, setVerificationData] = useState<{
    userId: string;
    contactTarget?: string;
    type: 'email' | 'phone';
  } | null>(null);

  // Reset password token handover
  const [recoveryToken, setRecoveryToken] = useState<string>('');

  useEffect(() => {
    if (initialView) {
      setActiveSubView(initialView);
    }
  }, [initialView]);

  // The avatar adopts a mood per authentication page (never blocks the form).
  useEffect(() => {
    setAvatarState(avatarStateFor(activeSubView));
  }, [activeSubView]);

  // If user is already authenticated and opens security
  if (currentUser && (!currentUser.portalRole || currentUser.portalRole === 'user') && activeSubView === 'security') {
    return (
      <div className="min-h-[100dvh] bg-slate-50 py-6">
        <AccountSecurityView
          currentUser={currentUser}
          onUpdateUser={onUpdateUser}
          onBackToDashboard={onNavigateToDashboard}
          onOpenLegalPage={onOpenLegalPage}
          onLogout={() => {
            onLogout();
            setActiveSubView('logout-success');
          }}
        />
        <AuthHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      </div>
    );
  }

  // Do not flash credentials while the app routes an existing session.
  if (currentUser) return <div role="status" className="grid min-h-[100dvh] place-items-center p-8 text-center">Opening your authorized portal…</div>;

  const switchView = (view: AuthSubView) => setActiveSubView(view);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-gradient-to-b from-medical-50/70 via-white to-medical-50/50">
      {/* Subtle blue atmosphere — soft radial glows, extremely light */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-medical-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-medical-100/60 blur-3xl" />
      </div>

      {/* 2. Main Authentication Surface */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid w-full max-w-5xl grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left Column: Branding + Animated Doctor Avatar (desktop) */}
          <div className="hidden flex-col justify-between space-y-8 pr-4 text-left lg:col-span-5 lg:flex">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-medical-200 bg-white px-3 py-1 text-xs font-bold text-medical-800 shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-medical-600" />
                <span>Your health data stays yours</span>
              </div>
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 xl:text-4xl">
                Welcome back to GlobalHealth.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                One GlobalHealth account session connects you directly to your authorized portal. Your identity, records, and workspace stay private.
              </p>
            </div>

            {/* Animated healthcare avatar — friendly, calm, persistent */}
            <div className="flex justify-center py-2">
              <div className="gh-av-frame relative">
                <DoctorAvatar expression={avatarState.expression} message={avatarState.message} size="lg" />
              </div>
            </div>

            {/* Trust pillars */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-medical-100/80 bg-white p-3.5 shadow-soft">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-medical-100 bg-medical-50 text-medical-700">
                  <Bookmark className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Your saved healthcare directory</h3>
                  <p className="text-[11px] leading-snug text-slate-500">
                    Hospitals, clinics, doctors and urgent-care centres — kept safe in your private list.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-medical-100/80 bg-white p-3.5 shadow-soft">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-medical-100 bg-medical-50 text-medical-700">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Care, coordinated</h3>
                  <p className="text-[11px] leading-snug text-slate-500">
                    Appointments, reminders and pharmacy orders in one calm, organized view.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-medical-100/80 bg-white p-3.5 shadow-soft">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-medical-100 bg-medical-50 text-medical-700">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Privacy by design</h3>
                  <p className="text-[11px] leading-snug text-slate-500">
                    Versioned consent, encrypted sessions and strict role-based isolation — never blanket permissions.
                  </p>
                </div>
              </div>
            </div>

            {/* View quick-switch */}
            <div className="flex items-center gap-4 border-t border-medical-100/80 pt-2 text-xs font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => switchView('login')}
                className={`cursor-pointer transition ${activeSubView === 'login' ? 'font-bold text-medical-700 underline' : 'hover:text-slate-800'}`}
              >
                Log In
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => switchView('signup')}
                className={`cursor-pointer transition ${activeSubView === 'signup' ? 'font-bold text-medical-700 underline' : 'hover:text-slate-800'}`}
              >
                Create Account
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => switchView('forgot-password')}
                className={`cursor-pointer transition ${activeSubView === 'forgot-password' ? 'font-bold text-medical-700 underline' : 'hover:text-slate-800'}`}
              >
                Recover Account
              </button>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="flex justify-center lg:col-span-7">
            <div className="relative w-full max-w-lg rounded-3xl border border-medical-100/90 bg-white p-6 shadow-lift sm:p-8">
              {/* Soft blue accent line on the card */}
              <div aria-hidden="true" className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-medical-400 via-medical-500 to-medical-700" />

              {/* Mobile avatar — above the card content */}
              <div className="mb-4 flex justify-center lg:hidden">
                <DoctorAvatar expression={avatarState.expression} message={avatarState.message} size="md" />
              </div>

              <fieldset className="mb-6">
                <legend className="mb-3 text-sm font-bold text-slate-800">Choose your account role</legend>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_ROLES.map(role => <button key={role} type="button" aria-pressed={selectedRole === role}
                    onClick={() => { setSelectedRole(role); setVerificationData(null); setRecoveryToken(''); if (!['login', 'signup', 'forgot-password'].includes(activeSubView)) setActiveSubView('login'); }}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${selectedRole === role ? 'border-medical-700 bg-medical-700 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {ROLE_NAMES[role]}
                  </button>)}
                </div>
                <p className="mt-2 text-xs text-slate-500">Your account credentials determine access. Roles cannot be switched after sign-in.</p>
              </fieldset>
              {/* Secondary Tab Switcher */}
              {(activeSubView === 'login' || activeSubView === 'signup' || activeSubView === 'forgot-password') && (
                <div className="mb-6 flex rounded-2xl bg-medical-50/80 p-1 text-xs font-bold text-slate-600" role="tablist" aria-label="Authentication mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubView === 'login'}
                    onClick={() => switchView('login')}
                    className={`flex-1 cursor-pointer rounded-xl py-2 transition ${
                      activeSubView === 'login' ? 'bg-white text-medical-800 shadow-soft' : 'hover:text-slate-900'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubView === 'signup'}
                    onClick={() => switchView('signup')}
                    className={`flex-1 cursor-pointer rounded-xl py-2 transition ${
                      activeSubView === 'signup' ? 'bg-white text-medical-800 shadow-soft' : 'hover:text-slate-900'
                    }`}
                  >
                    Sign Up
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSubView === 'forgot-password'}
                    onClick={() => switchView('forgot-password')}
                    className={`flex-1 cursor-pointer rounded-xl py-2 transition ${
                      activeSubView === 'forgot-password' ? 'bg-white text-medical-800 shadow-soft' : 'hover:text-slate-900'
                    }`}
                  >
                    Recover Password
                  </button>
                </div>
              )}

              {/* View Router — gentle fade/slide between Log In ↔ Sign Up ↔ Recover */}
              <div key={`${selectedRole}:${activeSubView}`} className="gh-auth-view">
                {selectedRole !== 'user' ? <ProfessionalAuthForm role={selectedRole} mode={activeSubView} onMode={setActiveSubView} onSuccess={onLoginSuccess} /> : <>
                {activeSubView === 'login' && (
                  <LoginForm
                    onSuccess={(user, token) => {
                      onLoginSuccess(user, token);

                    }}
                    onNavigate={(view) => setActiveSubView(view)}
                    onRequestHelp={() => setShowHelpModal(true)}
                    onOpenLegal={onOpenLegalPage}
                    onAvatarInteract={(expression, message) => setAvatarState({ expression, message })}
                    onRequiresVerification={(data) => {
                      setVerificationData({
                        userId: data.userId,
                        contactTarget: data.email || data.phone || 'your registered contact',
                        type: data.type
                      });
                      setActiveSubView(data.type === 'phone' ? 'verify-phone' : 'verify-email');
                    }}
                  />
                )}

                {activeSubView === 'signup' && (
                  <SignUpForm
                    onSuccess={(data) => {
                      setVerificationData({
                        userId: data.userId,
                        contactTarget: data.email,
                        type: data.type
                      });
                      setActiveSubView(data.type === 'phone' ? 'verify-phone' : 'verify-email');
                    }}
                    onNavigate={(view) => setActiveSubView(view)}
                    onRequestHelp={() => setShowHelpModal(true)}
                    onOpenLegal={onOpenLegalPage}
                    onAvatarInteract={(expression, message) => setAvatarState({ expression, message })}
                  />
                )}

                {activeSubView === 'forgot-password' && (
                  <ForgotPasswordForm
                    onNavigate={(view) => setActiveSubView(view)}
                    onRecoveryTokenGenerated={(token) => {
                      setRecoveryToken(token);
                    }}
                    onRequestHelp={() => setShowHelpModal(true)}
                    onOpenLegal={onOpenLegalPage}
                    onAvatarInteract={(expression, message) => setAvatarState({ expression, message })}
                  />
                )}

                {activeSubView === 'reset-password' && (
                  <ResetPasswordForm
                    initialToken={recoveryToken}
                    onSuccess={() => setActiveSubView('login')}
                    onOpenLegal={onOpenLegalPage}
                    onNavigate={(view) => setActiveSubView(view)}
                    onRequestHelp={() => setShowHelpModal(true)}
                    onAvatarInteract={(expression, message) => setAvatarState({ expression, message })}
                  />
                )}

                {(activeSubView === 'verify-email' || activeSubView === 'verify-phone') && (
                  <VerifyEmailPhoneForm
                    userId={verificationData?.userId || ''}
                    contactTarget={verificationData?.contactTarget || 'your registered email/number'}
                    type={activeSubView === 'verify-phone' ? 'phone' : 'email'}
                    onSuccess={(user, token) => {
                      onLoginSuccess(user, token);

                    }}
                    onNavigate={(view) => setActiveSubView(view)}
                    onRequestHelp={() => setShowHelpModal(true)}
                    onOpenLegal={onOpenLegalPage}
                  />
                )}

                {activeSubView === 'logout-success' && (
                  <LogoutSuccessView
                    onLoginAgain={() => setActiveSubView('login')}
                    onReturnHome={onReturnToHome}
                  />
                )}
                </>}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="relative z-10 w-full border-t border-medical-100/80 bg-white/80 px-4 py-4 text-center text-xs text-slate-500 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} GlobalHealth Portal. All rights reserved. Role-based account access.</p>
          <div className="flex flex-wrap items-center gap-4 font-semibold text-slate-600">
            <button type="button" onClick={onReturnToHome} className="cursor-pointer transition hover:text-medical-700">Back to GlobalHealth</button>
            <button type="button" onClick={() => onOpenLegalPage?.('privacy-policy')} className="cursor-pointer transition hover:text-medical-700">Privacy Policy</button>
            <button type="button" onClick={() => onOpenLegalPage?.('terms')} className="cursor-pointer transition hover:text-medical-700">Terms &amp; Conditions</button>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="cursor-pointer transition hover:text-medical-700"
            >
              Security Policy
            </button>
          </div>
        </div>
      </footer>

      {/* Help Modal */}
      <AuthHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
};
