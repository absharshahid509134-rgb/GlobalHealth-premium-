# GlobalHealth Deployment Mode & API Requirement

## Summary

GlobalHealth is a **single full-stack deployment**, not a static-only site.

- The React/Svelte UI in `dist/` is served by the same Express server that
  provides `/api/*`.
- Authentication, EHR, consent, pharmacy inventory, hospital registry, news
  governance, AI, and all private resources require the Express API process.
- The API must be reachable at the **same origin** as the UI. The server
  disallows arbitrary cross-origin calls in production; you must deploy both
  together or configure an allowlisted gateway address.

## Why a UI-only Netlify deployment is insufficient

A static host (for example Netlify's default `publish: dist`) can serve the
browser bundle, but it has no Node/Express process. Therefore:

- `POST /api/auth/login`, `/api/auth/signup`, `/api/me/*`, `/api/ehr/*`
- `/api/pharmacy-marketplace/*`, `/api/hospital-portal/*`, `/api/news/*`
- `/api/ai/assistant`, `/api/doctor/*`

all return the SPA's `index.html` (HTTP 200 with `Content-Type: text/html`) or
route to a static 404, which the client interprets as an invalid API response.

## Runtime guard added

`src/services/authClient.ts` now detects a frontend-only deploy: when a request
to an `/api/*` path receives `text/html`, it throws:

```
DEPLOYMENT_API_MISMATCH — The GlobalHealth API is not available on this host.
```

This prevents the app from silently pretending authentication / EHR / etc.
worked while all data stays client-side.

## Supported production shapes

| Shape | Works? |
| --- | --- |
| Express + `dist/` on one host / same-origin domain | Yes |
| Express API behind reverse proxy with the SPA on the same domain | Yes, set `CORS_ORIGIN` to the public origin |
| Static UI separate from an over-the-top reverse proxy that forwards `/api/*` to Express | Yes, configure `CORS_ORIGIN` to the UI origin |
| Static-only Netlify without any `/api/*` backend | No — authentication and every data feature are unavailable |

## Environment variables

```env
# Public origin used for same-origin CORS checks / deep links.
APP_URL=https://globalhealth.example

# Production cross-origin allowlist. Unknown origins are rejected (HTTP 403).
CORS_ORIGIN=https://globalhealth.example

# Verify-credential gateway; without these the endpoint reports NOT_VERIFIED.
MEDAUTH_REGISTRY_URL=https://registry.example.vendor/api/verify
MEDAUTH_REGISTRY_SECRET=<server secret>

# Server-held admin key for pharmacy-partner verification actions.
GH_ADMIN_KEY=<strong random value>

# Demo accounts are never seeded in production. Do not set GH_DEMO_MODE here;
# the server ignores it when NODE_ENV=production.

# Prescription signing; when unset prescriptions are prepared but UNSIGNED.
PRESCRIPTION_SIGNING_SECRET=<strong random value>

# News Management bootstrap admin (production). If unset, News fails closed.
NEWS_ADMIN_BOOTSTRAP_EMAIL=news-admin@globalhealth.example
NEWS_ADMIN_BOOTSTRAP_PASSWORD=<strong random value>
NEWS_ADMIN_BOOTSTRAP_NAME=GlobalHealth News Administrator
```

## Deployment checklist

1. Build both bundles with `npm run build` (`dist/` contains UI + `server.cjs`).
2. Run `NODE_ENV=production node dist/server.cjs`.
3. Bind to `0.0.0.0` and only expose the expected port/host through your load
   balancer or reverse proxy.
4. Set `CORS_ORIGIN` / `APP_URL` to the exact public origin.
5. Set all server-only secrets in the environment, never in the client bundle.
6. Verify `/api/health` returns `HEALTHY` and the SPA returns `200` at `/`.
7. Verify a UI-only fallback would never be accepted: `curl -H 'Origin: https://evil.example' ...` must return `403 CORS_ORIGIN_DENIED` in production.
