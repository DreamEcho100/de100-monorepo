# Production Deployment

This repo's production deployment path is self-host-first.

Primary orchestration path:

- Coolify plus Caddy on a VPS

Supported alternative:

- Traefik-based orchestration with equivalent runtime env wiring

Cloud-provider-era deployment artifacts are archived in `_old/backup-v1` and are not part of the active setup path.

## Current proof status

- `implemented-and-evidenced`: local provider-boundary and media guardrail validation
  - Evidence: [docs/evidence/2026-05-25-phase3-provider-refactor-validation.md](docs/evidence/2026-05-25-phase3-provider-refactor-validation.md)
- `implemented-and-evidenced`: local browser regression after shared UI standardization
  - Evidence: [docs/evidence/2026-05-25-phase4-ui-regression.md](docs/evidence/2026-05-25-phase4-ui-regression.md)
- `implemented-and-unverified`: production-close hosted smoke pass on deployed origin (Better Auth, Resend, cache driver, media upload/read/signed access, migrations)

Evidence index: [docs/evidence/README.md](docs/evidence/README.md)

## Secrets hygiene for deploy artifacts

- Do not include live secrets in screenshots, logs, or evidence markdown.
- Redact tokens, cookies, passwords, API keys, and auth headers before storing evidence.
- Keep `.env.deploy.local` uncommitted.
- Use placeholder values in all documentation snippets.

## Deploy architecture

The app runtime depends on external services:

- a Postgres-compatible database
- Better Auth secret and public origin configuration
- optional shared cache backend for Better Auth secondary storage
- object storage when `APP_LMS_MEDIA_STORAGE_DRIVER=r2`

Recommended production stack:

- Coolify plus Caddy for app runtime and edge routing
- Neon for `APP_LMS_DATABASE_URL`
- Upstash for `APP_LMS_CACHE_DRIVER=upstash`
- Resend for `APP_LMS_EMAIL_DRIVER=resend`
- S3-compatible object storage for media when `APP_LMS_MEDIA_STORAGE_DRIVER=r2`

Supported alternatives already in the codebase:

- standard Postgres instead of Neon
- `APP_LMS_CACHE_DRIVER=redis` instead of Upstash
- `APP_LMS_CACHE_DRIVER=memory` for single-instance or low-stakes environments
- `APP_LMS_MEDIA_STORAGE_DRIVER=local` for local-only or non-shared deployments

## Prerequisites

Before the first deploy, make sure you have:

1. A VPS provider account and a running host.
2. DNS configured for the final public origin.
3. A production database URL.
4. `APP_LMS_BETTER_AUTH_SECRET` with at least 32 characters.
5. A local `.env.deploy.local` file at the repo root containing production values, or equivalent provider-managed secrets.

Keep `.env.local` focused on local development.

Provider guides:

- Hetzner: `packages/apps/lms/infra/docs/providers/hetzner.md`
- DigitalOcean: `packages/apps/lms/infra/docs/providers/digitalocean.md`
- Hostinger: `packages/apps/lms/infra/docs/providers/hostinger.md`

## Required production env values

These values need to be present before preflight and deployment:

```env
APP_LMS_SERVER_PORT=3000
APP_LMS_DATABASE_URL=postgresql://user:password@your-db-host/dbname
APP_LMS_DATABASE_DRIVER=auto
APP_LMS_BETTER_AUTH_SECRET=replace-with-a-32-character-secret
APP_LMS_BETTER_AUTH_URL=https://your-app-domain.example/api/auth
APP_LMS_CORS_ORIGIN=https://your-app-domain.example
# Leave empty for same-origin browser -> server requests.
VITE_APP_LMS_SERVER_URL=
APP_LMS_EMAIL_DRIVER=resend
APP_LMS_EMAIL_FROM=LMS Starter <noreply@your-domain.example>
APP_LMS_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
APP_LMS_CACHE_DRIVER=upstash
APP_LMS_UPSTASH_REDIS_URL=https://your-upstash-instance.upstash.io
APP_LMS_UPSTASH_REDIS_TOKEN=replace-with-your-upstash-token
APP_LMS_MEDIA_STORAGE_DRIVER=r2
APP_LMS_MEDIA_S3_ENDPOINT=https://your-s3-endpoint.example
APP_LMS_MEDIA_S3_REGION=auto
APP_LMS_MEDIA_S3_ACCESS_KEY_ID=replace-with-your-access-key-id
APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY=replace-with-your-secret-access-key
APP_LMS_MEDIA_S3_PUBLIC_BUCKET=public-media
APP_LMS_MEDIA_S3_PRIVATE_BUCKET=private-media
APP_LMS_MEDIA_S3_FORCE_PATH_STYLE=true
APP_LMS_MEDIA_SIGNING_SECRET=replace-with-a-separate-32-character-secret
APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS=3600
```

