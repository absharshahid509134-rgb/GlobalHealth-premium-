import React, { useCallback, useEffect, useState } from 'react';
import {
  Newspaper, Lock, LogIn, Loader2, ShieldCheck, KeyRound, Mail,
  PhoneCall, ArrowLeft, AlertTriangle, Building2, UserRound, Eye, EyeOff, CheckCircle2, LogOut
} from 'lucide-react';
import {
  newsFetch,
  getAdminToken,
  getAdminProfile,
  storeAdminSession,
  clearAdminSession,
  getAuthorityToken,
  storeAuthorityToken,
  NewsGovError,
  ServerAdmin,
  NewsMfaState
} from '../services/newsGovernanceClient';
import { DemoFillButton } from './auth/DemoFillButton';

interface LoginResult {
  success: boolean;
  stage: 'mfa' | 'complete';
  accountType: 'admin' | 'authority';
  challengeId?: string;
  challengeExpiresAt?: string;
  demoDelivery?: { channel: string; recipientEmail: string; code: string };
  token?: string;
  admin?: ServerAdmin;
  authority?: any;
}

interface NewsManagementLoginProps {
  /** When provided, the component is embedded (e.g. inside the CMS) and
      calls this instead of hash-routing on success. */
  onAuthenticated?: (result: LoginResult) => void;
  onExit?: () => void;
  /** Branding shown in standalone mode. */
  standalone?: boolean;
}

/**
 * The single, separate News Management login. One form signs in BOTH
 * GlobalHealth administrators and Verified Authority accounts; the SERVER
 * determines the account type and role, and the user is routed to the
 * dashboard that role is allowed to see. No role selection, no public
 * "create account" option — accounts are provisioned by administrators.
 */
