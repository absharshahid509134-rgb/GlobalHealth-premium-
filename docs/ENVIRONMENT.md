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
| `CORS_ORIGIN` | Yes for cross-origin UI | Production accepts only same-origin unless allowlisted. `*` rejected. |
| `PUBLIC_DEMO_ENABLED` | Optional | Enables the passwordless, synthetic User Portal sandbox by default in local/deployed runtimes; set `false` to disable. Always off by default in tests. |
| `GEMINI_API_KEY` | Optional (AI disabled) | AI assistant returns a "not configured" response. |
| `MEDAUTH_REGISTRY_URL` + `MEDAUTH_REGISTRY_SECRET` | Required for real verification | Credential verification stays `NOT_VERIFIED` (503/fail closed). |
| `PRESCRIPTION_SIGNING_SECRET` | Required for signed prescriptions | Prescriptions are `UNSIGNED`/`HELD_FOR_SIGNING`. |
| `GH_ADMIN_KEY` | Required for pharmacy admin verify/pending | Returns `503 ADMIN_KEY_NOT_CONFIGURED`. |
| `NEWS_ADMIN_BOOTSTRAP_EMAIL` + `NEWS_ADMIN_BOOTSTRAP_PASSWORD` | Required to enable News admin in prod | No demo admin loaded; News CMS admin fails closed. |
| `NEWS_ADMIN_BOOTSTRAP_NAME` | Optional | Defaults to `GlobalHealth News Administrator`. |
| `GH_RUNTIME_DIR` | Optional | Defaults to `data` (runtime files under `data/runtime/`). |

## Environments

- **development**: local Vite middleware, development-only role-account fixtures,
  and the User Portal sandbox. `GET /api/auth/demo-accounts` returns the public
  sandbox availability plus seeded credentials only for legacy development
  fixtures. Simulated MFA/email delivery tokens may be returned for convenience.
- **test**: no auto-start of the listener is enabled in unit tests; the public
  demo defaults to disabled unless explicitly enabled.
- **production**: `IS_PRODUCTION=true`. The User Portal sandbox is enabled unless
  `PUBLIC_DEMO_ENABLED=false`; it creates unique synthetic users/sessions and
  does not expose any shared account password. Doctor, hospital, pharmacy, and
  news seeded demo credentials remain development-only. CORS is fail-closed,
  demo reset tokens are never returned, and News MFA codes are not returned in
  API responses.

## Public demo deployment requirements

Public demo sessions and all visitor-owned sandbox data live only in the server
process memory. A demo session is discarded on logout, after four hours of
inactivity, or when the server process restarts. It is intentionally excluded
from account, domain, EHR-share, and AI-conversation persistent stores. Keep the
production demo on a single server instance, or configure sticky routing so a
visitor is sent to the instance that created their session. Sticky routing does
not preserve sessions across restarts or instance replacement. A horizontally
scaled deployment that needs seamless sessions must add a shared, isolated demo
session store before scaling; this repository does not provide one.

The User Portal can explore synthetic profile, appointment, health-record,
consent, saved-item, and AI conversation flows. Marketplace orders are blocked
for demo users before inventory changes. Demo records are not real health
information; never enter real patient data into the sandbox.

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
PUBLIC_DEMO_ENABLED=true
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
