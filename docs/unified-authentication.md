# Unified authentication and private portals

## Routes and identity

- Fresh signed-out visits (including direct links) open `/#auth` first, without
  flashing the public homepage. Existing sessions are validated and continue to
  their authorized destination. Public navigation remains available after entry.
- `/#auth` is the only mounted credential page. It includes User, Doctor,
  Hospital, Pharmacy, and News Management role selection and login, registration,
  and recovery modes. The role selector chooses a credential realm; it does not
  assign a role or alter an authenticated account.
- Legacy portal links (including `/login`, `/signup`, `/forgot-password` hash
  suffixes) enter the same page when signed out. Doctor/hospital external portal
  URL fallbacks have been replaced by same-origin destinations.
- `POST /api/auth/portal/:role/:action` dispatches to an explicit allowlist of
  existing server verifiers. User verification and two-factor flows remain in
  the existing central User forms. News MFA must complete before a token exists.
  Legacy news login APIs also use the MFA-aware verifier.
- The application keeps one browser token, validated through `/api/auth/me`.
  That endpoint derives `portalRole`, account identity, and destination from the
  server's session/account stores. No browser role or account ID is trusted.
  Existing realm-specific session stores remain as backend adapters; they are
  not independently authenticated browser workspaces.
- Login redirects directly to `#dashboard`, `#doctor-portal`, `#hospital-portal`,
  `#pharmacy-portal`, or `#news-management`. Refresh revalidates the token. Public
  navigation does not revoke a session. Wrong-role navigation shows Access denied
  rather than asking for another login.
- Global logout revokes the presented token in every session realm and persists
  revocation. New sign-in clears legacy browser session keys. Cross-tab changes
  hide the previous identity while the replacement is validated; stale API 401s
  cannot clear a newer token.

## Public navigation

Professional portal cards and launch buttons are removed from the public mobile
menu, More menu, and Explore page. Public doctor/hospital directories, medicines,
and health news remain available. Only the universal authentication page offers
professional role selection. A signed-in professional can return to their own
portal using **My workspace** in the account menu; no other role's portal is listed.
Medicine purchases without a verified marketplace listing show an availability
notice instead of sending shoppers into the private pharmacy partner portal.

## Workspaces and enforcement

`PrivatePortal` is the new professional workspace shell: overview, records,
account activity, notifications, and password settings (Doctor/Hospital/Pharmacy).
`GET /api/portals/:role/workspace` returns only the server-resolved account and its
scoped data. It returns 401 for absent/invalid sessions and 403 for another role.
Private responses use `Cache-Control: no-store, private`.

Professional role namespaces have backend role checks before their existing
resource/organization authorization. Hospital and pharmacy record endpoints keep
cross-organization ownership checks. User API guards reject professional sessions;
User permissions are no longer assigned to professional identities.

Legacy portal prototype components remain in source. The Doctor and Hospital
routes retain their server-verified session adapters; demo account seeds and
credential shortcuts have also been removed from those adapters. Other prototype
operations and sample catalog data are not evidence that every advanced clinical,
operational, inventory or publishing feature has been migrated to account-scoped
server APIs. The server remains the authentication and authorization authority.

## Account policy and legacy demo removal

- Only registered users and explicitly provisioned professional accounts can
  sign in. Login forms start with blank credentials. The only prefill is the
  opt-in demo panel described below, which is never shown unless demo mode is on.
- No environment seeds demo accounts unless `GH_DEMO_MODE=true` (see
  "Opt-in demo accounts"). The passwordless User/Doctor/Hospital/
  Pharmacy/News sandboxes and their session renewal/restore logic are removed.
  `GET /api/auth/demo-accounts`, `POST /api/auth/demo-login`, and the old portal
  sandbox mutation routes return JSON 404. Old demo tokens return 401 when used
  for authenticated identity or workspace requests.
- `src/core/legacyDemoAccounts.ts` lists the reserved legacy identifiers for
  removal only; it does not contain passwords or create accounts.
  `src/server/accountMigration.ts` prunes these identities, explicitly marked
  synthetic accounts, and their sessions/capabilities from persisted stores at
  server startup. Real users are never matched solely by name or ordinary email.
- Browser startup removes cached fixture accounts and pre-issued fixture
  activation/recovery tokens before providers restore local state. New real
  users start with empty health records and appointments, not sample clinical
  facts. Existing real records are retained.
- `PUBLIC_DEMO_ENABLED` and `DEMO_SESSION_SECRET` are retired; setting them cannot
  re-enable demo access. Restart updated server instances to apply the migration
  to their persisted runtime stores.

## Opt-in demo accounts (`GH_DEMO_MODE`)

- `GH_DEMO_MODE=true` seeds exactly one sample account per portal: User
  (`demo.user@example.test`), Doctor, Hospital, Pharmacy and News. It is off by
  default and is ignored in production (`NODE_ENV=production` never seeds
  demo accounts, whatever the flag says).
