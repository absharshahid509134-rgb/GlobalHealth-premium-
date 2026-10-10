import type { UI } from '~/i18n';
import type { LocaleDef } from '~/i18n/locales';

export type SearchKind = 'page' | 'topic' | 'medicine' | 'test' | 'action';

export interface SearchEntry {
  id: string;
  kind: SearchKind;
  /** Title shown in the palette. */
  title: string;
  /** Secondary line shown beneath the title. */
  subtitle: string;
  /** In-site path (always English-rooted; the palette rewrites the locale). */
  path: string;
  /** Extra keywords that should match but are not displayed. */
  keywords?: string[];
}

/**
 * The ⌘K palette searches this index.
 *
 * It is deliberately *not* a client-side copy of the whole medical database —
 * that would cost megabytes on first paint. The index covers navigation and the
 * highest-intent tasks; deep clinical search is a server concern that this
 * static site does not pretend to do.
 */
export function buildSearchIndex(t: UI): SearchEntry[] {
  return [
    // --- Pages -----------------------------------------------------------
    { id: 'page-home', kind: 'page', title: t.nav.home, subtitle: t.site.tagline, path: '/' },
    { id: 'page-platform', kind: 'page', title: t.nav.platform, subtitle: t.pages.platform.lead, path: '/platform/' },
    { id: 'page-solutions', kind: 'page', title: t.nav.solutions, subtitle: t.pages.solutions.lead, path: '/solutions/' },
    { id: 'page-global', kind: 'page', title: t.nav.global, subtitle: t.pages.global.lead, path: '/global/' },
    { id: 'page-about', kind: 'page', title: t.nav.about, subtitle: t.pages.about.lead, path: '/about/' },
    { id: 'page-contact', kind: 'page', title: t.nav.contact, subtitle: t.pages.contact.lead, path: '/contact/' },
    { id: 'page-privacy', kind: 'page', title: t.footer.privacy, subtitle: t.common.lastReviewed, path: '/privacy/' },
    { id: 'page-terms', kind: 'page', title: t.footer.terms, subtitle: t.common.lastReviewed, path: '/terms/' },

    // --- High-intent tasks ------------------------------------------------
    { id: 'action-emergency', kind: 'action', title: t.nav.emergency, subtitle: t.pages.global.emergency.lead, path: '/global/#emergency', keywords: ['emergency', 'ambulance', 'police', 'urgent', '112', '911', '999'] },
    { id: 'action-assistant', kind: 'action', title: t.home.modules.items[4].title, subtitle: t.home.modules.items[4].desc, path: '/platform/#ai', keywords: ['ai', 'assistant', 'chat', 'ask'] },
    { id: 'action-medicine', kind: 'action', title: t.home.modules.items[1].title, subtitle: t.home.modules.items[1].desc, path: '/platform/#medicines', keywords: ['drug', 'medicine', 'pill', 'dosage', 'interaction'] },
    { id: 'action-tests', kind: 'action', title: t.home.modules.items[2].title, subtitle: t.home.modules.items[2].desc, path: '/platform/#diagnostics', keywords: ['lab', 'test', 'blood', 'fasting', 'result'] },
    { id: 'action-directory', kind: 'action', title: t.home.modules.items[3].title, subtitle: t.home.modules.items[3].desc, path: '/platform/#directory', keywords: ['hospital', 'clinic', 'doctor', 'pharmacy', 'find care'] },

    // --- Trust & safety ---------------------------------------------------
    { id: 'trust-standards', kind: 'topic', title: t.home.standards.title, subtitle: t.home.standards.lead, path: '/#standards', keywords: ['trust', 'review', 'sources', 'safety'] },
    { id: 'trust-governance', kind: 'topic', title: t.pages.about.governance.title, subtitle: t.pages.about.governance.items[0].title, path: '/about/#governance', keywords: ['governance', 'editorial', 'policy', 'accountability'] },
    { id: 'trust-accessibility', kind: 'topic', title: t.pages.contact.accessibility.title, subtitle: t.pages.contact.accessibility.desc, path: '/contact/#accessibility', keywords: ['accessibility', 'a11y', 'screen reader', 'barrier'] },
    { id: 'trust-privacy', kind: 'topic', title: t.pages.platform.security.title, subtitle: t.pages.platform.security.items[1], path: '/platform/#security', keywords: ['privacy', 'security', 'encryption', 'data'] },
  ];
}

/**
 * Rewrite an English-rooted path for the active locale.
 * `/platform/` → `/fr/platform/`, `/` → `/fr/`.
 */
export function localizePath(path: string, lang: string): string {
  if (lang === 'en') return path;
  const rest = path.replace(/^\/+/, '');
  return rest ? `/${lang}/${rest}` : `/${lang}/`;
}

/** Flat, ranked search over the index. Cheap enough to run on every keystroke. */
export function searchIndex(index: SearchEntry[], raw: string, limit = 8): SearchEntry[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = index
    .map((entry) => {
      const haystackTitle = entry.title.toLowerCase();
      const haystackSub = entry.subtitle.toLowerCase();
      const haystackExtra = (entry.keywords ?? []).join(' ').toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (haystackTitle.startsWith(term)) score += 12;
        else if (haystackTitle.includes(term)) score += 8;
        if (haystackSub.includes(term)) score += 3;
        if (haystackExtra.includes(term)) score += 5;
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));

  return scored.slice(0, limit).map((r) => r.entry);
}

/** Group id → lucide icon name used by the palette renderer. */
export const SEARCH_KIND_ORDER: SearchKind[] = ['action', 'page', 'topic'];

export function kindLabel(kind: SearchKind, t: UI): string {
  switch (kind) {
    case 'page':
      return t.nav.sectionPrimary;
    case 'action':
      return t.nav.sectionExplore;
    default:
      return t.a11y.sectionLabel;
  }
}

export function kindIcon(kind: SearchKind): string {
  switch (kind) {
    case 'page':
      return 'page';
    case 'action':
      return 'spark';
    case 'medicine':
      return 'pill';
    case 'test':
      return 'flask';
    default:
      return 'shield';
  }
}

export type { LocaleDef };
