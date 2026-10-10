import en from './en';
import es from './es';
import fr from './fr';
import de from './de';
import pt from './pt';
import ar from './ar';
import hi from './hi';
import zh from './zh';
import { getLocale, isLocale, DEFAULT_LOCALE, LOCALES, LOCALE_CODES, localePath, negotiateLocale, hreflangTag } from './locales';
import type { LocaleDef } from './locales';

export type UI = typeof en;

const DICTIONARIES: Record<string, UI> = { en, es, fr, de, pt, ar, hi, zh };

export { LOCALES, LOCALE_CODES, DEFAULT_LOCALE, getLocale, isLocale, localePath, negotiateLocale, hreflangTag };
export type { LocaleDef };

/** Look up the active dictionary. Falls back to English, never throws. */
export function getStrings(lang: string | undefined): UI {
  return (lang && DICTIONARIES[lang]) || DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Tiny ICU-free interpolation: `Hello {name}` → `Hello Ada`.
 * Deliberately minimal — the catalogues contain no plurals or gender
 * agreement, which is where a full formatter would start to cost bytes.
 */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match
  );
}

/** Locale-aware number formatting used across the site. */
export function num(value: number, lang: string, options?: Intl.NumberFormatOptions): string {
  const intl = getLocale(lang).intl;
  try {
    return new Intl.NumberFormat(intl, options).format(value);
  } catch {
    return String(value);
  }
}
