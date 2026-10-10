import React, { useEffect, useState } from 'react';
import { Activity, Eye, EyeOff, ArrowLeft, ArrowRight, ShieldCheck, Mail, Lock, Phone, Building2, AlertCircle } from 'lucide-react';
import { hospitalPortalApi, HospitalOrganization, StaffRole } from './hospitalPortalData';

interface HospitalAuthProps {
  onBackToGlobalHealth: () => void;
  onLoginSuccess: (organizations: HospitalOrganization[], role: StaffRole) => void;
}

type Phase = 'login' | 'signup' | 'forgot' | 'reset' | 'verify';

const SUBTITLE = "Securely manage your hospital's GlobalHealth profile and services.";

export const HospitalAuth: React.FC<HospitalAuthProps> = ({ onBackToGlobalHealth, onLoginSuccess }) => {
  const [phase, setPhase] = useState<Phase>('login');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Deep-link support: #hospital-portal/login|signup|forgot-password|reset-password|verify
  useEffect(() => {
    const match = window.location.hash.match(/^#hospital-portal\/(login|signup|forgot-password|reset-password|verify)$/);
    if (match) {
      const map: Record<string, Phase> = { login: 'login', signup: 'signup', 'forgot-password': 'forgot', 'reset-password': 'reset', verify: 'verify' };
      setPhase(map[match[1]]);
    }
  }, []);

  const go = (p: Phase) => { setError(''); setInfo(''); setPhase(p); };

  const handleLogin = async (identifier: string, password: string) => {
    const res = await hospitalPortalApi.login(identifier, password);
    if (res.success) onLoginSuccess(res.organizations, res.staffRole);
    else setError(res.error || 'Unable to sign in.');
  };

  const handleSignup = async () => {
    const res = await hospitalPortalApi.signup();
    if (res.success) { go('verify'); setInfo('A 6-digit verification code was sent to your registered email.'); }
  };

  const handleVerify = async (code: string) => {
    const res = await hospitalPortalApi.verify(code);
    if (res.success) {
      go('login');
      setInfo('Account verified. Sign in to register your hospital.');
    } else {
      setError(res.error || 'The verification code is invalid or has expired.');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-medical-50/70 via-white to-medical-50/50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-medical-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-medical-100/40 blur-3xl" />
      </div>

      <header className="relative z-30 border-b border-medical-100/80 bg-white/85 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button onClick={onBackToGlobalHealth} className="flex cursor-pointer items-center gap-2.5 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-medical-500 to-medical-800 text-white">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-slate-900">
              GlobalHealth <span className="font-semibold text-medical-700">— Hospital Portal</span>
            </span>
          </button>
          <button onClick={onBackToGlobalHealth} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to GlobalHealth
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center gap-10 px-4 py-10">
        <div className="hidden flex-1 lg:block">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Hospital Portal</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{SUBTITLE}</p>
          <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
            {[
              'Register, verify and activate your hospital profile',
              'Manage departments, doctors, services and schedules',
              'Separate public profile from private operations',
              'Role-based access, audit logging and security controls',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5 rounded-xl border border-medical-100 bg-white/70 px-3 py-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-medical-50 text-medical-700"><ShieldCheck className="h-3.5 w-3.5" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-md flex-1 lg:flex-none">
          <div className="relative rounded-3xl border border-medical-100/90 bg-white p-6 shadow-lift sm:p-8">
            <div aria-hidden="true" className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-gradient-to-r from-medical-400 via-medical-500 to-medical-700" />

            {error && (
              <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /> {error}
              </p>
            )}
            {info && (
              <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800">{info}</p>
            )}

            {phase === 'login' && <LoginForm onLogin={handleLogin} onCreate={() => go('signup')} onForgot={() => go('forgot')} onContactSupport={() => go('signup')} />}
            {phase === 'signup' && <SignupForm onSignup={handleSignup} onBack={() => go('login')} onVerify={() => go('verify')} />}
            {phase === 'forgot' && <ForgotForm onBack={() => go('login')} onSent={() => { go('login'); setInfo("If an account exists for that email, we've sent a password reset link. Check your inbox."); }} />}
            {phase === 'reset' && <ResetForm onBack={() => go('login')} onDone={() => { go('login'); setInfo('Password updated. All other sessions were signed out. Sign in with your new password.'); }} />}
            {phase === 'verify' && <VerifyForm onVerify={handleVerify} onBack={() => go('signup')} />}
          </div>
        </div>
      </main>
    </div>
  );
};

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-medical-500 focus:outline-none focus:ring-2 focus:ring-medical-500/20 transition';
const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700';

const LogoRow: React.FC<{ heading: string }> = ({ heading }) => (
  <div className="mb-5 text-center">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-medical-500 to-medical-800 text-white shadow-md shadow-medical-600/20">
      <Building2 className="h-6 w-6" />
    </div>
    <h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">{heading}</h2>
    <p className="mt-1 text-xs text-slate-500">{SUBTITLE}</p>
  </div>
);

const LoginForm: React.FC<{ onLogin: (id: string, pw: string) => void; onCreate: () => void; onForgot: () => void; onContactSupport: () => void }> = ({ onLogin, onCreate, onForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Enter a valid work email.'); return; }
    if (password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setErr(''); setBusy(true);
    await onLogin(email, password);
    setBusy(false);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <LogoRow heading="Hospital Portal" />
      <div className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="hp-email">Email / Work Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="hp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} pl-9`} placeholder="admin@hospital.example.com" />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="hp-password">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="hp-password" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pl-9 pr-10`} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600" aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-medical-600" />
          Remember this device
        </label>
        {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">{err}</p>}
        <button type="submit" disabled={busy} className="w-full cursor-pointer rounded-xl bg-medical-600 py-2.5 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Log In'}
        </button>
        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={onForgot} className="cursor-pointer font-bold text-medical-700 hover:underline">Forgot Password?</button>
          <button type="button" onClick={onCreate} className="cursor-pointer font-bold text-medical-700 hover:underline">Create Hospital Account</button>
        </div>
        <p className="text-center text-[11px] text-slate-400">Need help? <button type="button" onClick={() => { window.location.hash = '#hospital-portal/verify'; }} className="cursor-pointer font-bold text-medical-700 hover:underline">Contact Portal Support</button></p>
      </div>
    </form>
  );
};

const calculateStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const label = score <= 1 ? 'Weak' : score <= 3 ? 'Fair' : score <= 4 ? 'Good' : 'Strong';
  const color = score <= 1 ? 'bg-rose-400' : score <= 3 ? 'bg-amber-400' : 'bg-emerald-500';
  return { score, label, color };
};

const SignupForm: React.FC<{ onSignup: () => void; onBack: () => void; onVerify: () => void }> = ({ onSignup, onBack, onVerify }) => {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [repName, setRepName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Hospital Administrator');
  const [err, setErr] = useState('');
  const strength = calculateStrength(pw);

  const submit = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Enter a valid official work email.'); return; }
    if (strength.score < 3) { setErr('Password is too weak — use 8+ characters with mixed case, numbers and symbols.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    if (!repName.trim() || !phone.trim()) { setErr('Representative name and phone are required.'); return; }
    setErr('');
    onSignup();
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <LogoRow heading="Register Your Hospital" />
      <div className="space-y-3.5">
        <div>
          <label className={labelCls} htmlFor="hs-email">Official work email</label>
          <input id="hs-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="admin@hospital.example.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="hs-pw">Password</label>
            <input id="hs-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="hs-pw2">Confirm password</label>
            <input id="hs-pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} />
          </div>
        </div>
        {pw && (
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>Password strength: {strength.label}</span>
            </div>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
        )}
        <div>
          <label className={labelCls} htmlFor="hs-rep">Authorized representative name</label>
          <input id="hs-rep" value={repName} onChange={(e) => setRepName(e.target.value)} className={inputCls} placeholder="Full name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="hs-phone">Phone</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="hs-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} pl-9`} placeholder="+91 …" />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="hs-role">Role</label>
            <select id="hs-role" value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {['Hospital Owner', 'Hospital Administrator', 'Department Manager', 'Verification Manager', 'Other'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">{err}</p>}
        <button type="submit" className="w-full cursor-pointer rounded-xl bg-medical-600 py-2.5 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700">Create Account</button>
        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={onBack} className="cursor-pointer font-bold text-slate-500 hover:underline">Back to login</button>
          <button type="button" onClick={onVerify} className="cursor-pointer font-bold text-medical-700 hover:underline">Have a code? Verify</button>
        </div>
      </div>
    </form>
  );
};

const maskEmail = (e: string) => {
  const [local, domain] = e.split('@');
  if (!domain) return e;
  return `${local.slice(0, 2)}••••@${domain}`;
};

const ForgotForm: React.FC<{ onBack: () => void; onSent: () => void }> = ({ onBack, onSent }) => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Enter a valid work email.'); return; }
    setErr(''); setBusy(true);
    await hospitalPortalApi.forgot();
    setBusy(false);
    onSent();
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <LogoRow heading="Reset your password" />
      <div className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="hp-forgot-email">Work email</label>
          <input id="hp-forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="admin@hospital.example.com" />
        </div>
        {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">{err}</p>}
        <button type="submit" disabled={busy} className="w-full cursor-pointer rounded-xl bg-medical-600 py-2.5 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700 disabled:opacity-50">
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="text-[11px] text-slate-400">For security, we never reveal whether an email has an account.</p>
        <button type="button" onClick={onBack} className="w-full cursor-pointer text-xs font-bold text-slate-500 hover:underline">Back to login</button>
      </div>
    </form>
  );
};

const ResetForm: React.FC<{ onBack: () => void; onDone: () => void }> = ({ onBack, onDone }) => {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const strength = calculateStrength(pw);
  const submit = async () => {
    if (strength.score < 3) { setErr('Password is too weak.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    await hospitalPortalApi.reset();
    onDone();
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <LogoRow heading="Set a new password" />
      <div className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="hp-reset-pw">New password</label>
          <input id="hp-reset-pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} />
        </div>
        {pw && (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.score ? strength.color : 'bg-slate-200'}`} />
            ))}
          </div>
        )}
        <div>
          <label className={labelCls} htmlFor="hp-reset-pw2">Confirm new password</label>
          <input id="hp-reset-pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} />
        </div>
        {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">{err}</p>}
        <button type="submit" className="w-full cursor-pointer rounded-xl bg-medical-600 py-2.5 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700">Update password</button>
        <p className="text-[11px] text-slate-400">Changing your password signs out all other sessions.</p>
        <button type="button" onClick={onBack} className="w-full cursor-pointer text-xs font-bold text-slate-500 hover:underline">Back to login</button>
      </div>
    </form>
  );
};

const VerifyForm: React.FC<{ onVerify: (code: string) => void; onBack: () => void }> = ({ onVerify, onBack }) => {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearInterval(t);
  }, [cooldown > 0]);

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) { setErr('Enter the 6-digit code.'); return; }
    if (attempts >= 4) { setErr('Too many attempts. A new code was sent to your email.'); return; }
    setErr('');
    await onVerify(code);
    setAttempts((a) => a + 1);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <LogoRow heading="Verify your email" />
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Enter the 6-digit code sent to {maskEmail('admin@example.com')}. Codes expire after 10 minutes.</p>
        <div>
          <label className={labelCls} htmlFor="hp-code">Verification code</label>
          <input
            id="hp-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={`${inputCls} text-center font-mono text-lg tracking-[0.4em]`}
            placeholder="••••••"
            aria-label="6-digit verification code"
          />
        </div>
        {err && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">{err}</p>}
        <button type="submit" className="w-full cursor-pointer rounded-xl bg-medical-600 py-2.5 text-sm font-bold text-white shadow-md shadow-medical-600/20 transition hover:bg-medical-700">Verify</button>
        <div className="flex items-center justify-between text-xs">
          <button type="button" onClick={onBack} className="cursor-pointer font-bold text-slate-500 hover:underline">Back</button>
          <button type="button" disabled={cooldown > 0} onClick={() => setCooldown(30)} className="cursor-pointer font-bold text-medical-700 hover:underline disabled:opacity-50">
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </form>
  );
};
