# GlobalHealth Security

This document describes implemented controls. It is not a claim of regulatory
compliance; jurisdiction-specific legal review remains the customer's
responsibility.

## Authentication

- Public users: signup -> email verification -> login -> session.
- Passwords: `scrypt` (`scrypt$16384$8$1$<salt>$<hash>`), random 16-byte salt.
  Legacy PBKDF2 is verified and migrated on successful login.
- No universal verification code. Each code is account-specific, time-limited,
  and consumed on success.
- 2FA: RFC 6238 TOTP. Setup generates a unique base32 secret; a second-factor
  challenge is required before a session is issued when 2FA is enabled.
- Demo accounts (opt-in, `GH_DEMO_MODE=true`, never in production): normal
  password accounts with sample data. Sign-in goes through the same password
  verifier, MFA and session issuance as any account. Sample credentials are
  exposed through `/api/demo/config` only while demo mode is on, and the login
  UI only shows them then. Demo records carry a marker so they can be pruned
  when demo mode is turned off, and real records are never overwritten.
- Reset flows: opaque 256-bit tokens, same-origin delivery, no token returned in
  the browser response in production, existing sessions revoked after reset.

## Session handling

- Bearer tokens map to exactly one account/org. Ownership for every protected
  route is derived server-side from the token.
- Sliding expiry for public/doctor/hospital/pharmacy/news sessions.
- Logout destroys the server session.
- Session restore: only a 401/403 from `/api/auth/me` clears a stored session.
  Network and 5xx errors keep the token and offer a retry, so a temporary outage
  does not sign the user out.
- `authenticate`, `requireDoctor`, `requireHospitalToken`,
  `requireMarketPartner`, `requireNewsAdmin`, and `requireAuthority` reject
  expired/revoked/foreign sessions.

## Authorization

- Public user: owner-only access to `/api/me/*`.
- Doctor: only patients with an active access grant; EHR edits require patient
  consent; emergency access is view-only, time-limited, audited.
- Pharmacy: a partner can only read/update its own inventory; cross-pharmacy
  edits are rejected and audited.
- Hospital: a portal session maps to one hospital; cross-hospital writes are
  rejected and audited.
- News: admin/authority roles gate editorial workflows server-side.

## CORS / headers

- Production fail-closed: unknown origins return `403 CORS_ORIGIN_DENIED`.
- `CORS_ORIGIN=*` is rejected at startup in production.
- Security headers set per request: `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `X-Request-Id`.

## Secrets / logging

- No production fallback secrets. Missing `GH_ADMIN_KEY`,
  `PRESCRIPTION_SIGNING_SECRET`, registry gateways cause the affected feature to
  fail closed.
- Structured logger redacts passwords, tokens, 2FA, verification codes, API keys.
- API error boundary never returns stack traces or internal details.

## Credential verification

- `/api/verify-credential` only asserts `VERIFIED` when a configured registry
  confirms it. No registry => `NOT_VERIFIED`, no fabricated confidence score.

## Known gaps

- Auth tokens are bearer tokens stored by the client; HttpOnly cookies + CSRF
  protection are not yet implemented.
- State is JSON-file backed, not relational DB (see migration plan).
- No automated IDOR/security test suite yet (unit tests only at this point).
- Demo passwords default to documented values. They are for local evaluation only.
  Set `GH_DEMO_PASSWORD_<ROLE>` for any shared non-production environment.
- The User health dashboard (`PatientEhrContext`) is a local, browser-stored model.
  It is not hydrated from `/api/me/*`, so server-side sample profile data is not
  shown there.
- The Doctor, Hospital, Pharmacy and News portal-specific sign-in screens have no
  demo Fill button. Demo accounts are verified through the central sign-in and
  the API. The generic private-portal badge does not cover the doctor portal.
