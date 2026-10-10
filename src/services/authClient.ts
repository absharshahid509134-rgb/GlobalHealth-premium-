// Centralized authenticated API client for GlobalHealth.
// Attaches the session token to every request, normalizes 401/session-expiry
// handling, and never leaks private data on error.

const TOKEN_STORAGE_KEY = 'globalhealth_auth_token';
const SESSION_STORAGE_KEY = 'globalhealth_user_session';

// Any client-side key owned by GlobalHealth. Logging out of the User Portal
// must clear every workspace/session variant so one global Logout really
// destroys the whole authenticated identity (see unified-session contract).
export const GLOBAL_SESSION_KEYS = [
  TOKEN_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  // Pharmacy partner portal
  'globalhealth_pharmacy_session',
  'gh_pharmacy_session_token',
  'globalhealth_partner_session',
  // Hospital portal
  'globalhealth_hospital_session',
  'gh_hospital_session_token',
  'hospital_portal_session_token_v1',
  // Doctor / MedAuth portal
  'globalhealth_doctor_session',
  'globalhealth_doctor_token',
  'gh_doctor_session_token',
  'globalhealth_medauth_session',
  'doctor_portal_session_token_v1',
  'doctor_portal_session_expiry_v1',
  'doctor_portal_active_account_v2',
  'medauth_active_doctor_v1',
  // News / editorial
  'globalhealth_news_session',
  'gh_news_session_token',
  // Community & saved/locale identity caches are NOT secret, but clear them so
  // a logout never leaves stale per-user UI state behind.
  'globalhealth_localization_cache',
  'globalhealth_community_session',
];

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeSession(token: string, user: unknown) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // storage may be unavailable; fail silently
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Destroys every GlobalHealth client session variant. The User Portal keeps a
 * single GlobalHealth session; professional workspaces must never retain a
 * stale identity after the user clicks the one global Logout.
 */
export function clearAllGlobalSessions() {
  // Professional portals historically used sessionStorage while the central
  // User Portal uses localStorage. Clear both stores so switching accounts in
  // the central auth flow cannot resurrect a stale clinical identity in a
  // nested portal. Only opaque session keys are touched; clinical data is not
  // stored here.
  const clearStorage = (storage: Storage) => {
    GLOBAL_SESSION_KEYS.forEach((key) => storage.removeItem(key));
    // Defensive: also drop any older/unknown namespace keys a feature may have
    // used in a previous build. These keys are session-scoped, never public.
    Object.keys(storage)
      .filter((k) => /globalhealth_.*(session|token|auth)|doctor_portal_.*(session|token|active)|medauth_active_doctor|gh_.*(session|token)/i.test(k))
      .forEach((k) => storage.removeItem(k));
  };
  try {
    clearStorage(localStorage);
  } catch {
    // localStorage may be unavailable while sessionStorage still works.
  }
  try {
    clearStorage(sessionStorage);
  } catch {
    // storage unavailable — nothing to clear
  }
}

export class AuthError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  // When false, the request is made without an Authorization header.
  auth?: boolean;
}

// Authenticated fetch. Throws AuthError with friendly messages on 401/403.
export async function apiFetch<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const requestToken = auth ? getStoredToken() : null;
  if (auth) {
    const token = requestToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new AuthError(
      'Network connection failed. Please check your internet connection and try again.',
      'NETWORK_ERROR',
      0
    );
  }

  // Frontend-only deployment guard: if the host serves the SPA fallback for an
  // `/api/*` URL, the API is not deployed. Fail loudly instead of silently
  // treating HTML as API data.
  const contentType = res.headers.get('content-type') || '';
  if (path.startsWith('/api/') && contentType.includes('text/html')) {
    throw new AuthError(
      'The GlobalHealth API is not available on this host. A UI-only deployment cannot serve authentication, EHR, pharmacy, hospital, or AI features.',
      'DEPLOYMENT_API_MISMATCH',
      502
    );
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.status === 401) {
    const code = data?.code || 'AUTH_REQUIRED';
    const message =
      code === 'SESSION_EXPIRED'
        ? 'Your session has expired. Please sign in again.'
        : 'Please sign in to access this feature.';
    // If the user *was* signed in and the token is now invalid, surface the
    // secure session-expired experience and drop the stale session locally.
    if (auth && requestToken && getStoredToken() === requestToken) {
      clearStoredSession();
      try {
        window.dispatchEvent(
          new CustomEvent('globalhealth:unauthorized', { detail: { reason: code === 'SESSION_EXPIRED' ? 'expired' : 'unauthorized' } })
        );
      } catch {
        // ignore
      }
    }
    throw new AuthError(message, code, 401);
  }
  if (res.status === 403) {
    throw new AuthError("You do not have permission to access this information.", 'FORBIDDEN', 403);
  }
  if (res.status === 404) {
    throw new AuthError('This healthcare record could not be found.', 'NOT_FOUND', 404);
  }
  if (!res.ok) {
    throw new AuthError(data?.error || 'Something went wrong. Please try again.', 'ERROR', res.status);
  }
  return data as T;
}
