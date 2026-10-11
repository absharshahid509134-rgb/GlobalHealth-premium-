import React, { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import type { PlatformRole } from '../../core/platformRoles';
import { loadDemoConfig, type DemoAccountCredential, type DemoConfig } from '../../services/demoAccounts';

interface DemoAccountPanelProps {
  role: PlatformRole;
  onFill: (account: DemoAccountCredential) => void;
}

/**
 * Shown only when the server reports demo mode. "Fill Demo Account" populates
 * the sign-in form; it never submits or creates a session by itself.
 */
export function DemoAccountPanel({ role, onFill }: DemoAccountPanelProps) {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    let active = true;
    loadDemoConfig().then((result) => { if (active) setConfig(result); });
    return () => { active = false; };
  }, []);

  const account = config?.enabled ? config.accounts.find((candidate) => candidate.role === role) : undefined;
  if (!account) return null;

  return (
    <section aria-labelledby="demo-account-heading" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="demo-account-heading" className="flex items-center gap-2 text-sm font-bold">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          Demo account · sample data
        </h3>
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">Demo mode</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed">{account.description}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="font-semibold">Email</dt>
        <dd className="break-all font-mono">{account.identifier}</dd>
        <dt className="font-semibold">Password</dt>
        <dd className="break-all font-mono">{account.password}</dd>
      </dl>
      <button
        type="button"
        onClick={() => { onFill(account); setFilled(true); }}
        className="mt-3 w-full rounded-xl border border-amber-700 bg-white px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
      >
        Fill Demo Account
      </button>
      {filled && (
        <p role="status" className="mt-2 text-xs">
          Credentials filled. Select Sign in to continue through the normal login.
        </p>
      )}
    </section>
  );
}
