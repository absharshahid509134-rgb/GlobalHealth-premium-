import React, { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import type { PlatformRole } from '../../core/platformRoles';
import { loadDemoConfig, type DemoAccountCredential } from '../../services/demoAccounts';

/**
 * Compact "Fill Demo Account" control for portal-specific sign-in screens.
 * It renders nothing unless demo mode is enabled on the server and the role has a
 * seeded account. It only fills the form. The user still submits through the
 * normal, server-verified sign-in.
 */
export function DemoFillButton({ role, onFill, className = '' }: {
  role: PlatformRole;
  onFill: (account: DemoAccountCredential) => void;
  className?: string;
}) {
  const [account, setAccount] = useState<DemoAccountCredential | null>(null);

  useEffect(() => {
    let alive = true;
    loadDemoConfig().then((config) => {
      if (!alive) return;
      setAccount(config.enabled ? config.accounts.find((a) => a.role === role) ?? null : null);
    });
    return () => { alive = false; };
  }, [role]);

  if (!account) return null;
  return (
    <button
      type="button"
      onClick={() => onFill(account)}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${className}`}
      aria-label={`Fill demo ${account.roleName} account`}
    >
      <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
      Fill Demo Account
    </button>
  );
}