Start from the checked-in template:

```bash
cp .env.deploy.local.example .env.deploy.local
```

If you use `APP_LMS_MEDIA_STORAGE_DRIVER=local`, replace S3 variables with:

```env
APP_LMS_MEDIA_LOCAL_ROOT=./.local/media
```

Optional healthcheck overrides:

```env
APP_LMS_HEALTHCHECK_URL=https://your-app-domain.example/health
APP_LMS_HEALTHCHECK_TIMEOUT_MS=10000
```

If `APP_LMS_MEDIA_SIGNING_SECRET` is unset, the app falls back to `APP_LMS_BETTER_AUTH_SECRET`.

## Deploy workflow

From the repo root:

1. Install dependencies.

```bash
pnpm install
```

2. Validate deploy env.

```bash
pnpm -F @de100/apps-lms-infra selfhost:preflight
```

3. Apply latest database migrations against production.

```bash
pnpm -F @de100/apps-lms-db db:migrate
```

4. Deploy the app using your chosen orchestrator runbook.

- Coolify primary: `packages/apps/lms/infra/docs/coolify-deployment/setup-from-scratch.md`
- Traefik alternative: `packages/apps/lms/infra/docs/traefik-deployment/service-setup.md`

5. Run post-deploy checks.

```bash
pnpm -F @de100/apps-lms-infra selfhost:smoke:hosted -- --url https://your-app-domain.example --env <environment>
```

Equivalent manual sequence:

```bash
pnpm -F @de100/apps-lms-infra selfhost:health
pnpm -F @de100/apps-lms-infra selfhost:verify
pnpm -F @de100/apps-lms-infra selfhost:smoke:public
pnpm -F @de100/apps-lms-infra selfhost:verify:full
```

6. Complete smoke checklist and capture evidence artifact:

- `packages/apps/lms/infra/docs/checklists/hosted-smoke-run-procedure.md`
- `packages/apps/lms/infra/docs/checklists/post-deploy-smoke-checklist.md`
- `pnpm -F @de100/apps-lms-infra selfhost:evidence:init -- <environment>` (only when manual sequence is used, or when `--skip-evidence-init` was passed)
- `docs/evidence/templates/hosted-deploy-smoke-template.md`

`pnpm -F @de100/apps-lms-infra deploy` is an alias for `selfhost:verify`.

Optional smoke URL override:

```env
APP_LMS_SMOKE_BASE_URL=https://your-app-domain.example
APP_LMS_SMOKE_TIMEOUT_MS=15000
```

## Origin and Better Auth configuration

The biggest production misconfiguration risk is the public origin.

Rules:

- `APP_LMS_BETTER_AUTH_URL` must be the final public origin plus `/api/auth`.
- `APP_LMS_CORS_ORIGIN` must match the browser origin that serves the app.
- `VITE_APP_LMS_SERVER_URL` should stay empty for same-origin deployments unless browser and server origins are intentionally split.

If the public URL changes, update these values and redeploy.

## Media configuration

For multi-instance self-host deployment, use:

```env
APP_LMS_MEDIA_STORAGE_DRIVER=r2
```

With `r2`, preflight expects:

