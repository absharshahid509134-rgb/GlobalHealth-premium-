import { guestAuthEntry } from './core/authEntry';
import { PrivatePortal } from './components/portal/PrivatePortal';
import { ROLE_DESTINATIONS, roleForDestination, type PlatformRole } from './core/platformRoles';
import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Newspaper as NewspaperIcon } from 'lucide-react';
import { NavigationTab } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MedicalDisclaimer } from './components/MedicalDisclaimer';
import { HomePage } from './components/home/HomePage';
import { GlobalHealthAIAssistant } from './components/ai/GlobalHealthAIAssistant';
import { TermsPage } from './components/legal/TermsPage';
import { PrivacyPolicyPage } from './components/legal/PrivacyPolicyPage';
import { LanguageModal } from './components/LanguageModal';
import { ProtectedScreen, AuthLoading, SessionExpiredModal } from './components/auth/ProtectedScreen';
import { WorkspaceOverlay } from './components/WorkspaceOverlay';
import { useLocalization } from './context/LocalizationContext';
import { useAuth, toUserAccount } from './context/AuthContext';
import { AuthSubView } from './types/auth';
import { TERMS_VERSION } from './lib/policyVersions';

// Heavy workspaces (portals, CMS, health-records suite) are code-split so the
// public homepage never downloads them until a visitor actually opens one.
//
// The content directories below (diseases, medicines, lab tests, nutrition &
// recipes, wellness, calculators, hospitals, map, community, news) each embed
// large static datasets. Importing them eagerly pulled ~28MB of data into the
// initial bundle, so every first-time visitor paid for content they had not
// navigated to yet. They are lazy so the landing page stays light.
const ExplorePage = lazy(() =>
  import('./components/explore/ExplorePage').then((m) => ({ default: m.ExplorePage }))
);
const DiseasesSection = lazy(() =>
  import('./components/diseases/DiseasesSection').then((m) => ({ default: m.DiseasesSection }))
);
const MedicinesView = lazy(() =>
  import('./components/MedicinesView').then((m) => ({ default: m.MedicinesView }))
);
const MedicalTestsView = lazy(() =>
  import('./components/MedicalTestsView').then((m) => ({ default: m.MedicalTestsView }))
);
const NutritionLibraryView = lazy(() =>
  import('./components/NutritionLibraryView').then((m) => ({ default: m.NutritionLibraryView }))
);
const WellnessFitnessView = lazy(() =>
  import('./components/WellnessFitnessView').then((m) => ({ default: m.WellnessFitnessView }))
);
const CalculatorsView = lazy(() =>
  import('./components/CalculatorsView').then((m) => ({ default: m.CalculatorsView }))
);
const HospitalsView = lazy(() =>
  import('./components/HospitalsView').then((m) => ({ default: m.HospitalsView }))
);
const DoctorsView = lazy(() =>
  import('./components/DoctorsView').then((m) => ({ default: m.DoctorsView }))
);
const MedicalMapView = lazy(() =>
  import('./components/medical-map/MedicalMapView').then((m) => ({ default: m.MedicalMapView }))
);
const CommunityView = lazy(() =>
  import('./components/CommunityView').then((m) => ({ default: m.CommunityView }))
);
const NewsView = lazy(() =>
  import('./components/NewsView').then((m) => ({ default: m.NewsView }))
);
const AuthPage = lazy(() =>
  import('./components/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const AIAssistantView = lazy(() =>
  import('./components/AIAssistantView').then((m) => ({ default: m.AIAssistantView }))
);
const DashboardView = lazy(() =>
  import('./components/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const AppointmentsView = lazy(() =>
  import('./components/AppointmentsView').then((m) => ({ default: m.AppointmentsView }))
);
const MyHistoryView = lazy(() =>
  import('./components/MyHistoryView').then((m) => ({ default: m.MyHistoryView }))
);
const PrivacyConsentView = lazy(() =>
  import('./components/PrivacyConsentView').then((m) => ({ default: m.PrivacyConsentView }))
);
const DoctorAccessConsentPage = lazy(() =>
  import('./components/DoctorAccessConsentPage').then((m) => ({ default: m.DoctorAccessConsentPage }))
);
const PersonalDetailsView = lazy(() =>
  import('./components/PersonalDetailsView').then((m) => ({ default: m.PersonalDetailsView }))
);
const FullScreenNewsWorkspace = lazy(() =>
  import('./components/news/FullScreenNewsWorkspace').then((m) => ({ default: m.FullScreenNewsWorkspace }))
);

/** Shared spinner shown while a lazy workspace chunk loads. */
const RouteFallback: React.FC<{ fullScreen?: boolean }> = ({ fullScreen = false }) => (
  <div className={`flex ${fullScreen ? 'min-h-[100dvh]' : 'min-h-[60vh]'} w-full items-center justify-center bg-white`}>
    <div className="flex flex-col items-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-600" />
      <span className="text-xs font-bold text-slate-500">Loading workspace…</span>
    </div>
  </div>
);

import type { DashboardViewMode } from './types';
export type { DashboardViewMode };

// Tabs that expose personal/private data and require an authenticated session.
// NOTE: news-admin is intentionally NOT here — editorial staff authenticate via
// the News Management credential gate, not the patient sign-in.
const PROTECTED_TABS: NavigationTab[] = ['dashboard', 'appointments', 'privacy', 'my-history'];

// Portal workspaces render edge-to-edge; health-records destinations use the
// framed overlay with the health-records sub-navigation.
const FULLSCREEN_OVERLAY_TABS: NavigationTab[] = [
  'hospital-portal',
  'doctor-portal',
  'medauth',
  'pharmacy-portal',
  'news-admin',
  'news-management',
  'news-authority',
  'doctor-console',
];

// Destinations that overlap the public website instead of replacing it.
const OVERLAY_TABS: NavigationTab[] = [
  'dashboard',
  'privacy',
  'doctor-consent',
  'hospital-portal',
  'doctor-portal',
  'medauth',
  'pharmacy-portal',
  'news-admin',
  'news-authority',
  'news-management',
  'doctor-console',
];

const isOverlayTab = (tab: NavigationTab) => OVERLAY_TABS.includes(tab);

// Human-readable copy for each protected destination (used by the gate UI).
const PROTECTED_COPY: Partial<Record<NavigationTab, { title: string; feature: string }>> = {
  'my-history': {
    title: 'Your Health & Security History',
    feature: 'review who accessed your record, what was requested, and your consent decisions'
  },
  appointments: {
    title: 'Your Medical Appointments',
    feature: 'schedule appointments, check clinical schedules, and manage telehealth sessions'
  },
  dashboard: {
    title: 'Your Personal Health Dashboard',
    feature: 'view your private health dashboard and manage doctor access'
  },
  privacy: {
    title: 'Doctors & Health Access',
    feature: 'review doctor access requests and manage your health-record privacy'
  }
};

const OVERLAY_META: Partial<Record<NavigationTab, { title: string; subtitle: string; badge: string; theme: 'light' | 'dark' }>> = {
  dashboard: {
    title: 'My Health Records',
    subtitle: 'Personal health dashboard and doctor access',
    badge: 'FHIR R4 Aligned',
    theme: 'light',
  },
  privacy: {
    title: 'My Health Records',
    subtitle: 'Doctor access, consent tokens and sharing rules',
    badge: 'Patient Controlled',
    theme: 'light',
  },
  'doctor-consent': {
    title: 'My Health Records',
    subtitle: 'Doctor access, consent tokens and sharing rules',
    badge: 'Patient Controlled',
    theme: 'light',
  },
  medauth: {
    title: 'Doctor Portal',
    subtitle: 'State Board Registry & Private Doctor Portal — MedAuth Engine™',
    badge: 'MedAuth Engine™',
    theme: 'light',
  },
  'doctor-portal': {
    title: 'Doctor Portal',
    subtitle: 'State Board Registry & Private Doctor Portal — MedAuth Engine™',
    badge: 'MedAuth Engine™',
    theme: 'light',
  },
  'doctor-console': {
    title: 'Verified Doctor Console',
    subtitle: 'Authorized patient-record access and consent requests',
    badge: 'Verified MD',
    theme: 'light',
  },
  'hospital-portal': {
    title: 'Hospital Portal',
    subtitle: 'Inpatient bed telemetry, multi-wing capacity, ambulance dispatch & staff management',
    badge: 'GlobalHealth Enterprise',
    theme: 'light',
  },
  'pharmacy-portal': {
    title: 'Pharmacy Porter',
    subtitle: 'Authorized Pharmacy Portal Website & Verified Pharmacy Partners',
    badge: 'Enterprise v4.2',
    theme: 'dark',
  },
  'news-management': {
    title: 'News Management',
    subtitle: 'Editorial CMS workspace & Verified Authority Portal',
    badge: 'Editorial CMS',
    theme: 'dark',
  },
  'news-admin': {
    title: 'News Management',
    subtitle: 'Editorial CMS workspace for public health announcements',
    badge: 'Editorial CMS',
    theme: 'light',
  },
  'news-authority': {
    title: 'Verified Authority Portal',
    subtitle: 'Public health agencies and institutional announcements',
    badge: 'Verified Authority',
    theme: 'light',
  },
};

export default function App() {
  const { currentLanguage, direction } = useLocalization();
  const { user: currentUser, publicUser, setPublicUser, initializing, requireAuth, gateOpen, gateMode, logout, authenticate, closeGate } = useAuth();
  const [authRole, setAuthRole] = useState<PlatformRole>('user');
  const activeRole: PlatformRole = publicUser?.portalRole || 'user';
  const [currentTab, setCurrentTabState] = useState<NavigationTab>('auth');
  const [overlayTab, setOverlayTab] = useState<NavigationTab | null>(null);
  // Optional prompt pre-filled when a user asks AI from a context page (e.g. a disease).
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
  // The AI workspace stays mounted after its first open so the guest session
  // conversation survives page navigation — but it is NOT mounted (nor its
  // lazy chunk loaded) until the user actually opens the assistant.
  const [hasOpenedAssistant, setHasOpenedAssistant] = useState(false);
  // Which view the dedicated authentication page (#auth) opens on.
  const [authInitialView, setAuthInitialView] = useState<AuthSubView>('login');
  // Which section of Activity & Security History the account menu requested.
  const [historyInitialTab, setHistoryInitialTab] = useState<string>('all');
  // Saved library is strictly per-user. Keyed namespacing + reset on identity
  // change guarantees one account never sees another's saved content and that
  // logging out fully clears the visible saved library.
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const scope = currentUser ? `user_${currentUser.id}` : 'guest';
    try {
      const stored = localStorage.getItem(`globalhealth_${scope}_saved_library`);
      setSavedIds(stored ? JSON.parse(stored) : []);
    } catch {
      setSavedIds([]);
    }
  }, [currentUser?.id]);

  const persistSaved = (ids: string[]) => {
    const scope = currentUser ? `user_${currentUser.id}` : 'guest';
    try {
      if (ids.length) localStorage.setItem(`globalhealth_${scope}_saved_library`, JSON.stringify(ids));
      else localStorage.removeItem(`globalhealth_${scope}_saved_library`);
    } catch {
      // ignore storage failures
    }
  };
  // Full-screen news workspace article id (replaces PUBLIC READER PREVIEW)
  const [activeNewsArticleId, setActiveNewsArticleId] = useState<string | null>(null);

  // ---- Hash-based deep linking + back-button protection for protected URLs ----
  const VALID_TABS: NavigationTab[] = [
    'home', 'explore', 'diseases', 'medicines', 'medical-tests', 'nutrition', 'recipes', 'wellness',
    'calculators', 'ai-assistant', 'hospitals', 'doctors', 'appointments', 'medical-map', 'community',
    'news', 'news-admin', 'dashboard', 'hospital-portal', 'doctor-portal', 'medauth',
    'pharmacy-portal', 'privacy', 'doctor-consent', 'doctor-console', 'my-history', 'news-authority', 'news-management', 'auth', 'terms', 'privacy-policy'
  ];

  const parseHash = useCallback((): { tab: NavigationTab | null; newsArticleId?: string } => {
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    if (!rawHash) {
      // Also check pathname for /news/<id> direct URL per spec section 21
      const path = window.location.pathname;
      if (path.startsWith('/news/')) {
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const id = decodeURIComponent(parts.slice(1).join('/'));
          if (id) return { tab: 'news', newsArticleId: id };
        }
      }
      return { tab: null };
    }
    const withoutQuery = rawHash.split('?')[0];
    // Support #news/<id> or #/news/<id>
    if (withoutQuery.startsWith('news/')) {
      const id = decodeURIComponent(withoutQuery.slice(5));
      if (id) return { tab: 'news', newsArticleId: id };
    }
    const legacyPortal = withoutQuery.split('/')[0];
    if (roleForDestination(legacyPortal) && withoutQuery.includes('/')) return { tab: legacyPortal as NavigationTab };
    // Exact tab match
    if ((VALID_TABS as string[]).includes(withoutQuery)) {
      return { tab: withoutQuery as NavigationTab };
    }
    // Fallback: first segment is tab, second is article id
    const segs = withoutQuery.split('/').filter(Boolean);
    if (segs.length >= 2 && segs[0] === 'news') {
      const id = decodeURIComponent(segs.slice(1).join('/'));
      return { tab: 'news', newsArticleId: id };
    }
    // Check pathname as fallback when hash is just #news but pathname has /news/<id>
    const path = window.location.pathname;
    if (path.startsWith('/news/')) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 2) {
        const id = decodeURIComponent(parts.slice(1).join('/'));
        if (id) return { tab: 'news', newsArticleId: id };
      }
    }
    return { tab: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabFromHash = useCallback((): NavigationTab | null => {
    const parsed = parseHash();
    return parsed.tab;
  }, [parseHash]);

  const applyingHashRef = useRef(false);
  const entryResolvedRef = useRef(false);
  const [entryReady, setEntryReady] = useState(false);

  useEffect(() => {
    const apply = () => {
      if (initializing || applyingHashRef.current) return;
      // Every fresh signed-out visit starts at the same role-selecting page.
      // After entry, public navigation (including legal links) remains usable.
      if (!entryResolvedRef.current) {
        entryResolvedRef.current = true;
        setEntryReady(true);
        if (!currentUser) {
          const entry = guestAuthEntry(window.location.hash);
          setAuthRole(entry.role);
          setAuthInitialView(entry.mode);
          setOverlayTab(null);
          setCurrentTabState('auth');
          window.history.replaceState({}, '', '/#auth');
          return;
        }
      }
      const { tab, newsArticleId } = parseHash();
      if (!tab) return;
      // News article deep-link
      if (tab === 'news' && newsArticleId) {
        setActiveNewsArticleId(newsArticleId);
        setOverlayTab(null);
        setCurrentTabState('news');
        return;
      }
      if (tab === 'news' && !newsArticleId) {
        // Listing - clear article
        setActiveNewsArticleId(null);
      }
      if (isOverlayTab(tab)) {
        setOverlayTab(tab);
        setCurrentTabState((prev) => (isOverlayTab(prev) || prev === 'auth' ? 'home' : prev));
      } else {
        setOverlayTab(null);
        setCurrentTabState(tab);
        if (tab === 'ai-assistant') setHasOpenedAssistant(true);
      }
    };
    apply();
    window.addEventListener('hashchange', apply);
    // Also handle popstate for pathname /news/<id> direct navigation
    window.addEventListener('popstate', apply);
    return () => {
      window.removeEventListener('hashchange', apply);
      window.removeEventListener('popstate', apply);
    };
  }, [parseHash, initializing, currentUser]);

  const [dashboardViewMode, setDashboardViewMode] = useState<DashboardViewMode>('dashboard');

  // Track the destination the visitor wanted when the gate was shown.
  const restoredPortalRef = useRef(false);
  const intendedTabRef = useRef<NavigationTab | null>(null);
  const intendedModeRef = useRef<DashboardViewMode | undefined>(undefined);
  const openGate = useCallback(
    (intent: { tab?: string; feature?: string } | null, mode: 'login' | 'signup') => {
      intendedTabRef.current = (intent?.tab as NavigationTab) || null;
      requireAuth(intent || {}, mode);
    },
    [requireAuth]
  );

  const writeHash = (tab: NavigationTab, newsArticleId?: string | null) => {
    let next: string;
    if (tab === 'news' && newsArticleId) {
      next = `#news/${encodeURIComponent(newsArticleId)}`;
    } else {
      next = `#${tab}`;
    }
    const currentRaw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    const desiredRaw = next.replace(/^#\/?/, '');
    if (currentRaw !== desiredRaw) {
      applyingHashRef.current = true;
      window.location.hash = next;
      window.setTimeout(() => {
        applyingHashRef.current = false;
      }, 0);
    }
    // If we are on a direct /news/<id> pathname, push to history to clear pathname when going back to listing
    if (window.location.pathname.startsWith('/news/') && !(tab === 'news' && newsArticleId)) {
      try {
        window.history.pushState({}, '', next);
      } catch {}
    }
  };

  const closeOverlay = useCallback(() => {
    setOverlayTab(null);
    writeHash(currentTab, activeNewsArticleId && currentTab === 'news' ? activeNewsArticleId : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, activeNewsArticleId]);

  const openNewsArticle = useCallback((articleId: string) => {
    setActiveNewsArticleId(articleId);
    setOverlayTab(null);
    setCurrentTabState('news');
    writeHash('news', articleId);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const closeNewsArticle = useCallback(() => {
    setActiveNewsArticleId(null);
    setCurrentTabState('news');
    writeHash('news', null);
  }, []);

  const setCurrentTab = useCallback((tab: NavigationTab, dashboardMode?: DashboardViewMode) => {
    if (dashboardMode) {
      setDashboardViewMode(dashboardMode);
      intendedModeRef.current = dashboardMode;
    }
    // Navigating to a protected destination while signed out → show the gate,
    // preserving the destination so we return after login. Never render private data.
    if (PROTECTED_TABS.includes(tab) && !currentUser) {
      const copy = PROTECTED_COPY[tab];
      openGate({ tab, feature: copy?.feature }, 'login');
      return;
    }
    if (isOverlayTab(tab)) {
      setCurrentTabState(prev => prev === 'auth' ? 'home' : prev);
      setOverlayTab(tab);
      writeHash(tab);
      return;
    }
    // Leaving news article view when navigating elsewhere
    if (tab !== 'news') {
      setActiveNewsArticleId(null);
    }
    setOverlayTab(null);
    setCurrentTabState(tab);
    if (tab === 'ai-assistant') setHasOpenedAssistant(true);
    writeHash(tab, tab === 'news' ? activeNewsArticleId : null);
  }, [currentUser, openGate, activeNewsArticleId]);

  // Navbar / footer navigation wrapper — clears any contextual AI prompt when
  // the user opens the assistant directly (not from a context page).
  const handleNavTabChange = useCallback(
    (tab: NavigationTab, dashboardMode?: DashboardViewMode) => {
      if (tab === 'ai-assistant') setAiInitialPrompt(undefined);
      setCurrentTab(tab, dashboardMode);
    },
    [setCurrentTab]
  );


  // Authentication entry points and legacy portal URLs all resolve here.
  useEffect(() => {
    if (initializing || !entryReady) return;
    const destination = overlayTab || currentTab;
    const requestedRole = roleForDestination(destination);
    if (!currentUser && (gateOpen || requestedRole)) {
      setAuthRole(requestedRole || 'user');
      const suffix = window.location.hash.split('/')[1]?.split('?')[0];
      const mode = suffix === 'signup' ? 'signup' : suffix === 'forgot-password' ? 'forgot-password' : suffix === 'reset-password' ? 'reset-password' : gateMode;
      setAuthInitialView(mode);
      closeGate();
      intendedTabRef.current = null;
      setOverlayTab(null);
      setCurrentTabState('auth');
      writeHash('auth');
    } else if (currentUser && (destination === 'auth' && (authInitialView !== 'security' || activeRole !== 'user') || (destination === 'home' && !restoredPortalRef.current && (!tabFromHash() || tabFromHash() === 'home')))) {
      restoredPortalRef.current = true;
      intendedTabRef.current = null;
      setCurrentTab(ROLE_DESTINATIONS[activeRole] as NavigationTab);
    }
  }, [currentUser, initializing, entryReady, gateOpen, gateMode, overlayTab, currentTab, activeRole, authInitialView]);

  // All authentication routes through the secure, server-validated gate.
  // There is no client-side credential checking and no plaintext secret
  // handling in the browser.
  const handleOpenAuthModal = (mode: 'login' | 'signup' = 'login') => {
    requireAuth({ feature: 'access your personal content and private account data' }, mode);
  };

  // Explicit "Log In" / "Sign Up" CTAs open the dedicated full-page
  // authentication experience (#auth) instead of the inline gate.
  const handleOpenAuthPage = (mode: AuthSubView = 'login') => {
    setAuthInitialView(mode);
    setCurrentTab('auth');
  };

  // Signed-in users open their Security & Privacy settings (password, 2FA,
  // sessions, audit trail, privacy & consent) via the full auth page.
  const handleOpenSecuritySettings = () => {
    setAuthInitialView('security');
    setCurrentTab('auth');
  };

  const handleToggleSave = (id: string) => {
    if (!currentUser) {
      requireAuth({ feature: 'save items to your private library' }, 'login');
      return;
    }
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      persistSaved(next);
      return next;
    });
  };

  // While the session is being verified, show a neutral loading state for
  // protected destinations — never flash private content.
  const isProtected = PROTECTED_TABS.includes(currentTab) || (overlayTab ? PROTECTED_TABS.includes(overlayTab) : false);
  const showSecureLoading = !entryReady || (initializing && (isProtected || currentTab === 'auth'));
  const deniedPage = !!currentUser && !!roleForDestination(currentTab) && roleForDestination(currentTab) !== activeRole;

  const persistUserPatch = (updated: typeof currentUser) => {
    if (!updated) return;
    try {
      localStorage.setItem('globalhealth_user_session', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const overlayMeta = overlayTab ? OVERLAY_META[overlayTab] : undefined;
  const isAuthPage = currentTab === 'auth';

  // A full-page authentication route always starts at the top of the viewport,
  // including when launched from a scrolled public page.
  useEffect(() => {
    if (isAuthPage) window.scrollTo(0, 0);
  }, [isAuthPage]);

  // Health-records destinations share one overlay header with a two-tab
  // sub-navigation: Personal health dashboard | Doctor access.
  const isHealthRecordsOverlay =
    overlayTab === 'dashboard' || overlayTab === 'privacy' || overlayTab === 'doctor-consent';

  const openHealthRecords = (tab: 'dashboard' | 'doctor-access') => {
    if (tab === 'dashboard') {
      setDashboardViewMode('dashboard');
      setOverlayTab('dashboard');
      writeHash('dashboard');
    } else {
      setOverlayTab('doctor-consent');
      writeHash('doctor-consent');
    }
  };

  const healthSubnav = isHealthRecordsOverlay ? (
    <div className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-1.5 sm:px-6" role="tablist" aria-label="Health records sections">
        <button
          type="button"
          role="tab"
          aria-selected={overlayTab === 'dashboard'}
          onClick={() => openHealthRecords('dashboard')}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
            overlayTab === 'dashboard'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Personal health dashboard
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={overlayTab === 'privacy' || overlayTab === 'doctor-consent'}
          onClick={() => openHealthRecords('doctor-access')}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
            overlayTab === 'privacy' || overlayTab === 'doctor-consent'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          Doctor access
        </button>
      </div>
    </div>
  ) : null;

  const renderOverlayBody = () => {
    if (!overlayTab) return null;

    if (initializing) return <AuthLoading />;
    const requiredRole = roleForDestination(overlayTab);
    if (requiredRole && !currentUser) return <AuthLoading />;
    if (requiredRole && activeRole !== requiredRole) return (
      <div role="alert" className="p-12 text-center"><h2 className="text-2xl font-bold">Access denied</h2><p className="mt-3 text-slate-600">Your account is not authorized for this portal.</p><button className="mt-6 font-semibold text-medical-700" onClick={() => setCurrentTab(ROLE_DESTINATIONS[activeRole] as NavigationTab)}>Open my portal</button></div>
    );
    if (requiredRole && requiredRole !== 'user') return <PrivatePortal key={`${currentUser?.id}:${requiredRole}`} role={requiredRole} onExit={closeOverlay} />;


    if (overlayTab === 'dashboard' && !currentUser) {
      return (
        <ProtectedScreen
          title={PROTECTED_COPY['dashboard']?.title}
          feature={PROTECTED_COPY['dashboard']?.feature}
        />
      );
    }

    if (overlayTab === 'dashboard' && currentUser) {
      if (dashboardViewMode === 'details') {
        return (
          <PersonalDetailsView key={currentUser?.id}
            currentUser={currentUser}
            onUpdateUser={persistUserPatch}
          />
        );
      }
      return (
        <DashboardView key={currentUser?.id}
          savedIds={savedIds}
          onToggleSave={handleToggleSave}
          currentUser={currentUser}
          initialViewMode={dashboardViewMode === 'ehr' || dashboardViewMode === 'saved' ? dashboardViewMode : 'dashboard'}
          onUpdateUser={persistUserPatch}
          hideModeSwitcher
        />
      );
    }

    if (overlayTab === 'doctor-consent') {
      return <DoctorAccessConsentPage onTabChange={setCurrentTab} />;
    }

    if (overlayTab === 'privacy' && !currentUser) {
      return (
        <ProtectedScreen
          title={PROTECTED_COPY['privacy']?.title}
          feature={PROTECTED_COPY['privacy']?.feature}
        />
      );
    }
    if (overlayTab === 'privacy' && currentUser) {
      return <PrivacyConsentView key={currentUser?.id} />;
    }

    return null;
  };

  return (
    <div 
      className="flex min-h-screen flex-col bg-white text-slate-900 antialiased font-sans transition-opacity duration-150"
      dir={direction}
    >
      {/* Keep the dedicated login experience clear of the public-site chrome. */}
      {!isAuthPage && (
        <>
          {/* Top Announcement Strip Disclaimer */}
          <div className="bg-slate-50 border-b border-slate-200/80 py-1.5 px-4">
            <div className="mx-auto max-w-7xl">
              <MedicalDisclaimer compact />
            </div>
          </div>

          {/* Main Navbar */}
          <Navbar
            currentTab={overlayTab || currentTab}
            onTabChange={handleNavTabChange}
            savedCount={savedIds.length}
            currentUser={currentUser}
            accountDestination={ROLE_DESTINATIONS[activeRole] as NavigationTab}
            onOpenAuthModal={handleOpenAuthModal}
            onOpenAuthPage={handleOpenAuthPage}
            onOpenSecuritySettings={handleOpenSecuritySettings}
            onOpenHistoryTab={setHistoryInitialTab}
            onLogout={async () => {
              await logout();
              setOverlayTab(null);
              setCurrentTabState('home');
              writeHash('home');
            }}
          />
        </>
      )}

      {/* Primary Main View Container — stays mounted under overlays */}
      <main className={isAuthPage ? 'min-h-[100dvh] flex-1' : 'flex-1'}>
        {/* One route-level Suspense boundary: every lazily code-split view below
            resolves through this fallback. */}
        <Suspense fallback={<RouteFallback fullScreen={isAuthPage} />}>
        {/* Policy-update re-acceptance banner: when the accepted Terms/Privacy
            versions are older than the current published versions, surface a
            clear path to review and accept (spec: material-change re-acceptance). */}
        {currentUser &&
          currentUser.consent &&
          currentUser.consent.termsVersion !== TERMS_VERSION &&
          currentTab !== 'auth' && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5">
              <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <p className="text-xs font-medium text-amber-900">
                  <strong>Updated policies:</strong> We&apos;ve updated our Terms &amp; Conditions and Privacy Policy.
                  Review them and accept the current versions to continue using your account.
                </p>
                <button
                  type="button"
                  onClick={handleOpenSecuritySettings}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-amber-700 cursor-pointer"
                >
                  Review &amp; Accept
                </button>
              </div>
            </div>
          )}

        {showSecureLoading && !overlayTab && <AuthLoading fullScreen={isAuthPage} />}

        {deniedPage && <div role="alert" className="p-16 text-center"><h2 className="text-2xl font-bold">Access denied</h2><p className="mt-3">Your account cannot access this workspace.</p></div>}
        {!showSecureLoading && !deniedPage && (
          <>
        {currentTab === 'home' && (
          <HomePage
            onTabChange={setCurrentTab}
            currentUser={currentUser}
            onOpenAuth={handleOpenAuthModal}
            onOpenNewsArticle={openNewsArticle}
          />
        )}

        {(currentTab === 'nutrition' || currentTab === 'recipes') && (
          <NutritionLibraryView
            key={currentTab}
            initialSection="recipes"
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
            onRequestAuth={() => handleOpenAuthModal('login')}
            onNavigate={setCurrentTab}
            onAskAI={(prompt) => {
              setAiInitialPrompt(prompt);
              setCurrentTab('ai-assistant');
            }}
          />
        )}

        {currentTab === 'wellness' && (
          <WellnessFitnessView
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
          />
        )}

        {currentTab === 'diseases' && (
          <DiseasesSection
            savedIds={savedIds}
            onToggleSave={handleToggleSave}
            onNavigate={setCurrentTab}
            onAskAI={(prompt) => {
              setAiInitialPrompt(prompt);
              setCurrentTab('ai-assistant');
            }}
            isAuthenticated={!!currentUser}
          />
        )}

        {currentTab === 'medicines' && (
          <MedicinesView 
            savedIds={currentUser ? savedIds : []}
            onToggleSave={handleToggleSave} 
            isAuthenticated={!!currentUser}
            onRequireAuth={(feature) => requireAuth({ feature }, 'login')}
            onNavigate={setCurrentTab}
            onAskAI={(prompt) => {
              setAiInitialPrompt(prompt);
              setCurrentTab('ai-assistant');
            }}
          />
        )}

        {currentTab === 'medical-tests' && <MedicalTestsView />}

        {currentTab === 'calculators' && <CalculatorsView />}

        {currentTab === 'explore' && (
          <ExplorePage
            currentTab={currentTab}
            onNavigate={handleNavTabChange}
            onHome={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'auth' && (
          <Suspense fallback={<RouteFallback />}>
            <AuthPage
              initialView={authInitialView}
              initialRole={authRole}
              currentUser={publicUser}
              onLoginSuccess={(user, token) => {
                authenticate(toUserAccount(user), token || '', user);
                intendedTabRef.current = null;
                const destination = ROLE_DESTINATIONS[user.portalRole || 'user'] as NavigationTab;
                restoredPortalRef.current = true;
                setCurrentTabState('home');
                setOverlayTab(destination);
                writeHash(destination);
              }}
              onLogout={async () => {
                await logout();
              }}
              onUpdateUser={(updated) => {
                setPublicUser(updated);
                persistUserPatch(toUserAccount(updated));
              }}
              onReturnToHome={() => setCurrentTab('home')}
              onNavigateToDashboard={() => setCurrentTab('dashboard')}
              onOpenLegalPage={(tab) => setCurrentTab(tab)}
            />
          </Suspense>
        )}

        {currentTab === 'terms' && <TermsPage onNavigate={handleNavTabChange} />}

        {currentTab === 'privacy-policy' && <PrivacyPolicyPage onNavigate={handleNavTabChange} />}

        {/* AI Assistant workspace: the lazy chunk loads on first open, then
            the workspace stays mounted (hidden) so guest session
            conversations persist across page navigation. */}
        {(currentTab === 'ai-assistant' || hasOpenedAssistant) && (
        <div hidden={currentTab !== 'ai-assistant'} className={currentTab === 'ai-assistant' ? '' : 'hidden'}>
          <Suspense fallback={<RouteFallback />}>
            <AIAssistantView
              currentLanguage={currentLanguage}
              initialPrompt={aiInitialPrompt}
              active={currentTab === 'ai-assistant'}
              onBack={() => setCurrentTab('home')}
              onNavigate={(tab) => handleNavTabChange(tab as Parameters<typeof handleNavTabChange>[0])}
              onLogout={async () => {
                await logout();
                setCurrentTabState('home');
                writeHash('home');
              }}
            />
          </Suspense>
        </div>
        )}

        {/* Hospitals and Doctors are two separate pages with their own routes. */}
        {currentTab === 'hospitals' && (
          <HospitalsView
            onTabChange={setCurrentTab}
            isAuthenticated={!!currentUser}
            onRequireAuth={(feature) => requireAuth({ feature }, 'login')}
          />
        )}

        {currentTab === 'doctors' && (
          <DoctorsView
            onTabChange={setCurrentTab}
            isAuthenticated={!!currentUser}
            onRequireAuth={(feature) => requireAuth({ feature }, 'login')}
          />
        )}

        {currentTab === 'medical-map' && (
          <MedicalMapView onNavigateToHospitalProfile={() => setCurrentTab('hospitals')} />
        )}

        {currentTab === 'community' && (
          <CommunityView
            isAuthenticated={!!currentUser}
            currentUser={currentUser}
            onRequireAuth={(feature) => requireAuth({ feature }, 'login')}
          />
        )}

        {currentTab === 'news' && activeNewsArticleId && (
          <Suspense fallback={<RouteFallback />}>
            <FullScreenNewsWorkspace
              articleId={activeNewsArticleId}
              onBack={closeNewsArticle}
              onNavigateToSearch={() => {
                // Focus search in hero or open news search
                window.dispatchEvent(new CustomEvent('gh:focus-search'));
              }}
            />
          </Suspense>
        )}
        {currentTab === 'news' && !activeNewsArticleId && (
          <NewsView 
            onOpenArticle={openNewsArticle}
          />
        )}

        {/* Protected: Health & Security History (patient-only, append-only) */}
        {currentTab === 'my-history' && !currentUser && (
          <ProtectedScreen
            title={PROTECTED_COPY['my-history']?.title}
            feature={PROTECTED_COPY['my-history']?.feature}
          />
        )}
        {currentTab === 'my-history' && currentUser && (
          <Suspense fallback={<RouteFallback />}>
            <MyHistoryView initialTab={historyInitialTab as any} />
          </Suspense>
        )}

        {/* Protected: personal appointments manager */}
        {currentTab === 'appointments' && !currentUser && (
          <ProtectedScreen
            title={PROTECTED_COPY['appointments']?.title}
            feature={PROTECTED_COPY['appointments']?.feature}
          />
        )}
        {currentTab === 'appointments' && currentUser && (
          <Suspense fallback={<RouteFallback />}>
            <AppointmentsView key={currentUser?.id}
              onTabChange={setCurrentTab}
              isAuthenticated={!!currentUser}
              onRequireAuth={(feature) => requireAuth({ feature }, 'login')}
            />
          </Suspense>
        )}
          </>
        )}
        </Suspense>
      </main>

      {/* The public-site footer stays out of the full-screen auth experience. */}
      {!isAuthPage && <Footer onTabChange={handleNavTabChange} />}

      {/* Global 100-Language Selector Modal */}
      <LanguageModal />

      {/* Session-expired overlay */}
      <SessionExpiredModal />

      {/* Specialized portals & health-records workspaces overlap the website */}
      {overlayTab && overlayMeta && (
        <WorkspaceOverlay
          title={overlayMeta.title}
          subtitle={overlayMeta.subtitle}
          badge={overlayMeta.badge}
          theme={overlayMeta.theme}
          layout={FULLSCREEN_OVERLAY_TABS.includes(overlayTab) ? 'fullscreen' : 'framed'}
          onClose={closeOverlay}
          headerExtra={healthSubnav}
        >
          <Suspense fallback={<RouteFallback />}>{renderOverlayBody()}</Suspense>
        </WorkspaceOverlay>
      )}

      {/* Floating AI Assistant — persistent bottom-right doctor-boy avatar.
          Hidden inside the AI workspace itself and inside fullscreen overlays. */}
      {!isAuthPage && !overlayTab && currentTab !== 'ai-assistant' && (
        <GlobalHealthAIAssistant
          onOpen={() => {
            setAiInitialPrompt(undefined);
            setCurrentTab('ai-assistant');
          }}
        />
      )}

    </div>
  );
}
