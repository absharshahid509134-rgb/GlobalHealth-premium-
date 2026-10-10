# GlobalHealth — public website

A brand-new, standalone marketing site for GlobalHealth, built as a static Astro
project. It sits alongside the existing application in the parent directory and
shares no code with it; that app remains the product, this is the front door.

```bash
cd site
npm install
npm run dev        # http://localhost:4321
npm run audit      # astro check → build → post-build verification
```

## Why these choices

**Static output.** Every route is pre-rendered at build time, so the shipped
artefact is HTML, one stylesheet and three small ES modules. There is no runtime
framework, no hydration, and no API to go down. The largest page — the 68-country
emergency directory — is 128 KB of HTML that compresses to 14 KB.

**Progressive enhancement.** Every page is complete and navigable with
JavaScript disabled. The command palette, the mobile drawer, the emergency
search and the animated counters are all additions, never requirements. FAQ
items are native `<details>` elements.

**Eight languages, done properly.** English, Spanish, French, German,
Portuguese, Arabic (RTL), Hindi and Chinese, each with a complete hand-written
catalogue rather than a partial one. Country names in the emergency directory
are resolved at build time from the platform's own CLDR region database via
`Intl.DisplayNames`, so 68 countries are correct in every language without a
hand-maintained table that would drift. `<html lang>`, `dir`, `hreflang` and
the sitemap all agree.

**Self-hosted fonts.** Outfit and Inter (variable) for Latin, IBM Plex Sans
Arabic and Noto Sans Devanagari for the non-Latin scripts, all subset-gated with
explicit `unicode-range` so a browser only downloads a face it can actually use.
Chinese rides the system CJK stack — webfonts there would be megabytes. No
third-party font request is ever made, which is both a privacy and a
performance decision. Preloads are locale-aware: Latin pages preload only the
Latin faces, Arabic and Hindi pages preload their own script.

**One 404, in English.** A static host serves exactly one `404.html`, so
per-locale 404s are impossible. The single not-found page is English with a
language switcher that sends the visitor to the same page in their language.

## Verification

`npm run audit` is the gate. It runs three things:

| Step | What it proves |
| --- | --- |
| `astro check` | Strict TypeScript across all `.astro`/`.ts` sources — 0 errors, 0 warnings, 0 hints |
| `astro build` | 66 pages build cleanly |
| `scripts/verify.mjs` | Post-build audit of the generated tree |

`scripts/verify.mjs` is the interesting one. It walks every emitted file and
fails the build on: dead internal links, placeholder leakage (`undefined`,
`NaN`, `[object Object]`), missing `lang`/`dir`, over-long titles, incomplete
`hreflang` clusters, more or fewer than one `<h1>`, heading levels that skip,
form controls with no accessible name, a missing skip link or missing landmark
elements, and any `hreflang` that is not one of the eight declared interface
languages. It is deliberately paranoid — several of its checks exist because
they caught a real defect during the build.

## Layout

```
src/
  components/
    home/          homepage sections, one concern per file
    global/        EmergencyDirectory — server-rendered, progressively filtered
    *.astro        shell (Header, Footer, MobileNav, CommandPalette) and primitives
  content/legal.ts structured privacy and terms documents
  data/            canonical routes, search index, emergency numbers
  i18n/            locale registry and eight typed catalogues
  layouts/         BaseLayout — document shell, metadata, JSON-LD
  pages/           route matrix, locale negotiation, 404, sitemap
  scripts/site.ts  site-wide progressive enhancement
  styles/          design system (global.css) and font faces (fonts.css)
```

## Honest by design

The copy states plainly that GlobalHealth is not a regulator, does not
diagnose, and does not replace licensed clinicians or emergency services. The
command palette indexes navigation and high-intent tasks rather than pretending
to ship a complete medical database client-side. Emergency numbers carry a
correction path. Contact submission is validated and then opens the visitor's
mail client, because no backend is configured — and the interface says so.
