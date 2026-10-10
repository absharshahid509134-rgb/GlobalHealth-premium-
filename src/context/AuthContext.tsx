import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { PublicUserAccount } from '../types/auth';
import { UserAccount } from '../types';
import { apiFetch, clearAllGlobalSessions, getStoredToken, storeSession } from '../services/authClient';

// Where the user was trying to go / do when they were asked to sign in.
export interface AuthIntent {
  // The tab they wanted to open.
  tab?: string;
  // Human-readable description of the gated action (for the gate UI).
  feature?: string;
  // Optional context (e.g. selected doctor id / time slot) to restore after login.
  context?: Record<string, unknown>;
}

// Unified User Portal permissions. Every authorized feature checks this same
// identity; feature-specific role checks may narrow access, but they never ask
// for a second login.
const USER_PORTAL_PERMISSIONS = [
  'user-portal:read',
  'health-records:read',
  'appointments:read',
  'appointments:write',
  'pharmacy:order',
  'community:read',
  'community:write',
  'ai:assistant',
  'saved:write',
  'notifications:read',
] as const;

export type UserPortalPermission = (typeof USER_PORTAL_PERMISSIONS)[number];

interface AuthContextValue {
  user: UserAccount | null;
  /**
   * The server's account record, kept alongside `user` because UserAccount
   * drops the security fields (role, verification flags, twoFactor) that the
   * account-security screen needs.
   */
  publicUser: PublicUserAccount | null;
  /** The validated server-issued session token shared by every feature. */
  sessionId: string | null;
  /** Explicit session lifecycle state for every module reading auth. */
  sessionStatus: 'idle' | 'initializing' | 'active' | 'expired';
  /** Convenience accessors — every module reads the SAME account. */
  userId: string | null;
  userProfile: UserAccount | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  /** One unified permission set for the authenticated User Portal account. */
  permissions: UserPortalPermission[];
  /** True when exactly one valid GlobalHealth session is active. */
  isAuthenticated: boolean;
  // True until the initial session check against the server completes.
  initializing: boolean;
  // True when the active session has expired server-side.
  sessionExpired: boolean;
  // The global auth gate modal state.
  gateOpen: boolean;
  gateMode: 'login' | 'signup';
  gateIntent: AuthIntent | null;
  // Opens the authentication gate, optionally preserving intended destination.
  requireAuth: (intent?: AuthIntent, mode?: 'login' | 'signup') => void;
  closeGate: () => void;
  setGateMode: (mode: 'login' | 'signup') => void;
  // Called by login/signup flows with the authenticated user + token.
  authenticate: (user: UserAccount, token: string, publicUser?: PublicUserAccount | null) => void;
  /** Replaces the cached server account after a security change (e.g. 2FA). */
  setPublicUser: (user: PublicUserAccount) => void;
  logout: () => Promise<void>;
  dismissSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Maps a server public user (PublicUserAccount) into the app's UserAccount shape.
function toUserAccount(serverUser: any): UserAccount {
  const first = serverUser.firstName ?? (serverUser.fullName?.split(' ')[0] || 'Friend');
  const last = serverUser.lastName ?? '';
  return {
    id: serverUser.id,
    username: serverUser.username || '',
    fullName: serverUser.fullName || `${first} ${last}`.trim(),
    email: serverUser.email || '',
    avatarUrl: serverUser.avatarUrl,
    phoneNumber: serverUser.phoneNumber,
    dateOfBirth: serverUser.dateOfBirth,
    gender: 'Prefer not to say',
    dietaryPreferences: serverUser.dietaryPreferences ?? [],
    healthGoals: serverUser.healthGoals ?? [],
    createdAt: serverUser.createdAt || new Date().toISOString(),
    consent: serverUser.consent,
    consentHistory: serverUser.consentHistory
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [publicUser, setPublicUser] = useState<PublicUserAccount | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMode, setGateMode] = useState<'login' | 'signup'>('login');
  const [gateIntent, setGateIntent] = useState<AuthIntent | null>(null);
  // Holds the intent after a successful login so the app can route back.
  const pendingIntentRef = useRef<AuthIntent | null>(null);

  // On mount: validate any stored token with the server before trusting it.
  // We never render private data until this resolves.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getStoredToken();
      if (!token) {
        setInitializing(false);
        return;
      }
      try {
        const res = await apiFetch<{ success: boolean; user: any }>('/api/auth/me');
        if (!cancelled && res?.user) {
          setUser(toUserAccount(res.user));
          setPublicUser(res.user as PublicUserAccount);
          setSessionId(token);
        }
      } catch {
        // Token invalid or expired — clear this and every dependent session.
        clearAllGlobalSessions();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requireAuth = useCallback((intent?: AuthIntent, mode: 'login' | 'signup' = 'login') => {
    // ONE GLOBAL SESSION RULE: once the User Portal session is authenticated,
    // protected-feature requests never open the login again. The feature code
    // proceeds on the existing currentUser / isAuthenticated state.
    if (user) return;
    setGateIntent(intent || null);
    pendingIntentRef.current = intent || null;
    setGateMode(mode);
    setGateOpen(true);
  }, [user]);

  const closeGate = useCallback(() => {
    setGateOpen(false);
  }, []);

  const authenticate = useCallback((u: UserAccount, token: string, pu?: PublicUserAccount | null) => {
    // One session token is the single source of truth for every user feature.
    clearAllGlobalSessions();
    storeSession(token, u);
    setUser(u);
    setSessionId(token);
    setPublicUser(pu ?? null);
    setGateOpen(false);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(async () => {
    const token = getStoredToken();
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ sessionId: token })
        });
      }
    } catch {
      // continue local cleanup regardless
    }
    // One global Logout destroys the GlobalHealth session and every dependent
    // workspace session, while public pages stay available.
    clearAllGlobalSessions();
    setUser(null);
    setPublicUser(null);
    setSessionId(null);
    pendingIntentRef.current = null;
    setGateOpen(false);
  }, []);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  // Expose a global hook so any data-fetching code can report a hard 401.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      clearAllGlobalSessions();
      setUser(null);
      setPublicUser(null);
      setSessionId(null);
      if (detail.reason === 'expired') setSessionExpired(true);
    };
    window.addEventListener('globalhealth:unauthorized', handler);
    return () => window.removeEventListener('globalhealth:unauthorized', handler);
  }, []);

  // Multi-tab session safety: react when another tab logs in or out. The same
  // token is validated against the server so identity is never trusted from
  // storage alone.
  useEffect(() => {
    const onStorage = async (e: StorageEvent) => {
      if (e.key !== 'globalhealth_auth_token') return;
      const token = getStoredToken();
      if (!token) {
        setInitializing(false);
        // Logout happened in another tab.
        clearAllGlobalSessions();
        setUser(null);
        setPublicUser(null);
        setSessionId(null);
      } else if (token !== e.oldValue) {
        setUser(null); setPublicUser(null); setSessionId(null); setInitializing(true);
        // Login / session changed in another tab — validate before trusting.
        try {
          const res = await apiFetch<{ success: boolean; user: any }>('/api/auth/me');
          if (getStoredToken() !== token) return;
          setUser(res?.user ? toUserAccount(res.user) : null);
          setPublicUser((res?.user as PublicUserAccount) ?? null);
          setSessionId(res?.user ? token : null);
          setInitializing(false);
        } catch {
          if (getStoredToken() !== token) return;
          setInitializing(false);
          clearAllGlobalSessions();
          setUser(null);
          setPublicUser(null);
          setSessionId(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value: AuthContextValue = {
    user,
    publicUser,
    sessionId,
    sessionStatus: initializing
      ? 'initializing'
      : sessionExpired
        ? 'expired'
        : user && sessionId
          ? 'active'
          : 'idle',
    userId: user?.id ?? null,
    userProfile: user,
    userName: user?.fullName?.trim() || user?.username?.trim() || null,
    userEmail: user?.email?.trim() || null,
    userRole: (publicUser as any)?.role || (user ? 'USER' : null),
    permissions: user && (!publicUser?.portalRole || publicUser.portalRole === 'user') ? ([...USER_PORTAL_PERMISSIONS] as UserPortalPermission[]) : [],
    isAuthenticated: !!user && !!sessionId,
    initializing,
    sessionExpired,
    gateOpen,
    gateMode,
    gateIntent,
    requireAuth,
    closeGate,
    setGateMode,
    setPublicUser,
    authenticate,
    logout,
    dismissSessionExpired
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { toUserAccount };
