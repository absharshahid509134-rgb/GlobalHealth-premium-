// Centralized, validated environment configuration for GlobalHealth.
//
// No production secret ever has a source-code fallback. Missing gates are
// reported as explicit config warnings; callers decide whether an operation is
// safe without them (e.g. credential verification fails closed without a
// registry, prescription signing stays UNSIGNED without a signing secret).

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
    warnings
  };
}
