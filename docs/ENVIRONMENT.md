# GlobalHealth Environment Configuration

The server loads environment from `.env` (via `dotenv`) and validates it with
`src/server/config.ts` at startup. There is **no source-code production
fallback** for any operational secret: missing gates cause an explicit warning
and the affected operation fails closed.

## Required / recommended variables

| Variable | Required in production | Behavior when missing |
| --- | --- | --- |
| `NODE_ENV` | Yes (`production`) | Defaults to `development`; production security constraints off. |
| `PORT` | Recommended | Defaults to `3000`. Invalid value logs a warning and uses `3000`. |
| `APP_URL` | Recommended | Used for deep links; falls back to `http://localhost:<port>`. |
| `TRUST_PROXY` | Optional | Reverse-proxy hops trusted for `req.ip` (default `1` in production, off in development). Needed so per-visitor rate limits, including sign-in, are not shared by everyone behind the host's proxy. Use `false` if the app is exposed directly. |
| `CORS_ORIGIN` | Yes for cross-origin UI | Production accepts only same-origin unless allowlisted. `*` rejected. |
| `GEMINI_API_KEY` | Optional (AI disabled) | AI assistant returns a "not configured" response. |
| `MEDAUTH_REGISTRY_URL` + `MEDAUTH_REGISTRY_SECRET` | Required for real verification | Credential verification stays `NOT_VERIFIED` (503/fail closed). |
| `PRESCRIPTION_SIGNING_SECRET` | Required for signed prescriptions | Prescriptions are `UNSIGNED`/`HELD_FOR_SIGNING`. |
| `GH_ADMIN_KEY` | Required for pharmacy admin verify/pending | Returns `503 ADMIN_KEY_NOT_CONFIGURED`. |
| `NEWS_ADMIN_BOOTSTRAP_EMAIL` + `NEWS_ADMIN_BOOTSTRAP_PASSWORD` | Required to bootstrap a News admin | No demo admin loaded; News CMS admin fails closed. |
| `NEWS_ADMIN_BOOTSTRAP_NAME` | Optional | Defaults to `GlobalHealth News Administrator`. |
| `GH_RUNTIME_DIR` | Optional | Defaults to `data` (runtime files under `data/runtime/`). |

## Environments

- **development**: local Vite middleware. Accounts are registered or explicitly
  provisioned; no default/demo accounts are seeded. Simulated MFA/email delivery
  tokens may be returned for development diagnostics.
- **test**: unit tests do not start the listener. Acceptance suites create their
  own disposable runtime directory with explicitly provisioned test identities;
  those accounts never enter the application's normal runtime store.
- **production**: `IS_PRODUCTION=true`. No demo accounts, passwordless sandboxes,
  or shared default credentials. CORS is fail-closed. Recovery tokens and News
  MFA codes are not returned in API responses.

## Upgrading deployments that previously had demo accounts

Demo accounts have been removed in every environment. `PUBLIC_DEMO_ENABLED` and
`DEMO_SESSION_SECRET` are retired and ignored, even if a deployment still sets
them. Remove both variables from deployment configuration when convenient.

On startup, the server removes reserved/explicitly marked legacy demo accounts,
associated sessions and recovery capabilities from the account/domain runtime
stores. Demo-owned EHR shares, AI conversations and AI share links are also
removed. Real registrations, their sessions and records, public catalogs, and
explicitly configured News bootstrap administrators are preserved. Browser
startup cleans legacy cached demo identities and onboarding tokens. Old demo
bearer tokens no longer restore accounts or renew sessions.

Deploy the updated server and restart each running instance to apply cleanup to
its own `GH_RUNTIME_DIR`. Do not copy development runtime stores into production.
The removed demo catalog, sign-in and sandbox mutation endpoints return JSON 404.

## Configuration rules enforced at startup

- `CORS_ORIGIN=*` in production throws and aborts startup.
- Any production CORS origin that is not a full `http(s)://host[:port]` throws.
- Missing critical gates are logged through the structured logger as
  `startup configuration warning`.

## Example production `.env`

```env
NODE_ENV=production
PORT=3000
APP_URL=https://globalhealth.example
CORS_ORIGIN=https://globalhealth.example
GEMINI_API_KEY=<provider key>
MEDAUTH_REGISTRY_URL=https://registry.example/api/verify
MEDAUTH_REGISTRY_SECRET=<gateway shared secret>
PRESCRIPTION_SIGNING_SECRET=<strong random value>
GH_ADMIN_KEY=<strong random value>
NEWS_ADMIN_BOOTSTRAP_EMAIL=news-admin@globalhealth.example
NEWS_ADMIN_BOOTSTRAP_PASSWORD=<strong random value>
NEWS_ADMIN_BOOTSTRAP_NAME=GlobalHealth News Administrator
GH_RUNTIME_DIR=data
```
