# GlobalHealth Production Deployment

## Deployment shape

GlobalHealth is a **single full-stack process**: the Express server serves both
the built SPA (`dist/`) and `/api/*`. A static-only host (Netlify without an
API backend) cannot run this platform; the client now fails loudly with
`DEPLOYMENT_API_MISMATCH` when `/api/*` returns HTML.

## Supported topologies

1. Express + `dist/` behind one domain (recommended).
2. UI on one origin with a reverse proxy forwarding `/api/*` to Express, with
   `CORS_ORIGIN` set to the UI origin.

## Build

```sh
npm install
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

`npm run build` produces `dist/server.cjs` plus the static SPA assets. The
server binds to `0.0.0.0:${PORT}` so it works behind Cloud Run / a container
runtime / a reverse proxy.

## Environment

Set the variables in `docs/ENVIRONMENT.md`. There are no source-code fallback
secrets; the server starts even when some high-value gates are absent, but the
affected features fail closed (this is intentional and validated at startup
through `startup configuration warning`).

## Health probes

- `GET /api/health` — process health + memory + request ID.
- `GET /api/ready` — confirms the runtime persistence directory is writable.

## Reverse proxy / TLS

- Terminate TLS at the proxy/load balancer.
- Forward `X-Forwarded-Proto` so same-origin CORS and link generation see
  `https`.
- Pass through or rewrite `/api/*` to the Express process; do **not** let the
  SPA fallback serve `index.html` for `/api/*`.
- Configure HSTS at the proxy and ensure `CORS_ORIGIN` matches the public
  origin.

## Operational notes

- `data/runtime/` (git-ignored) stores account/domain state. Back it up and
  place it on durable storage. It is not a production relational database yet —
  see `docs/migration-plan.md` Phase 3.
- Rotate `GH_ADMIN_KEY`, `PRESCRIPTION_SIGNING_SECRET`, and the registry/AI
  keys through your secret manager.
- The AI assistant uses `GEMINI_API_KEY` server-side only.

## Demo accounts

`GH_DEMO_MODE` seeds sample accounts for local evaluation only. Leave it unset in
production: the server ignores it when `NODE_ENV=production`, and no demo
credentials are exposed. See [Unified authentication](unified-authentication.md#opt-in-demo-accounts-gh_demo_mode).

## Known limitations to plan around

- Multi-instance deployments need shared file storage + a shared rate-limit /
  session store; until the DB phase, run one instance or accept per-instance
  in-memory rate windows.
- No automated orchestrator config yet (`Dockerfile`, migration runner, CI).