- Demo accounts are ordinary password accounts. They sign in through the normal
  password verifier, MFA and session issuance. No code path creates a session
  directly. Demo passwords are the built-in defaults unless overridden by the
  per-role `GH_DEMO_PASSWORD_USER`, `_DOCTOR`, `_HOSPITAL`, `_PHARMACY` and `_NEWS` variables (minimum length enforced). Defaults are
  for local evaluation only; set your own values for any shared non-production
  environment.
- Seeding is idempotent. Restarts never duplicate records or reset passwords of
  existing demo accounts, and seeding never overwrites a real user's record.
  Seeded records carry a marker; only that marker identifies a demo record.
- While demo mode is on, startup pruning keeps the seeded demo accounts. It still
  removes legacy reserved identities. Turning demo mode off prunes the seeded
  demo records and their sessions on the next start. Real registrations remain.
- `GET /api/demo/config` returns the sample credentials only when demo mode is
  on. When it is off the response is `{ "enabled": false, "accounts": [] }`.
  The login UI shows a **Fill Demo Account** button only when that response
  is enabled. The button fills the form and never submits it.
- Professional workspaces served from the generic private portal show a
  "Demo account · sample data" badge (`workspace.demo` is true only for seeded
  demo accounts). The doctor portal has no badge yet.
- Demo sign-in is not covered on the portal-specific sign-in screens
  (Doctor, Hospital, Pharmacy and News portal screens). Those screens keep
  their own session flow and have no Fill button. A successful central
  sign-in for a professional role opens that portal's own sign-in, which the
  browser check confirmed for the Hospital portal. Demo accounts are verified
  through the central sign-in and the API.

## Session restore and logout

- On load, a stored bearer token is verified with `GET /api/auth/me`. A 401 or
  403 is a server-confirmed rejection: the session is cleared. A network error
  or 5xx is transient: the token is kept, the check is retried, and if it still
  fails, a protected route shows "We could not reach GlobalHealth" with a retry
  button and the app does not redirect to sign-in. Public pages stay usable and
  the token is kept. Private content stays hidden until the server confirms the
  session. Verified in a headless browser by aborting `/api/auth/me` and then
  restoring it. This browser check is not part of the repository suite.
- Logout revokes the server session and clears every client session key. The
  old token then returns 401.
- Professional workspaces load their data from server APIs, which the acceptance
  suite checks after a restart. The User health
  dashboard (`PatientEhrContext`) is still a local, browser-stored model and is
  not hydrated from `/api/me/*`. A demo or real user therefore sees an empty
  local profile there. This gap is documented and not yet fixed.

## Registration and deployment requirements

- User signup uses the existing contact-verification flow.
- Pharmacy signup creates a pending-verification application; approval remains an
  operator action. News signup submits an authority application, not an admin grant.
- Doctor/hospital access must be provisioned by a verified organization. Their
  existing registration APIs previously trusted client-side activation and could
  create privileged accounts. They now require server-held `GH_ADMIN_KEY` in
  `x-admin-key`. Never place this key in a browser, frontend environment variable,
  or public invitation link. A signed, single-use invitation service can replace
  this operator-only provisioning gate later.
- Startup removes reserved/marked demo identities in every environment. Existing
  real accounts still load; removing demos does not retroactively verify other
  unverified accounts. Explicit News administrator bootstrap configuration is
  supported in all environments without a shared fallback password.
- Professional recovery and News MFA retain the existing token/challenge logic,
  but **production message delivery is not integrated in this repository**.
  Connect an email/SMS delivery provider before relying on those flows in
  production. Development-only News MFA codes can be shown for diagnostics;
  recovery tokens/codes are never returned in production. The UI does not bypass
  verification.
- Existing bearer-token browser storage and single-process file-backed session
  persistence are retained. Use HTTPS. For multi-instance production deployments,
  migrate the realm adapters to a shared transactional session store and evaluate
  an HttpOnly-cookie/CSRF design; this change does not implement those migrations.

## Validation

```sh
npm test
npm run lint
npm run build
npm run accept:auth
npm run accept:no-demo
npm run accept:demo
```

Both acceptance suites start and stop their own isolated servers and remove
all test identities with their temporary runtime directories. No application
demo endpoint, running development server or production credentials are used.

`accept:auth` tests all 25 role/workspace combinations, all 25 role/domain API
combinations, MFA (including wrong code and no pre-MFA session), identity
restoration, same-role account separation, cross-hospital/pharmacy resource denial,
privileged self-provisioning rejection, cache headers, invalid tokens, and global
logout/revocation. `accept:no-demo` tests fresh and upgraded development/test/
production runtimes: retired credentials/tokens, removed endpoints, persisted
cleanup, preservation of real records/sessions and configured administrators,
and normal verified registration. `accept:demo` starts servers with
`GH_DEMO_MODE=true` and checks: password verification for all five demo roles,
own-workspace access and cross-role 403, patient-API isolation, survival across
a SIGTERM restart, idempotent restarts, global logout, and that disabling demo
mode prunes demo records while real registrations remain. Production ignores
the flag.

Manual browser checks: each role's central login; refresh and back/forward; role
selection in signup/recovery; legacy deep links; cross-role hash changes; logout
and identity replacement across two tabs; mobile role selector and portal sidebar.
