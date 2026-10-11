import React, { useEffect, useState } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Phone, User,
  ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, KeyRound, HelpCircle, Stethoscope
} from 'lucide-react';
import { doctorPortalApi, type DoctorProfile } from './doctorPortalData';
import { DemoFillButton } from '../auth/DemoFillButton';

export type PortalAuthPhase = 'login' | 'signup' | 'forgot' | 'reset' | 'verify';

interface DoctorAuthProps {
  initialPhase: PortalAuthPhase;
  onLoginSuccess: (doctor: DoctorProfile) => void;
  /** Start the server-reviewed onboarding flow without activating an account. */
  onStartOnboarding?: (draft: { fullName: string; email: string; phone: string; password: string }) => void;
  /** Retained for deep-link compatibility; verification is never decided in the browser. */
  onVerified: () => void;
  onBackToGlobalHealth: () => void;
}

/** Shared premium blue input shell used across every doctor-auth screen. */
const fieldShell = (invalid: boolean) =>
  `relative rounded-xl border bg-white shadow-xs transition-all focus-within:ring-2 ${
    invalid
      ? 'border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-400/20'
      : 'border-slate-300 focus-within:border-medical-500 focus-within:ring-medical-500/20'
  }`;

const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700';
const errSlot = 'mt-1 min-h-[16px] text-[11px] font-semibold text-rose-600';

