/**
 * GlobalHealth — locale registry.
 *
 * Every language the site ships is declared here once. The rest of the codebase
 * derives script direction, `<html lang>`, font stack, hreflang alternates,
 * the language switcher and the numeric/date locale from this single source.
 */

export interface LocaleDef {
  /** BCP-47 code used in URLs (`/es/...`) and as the `lang` attribute. */
  code: string;
  /** Name in English, for the switcher's secondary line. */
  englishName: string;
  /** Endonym — shown as the primary label so each language is self-evident. */
  nativeName: string;
  /** Writing direction. */
  dir: 'ltr' | 'rtl';
  /** Which optional webfont to load on top of the Latin defaults. */
  font: 'latin' | 'arabic' | 'devanagari' | 'cjk';
  /** Emoji flag for the compact switcher chips. */
  flag: string;
  /** Intl locale used for numbers, dates and relative times. */
  intl: string;
}

export const LOCALES: LocaleDef[] = [
  { code: 'en', englishName: 'English',    nativeName: 'English',       dir: 'ltr', font: 'latin',     flag: '🌐', intl: 'en-GB' },
  { code: 'es', englishName: 'Spanish',    nativeName: 'Español',       dir: 'ltr', font: 'latin',     flag: '🇪🇸', intl: 'es-ES' },
  { code: 'fr', englishName: 'French',     nativeName: 'Français',      dir: 'ltr', font: 'latin',     flag: '🇫🇷', intl: 'fr-FR' },
  { code: 'de', englishName: 'German',     nativeName: 'Deutsch',       dir: 'ltr', font: 'latin',     flag: '🇩🇪', intl: 'de-DE' },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português',     dir: 'ltr', font: 'latin',     flag: '🇧🇷', intl: 'pt-BR' },
  { code: 'ar', englishName: 'Arabic',     nativeName: 'العربية',        dir: 'rtl', font: 'arabic',    flag: '🇸🇦', intl: 'ar' },
  { code: 'hi', englishName: 'Hindi',      nativeName: 'हिन्दी',          dir: 'ltr', font: 'devanagari', flag: '🇮🇳', intl: 'hi-IN' },
  { code: 'zh', englishName: 'Chinese',    nativeName: '中文',            dir: 'ltr', font: 'cjk',       flag: '🇨🇳', intl: 'zh-CN' },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code) as [string, ...string[]];
export const DEFAULT_LOCALE = 'en';

const BY_CODE = new Map(LOCALES.map((l) => [l.code, l]));

export function getLocale(code: string | undefined): LocaleDef {
  return (code && BY_CODE.get(code)) || BY_CODE.get(DEFAULT_LOCALE)!;
}

export function isLocale(code: string | undefined): boolean {
  return !!code && BY_CODE.has(code);
}

/** Build an in-site URL for a given locale + path (without the base). */
export function localePath(lang: string, path = ''): string {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return `/${lang}/${clean ? `${clean}/` : ''}`;
}

/**
 * Map a browser `Accept-Language` string onto one of our locales.
 * Handles regional subtags (`pt-BR` → `pt`) and q-value ordering.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q.split('=')[1]) || 0 : 1 };
    })
    .filter((r) => r.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (BY_CODE.has(tag)) return tag;
    const base = tag.split('-')[0];
    if (BY_CODE.has(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** BCP-47 tag for hreflang / og:locale (e.g. `es` → `es-es`, `en` → `en-gb`). */
/**
 * `hreflang` value for a locale.
 *
 * Deliberately the bare ISO 639-1 code, not a regional variant. The regional
 * `intl` tag is right for *formatting* (`pt-BR` decimal separators), but the
 * copy is not region-specific: publishing `hreflang="pt-BR"` for neutral
 * Portuguese tells search engines the page is Brazilian-only and cuts it out of
 * the cluster for Portugal. A language-only value is valid hreflang and matches
 * the `<html lang>` attribute exactly, which is what Google checks first.
 */
export function hreflangTag(locale: LocaleDef): string {
  return locale.code.toLowerCase();
}
