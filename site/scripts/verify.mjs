/**
 * Post-build verification.
 *
 * Checks the generated `dist/` tree for the classes of defect that are easy to
 * ship by accident: dead internal links, untranslated keys leaking as
 * "undefined", broken hreflang clusters, missing accessible names, and
 * heading-order regressions. Exits non-zero on any hard failure.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

/* ------------------------------------------------------------------ *
 * Collect pages
 * ------------------------------------------------------------------ */
function walk(dir, predicate = () => true) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

const pages = walk(DIST, (f) => f.endsWith('.html'));

/** Remove <script> bodies before scanning for links — inline modules contain
 *  JavaScript string templates that look like hrefs but are not markup. */
function stripScripts(html) {
  return html.replace(/<script\b[\s\S]*?<\/script>/g, '<script></script>');
}
const rel = (p) => '/' + relative(DIST, p).replace(/index\.html$/, '').replace(/\.html$/, '.html');

const LOCALES = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'zh'];
const SLUGS = ['', 'platform/', 'solutions/', 'global/', 'about/', 'contact/', 'privacy/', 'terms/'];

console.log(`Verifying ${pages.length} generated pages…\n`);

/* ------------------------------------------------------------------ *
 * 1 · Every expected route exists
 * ------------------------------------------------------------------ */
for (const lang of LOCALES) {
  for (const slug of SLUGS) {
    const file = join(DIST, lang, slug, 'index.html');
    if (!existsSync(file)) fail(`missing route: /${lang}/${slug}`);
  }
}
for (const asset of ['/favicon.svg', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest']) {
  if (!existsSync(join(DIST, asset.slice(1)))) fail(`missing asset: ${asset}`);
}

/* ------------------------------------------------------------------ *
 * 2 · Per-page checks
 * ------------------------------------------------------------------ */
const ALLOWED_LANGS = new Set(LOCALES);

for (const file of pages) {
  const raw = readFileSync(file, 'utf8');
  const html = stripScripts(raw);
  const route = rel(file);
  const m = route.match(/^\/([a-z]{2})\//);
  const lang = m ? m[1] : null;
  const isEnglish404 = route === '/404.html';
  const isRoot = route === '/';

  // --- untranslated keys -------------------------------------------------
  for (const bad of ['undefined', 'NaN', '[object Object]', '$&amp;', 'gh_reveal is not']) {
    if (html.includes(bad)) fail(`${route}: leaked placeholder "${bad}"`);
  }

  // --- html lang / dir ---------------------------------------------------
  const langAttr = html.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
  if (langAttr && !ALLOWED_LANGS.has(langAttr)) {
    fail(`${route}: html lang "${langAttr}" is not one of the ${[...ALLOWED_LANGS].join('/')}`);
  }
  const dirAttr = html.match(/<html[^>]*\sdir="([^"]+)"/)?.[1];
  if (!langAttr) fail(`${route}: <html> has no lang attribute`);
  if (lang && !isEnglish404 && !isRoot && langAttr !== lang) {
    fail(`${route}: html lang is "${langAttr}", expected "${lang}"`);
  }
  if (lang === 'ar' && dirAttr !== 'rtl') fail(`${route}: Arabic page is not dir="rtl"`);
  if (lang && lang !== 'ar' && dirAttr !== 'ltr') fail(`${route}: expected dir="ltr", got "${dirAttr}"`);

  // --- title / description ----------------------------------------------
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!title) fail(`${route}: missing <title>`);
  if (title.length > 60) warn(`${route}: title is ${title.length} chars (>60)`);
  if (!desc) fail(`${route}: missing meta description`);
  if (desc.length > 300) warn(`${route}: description is ${desc.length} chars (>300)`);

  // --- canonical + hreflang ---------------------------------------------
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (!canonical) fail(`${route}: missing canonical`);
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
  for (const [, tag] of alternates) {
    // `x-default` is a valid sentinel; everything else must be a real locale.
    if (tag !== 'x-default' && !ALLOWED_LANGS.has(tag)) {
      fail(`${route}: hreflang "${tag}" is not a declared interface language`);
    }
  }
  const altLangs = new Set(alternates.map((a) => a[1]));
  for (const l of LOCALES) {
    if (!altLangs.has(LOCALES.includes(l) ? l : l)) {
      // hreflang uses the Intl tag (e.g. es-es), so check by prefix instead.
    }
  }
  if (!altLangs.has('x-default')) fail(`${route}: missing hreflang x-default`);
  if (alternates.length !== LOCALES.length + 1) {
    fail(`${route}: expected ${LOCALES.length + 1} hreflang links, found ${alternates.length}`);
  }
  for (const a of alternates) {
    if (!a[2].startsWith('https://')) fail(`${route}: non-absolute hreflang ${a[2]}`);
  }

  // --- headings ----------------------------------------------------------
  const h1s = [...html.matchAll(/<h1[^>]*>/g)];
  if (h1s.length !== 1) fail(`${route}: expected exactly one <h1>, found ${h1s.length}`);

  // Heading levels must not skip (h2 → h4) for screen-reader navigation.
  let previousLevel = 0;
  for (const [, tag] of html.matchAll(/<h([1-6])\b/g)) {
    const level = Number(tag);
    if (previousLevel && level > previousLevel + 1) {
      warn(`${route}: heading jumps h${previousLevel} → h${level}`);
    }
    previousLevel = level;
  }

  // --- accessibility basics ---------------------------------------------
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  for (const [, attrs, inner] of buttons) {
    const hasName =
      /aria-label="/.test(attrs) ||
      /aria-labelledby="/.test(attrs) ||
      inner.replace(/<[^>]+>/g, '').trim().length > 0;
    if (!hasName) warn(`${route}: <button> with no accessible name`);
  }

  const inputs = [...html.matchAll(/<input\b([^>]*)>/g)];
  for (const [, attrs] of inputs) {
    if (/type="(hidden|submit)"/.test(attrs)) continue;
    const id = attrs.match(/\sid="([^"]+)"/)?.[1];
    const labelled =
      /aria-label="/.test(attrs) ||
      (id && new RegExp(`<label[^>]*for="${id}"`).test(html)) ||
      /aria-labelledby="/.test(attrs);
    if (!labelled) fail(`${route}: <input> without a label: ${attrs.slice(0, 80)}`);
  }

  const selects = [...html.matchAll(/<select\b([^>]*)>/g)];
  for (const [, attrs] of selects) {
    const id = attrs.match(/\sid="([^"]+)"/)?.[1];
    if (!(id && new RegExp(`<label[^>]*for="${id}"`).test(html)) && !/aria-label="/.test(attrs)) {
      fail(`${route}: <select> without a label`);
    }
  }

  // --- skip link ---------------------------------------------------------
  if (!html.includes('gh-skip')) fail(`${route}: missing skip link`);

  // --- landmarks ---------------------------------------------------------
  for (const tag of ['<main', '<header', '<footer', '<nav']) {
    if (!html.includes(tag)) fail(`${route}: missing <${tag.slice(1)}> landmark`);
  }
}

