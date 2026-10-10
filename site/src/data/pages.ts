/** Canonical route table — one place defines every page of the site. */

export type PageSlug = '' | 'platform' | 'solutions' | 'global' | 'about' | 'contact' | 'privacy' | 'terms';

export interface PageDef {
  slug: PageSlug;
  /** Path segment used for hreflang/canonical/sitemap. */
  path: string;
  /** Key into the string catalogue that holds the page title. */
  titleKey: 'home' | 'platform' | 'solutions' | 'global' | 'about' | 'contact' | 'privacy' | 'terms';
  /** Load in the primary navigation. */
  inNav: boolean;
}

export const PAGES: PageDef[] = [
  { slug: '', path: '', titleKey: 'home', inNav: false },
  { slug: 'platform', path: 'platform', titleKey: 'platform', inNav: true },
  { slug: 'solutions', path: 'solutions', titleKey: 'solutions', inNav: true },
  { slug: 'global', path: 'global', titleKey: 'global', inNav: true },
  { slug: 'about', path: 'about', titleKey: 'about', inNav: true },
  { slug: 'contact', path: 'contact', titleKey: 'contact', inNav: true },
  { slug: 'privacy', path: 'privacy', titleKey: 'privacy', inNav: false },
  { slug: 'terms', path: 'terms', titleKey: 'terms', inNav: false },
];

export const PAGE_BY_SLUG = new Map(PAGES.map((p) => [p.slug, p]));

/**
 * Resolve a page's navigation label from the string catalogue.
 *
 * `titleKey` covers every page, but `privacy` and `terms` are not navigation
 * items — they live in the footer and legal sections respectively. Keeping the
 * mapping here means components never index a catalogue section that may not
 * exist.
 */
export function pageLabel(t: { nav: Record<string, string>; footer: Record<string, string> }, key: PageDef['titleKey']): string {
  if (key === 'privacy') return t.footer.privacy;
  if (key === 'terms') return t.footer.terms;
  return t.nav[key];
}

/** All static routes the sitemap should list, relative and locale-prefixed. */
export function allRoutes(): Array<{ lang: string; path: string }> {
  return PAGES.map((p) => ({ lang: 'en', path: `/${p.path ? `${p.path}/` : ''}` }));
}
