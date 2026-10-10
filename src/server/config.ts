// Centralized, validated environment configuration for GlobalHealth.
//
// No production secret ever has a source-code fallback. Missing gates are
// reported as explicit config warnings; callers decide whether an operation is
// safe without them (e.g. credential verification fails closed without a
// registry, prescription signing stays UNSIGNED without a signing secret).

import type { PlatformRole } from '../core/platformRoles';
import { resolveDemoPasswords, type DemoPasswords } from './demoAccounts';

export const SESSION_DEFAULTS = {
  /** Public User sessions: sliding inactivity window (unchanged default). */
  userIdleMs: 7 * 24 * 60 * 60 * 1000,
  /** Professional portal sessions (doctor, hospital, pharmacy, news). */
  professionalIdleMs: 12 * 60 * 60 * 1000,
} as const;
/** Long-lived window used while demo mode is enabled (non-production only). */
export const DEMO_SESSION_IDLE_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_SESSION_IDLE_HOURS = 365 * 24;

export interface SessionPolicy {
  userIdleMs: number;
  professionalIdleMs: number;
}

export interface RuntimeConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  isTest: boolean;
  port: number;
  runtimeDir: string;
  corsOrigins: string[];
  appUrl: string;
  geminiApiKey: string;
  medAuthRegistryUrl: string;
  medAuthRegistrySecret: string;
  prescriptionSigningSecret: string;
  ghAdminKey: string;
  /** Express `trust proxy` setting so req.ip is the real visitor behind a load balancer. */
  trustProxy: boolean | number | string;
  newsAdminBootstrap: {
    email: string;
    password: string;
    name: string;
  };
  /** Opt-in demo accounts. Always disabled in production. */
  demo: {
    enabled: boolean;
    passwords: DemoPasswords;
  };
  sessionPolicy: SessionPolicy;
  warnings: string[];
}

const PROD_ORIGIN = /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i;

/**
 * Resolve TRUST_PROXY. Hosted platforms (Render, Railway, Fly, Cloud Run, Heroku,
 * Vercel, nginx, ...) terminate TLS at a reverse proxy, so without this every
 * visitor shares the proxy's IP and the per-IP authentication rate limits
 * would lock everyone out after a few requests.
 * Accepts: true/false, a hop count (e.g. 1) or an Express subnet list.
 * Defaults to 1 hop in production and off elsewhere.
 */
function parseTrustProxy(raw: string, isProduction: boolean): boolean | number | string {
  const value = raw.trim();
  if (!value) return isProduction ? 1 : false;
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false' || lower === '0') return false;
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  return value;
}

/** Resolve session lifetimes. SESSION_IDLE_TTL_HOURS overrides every window;
 * demo mode otherwise uses a 365-day window so demonstrations persist. */
function resolveSessionPolicy(raw: string, demoEnabled: boolean, warnings: string[]): SessionPolicy {
  const value = raw.trim();
  if (value) {
    const hours = Number(value);
    if (Number.isInteger(hours) && hours >= 1 && hours <= MAX_SESSION_IDLE_HOURS) {
      const ms = hours * 60 * 60 * 1000;
      return { userIdleMs: ms, professionalIdleMs: ms };
    }
    warnings.push(`SESSION_IDLE_TTL_HOURS must be an integer from 1 to ${MAX_SESSION_IDLE_HOURS}; using defaults.`);
  }
  if (demoEnabled) return { userIdleMs: DEMO_SESSION_IDLE_MS, professionalIdleMs: DEMO_SESSION_IDLE_MS };
  return { ...SESSION_DEFAULTS };
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase();
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const warnings: string[] = [];

  const rawPort = env.PORT || '3000';
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    warnings.push(`PORT is not a valid TCP port (received "${rawPort}"); using 3000.`);
  }

  // Demo mode is opt-in and fails closed: it can never be enabled in production.
  const demoRequested = /^(1|true|yes|on)$/i.test((env.GH_DEMO_MODE || '').trim());
  const demoEnabled = demoRequested && !isProduction;
  if (demoRequested && isProduction) {
    warnings.push('GH_DEMO_MODE is ignored in production; demo accounts are never provisioned in production.');
  }
  // Override lengths are validated only when demo accounts will actually exist.
  const demoPasswords = resolveDemoPasswords(demoEnabled ? env : {});
  const sessionPolicy = resolveSessionPolicy(env.SESSION_IDLE_TTL_HOURS || '', demoEnabled, warnings);

  const corsOrigins = (env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const appUrl = (env.APP_URL || '').trim();

  const geminiApiKey = (env.GEMINI_API_KEY || '').trim();
  const medAuthRegistryUrl = (env.MEDAUTH_REGISTRY_URL || '').trim();
  const medAuthRegistrySecret = (env.MEDAUTH_REGISTRY_SECRET || '').trim();
  const prescriptionSigningSecret = (env.PRESCRIPTION_SIGNING_SECRET || '').trim();
  const ghAdminKey = (env.GH_ADMIN_KEY || '').trim();
  if (isProduction && !ghAdminKey) {
    warnings.push('GH_ADMIN_KEY is not set; pharmacy-partner administrative verification is disabled.');
  }
  if (isProduction && !prescriptionSigningSecret) {
    warnings.push('PRESCRIPTION_SIGNING_SECRET is not set; prescriptions are prepared as UNSIGNED/HELD_FOR_SIGNING.');
  }
  if (!medAuthRegistryUrl || !medAuthRegistrySecret) {
    warnings.push('MEDAUTH_REGISTRY_URL/MEDAUTH_REGISTRY_SECRET are not set; credential verification remains NOT_VERIFIED (fail closed).');
  }
  if (!geminiApiKey) {
    warnings.push('GEMINI_API_KEY is not set; AI Assistant returns a "not configured" response.');
  }
  if (isProduction && corsOrigins.some((origin) => origin === '*')) {
    throw new Error('CORS_ORIGIN must not be "*" in production. Configure an explicit HTTPS origin allowlist.');
  }
  if (isProduction && corsOrigins.some((origin) => !PROD_ORIGIN.test(origin))) {
    throw new Error('CORS_ORIGIN contains an invalid origin in production. Use full HTTPS origins, comma-separated.');
  }
  if (isProduction && !corsOrigins.length) {
    warnings.push('CORS_ORIGIN is not set; only same-origin requests will be accepted.');
  }

  return {
    nodeEnv: nodeEnv as RuntimeConfig['nodeEnv'],
    isProduction,
    isTest,
    port: Number.isFinite(port) && port >= 1 && port <= 65535 ? port : 3000,
    runtimeDir: env.GH_RUNTIME_DIR || 'data',
    corsOrigins,
    appUrl,
    geminiApiKey,
    medAuthRegistryUrl,
    medAuthRegistrySecret,
    prescriptionSigningSecret,
    ghAdminKey,
    trustProxy: parseTrustProxy(env.TRUST_PROXY || '', isProduction),
    newsAdminBootstrap: {
      email: (env.NEWS_ADMIN_BOOTSTRAP_EMAIL || '').trim(),
      password: (env.NEWS_ADMIN_BOOTSTRAP_PASSWORD || '').trim(),
      name: (env.NEWS_ADMIN_BOOTSTRAP_NAME || 'GlobalHealth News Administrator').trim()
    },
    demo: { enabled: demoEnabled, passwords: demoPasswords },
    sessionPolicy,
    warnings
  };
}
