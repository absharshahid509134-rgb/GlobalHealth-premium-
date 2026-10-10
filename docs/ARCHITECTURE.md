# GlobalHealth Architecture

This document reflects the **current implemented** architecture. Items marked
`NEXT` are planned and not yet implemented; never read an intended state as
shipped.

## Runtime topology

```
Browser SPA (Vite build in dist/)
   |
   | same-origin HTTPS, /api/*
   v
Express server (dist/server.cjs, NODE_ENV=production)
   |
   +-- Authentication (public users, doctors, hospitals, pharmacy, news)
   +-- Authorization middleware (requireAuth/requireDoctor/requireHospitalToken/...)
   +-- Domain services (EHR consent, prescriptions, marketplace, hospitals, news, AI)
   +-- Audit trail (in-process, persisted summary to data/runtime/)
   +-- File persistence (data/runtime/account-store.json, domain-store.json)
   |
   v
External providers (opt-in):
   Medical registry gateway, Google GenAI, email notification layer
```

## Modules

### Server-side (new, importable)

| Module | Purpose |
| --- | --- |
| `src/server/config.ts` | Validated environment configuration; fails closed on wildcard CORS in production; surfaces missing production gates as structured warnings. |
| `src/server/security.ts` | scrypt password hashing, legacy PBKDF2 verification/migration, `secureToken` 256-bit opaque tokens, RFC 6238 TOTP. Unit-tested. |
| `src/server/logger.ts` | Structured JSON logger with recursive redaction of passwords/tokens/2FA/PII keys. |
| `src/server/errors.ts` | Central error envelope helper (`code`, `message`, optional `requestId`). |

### Monolithic backend (still present, being decomposed)

`server.ts` (~8.3k lines) still owns all routes. The extracted modules are the
first boundary; the next phases move route groups behind domain repos.

## Data lifecycle (current)

1. Frontend sends API request.
2. Express validates auth/ownership via middleware (never trusting body IDs).
3. Domain logic updates in-process Maps.
4. State is atomically persisted to JSON files under `data/runtime/` on change
   and on a short interval.
5. Audit event(s) recorded.
6. Safe JSON response returned.

## Known limitation

- Critical state is JSON-file backed, not a relational database. This is a
  **known gap** tracked in `docs/migration-plan.md` (Phase 3). In-process Maps
  remain for hot reads and are restored from disk on restart.
- No automated integration/security suite yet; unit tests for `security` and
  `config` are wired (`npm run test:unit`).

## Where to put new server code

- Reusable, side-effect-free logic: `src/server/*.ts` (imported by `server.ts`
  and by tests).
- Route-specific domain logic: still `server.ts` until Phase 1/2 decomposition
  moves it; do NOT introduce a second giant file.

## Demo accounts and session restore

- `src/server/demoAccounts.ts` defines the opt-in sample accounts (one per
  portal) and an idempotent seeder. `src/server/config.ts` reads
  `GH_DEMO_MODE`, and demo mode is always off in production.
- Seeded demo accounts go through the normal password and session paths. Their
  records carry `DEMO_SEED_MARKER`, which `src/server/accountMigration.ts` uses
  to keep them while demo mode is on and to prune them when it is off.
- The client `src/components/auth/DemoAccountPanel.tsx` fills the login form from
  `/api/demo/config`. It never submits. Filling is tagged by role, so one role's
  credentials never reach another role's form.
- `src/context/AuthContext.tsx` restores the session on load. It retries
  transient failures and shows `SessionRestoreRetry` rather than signing out.

