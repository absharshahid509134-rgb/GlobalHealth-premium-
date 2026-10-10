# GlobalHealth Repository Audit

Audit date: 2026-09-04
Scope: whole repository (frontend, backend, services, data, docs, build, deploy)

Update (2026-10-10): all public demo sandboxes, default account seeds and embedded
quick-fill credentials have been removed. Startup now prunes known/marked demo
identities and their sessions from legacy runtime stores. The demo-account
findings below describe the historical audit baseline, not the current account
policy. See [Unified authentication](unified-authentication.md) for current behavior.

Update (2026-10-10, demo opt-in): sample accounts return only behind
`GH_DEMO_MODE=true`, never in production. They go through real password
verification. Session restore no longer signs out on network or 5xx errors. Open
gaps: the User health dashboard is local-only (`PatientEhrContext`), the
portal-specific sign-in screens have no demo Fill button, the doctor workspace has
no demo badge, and HttpOnly cookies/CSRF and the SQL migration remain
unimplemented.

Honest status legend: `VERIFIED`, `PARTIAL`, `BLOCKED`, `NOT_IMPLEMENTED`.

---

## 1. Repository shape

- Single root package `react-example@0.0.0`, `"type": "module"`.
- Frontend: React 19 + Vite 6 + Tailwind 4.
- Backend: **one monolithic `server.ts` (~8,378 lines)** using Express 4.
- Build: `vite build` (UI) then `esbuild server.ts --bundle --platform=node --format=cjs --packages=external` -> `dist/server.cjs`.
- Runtime persistence: JSON files under `data/runtime/` (`account-store.json`, `domain-store.json`).
- No test framework, no CI config, no Dockerfile, no migration tool, no OpenAPI doc, no monitoring config.

## 2. Architecture as it exists today

```
Browser SPA (src/)
  -> centralized auth client (src/services/authClient.ts) for public/user API
  -> several bespoke clients/services: newsAuthService, newsGovernanceClient,
     pharmacyInventoryClient, pharmacyPortalStore, hospitalRegistryClient
  -> Express server.ts
       -> in-process Maps for sessions/2FA/hospital/pharmacy/consent/AI shares
       -> JSON file store for durable account/domain state
       -> direct Google GenAI call for AI (no gateway wrapping)
  -> dist/server.cjs served static SPA + /api/*
```

The frontend is a very large SPA with portal sub-apps (doctor, hospital, pharmacy, news, medauth). There are also several `views/` directories (e.g. `src/components/hospital-portal/views`, `src/components/medauth/views`) that contain older, primarily client-side auth flows that are not the live default.

## 3. Trust-level summary

| Concern | Current state | Status |
|---|---|---|
| Public auth/session | Server-side scrypt + TOTP, encrypted token attach via `authClient`, JSON file persistence | PARTIAL |
| Password hashing | scrypt (`scrypt$16384$8$1`) + legacy PBKDF2 migration | VERIFIED |
| 2FA | Real RFC-6238 TOTP setup/verify/login challenge | VERIFIED |
| Reset tokens | `secureToken(32-byte random)` for user/news; doctor/pharmacy/hospital resets still use lower-entropy `RST-*` with `Math.random` + 3 random bytes | PARTIAL |
| Doctor verification | `requireDoctor` + `VERIFIED` gate; external registry required for real verification | PARTIAL |
| Prescription | Authenticated doctor required; unsupported signing secret -> `UNSIGNED` | PARTIAL |
| Pharmacy admin | `GH_ADMIN_KEY` required, fails closed if unset | VERIFIED |
| Hospital publication | Server-side `PUBLISHED`/`SYNCED` gating | VERIFIED |
| News auth | Server-side credentials + MFA; no client credential authority | VERIFIED |
| Drug/inventory/orders | In-Memory `Map` in `server.ts` + reflected in domain store file | PARTIAL |
| Hospital registry | In-Memory `Map` + file | PARTIAL |
| Community | Mostly client-mock (`communityMockData.ts`); post APIs exist server-side | PARTIAL |
| AI | `/api/ai-assistant` proxy; provider key server-side; auth required for conversation state | PARTIAL |
| Rate limiting | In-process attempt windows for login/re-auth and auth-grade endpoints | PARTIAL |
| Audit | Central `audit()` + `hospitalAudit()`; persisted summary via domain store | PARTIAL |
| Request IDs | `X-Request-Id` generated per request; carried in responses/health | VERIFIED |
| CORS | Production fail-closed allowlist | VERIFIED |
| Security headers | X-Content-Type-Options, Referrer-Policy, X-XSS-Protection=0 | PARTIAL |
| Client storage | Long-lived auth token in `localStorage` via auth client/session handling | PARTIAL |
| Tests | None in repo | NOT_IMPLEMENTED |

## 4. Critical findings

### 4.1 Security / correctness (must fix)

