import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck, User, UserPlus } from 'lucide-react';

export interface PortalCredentialFormProps {
  title: string;
  subtitle: string;
  /** Branding accent, tailwind classes */
  accent?: {
    iconWrap?: string;
    button?: string;
    chip?: string;
    ring?: string;
  };
  icon?: React.ReactNode;
  identifierLabel: string;
  identifierPlaceholder?: string;
  passwordLabel?: string;
  mfaNote?: string;
  onValidate: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onSuccess: () => void;
  onBack?: () => void;
  /** Opens the portal's own "create a new account" screen, when available. */
  onCreateAccount?: () => void;
  /** Opens the portal's own password-recovery screen, when available. */
  onForgotPassword?: () => void;
  createAccountLabel?: string;
  forgotPasswordLabel?: string;
}

/**
 * Compact credential gate rendered whenever a specialized portal is opened.
 * Login always comes first — visitors only reach the portal workspace after
 * the portal's own auth service validates the credentials.
 */
export const PortalCredentialForm: React.FC<PortalCredentialFormProps> = ({
  title,
  subtitle,
  accent,
  icon,
  identifierLabel,
  identifierPlaceholder = '',
  passwordLabel = 'Password',
  mfaNote,
  onValidate,
  onSuccess,
  onBack,
  onCreateAccount,
  onForgotPassword,
  createAccountLabel = 'Create a new account',
  forgotPasswordLabel = 'Forgot password?',
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const iconWrap = accent?.iconWrap || 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white';
  const button = accent?.button || 'bg-emerald-600 hover:bg-emerald-700 text-white';
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (checking) return;
    if (!identifier.trim() || !password) {
      setError(`Please enter your ${identifierLabel.toLowerCase()} and password.`);
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const result = await onValidate(identifier.trim(), password);
      if (result.success) {
        onSuccess();
        return;
      }
      setError(result.error || 'Incorrect credentials. Please try again.');
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-900/5">
          {/* Portal branding */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className={`grid h-14 w-14 place-items-center rounded-2xl shadow-md ${iconWrap}`}>
              {icon || <ShieldCheck className="h-7 w-7" />}
            </div>
            <h1 className="mt-4 text-xl font-extrabold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{subtitle}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              <Lock className="h-3 w-3" />
              Secure sign-in required
            </span>
          </div>

          {/* Credential form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="portal-credential-identifier" className="mb-1.5 block text-xs font-bold text-slate-700">
                {identifierLabel}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="portal-credential-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={identifierPlaceholder || identifierLabel}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="portal-credential-password" className="mb-1.5 block text-xs font-bold text-slate-700">
                {passwordLabel}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="portal-credential-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={checking}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${button}`}
            >
              {checking ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Verifying credentials…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Sign in to portal
                </>
              )}
            </button>

            {mfaNote && (
              <p className="text-center text-[11px] font-medium text-slate-500">{mfaNote}</p>
            )}

            {/* Account self-service links — each portal wires these to its own
                sign-up / password-recovery flow. */}
            {(onCreateAccount || onForgotPassword) && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
                {onForgotPassword && (
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {forgotPasswordLabel}
                  </button>
                )}
                {onCreateAccount && (
                  <button
                    type="button"
                    onClick={onCreateAccount}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {createAccountLabel}
                  </button>
                )}
              </div>
            )}
          </form>

        </div>

        {onBack && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to GlobalHealth website
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