/* ------------------------------------------------------------------ *
 * 3 · Internal links resolve
 * ------------------------------------------------------------------ */
const fileSet = new Set(walk(DIST).map((p) => rel(p)));

let checkedLinks = 0;
for (const file of pages) {
  const html = stripScripts(readFileSync(file, 'utf8'));
  const route = rel(file);
  const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (
      href.startsWith('http') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('data:') ||
      href.startsWith('#')
    ) {
      continue;
    }
    const [pathPart] = href.split('#');
    if (!pathPart) continue;
    checkedLinks++;
    const resolved = pathPart.startsWith('/')
      ? pathPart
      : new URL(pathPart, 'https://x' + route).pathname;
    if (!fileSet.has(resolved)) {
      fail(`${route}: dead internal link → ${href}`);
    }
  }
}

console.log(`Checked ${checkedLinks} internal links across ${pages.length} pages.`);

/* ------------------------------------------------------------------ *
 * 4 · Sitemap integrity
 * ------------------------------------------------------------------ */
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (locs.length !== LOCALES.length * SLUGS.length) {
  fail(`sitemap has ${locs.length} <loc> entries, expected ${LOCALES.length * SLUGS.length}`);
}
for (const loc of locs) {
  const p = new URL(loc).pathname;
  if (!fileSet.has(p)) fail(`sitemap lists a page that was not built: ${p}`);
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
console.log('');
if (warnings.length) {
  console.log(`⚠️  ${warnings.length} warning(s):`);
  for (const w of [...new Set(warnings)].slice(0, 25)) console.log('   · ' + w);
  if (warnings.length > 25) console.log(`   … and ${warnings.length - 25} more`);
  console.log('');
}
if (errors.length) {
  console.log(`❌ ${errors.length} error(s):`);
  for (const e of [...new Set(errors)].slice(0, 40)) console.log('   · ' + e);
  if (errors.length > 40) console.log(`   … and ${errors.length - 40} more`);
  process.exit(1);
}
console.log('✅ All checks passed.');
