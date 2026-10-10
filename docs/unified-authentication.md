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

The previous Doctor/Hospital/Pharmacy/CMS prototype components remain in source,
but are deliberately **not mounted** by the application: some hold shared demo
state, client-side permissions, or embedded credential pages. The new shell does
not preserve every prototype action. Its records are read-only summaries; advanced
clinical editing, hospital operational modules, inventory editing, and CMS authoring
must be migrated to account-scoped server APIs before being re-enabled. This is a
security boundary, not a claim that all prototype functionality is migrated.

## Public User Portal demo and development accounts

- The User login presents **Explore the User Portal demo** when the server
  returns `demoSessionAvailable: true` from `GET /api/auth/demo-accounts`. Start
  it with `POST /api/auth/demo-login`; no credential, shared password, or
  production account is exposed. Each request creates a unique synthetic user
  ID and opaque server session with its own sample profile, appointments,
  health records, doctor-consent example, notifications, and private data.
- Demo data is temporary. It is held in process memory, omitted from all
  account/domain/EHR-share/AI persistence files, and fully removed on logout or
  after four hours without activity. Restarting the server also clears it.
  A visible banner warns that the signed-in identity is a demo and marketplace
  orders are disabled. Do not enter real health information.
- `PUBLIC_DEMO_ENABLED` defaults to enabled outside tests; set it to `false` to
  hide the login option and disable `POST /api/auth/demo-login`. The endpoint
  is rate-limited and responses use `Cache-Control: no-store, private` and
  `X-Robots-Tag: noindex, nofollow`.
- The Sarah/Alex User credentials and seeded Doctor, Hospital, Pharmacy, and
  News Management role-account pickers are development-only. The
  `GET /api/auth/demo-accounts` response may include those credentials only in
  development; production returns availability metadata and never returns
  development passwords. News demo administrators still complete MFA; any
  simulated verification code is available only from the development server.

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
- Fresh production startups no longer seed Doctor/Hospital/Pharmacy demo logins.
  Do not deploy development runtime stores into production. Existing persisted
  accounts still load: audit and remove legacy unverified/demo accounts before
  rollout. Removing initial seeds cannot retroactively verify persisted accounts.
- Professional recovery and News MFA retain the existing token/challenge logic,
  but **production message delivery is not integrated in this repository**.
  Connect an email/SMS delivery provider before relying on those flows in
  production. Development-only returned tokens/codes are not shown by the new UI
  and are never returned in production. The UI does not bypass verification.
- Existing bearer-token browser storage and single-process file-backed session
  persistence are retained. Use HTTPS. For multi-instance production deployments,
  migrate the realm adapters to a shared transactional session store and evaluate
  an HttpOnly-cookie/CSRF design; this change does not implement those migrations.
- The public demo session is memory-only. Keep it on one server instance, or use
  sticky routing for the lifetime of a session. Sticky routing does not survive
  process restarts; shared-store support is required before scaling if demo
  sessions must remain seamless. See [Environment Configuration](ENVIRONMENT.md).

## Validation

```
npm test
npm run build
npm run dev
# Against a single-process server with PUBLIC_DEMO_ENABLED=true:
npm run accept:demo
# Against a development fixture server only:
npm run accept:auth
```

The acceptance script tests all 25 role/workspace combinations, all 25 role/domain
API combinations, MFA (including wrong code and no pre-MFA session), identity
restoration, same-role account separation, cross-hospital/pharmacy resource denial,
privileged self-provisioning rejection, cache headers, invalid tokens, and global
logout/revocation. Fixtures are development-only; do not run this script against
production. `TEST_BASE_URL` can override the local server address.

Manual browser checks: each role's central login; refresh and back/forward; role
selection in signup/recovery; legacy deep links; cross-role hash changes; logout
and identity replacement across two tabs; mobile role selector and portal sidebar.