1. **Monolithic backend** — `server.ts` is a single 8k-line closure. There is no module boundary, no injectable config, no importable security primitive, no contract between domains. Rule 72 / architecture target violated.
2. **No relational database** — critical state is JSON-file-backed or in-process `Map`s. No SQL constraints, transactions, or migrations.
3. **Doctor/pharmacy/hospital password-reset tokens remain low-entropy** — `RST-DOC-…`, `RST-PPP-…`, `RST-HPT-…` mix a 5-digit `Math.floor(10000 + Math.random()*90000)` with 3 random bytes (24 bits). Not production-grade recovery secrets.
4. **`sessionStorage`/`localStorage` for auth** — token is stored in browser storage. Not HttpOnly/Cookie based. This is a design decision to change carefully because the current SPA uses Bearer tokens.
5. **No tests** — no unit, integration, or security tests.
6. **No env validation at startup** — missing required prod secrets are handled per-endpoint but not validated in one place.
7. **No central error envelope** — many routes return ad-hoc `{success, error}` shapes; no shared request-ID-aware error wrapper.
8. **Input validation** — mostly manual per-route; no schema library.
9. **AI gateway lacks rate/abuse guard** — auth gates conversation storage only; the direct `/api/ai-assistant` call is not rate-limited.
10. **`/api/doctors` and several map/hospital "registry" endpoints return thin responses** that are not backed by a real persistent registry index. They are not client-authority, but they are not full data lifecycles either.

### 4.2 Demo / prototype residue to isolate or remove

- `Password123!`, `Doctor123!`, `chen123`, `vance123`, `priya123`, `harr123` are seeded **inside production code paths** (seeded only when `!IS_PRODUCTION` for users, but doctor/news seeds are unconditional and derive hashes at startup even in NODE_ENV=production).
- Doctor/news seeds are unconditionally present in `server.ts`. They are not exposed as client credentials, but they do run in production memory.
- `communityMockData.ts` remains a client mock.
- Several portal `views/` dirs still hold client-side auth fallbacks.

### 4.3 Deployment

- Express serves both SPA and API from the same process (`dist/server.cjs`).
- UI-only static hosting cannot reach `/api/*`; `authClient` now fails loudly on HTML responses (`DEPLOYMENT_API_MISMATCH`).
- No reverse-proxy/Cookie/CSRF documentation beyond CORS.
- `start` hardcodes `NODE_ENV=production`.

## 5. Inventory of API groups in `server.ts`

| Range | Group | Auth |
|---|---|---|
| ~117-164 | health/ready | public |
| ~166-276 | verify-credential | registry-gated |
| ~278-351 | prescribe | `requireDoctor` |
| ~352-416 | doctors / medical-map | public(+meta) |
| ~417-820 | medical-map POST | informational |
| ~821-1650 | public auth: login/signup/verify/resend/forgot/reset/sessions/change-password/2FA/logout | mixed |
| ~1652-1904 | session helpers / auth me | auth |
| ~1919-2770 | EHR consent, dashboard, records, appointments, orders, community posts | auth |
| ~2772-3274 | doctor auth | doctor |
| ~3275-4600 | doctor patients/EHR/consent/access, user consent decisions | doctor/auth |
| ~4600-5040 | user email outbox, attachments, retention, audit history | auth |
| ~5041-6323 | news authority + news admin + MFA | news |
| ~6324-6547 | marketplace availability/validate/orders | public+auth-adjacent |
| ~6547-6840 | pharmacy partner auth + inventory | partner |
| ~6840-7340 | hospital/domain data, warehouse | hospital/partner |
| ~7341-7860 | hospital registry + hospital portal auth | hospital |
| ~7861-8320 | AI conversations + AI assistant | auth/public |
| ~8320-8378 | API fallback + static SPA + error handler | public |

## 6. Dependency map (high-level)

- `server.ts` imports only `@google/genai` for AI, plus static seed data packages (`pharmacyProductsData`, `hospitalInitialData`) and two AI helpers (`aiSafety`, `aiKnowledge`).
- Everything else is defined inside the `startServer` closure, which makes it impossible to unit-test, swap to Postgres, or reuse without opening the giant file.
- Frontend imports `crypto`-free client code; all server-only crypto lives in `server.ts`.
- `authClient.ts` is the central public API client.
- `newsAuthService`, `newsGovernanceClient`, `pharmacyInventoryClient`, `pharmacyPortalStore`, `hospitalRegistryClient` are the other API consumers.

## 7. Route security gaps (must still be verified case-by-case during migration)

- `/api/orders` creation: no per-user order table/ownership index yet.
- `/api/pharmacy-marketplace/validate` is public and computes totals; it must remain non-authoritative and be re-checked at order time.
- `/api/ai-assistant` public; no per-user quota.
- Doctor seed accounts exist in production memory.

## 8. What is already production-hardened (do not regress)

- scrypt password hashing + legacy migration.
- No universal `123456` verification in server auth (verified by test).
- `secureToken` (32-byte random) public/user/news/reset/consent tokens.
- Real TOTP with enrollment + challenge login.
- `requireDoctor` on `/api/prescribe`.
- CORS fail-closed in production.
- JSON runtime persistence (`data/runtime/`).
- `DEPLOYMENT_API_MISMATCH` guard for UI-only deploy.
- News MFA and server-side news credentials.

---

## Next steps (in priority order)

1. Split `server.ts` into importable modules (`config`, `logger`, `security`, `persistence`, `domains/*`), starting with the safe, testable primitives.
2. Add a real persistence abstraction with migrations (SQLite for single-node production now, Postgres-ready interface) and move critical state off in-process Maps.
3. Replace remaining low-entropy reset/session tokens with the secure module.
4. Add centralized env validation, structured logger, error envelope, and input-validation layer.
5. Add unit + integration + security tests around the extracted modules (first tests: password/token/TOTP).
6. Gate AI assistant behind auth + rate limit + provider abstraction.
7. Route security matrix + IDOR checks.
8. Deployment/ops docs (PostgreSQL/object-storage/email/provider choices), then CI.
9. Preserve `dist/`/`data/` so preview keeps working.
