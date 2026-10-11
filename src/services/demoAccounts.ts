import type { PlatformRole } from '../core/platformRoles';

/** One sample account per portal, returned only while demo mode is enabled. */
export interface DemoAccountCredential {
  role: PlatformRole;
  roleName: string;
  displayName: string;
  description: string;
  identifier: string;
  password: string;
  destination: string;
}

export interface DemoConfig {
  enabled: boolean;
  accounts: DemoAccountCredential[];
}

/** Credentials filled into a sign-in form. Tagged with the role so a prefill can
 * never leak into another portal's form after the role selector changes. */
export interface DemoPrefill {
  role: PlatformRole;
  identifier: string;
  password: string;
  nonce: number;
}

const DISABLED: DemoConfig = { enabled: false, accounts: [] };
let cached: Promise<DemoConfig> | null = null;

/** Loads the demo configuration once per page load. Failures degrade to "disabled". */
export function loadDemoConfig(): Promise<DemoConfig> {
  if (!cached) {
    cached = fetch('/api/demo/config', { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Demo configuration unavailable (${response.status})`);
        const data = await response.json();
        return {
          enabled: data?.enabled === true,
          accounts: Array.isArray(data?.accounts) ? data.accounts as DemoAccountCredential[] : [],
        };
      })
      .catch(() => {
        cached = null;
        return DISABLED;
      });
  }
  return cached;
}