- `APP_LMS_MEDIA_S3_ENDPOINT`
- `APP_LMS_MEDIA_S3_PUBLIC_BUCKET`
- `APP_LMS_MEDIA_S3_PRIVATE_BUCKET`
- `APP_LMS_MEDIA_S3_ACCESS_KEY_ID` and `APP_LMS_MEDIA_S3_SECRET_ACCESS_KEY` together, if either is set

Runtime resolution order:

- use request runtime bucket bindings when present
- otherwise use `APP_LMS_MEDIA_S3_*` values for hosted S3-compatible access

Use `APP_LMS_MEDIA_STORAGE_DRIVER=local` only for local or single-node flows where shared object storage is not required.

## Verification after deploy

Treat this checklist as `implemented-and-unverified` until matching evidence is added under `docs/evidence/`.

Use `packages/apps/lms/infra/docs/checklists/post-deploy-smoke-checklist.md` as the execution checklist and store results with `docs/evidence/templates/hosted-deploy-smoke-template.md`.
For a step-by-step operator flow, use `packages/apps/lms/infra/docs/checklists/hosted-smoke-run-procedure.md`.

After a successful deploy, verify:

1. `/en` loads and shows the landing page.
2. `/en/login` and `/ar/login` both return localized HTML.
3. `/api/reference` redirects to `/en/api/reference`.
4. `/api/reference/spec.json` returns JSON.
5. Sign-in works with a real production user or seeded/demo environment.
6. Media upload works and files can be read through public, private, and signed routes.
7. Verification and password-reset emails are delivered through Resend.

## Troubleshooting

### Preflight fails

- Re-run `pnpm -F @de100/apps-lms-infra selfhost:preflight` and resolve reported missing variables.
- If media driver is `r2`, ensure endpoint and bucket variables are present.
- If cache driver is `upstash` or `redis`, ensure matching driver variables are set.
- Verify `APP_LMS_SMOKE_BASE_URL` only points to the intended hosted target for smoke runs.

### Health check fails

- Set `APP_LMS_HEALTHCHECK_URL` to the deployed app URL.
- Confirm reverse proxy routes `/health` to the app service.
- Verify `APP_LMS_SERVER_PORT` matches the container port exposed by your orchestrator.

### Auth works locally but fails after deploy

Check these first:

- `APP_LMS_BETTER_AUTH_URL`
- `APP_LMS_CORS_ORIGIN`
- `APP_LMS_BETTER_AUTH_SECRET`

If the public URL changed, update values and redeploy.

### Media routes fail after deploy

Check these first:

- `APP_LMS_MEDIA_STORAGE_DRIVER`
- S3 endpoint and bucket vars when using `r2`
- runtime environment injection for all media variables

Remember that seeded media is metadata-only. Real object checks should be done with files uploaded through the running app.

### Cache-backed auth records fail

Check active `APP_LMS_CACHE_DRIVER` and matching vars:

- `REDIS_URL` for `redis`
- `APP_LMS_UPSTASH_REDIS_URL` and `APP_LMS_UPSTASH_REDIS_TOKEN` for `upstash`

If you do not want a shared cache backend yet, switch to `APP_LMS_CACHE_DRIVER=memory`.

### Auth emails do not send in production

Check these first:

- `APP_LMS_EMAIL_DRIVER=resend`
- `APP_LMS_EMAIL_FROM`
- `APP_LMS_RESEND_API_KEY`

For local development, switch back to `APP_LMS_EMAIL_DRIVER=log` and confirm generated Better Auth links appear in local server logs.

## Related docs

- `docs/setup/environment.md`
- `docs/architecture/media-storage.md`
- `docs/deployment/self-hosted/overview.md`
- `packages/apps/lms/infra/docs/README.md`
- `packages/apps/lms/infra/docs/runbooks/migration-cutover.md`
- `packages/apps/lms/infra/docs/runbooks/rollback-recovery.md`
- `packages/apps/lms/infra/docs/runbooks/security-incident.md`
- `apps/lms-web/README.md`
