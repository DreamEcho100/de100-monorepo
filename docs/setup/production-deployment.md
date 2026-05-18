# Production Deployment

This repo's production deployment path is built around Alchemy and Cloudflare.

The source of truth is `packages/apps/lms/infra/alchemy.run.ts`.

That stack currently provisions and deploys:

- a Cloudflare-hosted Vite app for `apps/lms-web`
- `PUBLIC_MEDIA_BUCKET` as an R2 bucket with a dev domain and CORS rules
- `PRIVATE_MEDIA_BUCKET` as an R2 bucket with private-object CORS rules
- `IMAGES` as the Cloudflare Images binding made available to the app runtime

## Deploy architecture

The app runtime itself still depends on external services outside Cloudflare:

- a Postgres-compatible database
- Better Auth secrets and public origin configuration
- an optional shared cache backend for Better Auth secondary storage

Recommended production stack:

- Cloudflare Workers via Alchemy for the web app runtime
- Cloudflare R2 for media storage
- Neon for `APP_LMS_DATABASE_URL`
- Upstash for `APP_LMS_CACHE_DRIVER=upstash`

Supported alternatives already in the codebase:

- standard Postgres instead of Neon
- `APP_LMS_CACHE_DRIVER=redis` instead of Upstash
- `APP_LMS_CACHE_DRIVER=memory` for single-instance or low-stakes environments

## Prerequisites

Before the first deploy, make sure you have:

1. A Cloudflare account.
2. A production database URL.
3. A `APP_LMS_BETTER_AUTH_SECRET` with at least 32 characters.
4. A final public origin for the deployed app.
5. An `.env` file at the repo root or `apps/lms-web/.env` containing the production values.

## Required production env values

These values need to be present before you deploy:

```env
ALCHEMY_PASSWORD=replace-with-a-local-password-for-alchemy-state
APP_LMS_DATABASE_URL=postgresql://user:password@your-project.region.aws.neon.tech/dbname
APP_LMS_DATABASE_DRIVER=auto
APP_LMS_BETTER_AUTH_SECRET=replace-with-a-32-character-secret
APP_LMS_BETTER_AUTH_URL=https://your-app-domain.example/api/auth
APP_LMS_CORS_ORIGIN=https://your-app-domain.example
# Leave empty for same-origin browser -> server requests.
VITE_APP_LMS_SERVER_URL=
APP_LMS_MEDIA_STORAGE_DRIVER=r2
APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS=3600
```

Add cache configuration based on your chosen driver:

### Upstash

```env
APP_LMS_CACHE_DRIVER=upstash
UPSTASH_REDIS_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_TOKEN=replace-with-your-upstash-token
```

### Redis

```env
APP_LMS_CACHE_DRIVER=redis
REDIS_URL=redis://your-redis-host:6379
```

### Memory

```env
APP_LMS_CACHE_DRIVER=memory
```

Optional media-signing override:

```env
MEDIA_SIGNING_SECRET=replace-with-a-separate-32-character-secret
```

If `MEDIA_SIGNING_SECRET` is unset, the app falls back to `APP_LMS_BETTER_AUTH_SECRET`.

## Alchemy and Cloudflare setup

Alchemy is the Cloudflare control plane for this repo. The current package scripts are in `packages/apps/lms/infra/package.json`.

Run these once before the first deploy:

```bash
pnpm --dir packages/apps/lms/infra exec alchemy configure
pnpm --dir packages/apps/lms/infra exec alchemy login
```

From Alchemy's official docs:

- `alchemy configure` sets up the local profile used for provider credentials
- `alchemy login` authenticates with Cloudflare and creates the OAuth tokens Alchemy needs

## Deploy workflow

From the repo root:

1. Install dependencies.

```bash
pnpm install
```

2. Apply the latest database migrations against the production database.

```bash
pnpm -F @de100/apps-lms-db db:migrate
```

3. Deploy the Cloudflare stack.

```bash
pnpm -F @de100/apps-lms-infra deploy
```

Useful alternatives:

```bash
pnpm -F @de100/apps-lms-infra smoke:deploy
pnpm -F @de100/apps-lms-infra destroy
```

`smoke:deploy` runs `alchemy deploy alchemy.run.ts` directly from the infra package. `destroy` tears down the resources created by the current Alchemy stack.

## What the deploy creates

The current stack in `alchemy.run.ts` does the following:

- creates or updates the Alchemy app `de100-lms`
- provisions the public R2 bucket `public-media`
- provisions the private R2 bucket `private-media`
- provisions the `IMAGES` Cloudflare Images binding
- deploys the Vite app named `lms-web`
- injects these bindings into the app runtime:
  - `PUBLIC_MEDIA_BUCKET`
  - `PRIVATE_MEDIA_BUCKET`
  - `IMAGES`
  - `PUBLIC_MEDIA_BUCKET_NAME`
  - `PRIVATE_MEDIA_BUCKET_NAME`
  - `PUBLIC_MEDIA_DEV_DOMAIN`
  - optional `VITE_APP_LMS_SERVER_URL` when explicitly configured

## Origin and Better Auth configuration

The biggest production misconfiguration risk is the public origin.

Rules:

- `APP_LMS_BETTER_AUTH_URL` must be the final public origin plus `/api/auth`
- `APP_LMS_CORS_ORIGIN` must match the browser origin that serves the app
- `VITE_APP_LMS_SERVER_URL` should stay empty for same-origin deployments unless you intentionally split browser and server origins

If you deploy once and then decide to keep a different Cloudflare URL or custom domain, update those values and redeploy.

## Media configuration

For the production Cloudflare path, use:

```env
APP_LMS_MEDIA_STORAGE_DRIVER=r2
```

Do not leave `APP_LMS_MEDIA_STORAGE_DRIVER=local` enabled for the Cloudflare deployment path. Local storage is only the development fallback.

The R2 bindings are injected at runtime by Alchemy. The app does not expect bucket credentials in plain env vars for this path.

## Verification after deploy

After a successful deploy, verify:

1. `/en` loads and shows the landing page.
2. `/en/login` and `/ar/login` both return localized HTML.
3. `/api/reference` redirects to `/en/api/reference`.
4. `/api/reference/spec.json` returns JSON.
5. Sign-in works with a real production user or a seeded/demo environment.
6. Media upload works and the deployed app can see the injected R2 bindings.

## Troubleshooting

### Alchemy cannot deploy or authenticate

- Re-run:

```bash
pnpm --dir packages/apps/lms/infra exec alchemy configure
pnpm --dir packages/apps/lms/infra exec alchemy login
```

- Make sure `ALCHEMY_PASSWORD` is set locally before using Alchemy state and secret features.

### Auth works locally but fails after deploy

Check these first:

- `APP_LMS_BETTER_AUTH_URL`
- `APP_LMS_CORS_ORIGIN`
- `APP_LMS_BETTER_AUTH_SECRET`

If the deployed public URL changed, update those values and redeploy.

### Media routes work locally but fail after deploy

Check these first:

- `APP_LMS_MEDIA_STORAGE_DRIVER=r2`
- the deploy completed successfully and printed the R2 resource names
- the app runtime received `PUBLIC_MEDIA_BUCKET` and `PRIVATE_MEDIA_BUCKET`

Remember that seeded media is metadata-only. Real object checks should be done with files uploaded through the running app.

### Cache-backed auth records fail

Check the active `APP_LMS_CACHE_DRIVER` and its matching env vars:

- `REDIS_URL` for `redis`
- `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` for `upstash`

If you do not want a shared cache backend yet, switch to `APP_LMS_CACHE_DRIVER=memory`.

### The app deploys but database calls fail

- Verify `APP_LMS_DATABASE_URL`
- verify `APP_LMS_DATABASE_DRIVER`
- run `pnpm -F @de100/apps-lms-db db:migrate` against the target database before deploying the app

## Related docs

- `docs/setup/environment.md`
- `docs/architecture/media-storage.md`
- `apps/lms-web/README.md`