export const NewsManagementLogin: React.FC<NewsManagementLoginProps> = ({ onAuthenticated, onExit, standalone }) => {
  const [step, setStep] = useState<'credentials' | 'mfa' | 'forgot' | 'recover'>('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mfa, setMfa] = useState<NewsMfaState | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  // Forgot-password workflow
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Existing sessions (continue-as)
  const [adminSession, setAdminSession] = useState<{ admin: ServerAdmin } | null>(null);
  const [authoritySession, setAuthoritySession] = useState(false);

  useEffect(() => {
    if (getAdminToken() && getAdminProfile()) setAdminSession({ admin: getAdminProfile()! });
    if (getAuthorityToken()) setAuthoritySession(true);
  }, []);

  const finish = useCallback((result: LoginResult) => {
    if (result.accountType === 'admin') {
      storeAdminSession(result.token || '', result.admin || null);
      if (onAuthenticated) {
        onAuthenticated(result);
      } else {
        window.location.hash = 'news-admin';
      }
    } else {
      storeAuthorityToken(result.token || '');
      if (onAuthenticated) {
        // An authority signing in at an admin surface is NEVER routed to the
        // administrator dashboard — always to their own dashboard.
        onAuthenticated(result);
      } else {
        window.location.hash = 'news-authority';
      }
    }
  }, [onAuthenticated]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await newsFetch<LoginResult>('/api/news/login', {
        method: 'POST',
        body: { identifier: identifier.trim(), password },
        token: null
      });
      if (r.stage === 'mfa') {
        setMfa({ challengeId: r.challengeId!, accountType: r.accountType, demoDelivery: r.demoDelivery! });
        setMfaCode('');
        setStep('mfa');
      } else {
        finish(r);
      }
    } catch (err: any) {
      setError(err.message || 'The sign-in information could not be verified.');
    } finally {
      setBusy(false);
    }
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfa) return;
    setBusy(true);
    setError('');
    try {
      const r = await newsFetch<LoginResult>('/api/news/mfa/verify', {
        method: 'POST',
        body: { challengeId: mfa.challengeId, code: mfaCode.trim() },
        token: null
      });
      finish(r);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await newsFetch<{ message: string }>('/api/news/forgot-password', {
        method: 'POST',
        body: { email: forgotEmail.trim() },
        token: null
      });
      setNotice(r.message || 'If that account exists, a reset link has been sent.');
      setResetCode('');
      setResetToken('');
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || 'Could not process the reset request.');
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    if (newPassword.length < 8) { setError('The new password must be at least 8 characters long.'); return; }
    if (newPassword !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await newsFetch<{ message: string }>('/api/news/reset-password', {
        method: 'POST',
        body: { resetToken, code: resetCode, newPassword },
        token: null
      });
      setNotice(r.message);
      setStep('credentials');
      setForgotSent(false);
      setNewPassword('');
      setConfirmPassword('');
      setForgotEmail('');
    } catch (err: any) {
      setError(err.message || 'The reset link could not be verified or has expired.');
    } finally {
      setBusy(false);
    }
  };

  const signOutOf = (kind: 'admin' | 'authority') => {
    const token = kind === 'admin' ? getAdminToken() : getAuthorityToken();
    if (token) newsFetch('/api/news/logout', { method: 'POST', token }).catch(() => {});
    if (kind === 'admin') { clearAdminSession(); setAdminSession(null); }
    else { storeAuthorityToken(''); setAuthoritySession(false); }
  };

  const isStandalone = standalone !== false;

  return (
    <div className={isStandalone ? 'min-h-screen bg-slate-950' : ''}>
      <div className={`mx-auto ${isStandalone ? 'max-w-md px-4 py-14' : ''}`}>
        <div className={isStandalone ? 'rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl' : 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'}>
          {/* Branding */}
          <div className="mb-6 text-center">
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${isStandalone ? 'bg-teal-500/10 text-teal-400 ring-teal-500/30' : 'bg-teal-50 text-teal-700 ring-teal-100'}`}>
              <Newspaper className="h-7 w-7" />
            </div>
            <h1 className={`text-xl font-extrabold ${isStandalone ? 'text-white' : 'text-slate-900'}`}>GlobalHealth News Management</h1>
            <p className={`mt-1 text-sm ${isStandalone ? 'text-slate-400' : 'text-slate-500'}`}>
              Authorized administrators &amp; verified authorities only.
            </p>
            {isStandalone && (
              <p className="mx-auto mt-3 max-w-xs rounded-xl bg-slate-800/60 px-3 py-2 text-[11px] text-slate-400 ring-1 ring-slate-700/60">
                <Lock className="mr-1 inline h-3 w-3 text-teal-400" />
                Accounts are provisioned by GlobalHealth administrators. Role and access are determined
                server-side after sign-in — they cannot be selected or changed from this page.
              </p>
            )}
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
          {notice && step === 'credentials' && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {notice}
            </div>
          )}

          {/* Existing sessions: continue-as */}
          {step === 'credentials' && !error && (adminSession || authoritySession) && (
            <div className="mb-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Existing sessions</div>
              {adminSession && (
                <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs ${isStandalone ? 'bg-slate-800 ring-1 ring-slate-700' : 'bg-slate-50 ring-1 ring-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-teal-500" />
                    <div>
                      <div className={`font-bold ${isStandalone ? 'text-slate-100' : 'text-slate-800'}`}>{adminSession.admin.name}</div>
                      <div className="text-[10px] text-slate-500">{adminSession.admin.role.replace('_', ' ')} · Administrator</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onAuthenticated ? onAuthenticated({ success: true, stage: 'complete', accountType: 'admin', admin: adminSession.admin }) : (window.location.hash = 'news-admin')}
                      className="rounded-lg bg-teal-600 px-2.5 py-1.5 font-bold text-white hover:bg-teal-500"
                    >
                      Continue
                    </button>
                    <button onClick={() => signOutOf('admin')} className="rounded-lg bg-slate-700/50 px-2 py-1.5 font-bold text-slate-300 hover:bg-slate-700" title="Sign out of this session">
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {authoritySession && (
                <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs ${isStandalone ? 'bg-slate-800 ring-1 ring-slate-700' : 'bg-slate-50 ring-1 ring-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-500" />
                    <div>
                      <div className={`font-bold ${isStandalone ? 'text-slate-100' : 'text-slate-800'}`}>Verified Authority session</div>
                      <div className="text-[10px] text-slate-500">Organization account</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onAuthenticated ? onAuthenticated({ success: true, stage: 'complete', accountType: 'authority' }) : (window.location.hash = 'news-authority')}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 font-bold text-white hover:bg-emerald-500"
                    >
                      Continue
                    </button>
                    <button onClick={() => signOutOf('authority')} className="rounded-lg bg-slate-700/50 px-2 py-1.5 font-bold text-slate-300 hover:bg-slate-700" title="Sign out of this session">
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CREDENTIALS */}
          {step === 'credentials' && (
            <form onSubmit={signIn} className="space-y-3">
              <DemoFillButton
                role="news"
                onFill={(account) => { setIdentifier(account.identifier); setPassword(account.password); setError(''); }}
              />
              <label className="block">
                <span className={`mb-1 block text-xs font-bold ${isStandalone ? 'text-slate-400' : 'text-slate-500'}`}>Email / Official Account ID</span>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@organization.org"
                  autoComplete="username"
                  className={isStandalone ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500' : 'inp'}
                />
              </label>
              <label className="block">
                <span className={`mb-1 block text-xs font-bold ${isStandalone ? 'text-slate-400' : 'text-slate-500'}`}>Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={isStandalone ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 pr-10 text-sm text-slate-100 outline-none focus:border-teal-500' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${isStandalone ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <button
                disabled={busy || !identifier.trim() || !password}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-50 ${isStandalone ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-700 hover:bg-teal-800'}`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Sign In
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <button type="button" onClick={() => { setStep('forgot'); setError(''); }} className={isStandalone ? 'font-semibold text-teal-400 hover:underline' : 'font-semibold text-teal-700 hover:underline'}>
                  Forgot Password
                </button>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setStep('recover'); setError(''); }} className={isStandalone ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}>
                    Account Recovery
                  </button>
                  <button type="button" onClick={() => { setStep('recover'); setError(''); }} className={isStandalone ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}>
                    Contact Administrator
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* MFA */}
          {step === 'mfa' && mfa && (
            <form onSubmit={verifyMfa} className="space-y-3">
              <div className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-xs ring-1 ${isStandalone ? 'bg-slate-800 text-slate-300 ring-slate-700' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                <span>
                  Identity verified. Enter the 6-digit security code sent to{' '}
                  <strong>{mfa.demoDelivery.recipientEmail}</strong> ({mfa.accountType === 'admin' ? 'administrator' : 'authority'} account).
                </span>
              </div>
              <div className={`rounded-xl border border-dashed px-3 py-2.5 text-[11px] ${isStandalone ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                <Mail className="mr-1 inline h-3 w-3" />
                <strong>Simulated email delivery</strong> (demo environment): your code is{' '}
                <span className="font-mono text-sm font-bold tracking-widest">{mfa.demoDelivery.code}</span>
              </div>
              <input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className={isStandalone ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-center font-mono text-lg tracking-[0.5em] text-slate-100 outline-none focus:border-teal-500' : 'inp text-center font-mono text-lg tracking-[0.5em]'}
              />
              <button
                disabled={busy || mfaCode.length !== 6}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-50 ${isStandalone ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-700 hover:bg-teal-800'}`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Verify &amp; Continue
              </button>
              <button type="button" onClick={() => { setStep('credentials'); setMfa(null); setError(''); }} className={`w-full text-xs ${isStandalone ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                ← Use different credentials
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {step === 'forgot' && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Reset Your Password</div>
              {!forgotSent ? (
                <>
                  <p className={`text-xs ${isStandalone ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter the email on your News Management account. For your security, the response is the
                    same whether or not the email is registered.
                  </p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Account email"
                    className={isStandalone ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500' : 'inp'}
                  />
                  <button
                    disabled={busy || !forgotEmail.trim()}
                    onClick={requestReset}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-50 ${isStandalone ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-700 hover:bg-teal-800'}`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send Reset Link
                  </button>
                </>
              ) : (
                <>
                  <div className={`rounded-xl border border-dashed px-3 py-2.5 text-[11px] ${isStandalone ? 'border-slate-700 bg-slate-800/70 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    <Mail className="mr-1 inline h-3 w-3" />
                    Enter the reset token and security code from the email delivered to the account address.
                    The link is valid for 15 minutes.
                  </div>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Reset token from email"
                    className={isStandalone ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500' : 'inp'}
                  />
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                    placeholder="6-digit security code from email"
                    className={isStandalone ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500' : 'inp'}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 characters)"
                    className={isStandalone ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500' : 'inp'}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={isStandalone ? 'w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500' : 'inp'}
                  />
                  <button
                    disabled={busy}
                    onClick={doReset}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-50 ${isStandalone ? 'bg-teal-600 hover:bg-teal-500' : 'bg-teal-700 hover:bg-teal-800'}`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Reset Password
                  </button>
                </>
              )}
              <button onClick={() => { setStep('credentials'); setForgotSent(false); setError(''); }} className={`flex w-full items-center justify-center gap-1 text-xs ${isStandalone ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
              </button>
            </div>
          )}

          {/* RECOVERY / CONTACT */}
          {step === 'recover' && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Account Recovery &amp; Contact</div>
              <div className={`space-y-2.5 rounded-xl p-3.5 text-xs ring-1 ${isStandalone ? 'bg-slate-800 text-slate-300 ring-slate-700' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                <p className="flex items-start gap-2">
                  <PhoneCall className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
                  <span><strong>News Management helpdesk:</strong> news-ops@globalhealth.org · Mon–Fri, 9:00–18:00 IST</span>
                </p>
                <p className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
                  <span>Lost your account? Contact your organization's authorized representative or the GlobalHealth news operations team. Identity verification is required before any recovery.</span>
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />
                  <span>GlobalHealth will never ask for your password or verification code by email or phone.</span>
                </p>
              </div>
              <button onClick={() => { setStep('credentials'); setError(''); }} className={`flex w-full items-center justify-center gap-1 text-xs ${isStandalone ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
              </button>
            </div>
          )}

          {isStandalone && onExit && (
            <button onClick={onExit} className="mt-5 w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-300">
              ← Back to GlobalHealth
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
