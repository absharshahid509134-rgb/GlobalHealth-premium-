import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, FlaskConical, LoaderCircle } from 'lucide-react';
import type { PlatformRole } from '../../core/platformRoles';

export interface DemoAccount {
  label: string;
  identifier: string;
  password: string;
}

type DemoAccountCatalog = Partial<Record<PlatformRole, DemoAccount[]>>;

/**
 * Shows a passwordless, isolated User Portal sandbox wherever it is enabled.
 * Legacy seeded credentials remain available only from development servers.
 */
export function DemoAccountPicker({
  role,
  onSelect,
  onStartPublicDemo,
  disabled = false,
}: {
  role: PlatformRole;
  onSelect: (account: DemoAccount) => void;
  onStartPublicDemo?: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [publicDemoAvailable, setPublicDemoAvailable] = useState(false);
  const [startingDemo, setStartingDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAccounts([]);
    setPublicDemoAvailable(false);

    fetch('/api/auth/demo-accounts', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result: { accounts?: DemoAccountCatalog; demoSessionAvailable?: boolean } | null) => {
        const roleAccounts = result?.accounts?.[role];
        if (!cancelled && Array.isArray(roleAccounts)) setAccounts(roleAccounts);
        if (!cancelled) setPublicDemoAvailable(Boolean(result?.demoSessionAvailable));
      })
      .catch(() => {
        // Demo access is optional; a missing endpoint simply hides this panel.
      });

    return () => {
      cancelled = true;
    };
  }, [role]);

  const showPublicDemo = role === 'user' && publicDemoAvailable && Boolean(onStartPublicDemo);
  if (!accounts.length && !showPublicDemo) return null;

  const startDemo = async () => {
    if (!onStartPublicDemo || startingDemo || disabled) return;
    setStartingDemo(true);
    try {
      await onStartPublicDemo();
    } finally {
      setStartingDemo(false);
    }
  };

  return (
    <div className="space-y-3">
      {showPublicDemo && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/75 p-3.5 text-left" aria-label="Public User Portal demo">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <FlaskConical className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-emerald-950">Explore the User Portal demo</p>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/80">
                Open a private sandbox with synthetic health records. Changes stay isolated and are cleared when you sign out or after 4 hours of inactivity. Please do not enter real health information.
              </p>
              <button
                type="button"
                disabled={disabled || startingDemo}
                onClick={() => void startDemo()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {startingDemo ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {startingDemo ? 'Preparing your private demo…' : 'Start demo — no password'}
              </button>
            </div>
          </div>
        </section>
      )}

      {accounts.length > 0 && (
        <details className="group rounded-xl border border-sky-200 bg-sky-50/70 text-left">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-sm font-bold text-sky-950 outline-none transition hover:bg-sky-100/70 focus-visible:ring-2 focus-visible:ring-sky-500">
            <span className="flex min-w-0 items-center gap-2">
              <FlaskConical className="h-4 w-4 shrink-0 text-sky-700" />
              <span>
                Try a development demo account
                <span className="ml-2 text-[11px] font-medium text-sky-800/75">
                  {accounts.length} available
                </span>
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-sky-200 px-3.5 pb-3.5 pt-3">
            <p className="mb-3 text-[11px] leading-relaxed text-sky-900/80">
              These are synthetic test accounts. Select one to fill the sign-in form; do not enter real patient information.
              {role === 'news' && ' News accounts require MFA; the development code appears after sign-in.'}
            </p>
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {accounts.map((account) => (
                <li key={`${account.identifier}:${account.label}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-sky-100 bg-white px-3 py-2.5">
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-bold text-slate-800">{account.label}</p>
                    <p className="mt-1 break-all text-slate-600">
                      Login: <code className="font-mono">{account.identifier}</code>
                    </p>
                    <p className="mt-0.5 break-all text-slate-600">
                      Password: <code className="font-mono">{account.password}</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(account)}
                    className="rounded-lg bg-sky-700 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Use account
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
