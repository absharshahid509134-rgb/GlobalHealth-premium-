import React from 'react';
import { Lock, LogIn, UserPlus, ShieldCheck, HeartPulse, BookMarked, CalendarCheck, Pill, MessageCircle, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProtectedScreenProps {
  // Short label of what the visitor tried to reach, e.g. "your EHR".
  title?: string;
  feature?: string;
  description?: string;
  icon?: React.ReactNode;
}

// Full-page, friendly "authentication required" experience shown when a
// visitor lands on a protected destination directly (tab/deep-link).
export const ProtectedScreen: React.FC<ProtectedScreenProps> = ({
  title = 'Your Personal Health Dashboard',
  feature,
  description = 'Manage appointments, health records, EHR, saved resources, medicines, community activity, and other personalized healthcare features from one secure dashboard.',
  icon
}) => {
  const { requireAuth } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 px-6 py-10 text-center text-white sm:px-12">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            {icon || <Lock className="h-8 w-8" />}
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/95 sm:text-base">
            {feature
              ? `This area is private and available after you sign in. Sign in or create an account to ${feature}.`
              : 'This area is private and available after you sign in to GlobalHealth.'}
          </p>
          <p className="mx-auto mt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-50/80">
            <ShieldCheck className="h-4 w-4" /> Private by default — your information is protected
          </p>
        </div>

        <div className="px-6 py-8 sm:px-12">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => requireAuth({ feature }, 'login')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <LogIn className="h-4 w-4" /> Log In
            </button>
            <button
              onClick={() => requireAuth({ feature }, 'signup')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-3.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <UserPlus className="h-4 w-4" /> Create Account
            </button>
          </div>

          <p className="mt-6 text-center text-sm leading-relaxed text-slate-500">{description}</p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { icon: <HeartPulse className="h-5 w-5" />, label: 'Health records & EHR' },
              { icon: <CalendarCheck className="h-5 w-5" />, label: 'Appointments' },
              { icon: <Pill className="h-5 w-5" />, label: 'Medicines & orders' },
              { icon: <BookMarked className="h-5 w-5" />, label: 'Saved library' },
              { icon: <MessageCircle className="h-5 w-5" />, label: 'Community & messages' },
              { icon: <Bell className="h-5 w-5" />, label: 'Notifications' }
            ].map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-center"
              >
                <span className="text-emerald-600">{f.icon}</span>
                <span className="text-xs font-medium text-slate-600">{f.label}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">
            You can still explore public health information, medicines, doctors, hospitals, and community
            discussions without an account.
          </p>
        </div>
      </div>
    </div>
  );
};

// Neutral loading state — never flashes private content while auth is checked.
export const AuthLoading: React.FC<{ label?: string; fullScreen?: boolean }> = ({ label = 'Checking your secure session…', fullScreen = false }) => (
  <div className={`flex ${fullScreen ? 'min-h-[100dvh]' : 'min-h-[60vh]'} flex-col items-center justify-center gap-4 px-4 text-center`} role="status" aria-live="polite">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
      <ShieldCheck className="h-7 w-7 animate-pulse text-emerald-600" />
    </div>
    <p className="text-sm font-medium text-slate-600">{label}</p>
  </div>
);

// Session-expired modal: shown when a once-authenticated session lapses.
export const SessionExpiredModal: React.FC = () => {
  const { sessionExpired, dismissSessionExpired, requireAuth, logout } = useAuth();
  if (!sessionExpired) return null;
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
          <Lock className="h-7 w-7 text-amber-600" />
        </div>
        <h2 id="session-expired-title" className="text-xl font-bold text-slate-900">
          Your session has expired
        </h2>
        <p className="mt-2 text-sm text-slate-500">Please sign in again to continue securely.</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={() => {
              dismissSessionExpired();
              requireAuth({}, 'login');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <LogIn className="h-4 w-4" /> Log In
          </button>
          <button
            onClick={async () => {
              await logout();
              dismissSessionExpired();
              window.location.hash = '#home';
              window.location.reload();
            }}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};
