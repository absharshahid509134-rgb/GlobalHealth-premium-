# GlobalHealth — Master Build Prompt

> A complete, self-contained specification of the GlobalHealth platform. Paste
> this whole document into an AI builder or hand it to a dev team to reproduce
> the product. Every number below is measured from the current codebase, not
> estimated.

---

## 1. The brief

Build **GlobalHealth**, a multilingual, evidence-based health and medical
information platform with five authenticated professional portals and a
Gemini-powered AI assistant.

It is **not** a hospital management system and **not** a telemedicine service.
It is a consumer health-encyclopedia product fused with real clinical workflow
tooling: a patient-facing directory of diseases, medicines, lab tests and
recipes, plus the authenticated portals that doctors, hospitals, pharmacies and
news editors actually work in.

**Non-negotiable posture.** This product shows medical information and never
replaces a clinician. It does not diagnose, does not prescribe, and does not
dispatch emergency services. Every clinical surface carries a visible
disclaimer. Where a capability is not configured, the product must say so
plainly and fail closed — never silently degrade into something that looks
authoritative but is not.

---

## 2. Tech stack

Reproduce this stack exactly; the architecture depends on it.

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript 5.8, single-page app |
| Build | Vite 6, `@vitejs/plugin-react` |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` — tokens in `@theme`, no `tailwind.config.js` |
| Server | Express 4 running the SPA and all `/api/*` routes from one process |
| Dev runtime | `tsx server.ts` — Vite in **middleware mode** inside Express |
| Prod runtime | `vite build` → `esbuild server.ts --bundle --platform=node --format=cjs --packages=external` → `node dist/server.cjs` |
| Icons | `lucide-react` |
| Motion | `motion` |
| Maps | Leaflet + `@types/leaflet` |
| AI | `@google/genai` (Gemini) |
| Persistence | JSON files under `data/runtime/`, atomic write + in-process Maps for hot reads |
| Config | `dotenv` + a validated `src/server/config.ts` |

**Architectural rules that must survive a rebuild:**

1. One origin. The SPA and the API are served by the same Express process, so
   the client uses **relative URLs only** — never a hardcoded `localhost`.
2. Route-level code splitting. The clinical catalogs are ~13 MB of static data;
   they load through memoised `import()` in `src/data/catalogLoaders.ts`, never
   through static top-level imports.
3. Server-side authorization is the only authority. No client-supplied user id
   is ever trusted; the session token identifies the caller.
4. The role selector on the sign-in page chooses a **credential realm**, never
   grants a role. Only that realm's own verifier can issue its own session.

---

## 3. Design system

Tailwind v4 `@theme` tokens — the single source of truth in `src/index.css`:

- **Brand (emerald)** `--color-brand-50 … 900`, `#10b981` at 500 — success,
  verification, primary actions.
- **Medical (deep teal-blue)** `--color-medical-50 … 950`, `#3d829e` at 500 —
  the platform's identity colour. Every homepage surface is themed through
  these tokens so the whole product can be re-themed without touching
  components.
- **Surfaces** `--color-surface`, `--color-surface-subtle`,
  `--color-surface-muted`, `--color-border-subtle`.
- **Ink** `--color-ink` `#0f172a`, `--color-ink-soft`, `--color-ink-muted`.
- **Status** success `#16a34a`, warning `#d97706`, danger `#dc2626`,
  info `#0284c7`.
- **Radius** `--radius-card: 1rem`, `--radius-control: 0.75rem`.
- **Shadows** `--shadow-card`, `--shadow-pop`, `--shadow-soft`.
- **Type** `--font-display: 'Plus Jakarta Sans', 'Inter', system-ui`.

Component classes are defined with `@apply` (`.btn-primary`, `.btn-secondary`,
`.chip`), so a button is `<button class="btn-primary">` — never a wall of
utilities repeated across 300 files.

**Accessibility floor:** a global `:focus-visible` ring using
`--color-medical-500`, semantic landmarks, labelled form controls, and status
messages announced via `role="status"`.

---

## 4. Information architecture

25 top-level destinations, routed by hash so deep links and browser back work:

```
home · explore · diseases · medicines · medical-tests · nutrition · recipes
wellness · calculators · ai-assistant · hospitals · doctors · appointments
medical-map · community · news · news-admin · dashboard · hospital-portal
doctor-portal · medauth · pharmacy-portal · privacy · doctor-consent
doctor-console · my-history · news-authority · news-management · auth · terms
```

Three route classes behave differently and must be implemented as such:

- **Page routes** — normal navigation with the navbar and footer.
- **Protected routes** (`dashboard`, `appointments`, `privacy`, `my-history`) —
  render a signed-out gate with a specific explanation of what the feature does
  and why an account is required.
- **Full-screen overlay routes** (portals, `auth`, AI workspace, news) —
  suppress the marketing chrome entirely and own the viewport.

Navigation itself is a navbar with a **More overlay** on desktop and a
dedicated mobile drawer; both list all 25 destinations.

---

## 5. The five portals and the authentication model

Five realms, each with its own register / login / recover / reset endpoints and
its own server-side verifier:

| Realm | Sign-in identifier | Destination |
|---|---|---|
| Patient / User | email | `dashboard` |
| Doctor | email or registration no. | `doctor-portal` |
| Hospital | facility admin username | `hospital-portal` |
| Pharmacy partner | partner email | `pharmacy-portal` |
| News Management | admin email + **mandatory MFA** | `news-management` |

Shared authentication contract:

- **scrypt** password hashing, with legacy PBKDF2 verification and transparent
  migration on successful login.
- Opaque 256-bit session tokens. Sessions are persisted and restored across
  server restarts; client restores on load and, on transient failure, shows a
  retry affordance rather than silently signing the user out.
- **RFC 6238 TOTP** two-factor authentication for public accounts.
- Per-IP rate limiting on authentication, with `trust proxy` configured so
  visitors behind a load balancer do not share one bucket.
- Email/phone verification codes, password reset tokens, device/session
  listing with individual and global termination, and a security audit log.
- **Global logout** revokes every session for the account across all portals
  immediately.
- News Management passes a mandatory MFA gate on every sign-in. Development
  builds surface the generated 6-digit code in the response so the flow is
  testable; production never does.

**Isolation is a security property, not a nicety.** A doctor token must be
refused with `403` by the patient, hospital, pharmacy and news workspaces. There
are 20 such cross-portal combinations and all 20 must be denied.

### Role-based permissions

A permission model (`src/core/portalRoles.ts`) with 12+ granular portal roles —
`PATIENT`, `DOCTOR`, `HOSPITAL_OWNER`, `HOSPITAL_ADMINISTRATOR`,
`HOSPITAL_DEPARTMENT_MANAGER`, `HOSPITAL_RECEPTIONIST`, `HOSPITAL_DOCTOR`,
`HOSPITAL_VERIFICATION_MANAGER`, `HOSPITAL_READ_ONLY`, `LABORATORY`,
`IMAGING_PROVIDER`, `PHARMACY_OWNER`, `PHARMACY_ADMINISTRATOR`,
`PHARMACY_PHARMACIST`, `PHARMACY_INVENTORY_STAFF`, `PHARMACY_DELIVERY`,
`PHARMACY_ACCOUNTANT`, `PHARMACY_SUPPORT`, `HOSPITAL`, `ADMIN`, … — each mapped
to an explicit permission list. Components ask *"can this role do X?"* through
`usePortalRole()` and `<PermissionGate permission={…}>` rather than hard-coding
page access. Authorization stays in one place; the component tree stays
presentational.

### Opt-in demo accounts

`GH_DEMO_MODE=true` seeds exactly one sample account per portal with realistic
sample data, written into the same persisted stores real registrations use and
authenticating through the same password verifiers. Nothing bypasses
credentials. Seeding is idempotent across restarts. Records carry a
`demoSeed` marker; turning the flag off prunes them and their sessions on next
start while leaving real registrations untouched. **The flag is ignored
entirely when `NODE_ENV=production`** — demo accounts can never exist in a live
deployment.

A "Fill Demo Account" control appears on the sign-in form only when the server
reports demo mode. It populates the form and never submits.

---

## 6. The clinical catalogs

The content library is the product. Ship it as structured, typed, reviewable
TypeScript data — not prose scraped into a CMS.

| Catalog | Count | Organisation |
|---|---|---|
| **Diseases** | **500** | 10 specialties: cardiology, neurology, pulmonology, gastroenterology, orthopedics, nephrology, endocrinology, dermatology, infectious disease, oncology |
| **Medicines** | **400** | 8 groups: primary care, cardiology, neurology, pulmonology, gastroenterology, orthopedics, nephrology, specialist |
| **Medical tests** | **1,000** | 10 categories: haematology & coagulation, kidney & urine, gastro & liver, metabolism & cardio, endocrine & hormone, infectious disease, immunology & allergy, cancer & genetics, reproductive & obstetric, fluid/toxicology & specialised |
| **Recipes** | **1,000** | 10 categories, Indian and international healthy home cooking |
| **Languages** | **100** | full locale config: code, native name, script, direction, region, currency, font |

Every entry carries structured fields, not a blob. A medicine has generic name,
therapeutic group, prescription status, dosage forms, what it is, and so on. A
lab test has purpose, **normal range**, preparation/fasting requirements, and
interpretation. A disease has category, specialist to consult, summary and
clinical detail.

Each catalog is lazy-loaded through a memoised `import()` so the chunk is
downloaded and parsed at most once per session, and only when a view needs it.

---

## 7. The AI assistant

A full workspace, not a chat box. Gemini-backed, with a server-side safety and
grounding layer that runs **before** the model is consulted.

**Safety triage first.** `src/core/ai/aiSafety.ts` pattern-matches for
emergencies — breathing difficulty, severe chest pain, loss of consciousness,
seizure, stroke signs, anaphylaxis, severe bleeding, poisoning/overdose,
suicidal ideation. On an urgent match the assistant leads with immediate
emergency guidance naming the local emergency number and **suppresses the
normal educational answer**. It is explicitly a heuristic triage layer, never a
diagnosis or a dispatch system.

**Grounded retrieval.** `src/core/ai/aiKnowledge.ts` performs conservative
RAG over the platform's own reviewed catalogs, matching only exact
name/generic-name hits and attaching a `source` label so answers can be marked
as verified GlobalHealth platform data. It never invents availability, price,
patient-specific dosage, or a diagnosis.

**Ownership and privacy.**

- The user is identified **only** by the validated session token. The client
  never sends a user id and any supplied one is ignored.
- Every persistent read/write validates ownership; non-existent and
  other-people's conversations both return a uniform `404` so existence never
  leaks.
- Guest conversations are session-only React state, never persisted, never
  account-linked. Saving to an account is an explicit user action; there is
  **no automatic merge**.
- **AI chat is never an EHR.** Nothing from a conversation enters the patient
  profile or any clinical store.
- Messages use a `clientMessageId` idempotency key so a retry never duplicates.

**Workspace features:** conversation list with saved/starred, archive, trash
and permanent delete; rename; message history; export; and share links over an
unguessable token. The workspace stays mounted while hidden so a guest
conversation survives navigation. Personal questions while signed out get an
explicit, honest explanation of why sign-in is required instead of a fake
answer.

When `GEMINI_API_KEY` is absent the assistant returns a clear "not configured"
response rather than erroring.

---

## 8. Feature modules

**Diseases / Medicines / Lab tests** — searchable, category-filtered
directories over the catalogs above, each with a rich detail view
(infographics, monograph modals, comparison), cross-links between a condition,
its medicines and its relevant tests, and a "ask the AI about this" hand-off
that pre-fills the assistant.

**Interactive body & vitality hub** — an explorable anatomical interface that
drills into systems and conditions.

**80 health calculators** across 8 categories — body & composition, nutrition &
macros, cardiovascular, clinical & labs, kidney & renal, pregnancy & pediatrics,
sports & performance, lifestyle & wellness. Includes BMI, BMR/TDEE, macro
splits, eGFR, cardiovascular risk, and paediatric growth tools.

**Wellness & fitness** — activity, targets and habit tracking surfaces with
supporting data.

**Nutrition & recipes** — the 1,000-recipe library with category browsing,
detail modals, nutrition breakdown, and a **food comparison lab** plus a
**food–drug interaction** tool that warns about clinically relevant
food/medication combinations.

**AI meal planner** — generates a day/plan against stated goals and constraints.

**Hospitals** — a facility registry with rich profiles: departments, doctors,
services, pricing and finance views, schedules, insights, verification status,
and appointment booking modals. Includes an intelligence modal for
facility-level analysis.

**Doctors** — discovery with specialty filtering, profiles, availability, and
booking.

**Medical map** — Leaflet-powered map of hospitals, blood banks and facilities
with an interactive filter and a detail modal, plus a card/detail presentation
for non-map browsing.

**Appointments** — booking, viewing and managing consultations, including
hospital appointment and ambulance booking flows.

**Health records (`dashboard`)** — the patient's private space: EHR summary
(blood group, allergies, chronic conditions, immunisations), vitals, health
records, prescriptions with a viewer and save-to-record flow, orders, messages,
notifications, saved library, and retention archive.

**Consent & access governance** — the patient grants, narrows and revokes
doctor access to their record: scoped consent requests with reason, priority,
scope, duration and expiry; a doctor-facing consent console; a patient-facing
access page; and a full **audit trail** of who accessed what and when.
Emergency access is a distinct, audited path.

**Community** — feed, groups, discussions Q&A, events, leaderboard, direct
messages, notifications, profiles, post composer, reporting and a safety modal,
with moderation surfaces.

**News** — a public news workspace plus a full editorial CMS: submissions,
authority applications, reports, audit logs, notifications, session management,
and a role-gated management console with its own MFA-protected sign-in.

**Pharmacy** — a marketplace with product detail, cart, checkout, order
tracking, prescription upload and verified-partner selection. The **partner
portal** is a complete back office: dashboard, inventory management with batch
and expiry tracking, medicine catalog, pricing, orders, prescription review,
marketplace sync, branches, staff, compliance documents, payments and finance,
analytics and reports, audit logs, support tickets, and an onboarding
application wizard with a status tracker and fee configuration.

**Doctor portal** — dashboard, patients, appointments, availability, virtual
consultations, prescriptions, labs, imaging, billing, credentials,
affiliations, clinical decision support, AI assistant, communication, profile
and security, with an onboarding flow.

**Pharmacy/Doctor/Hospital onboarding** — multi-step application wizards with
document upload, verification states, and status tracking.

**Legal & trust** — privacy consent, terms, a reusable medical disclaimer in
compact and full variants, and a doctor access consent page.

---

## 9. Backend surface

**115 API endpoints**, grouped by domain:

- `/api/auth/*` — signup, login, verify-code, resend, forgot/reset password,
  change-password, 2FA setup/verify/login, sessions list/terminate/terminate-all,
  audit logs, logout, me
- `/api/doctor/*` — auth realm, patients, consent requests, emergency access,
  notifications, audit history
- `/api/hospital-portal/*` and `/api/hospital-registry/public/*`
- `/api/pharmacy-partner/*`, `/api/pharmacy-marketplace/*`
- `/api/news/*` — public articles, submissions, report, MFA verify, authority
  and admin realms, audit logs, reports
- `/api/me/*` — dashboard, ehr, health-records, appointments, orders, messages,
  notifications, saved-library, consent, consent-requests, doctor-access,
  audit-history, email-outbox, retention-archive
- `/api/ai/conversations/*` — list, create, messages, rename, share, export,
  permanent delete
- `/api/ehr/consent-share/*` — privacy-scoped record sharing
- `/api/portals/:role/workspace` — the generic portal workspace
- `/api/community/*`, `/api/medical-map/facilities`, `/api/doctors`
- `/api/demo/config`, `/api/health`, `/api/ready`, `/api/verify-credential`,
  `/api/prescribe`, `/api/email-link/:token`

Cross-cutting server concerns:

- **Validated config** (`src/server/config.ts`) with structured startup
  warnings for every missing gate; fails closed on wildcard CORS in production.
- **Structured JSON logger** with recursive redaction of passwords, tokens, 2FA
  and PII keys.
- **Central error envelope** — `{ code, message, requestId? }`.
- **Audit trail** for authentication and data access, persisted as a summary.
- `Cache-Control: no-store` on every private response; the demo config is
  never cached.
- Graceful shutdown flushes runtime state on `SIGTERM`.

**Known and documented limitation to preserve honesty about:** critical state is
JSON-file backed, not a relational database. This is a tracked gap with a
migration plan, not something to paper over.

---

## 10. Internationalisation

Two distinct systems, deliberately:

**Inside the app** — 100 languages configured in `src/data/languages100.ts`
with code, native name, script, text direction, region, currency, flag and font
family. A translation dictionary plus a universal translator resolve strings;
`LanguageModal` and `LanguageSelector` drive switching; RTL is respected via
`dir`.

**The public marketing site** — 8 hand-written, complete language catalogues:
English, Spanish, French, German, Portuguese, Arabic (RTL), Hindi, Chinese. Not
partial translations. Country names in the emergency directory are resolved at
**build time** from the platform's own CLDR data via `Intl.DisplayNames`, so 68
countries are correct in every language without a hand-maintained table that
would drift.

---

## 11. The public marketing site

A **separate, standalone Astro project in `site/`** that shares no code with the
app. Static output, pre-rendered at build time.

- **66 pages** = 8 languages × 8 routes (home, platform, solutions, global,
  about, contact, privacy, terms) + a single 404 + a sitemap.
- 8 routes defined once in a canonical route table (`site/src/data/pages.ts`).
- **No runtime framework, no hydration, no API to go down.** The shipped
  artefact is HTML, one stylesheet and a few small ES modules.
- **Progressive enhancement:** every page is complete and navigable with
  JavaScript disabled. The command palette, mobile drawer, emergency search and
  animated counters are additions, never requirements. FAQ items are native
  `<details>`.
- **68-country emergency directory**, server-rendered and progressively
  filtered, with a correction path for wrong numbers.
- **Self-hosted fonts** — Outfit and Inter (variable) for Latin, IBM Plex Sans
  Arabic, Noto Sans Devanagari, subset-gated with explicit `unicode-range`.
  Chinese uses the system CJK stack. No third-party font request is ever made.
  Preloads are locale-aware.
- **One 404, in English** — a static host serves exactly one `404.html`, so
  per-locale 404s are impossible; the page carries a language switcher.
- Contact submission is validated and then opens the visitor's mail client,
  because no backend is configured — and the interface says so.

**The verification gate is part of the deliverable.** `npm run audit` runs
`astro check` (strict TypeScript, zero errors/warnings/hints), `astro build`,
then `site/scripts/verify.mjs`, a deliberately paranoid post-build audit that
walks every emitted file and fails on: dead internal links, placeholder leakage
(`undefined`, `NaN`, `[object Object]`), missing `lang`/`dir`, over-long titles,
incomplete hreflang clusters, more or fewer than one `<h1>`, skipped heading
levels, form controls with no accessible name, a missing skip link, missing
landmarks, and any hreflang outside the eight declared languages. It currently
verifies 3,649 internal links across 66 pages.

---

## 12. Quality gates

The build is not done until all of these pass:

| Command | Proves |
|---|---|
| `npm run lint` | `tsc --noEmit` clean across the whole project |
| `npm test` | 52 unit tests (security, config, TOTP, demo accounts) |
| `npm run accept:auth` | Unified auth across 5 roles: provisioning, 25 workspace + 25 domain checks, MFA, isolation, global logout |
| `npm run accept:demo` | 11 checks: every demo role signs in over real HTTP, wrong password rejected with no token, cross-portal denied, sessions survive restart, production never provisions |
| `npm run accept:no-demo` | Retired demo entry points stay 404 in dev/test/prod; legacy credentials and tokens rejected; real registrations preserved |
| `npm run accept:ai` | AI auth and chat end-to-end |
| `cd site && npm run audit` | 66 pages build; 3,649 links and all markup/a11y checks pass |

Acceptance suites must run against **real HTTP** on a disposable runtime
directory, never against mocks, and must never seed accounts into the normal
runtime store.

---

## 13. Definition of done

A faithful build satisfies every line below:

1. 500 diseases, 400 medicines, 1,000 lab tests, 1,000 recipes and 100 language
   configurations ship as structured, typed data.
2. 80 calculators work across 8 categories.
3. All 25 destinations are reachable with working hash routing, browser back,
   and deep links.
4. All five portals accept real credentials, resolve to their own destination,
   and load their own workspace with sample data.
5. A token from one portal is refused by the other four — all 20 combinations.
6. Wrong passwords are rejected with no token issued.
7. News Management demands an MFA code on every sign-in.
8. Global logout kills every session for the account at once.
9. The AI assistant leads with emergency guidance on urgent symptoms, grounds
   answers in the platform's own catalogs, and never leaks another account's
   conversation.
10. Guests can use the AI assistant and are told honestly, in plain language,
    why personal questions need an account.
11. No private response is cacheable.
12. The medical disclaimer is visible on every clinical surface.
13. `GH_DEMO_MODE` is inert under `NODE_ENV=production`.
14. Every quality gate in §12 passes.
15. The marketing site renders all 8 languages and its paranoid verifier
    reports zero failures.

---

## 14. Voice and honesty rules

The product's credibility depends on what it refuses to claim.

- Never imply diagnosis or treatment. Label educational content as educational.
- Never invent a price, availability, dosage for a specific person, or a
  diagnosis.
- Where a capability is unconfigured — AI without a key, credential
  verification without a registry — say so explicitly and fail closed. Do not
  substitute a plausible-looking placeholder.
- Name the emergency number for the user's region and state plainly that the
  platform cannot dispatch help.
- Distinguish sample data from real data everywhere it appears.
- Copy states plainly that GlobalHealth is not a regulator, does not diagnose,
  and does not replace licensed clinicians or emergency services.
