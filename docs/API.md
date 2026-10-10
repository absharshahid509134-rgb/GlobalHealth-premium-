# GlobalHealth API

Server is Express under the same origin as the SPA. Error shape for the
central boundary is:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong. Please try again."
  },
  "requestId": "req-..."
}
```

> This document is intentionally lean now because the route inventory lives in
> `docs/audit.md` and the source. The full OpenAPI contract is a later Phase.

## Groups

| Group | Base | Notes |
| --- | --- | --- |
| Health | `/api/health`, `/api/ready` | public |
| Credential verification | `/api/verify-credential` | registry-gated, fail closed |
| Public auth | `/api/auth/*`, `/api/me/*` | public + `requireAuth` |
| Doctor | `/api/doctor/*` | `requireDoctor` (VERIFIED + ACTIVE) |
| EHR/consent | `/api/doctor/patients/*`, `/api/me/consent-requests/*` | doctor/patient ownership |
| News | `/api/news/*` | public/admin/authority/auth |
| Pharmacy marketplace | `/api/pharmacy-marketplace/*` | public availability/orders |
| Pharmacy partner | `/api/pharmacy-partner/*` | `requireMarketPartner` (ownership) |
| Hospital | `/api/hospital-registry/*`, `/api/hospital-portal/*` | public + `requireHospitalToken` |
| AI | `/api/ai/conversations*`, `/api/ai-assistant` | authenticated conversations; AI assistant rate-limited |

## Authentication

- `GET /api/auth/demo-accounts`: synthetic role-specific demo credentials in
  development only; returns `404` in production and test modes. Responses are
  private and non-cacheable. Never use these accounts for real patient data.
- `POST /api/auth/demo-login` (`{ role?: 'user' | 'doctor' | 'hospital' | 'pharmacy' | 'news' }`):
  starts a passwordless, isolated synthetic sandbox (201 + opaque token). Unknown
  roles return `400 INVALID_DEMO_ROLE`; `404 DEMO_DISABLED` when
  `PUBLIC_DEMO_ENABLED=false`. Professional demo tokens only unlock
  `GET /api/portals/:role/workspace` and `POST|PATCH|DELETE /api/portals/:role/demo/items[/:itemId]`
  for their own role; see `docs/unified-authentication.md`.
- Public users: bearer token returned by `/api/auth/*`, attached through
  `src/services/authClient.ts`.
- Doctors/hospitals/pharmacy/news: separate bearer tokens scoped to one
  account. Ownership is always resolved from the token on the server.

## Key security behaviors (verified)

- `/api/prescribe` -> `401 DOCTOR_AUTH_REQUIRED` without a doctor session.
- Unknown CORS origin in production -> `403 CORS_ORIGIN_DENIED`.
- `/api/verify-credential` without registry -> `503 VERIFICATION_UNAVAILABLE`,
  never a synthesized `VERIFIED`.
- Pharmacy admin verify/pending without `GH_ADMIN_KEY` -> `503
  ADMIN_KEY_NOT_CONFIGURED`.
- Doctor/pharmacy/hospital password-reset endpoints never return a token or code
  in `NODE_ENV=production`.
