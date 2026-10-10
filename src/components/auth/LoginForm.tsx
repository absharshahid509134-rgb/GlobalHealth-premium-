import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLocalization } from '../../context/LocalizationContext';
import { loginUser, verifyTwoFactorLogin } from '../../services/authService';
import { PublicUserAccount } from '../../types/auth';
import { AvatarExpression } from './DoctorAvatar';

interface LoginFormProps {
  onSuccess: (user: PublicUserAccount, token?: string) => void;
  onNavigate: (view: 'signup' | 'forgot-password' | 'verify-email' | 'verify-phone') => void;
  onRequestHelp?: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy-policy') => void;
  onRequiresVerification?: (data: { userId: string; email?: string; phone?: string; type: 'email' | 'phone' }) => void;
  /** Lets the animated assistant react to what the user is doing. */
  onAvatarInteract?: (expression: AvatarExpression, message?: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onNavigate,
  onRequestHelp,
  onOpenLegal,
  onRequiresVerification,
  onAvatarInteract
}) => {
  const { t } = useLocalization();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [twoFactorPending, setTwoFactorPending] = useState<{ challengeId: string; method: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const validate = () => {
    const next: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) next.identifier = 'Please enter your email or mobile number.';
    if (!password) next.password = 'Please enter your password.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!validate()) {
      onAvatarInteract?.('error', 'Let me help — check your details and try again.');
      return;
    }

    setIsLoading(true);

    const result = await loginUser(identifier.trim(), password, rememberMe);
    setIsLoading(false);

    if (result.success) {
      if (result.verificationRequired && onRequiresVerification) {
        onRequiresVerification({
          userId: result.userId,
          email: result.email,
          type: result.verificationType || 'email'
        });
        return;
      }

      // Real two-factor gate: a session is only issued after the TOTP code
      // is verified by the server.
      if (result.twoFactorRequired && result.challengeId) {
        setTwoFactorPending({ challengeId: result.challengeId, method: result.method || 'authenticator_app' });
        setTwoFactorCode('');
        setSuccessMessage('Enter the 6-digit code from your authenticator app.');
        onAvatarInteract?.('verifying', 'One more step — open your authenticator app.');
        return;
      }

      setSuccessMessage(result.message || 'Login successful!');
      onAvatarInteract?.('success', 'Welcome back to GlobalHealth.');
      setTimeout(() => {
        onSuccess(result.user, result.token);
      }, 450);
    } else {
      setErrorMessage(
        result.error || 'Unable to sign in with those credentials. Please try again.'
      );
      onAvatarInteract?.('error', 'Let me help — check your details and try again.');
    }
  };

  const handleSubmitTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorPending) return;
    setErrorMessage('');
    setSuccessMessage('');
    if (!/^\d{6}$/.test(twoFactorCode.trim())) {
      setErrorMessage('Please enter the 6-digit code from your authenticator app.');
      return;
    }
    setIsLoading(true);
    const result = await verifyTwoFactorLogin(twoFactorPending.challengeId, twoFactorCode.trim());
    setIsLoading(false);
    if (result.success) {
      setTwoFactorPending(null);
      setTwoFactorCode('');
      setSuccessMessage(result.message || 'Sign-in complete.');
      onAvatarInteract?.('success', 'Welcome back to GlobalHealth.');
      setTimeout(() => onSuccess(result.user, result.token), 450);
    } else {
      setErrorMessage(result.error || 'The two-factor code could not be verified.');
      onAvatarInteract?.('error', 'That authenticator code did not work. Please try again.');
    }
  };

  if (twoFactorPending) {
    return (
      <div className="w-full">
        <div className="mb-6 text-left">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">Two-Factor Verification</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Open your authenticator app and enter the 6-digit code.
          </p>
        </div>

        {errorMessage && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-medical-200 bg-medical-50 p-3 text-xs text-medical-800">
            <ShieldCheck className="h-4 w-4 shrink-0 text-medical-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitTwoFactor} noValidate className="space-y-3.5">
          <div>
            <label htmlFor="login-totp" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
              Authenticator Code
            </label>
            <input
              id="login-totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={twoFactorCode}
              onChange={(e) => {
                setTwoFactorCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6));
                setErrorMessage('');
              }}
              placeholder="6-digit code"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.35em] text-slate-900 placeholder:text-slate-300 focus:border-medical-500 focus:outline-hidden focus:ring-2 focus:ring-medical-500/20"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700 hover:shadow-lg active:bg-medical-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify &amp; Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setTwoFactorPending(null);
              setTwoFactorCode('');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className="w-full cursor-pointer text-center text-xs font-semibold text-slate-500 transition hover:text-medical-700"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Form Header */}
      <div className="mb-6 text-left">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
          Welcome Back
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Sign in to continue to GlobalHealth
        </p>
      </div>

      {/* Error Alert (server-level, non-enumerating) */}
      {errorMessage && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 animate-in fade-in duration-150" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="leading-snug">
            <span className="mb-0.5 block font-semibold">Authentication Issue</span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-medical-200 bg-medical-50 p-3 text-xs text-medical-800 animate-in fade-in duration-150" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-medical-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        {/* Identifier Field */}
        <div>
          <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Email or Mobile Number
          </label>
          <div className={`relative rounded-xl border bg-white shadow-xs transition-all focus-within:ring-2 ${
            fieldErrors.identifier
              ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-400/20'
              : 'border-slate-300 focus-within:border-medical-500 focus-within:ring-medical-500/20'
          }`}>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="login-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errorMessage) setErrorMessage('');
                if (fieldErrors.identifier) setFieldErrors((p) => ({ ...p, identifier: undefined }));
              }}
              onFocus={() => onAvatarInteract?.('login', 'Take your time. I’ll help you get signed in.')}
              onBlur={() => {
                if (!identifier.trim()) {
                  setFieldErrors((p) => ({ ...p, identifier: 'Please enter your email or mobile number.' }));
                }
              }}
              placeholder="Enter your email or mobile number"
              className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.identifier)}
              aria-describedby={fieldErrors.identifier ? 'login-identifier-error' : undefined}
            />
          </div>
          {/* Reserved slot — validation appears without shifting the layout */}
          <p id="login-identifier-error" className="mt-1 min-h-[16px] text-[11px] font-semibold text-rose-600">
            {fieldErrors.identifier || ''}
          </p>
        </div>

        {/* Password Field */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Password
            </label>
            <button
              type="button"
              onClick={() => onNavigate('forgot-password')}
              className="cursor-pointer text-xs font-semibold text-medical-700 transition hover:text-medical-800 hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <div className={`relative rounded-xl border bg-white shadow-xs transition-all focus-within:ring-2 ${
            fieldErrors.password
              ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-400/20'
              : 'border-slate-300 focus-within:border-medical-500 focus-within:ring-medical-500/20'
          }`}>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              onFocus={() => onAvatarInteract?.('password', 'Your password stays private.')}
              onBlur={() => {
                if (!password) {
                  setFieldErrors((p) => ({ ...p, password: 'Please enter your password.' }));
                }
              }}
              placeholder="Enter your password"
              className="w-full rounded-xl py-2.5 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-slate-400 transition hover:text-slate-600 focus:outline-hidden"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p id="login-password-error" className="mt-1 min-h-[16px] text-[11px] font-semibold text-rose-600">
            {fieldErrors.password || ''}
          </p>
        </div>

        {/* Remember Device Checkbox */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded-md border-slate-300 accent-medical-600 focus:ring-medical-500"
            />
            <span className="text-xs font-medium text-slate-600">
              Remember this device
            </span>
          </label>
        </div>

        {/* Login consent line — returning users are not forced to re-accept
            Terms every time; this is an acknowledgement, not a new consent. */}
        <p className="text-[11px] leading-relaxed text-slate-500">
          By continuing, you agree to the{' '}
          <button type="button" onClick={() => onOpenLegal?.('terms')} className="cursor-pointer font-semibold text-medical-700 hover:underline">Terms &amp; Conditions</button>{' '}
          and acknowledge the{' '}
          <button type="button" onClick={() => onOpenLegal?.('privacy-policy')} className="cursor-pointer font-semibold text-medical-700 hover:underline">Privacy Policy</button>.
        </p>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700 hover:shadow-lg active:bg-medical-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing you in...</span>
            </>
          ) : (
            <>
              <span>Log In</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation Switcher */}
      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <p className="text-xs text-slate-600">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('signup')}
            className="cursor-pointer font-bold text-medical-700 transition hover:text-medical-800 hover:underline"
          >
            Sign Up
          </button>
        </p>

        <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-400">
          <button type="button" onClick={() => onOpenLegal?.('privacy-policy')} className="cursor-pointer transition hover:text-slate-600">Privacy Policy</button>
          <span>·</span>
          <button type="button" onClick={() => onOpenLegal?.('terms')} className="cursor-pointer transition hover:text-slate-600">Terms &amp; Conditions</button>
          <span>·</span>
          <button
            type="button"
            onClick={onRequestHelp}
            className="cursor-pointer transition hover:text-slate-600"
          >
            Help & Security
          </button>
        </div>

        {/* Security note — accurate, never overclaiming (spec) */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-medical-500" />
          Your account is protected by security measures designed to help safeguard your information. Never share
          your password or verification code with anyone.
        </p>
      </div>
    </div>
  );
};
