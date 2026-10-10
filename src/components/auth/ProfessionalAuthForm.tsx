import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PlatformRole, ROLE_NAMES } from '../../core/platformRoles';
import { AuthSubView, PublicUserAccount } from '../../types/auth';
import { NewsStaffSignupScreen } from '../news/NewsWorkspaceAccessScreens';
import { DemoAccount, DemoAccountPicker } from './DemoAccountPicker';
import { startPublicDemoSession } from '../../services/authService';

export function ProfessionalAuthForm({ role, mode, onMode, onSuccess }: {
  role: Exclude<PlatformRole, 'user'>; mode: AuthSubView;
  onMode: (mode: AuthSubView) => void;
  onSuccess: (user: PublicUserAccount, token: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [challenge, setChallenge] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const request = async (action: string, body: unknown) => {
    const response = await fetch(`/api/auth/portal/${role}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || data.problems?.join(' ') || 'Unable to complete this request.');
    return data;
  };

  if (mode === 'signup' && role === 'news') {
    return <NewsStaffSignupScreen onBack={() => onMode('login')} />;
  }
  if (mode === 'signup' && (role === 'doctor' || role === 'hospital')) {
    return <div className="space-y-4"><ShieldCheck className="text-medical-600" /><h2 className="text-xl font-bold">Activate your {ROLE_NAMES[role]} account</h2><p className="text-sm text-slate-600">Professional access must be provisioned by your verified organization. Contact your organization administrator to verify your credentials and receive your account. Selecting a role does not grant access to an existing organization.</p><button className="font-bold text-medical-700" onClick={() => onMode('login')}>Already activated? Sign in</button></div>;
  }

  const recover = mode === 'forgot-password';
  const reset = mode === 'reset-password';
  const signup = mode === 'signup';
  const title = challenge ? 'Verify your sign-in' : recover ? 'Recover password' : reset ? 'Set a new password' : signup ? 'Apply for pharmacy access' : `Sign in as ${ROLE_NAMES[role]}`;
  const input = (name: string, label: string, type = 'text', minLength?: number) => (
    <label className="block text-sm font-semibold text-slate-700" key={name}>
      {label}
      <input
        name={name}
        type={type}
        required
        minLength={minLength}
        maxLength={name === 'code' ? 6 : undefined}
        inputMode={name === 'code' ? 'numeric' : undefined}
        autoComplete={name === 'password' ? signup ? 'new-password' : 'current-password' : name === 'identifier' ? 'username' : name === 'code' ? 'one-time-code' : 'off'}
        value={formValues[name] || ''}
        onChange={(event) => {
          const value = name === 'code' ? event.target.value.replace(/[^0-9]/g, '') : event.target.value;
          setFormValues((current) => ({ ...current, [name]: value }));
          if (error) setError('');
        }}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-medical-500"
      />
    </label>
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    const identifier = String(formValues.identifier || '').trim();
    try {
      const action = challenge ? 'mfa' : recover ? 'recover' : reset ? 'reset' : signup ? 'signup' : 'login';
      const data = await request(action, {
        ...formValues, identifier, email: identifier, usernameOrEmail: identifier,
        challengeId: challenge,
      });
      if (data.stage === 'mfa') {
        const developmentCode = typeof data.demoDelivery?.code === 'string' ? data.demoDelivery.code : '';
        setChallenge(data.challengeId);
        setDemoCode(developmentCode);
        setFormValues((current) => ({ ...current, code: developmentCode }));
        setMessage(developmentCode
          ? 'This development account uses simulated MFA. Enter the demo code shown below.'
          : 'Enter the verification code sent to your registered contact.');
        return;
      }
      if (recover || signup || reset) {
        setMessage(signup ? 'Application received. Sign-in is available only after license approval.' : reset ? 'Password updated. You can now sign in.' : 'If an eligible account exists, reset instructions will be sent to its registered contact.');
        return;
      }
      if (!data.token) throw new Error('The server did not issue a session.');
      // Validate identity and role before adopting the token or mounting data.
      const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${data.token}` }, cache: 'no-store' });
      const session = await response.json();
      if (!response.ok) {
        throw new Error(session.error || 'Unable to verify this sign-in session. Please try again.');
      }
      // Accept canonical role claims from either response location, including
      // legacy uppercase `user.role`, then normalize before comparing.
      const roleClaim = [session.portalRole, session.user?.portalRole, session.role, session.user?.role]
        .find((candidate) => typeof candidate === 'string' && candidate.trim());
      const authenticatedRole = typeof roleClaim === 'string' ? roleClaim.trim().toLowerCase() : '';
      if (authenticatedRole !== role) {
        throw new Error(`This session belongs to ${authenticatedRole || 'an unknown role'}, not ${role}. Sign in using the matching portal role.`);
      }
      onSuccess(session.user, data.token);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  };

  // Passwordless, isolated sandbox for this portal. The server issues an opaque
  // demo token; identity and role are re-verified through /api/auth/me.
  const startDemo = async () => {
    setError(''); setMessage(''); setBusy(true);
    try {
      const result = await startPublicDemoSession(role);
      if (!result?.success || !result.token) throw new Error(result?.error || 'Unable to start the demo right now. Please try again.');
      const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${result.token}` }, cache: 'no-store' });
      const session = await response.json();
      if (!response.ok) throw new Error(session.error || 'Unable to verify the demo session. Please try again.');
      const authenticatedRole = String(session.portalRole || session.user?.portalRole || '').trim().toLowerCase();
      if (authenticatedRole !== role) throw new Error('The demo session did not match this portal. Please try again.');
      setMessage('Your private demo is ready.');
      onSuccess(session.user, result.token);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start the demo right now. Please try again.'); }
    finally { setBusy(false); }
  };

  const applyDemoAccount = (account: DemoAccount) => {
    setFormValues((current) => ({ ...current, identifier: account.identifier, password: account.password }));
    setError('');
    setMessage('');
  };

  return <form onSubmit={submit} className="space-y-5">
    <div><h2 className="text-2xl font-bold text-slate-900">{title}</h2><p className="mt-2 text-sm text-slate-500">One GlobalHealth session. Your authorized workspace only.</p></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-medical-50 p-3 text-sm text-medical-800">{message}</p>}
    {challenge && demoCode && <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">Development-only MFA code: <code className="font-mono font-bold">{demoCode}</code></p>}
    <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
      {challenge ? input('code', 'Verification code', 'text', 6) : reset ? <>{input('resetToken', 'Reset token from your recovery message')}{role === 'news' && input('code', 'Recovery code')}{input('newPassword', 'New password', 'password', 8)}</> : <>
        {input('identifier', signup || role === 'news' || role === 'pharmacy' ? 'Official email' : 'Email or username', signup ? 'email' : 'text')}
        {!recover && input('password', 'Password', 'password', signup ? 8 : undefined)}
        {signup && <>{input('pharmacyName', 'Pharmacy legal name', 'text', 3)}{input('licenseNumber', 'License number', 'text', 4)}{input('contactName', 'Contact name')}{input('phone', 'Phone number', 'tel')}</>}
        {!signup && !recover && !reset && <DemoAccountPicker role={role} disabled={busy} onSelect={applyDemoAccount} onStartPublicDemo={startDemo} />}
      </>}
      <button className="w-full rounded-xl bg-medical-700 px-4 py-3 font-bold text-white hover:bg-medical-800" type="submit">{busy ? 'Please wait…' : challenge ? 'Verify and enter portal' : recover ? 'Request recovery' : reset ? 'Update password' : signup ? 'Submit for verification' : 'Sign in'}</button>
    </fieldset>
    {recover && <button type="button" className="text-sm font-semibold text-medical-700" onClick={() => onMode('reset-password')}>Already have a reset token?</button>}
    {(reset || challenge) && <button type="button" className="text-sm font-semibold text-medical-700" onClick={() => { setChallenge(''); setDemoCode(''); setError(''); setMessage(''); setFormValues((current) => ({ ...current, code: '' })); onMode('login'); }}>Back to sign in</button>}
  </form>;
}