export const DoctorAuth: React.FC<DoctorAuthProps> = ({ initialPhase, onLoginSuccess, onStartOnboarding, onVerified, onBackToGlobalHealth }) => {
  const [phase, setPhase] = useState<PortalAuthPhase>(initialPhase);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'phone' | 'in_app'>('email');

  // Verify fields
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [attempts, setAttempts] = useState(5);

  // Reset fields
  const [resetToken, setResetToken] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [resetDone, setResetDone] = useState(false);

  // Respect #doctor-portal/login … #doctor-portal/verify deep links.
  useEffect(() => {
    const hash = window.location.hash;
    const m = hash.match(/doctor-portal\/(login|signup|forgot-password|reset-password|verify)/);
    if (m) {
      const map: Record<string, PortalAuthPhase> = {
        login: 'login', signup: 'signup', 'forgot-password': 'forgot', 'reset-password': 'reset', verify: 'verify',
      };
      setPhase(map[m[1]]);
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const go = (p: PortalAuthPhase) => { setPhase(p); setError(''); setInfo(''); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fe: Record<string, string> = {};
    if (!identifier.trim()) fe.identifier = 'Enter your professional email.';
    if (!password) fe.password = 'Enter your password.';
    setFieldErr(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    const res = await doctorPortalApi.login(identifier, password);
    setBusy(false);
    if (res.success) onLoginSuccess(res.doctor);
    else setError(res.error || 'Unable to sign in with those credentials.');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fe: Record<string, string> = {};
    if (!fullName.trim()) fe.fullName = 'Enter your full name.';
    if (!identifier.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) fe.identifier = 'Enter a valid professional email.';
    if (password.length < 8) fe.password = 'At least 8 characters.';
    if (!phone.trim()) fe.phone = 'Enter a phone number.';
    setFieldErr(fe);
    if (Object.keys(fe).length) return;
    setBusy(false);
    // Creating a browser-side identity would be an authorization bypass. The
    // remaining professional fields and document metadata are collected in the
    // reviewed onboarding flow and submitted to the server together.
    onStartOnboarding?.({
      fullName: fullName.trim(),
      email: identifier.trim().toLowerCase(),
      phone: phone.trim(),
      password,
    });
  };

  const handleVerify = async () => {
    // There is deliberately no universal/demo verification code. A real
    // activation is issued by the server after organization review.
    setError('Email verification and professional activation are completed by the verified organization. Continue with the review request instead.');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fe: Record<string, string> = {};
    if (!resetToken.trim()) fe.resetToken = 'Paste the single-use reset token from your secure reset message.';
    if (newPw.length < 8) fe.newPw = 'At least 8 characters.';
    if (newPw !== confirmPw) fe.confirmPw = 'Passwords do not match.';
    setFieldErr(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    const res = await doctorPortalApi.completePasswordReset(resetToken, newPw);
    setBusy(false);
    if (res.success) setResetDone(true);
    else setError(res.error || 'The reset token could not be verified.');
  };

  const maskEmail = (v: string) => {
    if (!v.includes('@')) return v;
    const [l, d] = v.split('@');
    return `${l.slice(0, 2)}••••@${d}`;
  };

  const strength = calculateStrength(newPw);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-medical-50/70 via-white to-medical-50/50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-medical-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-medical-100/60 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-30 border-b border-medical-100/80 bg-white/85 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={onBackToGlobalHealth} className="group flex cursor-pointer items-center gap-2.5 text-left focus-visible:outline-none">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-medical-500 to-medical-800 text-white shadow-md shadow-medical-600/25 transition group-hover:scale-105">
              <Activity className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-extrabold leading-tight tracking-tight text-slate-900">GlobalHealth</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-medical-700">Doctor Portal</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onBackToGlobalHealth}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-medical-50 px-3.5 py-1.5 text-xs font-bold text-medical-800 transition hover:bg-medical-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to GlobalHealth
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="relative overflow-hidden rounded-3xl border border-medical-100/90 bg-white p-6 shadow-lift sm:p-8">
            <div aria-hidden="true" className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-medical-400 via-medical-500 to-medical-700" />

            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-medical-50 text-medical-700 ring-1 ring-medical-100">
                <Stethoscope className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Doctor Portal</h1>
                <p className="text-[11px] text-slate-500">Securely manage your professional profile, schedule and supported healthcare workflows.</p>
              </div>
            </div>

            {error && (
              <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div role="status" className="mb-4 flex items-start gap-2.5 rounded-xl border border-medical-200 bg-medical-50 p-3 text-xs text-medical-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-medical-600" />
                <span>{info}</span>
              </div>
            )}

            <div key={phase} className="gh-auth-view">
              {/* ---------------- LOGIN ---------------- */}
              {phase === 'login' && (
                <form onSubmit={handleLogin} noValidate className="space-y-3.5">
                  <DemoFillButton
                    role="doctor"
                    onFill={(account) => { setIdentifier(account.identifier); setPassword(account.password); setFieldErr({}); setError(''); }}
                  />
                  <div>
                    <label htmlFor="dp-email" className={labelCls}>Professional / Work Email</label>
                    <div className={fieldShell(Boolean(fieldErr.identifier))}>
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-email" type="email" autoComplete="username" value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setFieldErr((p) => ({ ...p, identifier: '' })); }}
                        placeholder="you@hospital.org" className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden" />
                    </div>
                    <p className={errSlot}>{fieldErr.identifier || ''}</p>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="dp-pw" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
                      <button type="button" onClick={() => go('forgot')} className="cursor-pointer text-xs font-semibold text-medical-700 hover:underline">Forgot Password?</button>
                    </div>
                    <div className={fieldShell(Boolean(fieldErr.password))}>
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
                        onChange={(e) => { setPassword(e.target.value); setFieldErr((p) => ({ ...p, password: '' })); }}
                        placeholder="Enter your password" className="w-full rounded-xl py-2.5 pl-10 pr-11 text-sm focus:outline-hidden" />
                      <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className={errSlot}>{fieldErr.password || ''}</p>
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-500">This tab keeps only an opaque session token. The server controls expiry and logout; no password or clinical data is stored in browser storage.</p>

                  <button type="submit" disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700 hover:shadow-lg active:bg-medical-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <><span>Log In</span><ArrowRight className="h-4 w-4" /></>}
                  </button>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                    Access is granted only after the GlobalHealth server validates your verified professional account. There is no browser-only or universal demo login.
                  </div>

                  <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-600">
                    New to the Doctor Portal?{' '}
                    <button type="button" onClick={() => go('signup')} className="cursor-pointer font-bold text-medical-700 hover:underline">Create Doctor Account</button>
                  </p>
                  <p className="text-center text-[11px] text-slate-400">
                    Need help?{' '}
                    <button type="button" onClick={() => go('forgot')} className="cursor-pointer font-semibold text-medical-700 hover:underline">Contact Support</button>
                  </p>
                </form>
              )}

              {/* ---------------- SIGNUP ---------------- */}
              {phase === 'signup' && (
                <form onSubmit={handleSignup} noValidate className="space-y-3.5">
                  <h2 className="text-lg font-extrabold text-slate-900">Create Doctor Account</h2>
                  <p className="-mt-2 text-xs text-slate-500">Step 1 of a guided onboarding — professional details come next.</p>
                  <div>
                    <label htmlFor="dp-name" className={labelCls}>Full name</label>
                    <div className={fieldShell(Boolean(fieldErr.fullName))}>
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-name" autoComplete="name" value={fullName}
                        onChange={(e) => { setFullName(e.target.value); setFieldErr((p) => ({ ...p, fullName: '' })); }}
                        placeholder="Dr. Your Name" className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden" />
                    </div>
                    <p className={errSlot}>{fieldErr.fullName || ''}</p>
                  </div>
                  <div>
                    <label htmlFor="dp-email2" className={labelCls}>Professional / Work Email</label>
                    <div className={fieldShell(Boolean(fieldErr.identifier))}>
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-email2" type="email" autoComplete="email" value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setFieldErr((p) => ({ ...p, identifier: '' })); }}
                        placeholder="you@hospital.org" className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden" />
                    </div>
                    <p className={errSlot}>{fieldErr.identifier || ''}</p>
                  </div>
                  <div>
                    <label htmlFor="dp-pw2" className={labelCls}>Password</label>
                    <div className={fieldShell(Boolean(fieldErr.password))}>
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-pw2" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password}
                        onChange={(e) => { setPassword(e.target.value); setFieldErr((p) => ({ ...p, password: '' })); }}
                        placeholder="At least 8 characters" className="w-full rounded-xl py-2.5 pl-10 pr-11 text-sm focus:outline-hidden" />
                      <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Toggle password visibility"
                        className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-slate-400 hover:text-slate-600">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className={errSlot}>{fieldErr.password || ''}</p>
                  </div>
                  <div>
                    <label htmlFor="dp-phone" className={labelCls}>Phone</label>
                    <div className={fieldShell(Boolean(fieldErr.phone))}>
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-phone" type="tel" autoComplete="tel" value={phone}
                        onChange={(e) => { setPhone(e.target.value); setFieldErr((p) => ({ ...p, phone: '' })); }}
                        placeholder="+91 …" className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden" />
                    </div>
                    <p className={errSlot}>{fieldErr.phone || ''}</p>
                  </div>
                  <div>
                    <label className={labelCls}>Preferred contact method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['email', 'phone', 'in_app'] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setContactMethod(m)}
                          className={`cursor-pointer rounded-xl border px-2 py-2 text-xs font-bold capitalize transition ${
                            contactMethod === m ? 'border-medical-500 bg-medical-50 text-medical-800' : 'border-slate-200 bg-white text-slate-500 hover:border-medical-200'
                          }`}>
                          {m === 'in_app' ? 'In-app' : m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button type="submit" disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700 disabled:opacity-60">
                    {busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
                  </button>

                  <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-600">
                    Already a verified doctor?{' '}
                    <button type="button" onClick={() => go('login')} className="cursor-pointer font-bold text-medical-700 hover:underline">Log In</button>
                  </p>
                </form>
              )}

              {/* ---------------- FORGOT ---------------- */}
              {phase === 'forgot' && (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!identifier.trim()) { setFieldErr({ identifier: 'Enter your professional email.' }); return; }
                  setBusy(true);
                  const result = await doctorPortalApi.requestPasswordReset(identifier);
                  setBusy(false);
                  if (!result.success) { setError(result.message); return; }
                  if (result.demoResetToken) {
                    // The development server exposes a reset token only in its
                    // explicitly non-production response. Production delivery
                    // remains out-of-band and never puts a token in the bundle.
                    setResetToken(result.demoResetToken);
                    go('reset');
                    setInfo('Development delivery: a single-use reset token was placed in the reset form.');
                  } else {
                    go('login');
                    setInfo(result.message || 'If an account matches, recovery instructions have been sent to the registered contact method.');
                  }
                }}
                  noValidate className="space-y-3.5">
                  <h2 className="text-lg font-extrabold text-slate-900">Recover Your Account</h2>
                  <p className="-mt-2 text-xs text-slate-500">We’ll help you securely regain access to your Doctor Portal account.</p>
                  <div>
                    <label htmlFor="dp-fg" className={labelCls}>Professional / Work Email</label>
                    <div className={fieldShell(Boolean(fieldErr.identifier))}>
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-fg" type="email" autoComplete="email" value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setFieldErr((p) => ({ ...p, identifier: '' })); }}
                        placeholder="you@hospital.org" className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden" />
                    </div>
                    <p className={errSlot}>{fieldErr.identifier || ''}</p>
                  </div>
                  <button type="submit" disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-medical-700 disabled:opacity-60">
                    {busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Remembered it?{' '}
                    <button type="button" onClick={() => go('login')} className="cursor-pointer font-bold text-medical-700 hover:underline">Back to Log In</button>
                  </p>
                </form>
              )}

              {/* ---------------- RESET ---------------- */}
              {phase === 'reset' && !resetDone && (
                <form onSubmit={handleReset} noValidate className="space-y-3.5">
                  <h2 className="text-lg font-extrabold text-slate-900">Create a New Password</h2>
                  <p className="-mt-2 text-xs text-slate-500">Use the single-use token from your secure reset message. Tokens expire and cannot be reused.</p>
                  <div>
                    <label htmlFor="dp-reset-token" className={labelCls}>Reset token</label>
                    <div className={fieldShell(Boolean(fieldErr.resetToken))}>
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-reset-token" type="text" autoComplete="one-time-code" value={resetToken}
                        onChange={(e) => { setResetToken(e.target.value); setFieldErr((p) => ({ ...p, resetToken: '' })); }}
                        placeholder="Paste your secure reset token" className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm font-mono focus:outline-hidden" />
                    </div>
                    <p className={errSlot}>{fieldErr.resetToken || ''}</p>
                  </div>
                  <div>
                    <label htmlFor="dp-npw" className={labelCls}>New password</label>
                    <div className={fieldShell(Boolean(fieldErr.newPw))}>
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-npw" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={newPw}
                        onChange={(e) => { setNewPw(e.target.value); setFieldErr((p) => ({ ...p, newPw: '' })); }}
                        placeholder="At least 8 characters" className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden" />
                    </div>
                    {newPw && (
                      <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500">Strength: {strength.label}</span>
                          <div className="grid w-24 grid-cols-4 gap-1">
                            {[0, 1, 2, 3].map((i) => (
                              <span key={i} className={`h-1.5 rounded-full ${i < strength.segments ? strength.color : 'bg-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <p className={errSlot}>{fieldErr.newPw || ''}</p>
                  </div>
                  <div>
                    <label htmlFor="dp-cpw" className={labelCls}>Confirm new password</label>
                    <div className={fieldShell(Boolean(fieldErr.confirmPw))}>
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input id="dp-cpw" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={confirmPw}
                        onChange={(e) => { setConfirmPw(e.target.value); setFieldErr((p) => ({ ...p, confirmPw: '' })); }}
                        placeholder="Re-enter your password" className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-hidden" />
                    </div>
                    <p className={errSlot}>{fieldErr.confirmPw || ''}</p>
                  </div>
                  <button type="submit" disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-medical-700 disabled:opacity-60">
                    {busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Reset Password'}
                  </button>
                </form>
              )}
              {phase === 'reset' && resetDone && (
                <div className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h2 className="mt-3 text-lg font-extrabold text-slate-900">Your password has been updated successfully.</h2>
                  <p className="mt-1 text-xs text-slate-500">Other active sessions have been signed out for your security.</p>
                  <button type="button" onClick={() => go('login')}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-medical-700">
                    Continue to Log In <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* ---------------- VERIFY ---------------- */}
              {phase === 'verify' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-medical-50 text-medical-700 ring-1 ring-medical-100">
                      <Mail className="h-6 w-6" />
                    </div>
                    <h2 className="mt-3 text-lg font-extrabold text-slate-900">Verify your email</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Enter the 6-digit code sent to <strong>{maskEmail(identifier)}</strong>. We never display the full address.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {digits.map((d, i) => (
                      <input
                        key={i}
                        type="text" inputMode="numeric" maxLength={6}
                        value={d}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          const next = [...digits];
                          if (v.length > 1) { v.split('').slice(0, 6).forEach((c, j) => { next[j] = c; }); }
                          else next[i] = v;
                          setDigits(next);
                          setError('');
                        }}
                        className="h-12 w-11 rounded-xl border border-slate-300 bg-white text-center text-lg font-bold text-slate-900 shadow-xs focus:border-medical-500 focus:ring-2 focus:ring-medical-500/20 focus:outline-hidden"
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button type="button" onClick={handleVerify} disabled={busy || digits.join('').length !== 6}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-medical-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-medical-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Verify Email'}
                  </button>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{attempts} attempt{attempts === 1 ? '' : 's'} remaining</span>
                    {canResend ? (
                      <button type="button" onClick={() => { setCountdown(45); setCanResend(false); setDigits(['', '', '', '', '', '']); setInfo('A new code has been dispatched.'); }}
                        className="flex cursor-pointer items-center gap-1 font-bold text-medical-700 hover:underline">
                        <RefreshCw className="h-3 w-3" /> Resend code
                      </button>
                    ) : (
                      <span className="font-medium text-slate-400">Resend in {countdown}s</span>
                    )}
                  </div>

                  <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-medical-600" /> Never share your verification code with anyone.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-medical-500" />
            Protected by server-validated sessions, MFA-ready, and full audit logging. Need help?{' '}
            <button type="button" onClick={onBackToGlobalHealth} className="cursor-pointer font-semibold text-medical-700 hover:underline">Contact Support</button>
          </p>
        </div>
      </main>
    </div>
  );
};

function calculateStrength(pw: string): { label: string; color: string; segments: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'bg-rose-500', segments: 1 };
  if (score === 2) return { label: 'Fair', color: 'bg-amber-500', segments: 2 };
  if (score === 3) return { label: 'Strong', color: 'bg-medical-500', segments: 3 };
  return { label: 'Very Strong', color: 'bg-medical-600', segments: 4 };
}
