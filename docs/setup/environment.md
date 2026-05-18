# Environment Setup

The repo now uses a single `APP_LMS_DATABASE_URL` plus an optional `APP_LMS_DATABASE_DRIVER` override.

## Required variables

- `APP_LMS_DATABASE_URL`: Postgres connection string
- `APP_LMS_BETTER_AUTH_SECRET`: Better Auth secret, minimum 32 characters
- `APP_LMS_BETTER_AUTH_URL`: full auth route base, for example `http://127.0.0.1:3000/api/auth`
- `APP_LMS_CORS_ORIGIN`: allowed browser origin, for example `http://127.0.0.1:3000`

## Optional variables

- `ALCHEMY_PASSWORD`: local password Alchemy uses to encrypt its stored state and secrets when you manage infrastructure
- `APP_LMS_DATABASE_DRIVER`: one of `auto`, `postgres`, or `neon-http`
- `VITE_APP_LMS_SERVER_URL`: explicit browser-to-server base URL when not using same-origin requests
- `APP_LMS_CACHE_DRIVER`: one of `memory`, `redis`, or `upstash`
- `APP_LMS_CACHE_KEY_PREFIX`: prefix applied to LMS cache keys, defaults to `de100:lms`
- `APP_LMS_MEDIA_STORAGE_DRIVER`: one of `r2` or `local`
- `APP_LMS_MEDIA_LOCAL_ROOT`: filesystem root used when `APP_LMS_MEDIA_STORAGE_DRIVER=local`
- `MEDIA_SIGNING_SECRET`: optional dedicated HMAC secret for signed media URLs; falls back to `APP_LMS_BETTER_AUTH_SECRET`
- `APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS`: signed media URL lifetime in seconds, defaults to `3600`
- `REDIS_URL`: required when `APP_LMS_CACHE_DRIVER=redis`
- `UPSTASH_REDIS_URL`: required when `APP_LMS_CACHE_DRIVER=upstash`
- `UPSTASH_REDIS_TOKEN`: required when `APP_LMS_CACHE_DRIVER=upstash`

## Driver selection

`APP_LMS_DATABASE_DRIVER=auto` is the default.

In auto mode:

- Neon-style URLs resolve to the `neon-http` driver
- local Docker or standard Postgres URLs resolve to the `postgres` driver

Use an explicit override when you want to force a specific client library regardless of host naming.

## Local development

The LMS web package's wrapped dev and build scripts layer env files in this order:

1. `.env.example`
2. `.env`

That means the app can boot with safe local defaults even before you create a real `.env` file, and any values you add to `.env` will override the example defaults.

The env package in `packages/apps/lms/env/src/server.ts` also loads `.env` from the current working directory, the repo root, and `apps/lms-web/.env` when code runs outside those wrapped scripts.

For a repeatable local run without manual shell exports:

```sh
pnpm --dir apps/lms-web with-env vite dev --host 127.0.0.1 --port 3000
```

Use locale-prefixed page routes in examples and checks, for example `/en`, `/en/login`, and `/ar/login`.

For a trace-friendly local runtime, create `.env.trace.local` from `.env.trace.local.example` and run:

```bash
pnpm --dir apps/lms-web dev:trace --host 127.0.0.1 --port 3000
```

That mode enables Vite dev sourcemaps, disables build minification, preserves function and class names, and includes dependency sourcemaps during local debugging.

Create a real `.env` when you need local secrets, non-default URLs, or a real database target.

## Better Auth secondary storage

The starter now routes Better Auth secondary storage through `@de100/apps-lms-cache`.

- `memory` is the default and keeps ephemeral auth state in-process.
- `redis` uses a standard Redis connection string.
- `upstash` uses the Upstash REST client.

Better Auth still stores sessions in the database, but reads and writes its secondary-storage records through the configured cache driver.

## Media storage and signed delivery

The starter supports two storage backends:

- `APP_LMS_MEDIA_STORAGE_DRIVER=r2` for Cloudflare R2-backed object storage
- `APP_LMS_MEDIA_STORAGE_DRIVER=local` for a local filesystem fallback during development

When local storage is enabled, `APP_LMS_MEDIA_LOCAL_ROOT` controls where uploaded files are written.

Private media sharing now uses signed app URLs. The signing flow uses:

- `MEDIA_SIGNING_SECRET` when you want a secret separate from Better Auth
- `APP_LMS_BETTER_AUTH_SECRET` as the fallback signing secret when `MEDIA_SIGNING_SECRET` is unset
- `APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS` to control how long a signed media URL remains valid

## Local Docker Postgres and Redis

This repo now includes root [docker-compose.yml](/home/viavi/Desktop/workspaces/github/lms/docker-compose.yml) services that match the default local database setup and the optional Redis cache setup in `.env.example`.

Typical local sequence:

```sh
pnpm -F @de100/apps-lms-db db:up
pnpm -F @de100/apps-lms-db db:migrate
pnpm --dir apps/lms-web with-env vite dev --host 127.0.0.1 --port 3000
```

If you switch to `APP_LMS_CACHE_DRIVER=redis`, start Redis too:

```sh
docker compose up -d lms-redis
```

Useful commands:

```sh
pnpm -F @de100/apps-lms-db db:logs
pnpm -F @de100/apps-lms-db db:down
pnpm -F @de100/apps-lms-db db:reset
```

`db:reset` removes the Docker volume and recreates the database container from scratch.

For local Docker or a directly running Postgres instance, a typical value is:

```env
APP_LMS_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/de100_lms
APP_LMS_DATABASE_DRIVER=postgres
APP_LMS_BETTER_AUTH_URL=http://127.0.0.1:3000/api/auth
APP_LMS_CORS_ORIGIN=http://127.0.0.1:3000
VITE_APP_LMS_SERVER_URL=http://127.0.0.1:3000
APP_LMS_CACHE_DRIVER=memory
APP_LMS_CACHE_KEY_PREFIX=de100:lms
APP_LMS_MEDIA_STORAGE_DRIVER=local
APP_LMS_MEDIA_LOCAL_ROOT=./.local/media
APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS=3600
```

For local Redis-backed auth cache, add:

```env
APP_LMS_CACHE_DRIVER=redis
REDIS_URL=redis://127.0.0.1:6379
```

For Neon, a typical value is:

```env
APP_LMS_DATABASE_URL=postgresql://user:password@your-project.region.aws.neon.tech/dbname
APP_LMS_DATABASE_DRIVER=auto
APP_LMS_MEDIA_STORAGE_DRIVER=r2
```

For Upstash, add:

```env
APP_LMS_CACHE_DRIVER=upstash
UPSTASH_REDIS_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_TOKEN=replace-with-your-upstash-token
```

## Production deployment environment

The repo's production Cloudflare path is driven by `packages/apps/lms/infra/alchemy.run.ts` and documented in `docs/setup/production-deployment.md`.

Recommended production baseline:

```env
ALCHEMY_PASSWORD=replace-with-a-local-password-for-alchemy-state
APP_LMS_DATABASE_URL=postgresql://user:password@your-project.region.aws.neon.tech/dbname
APP_LMS_DATABASE_DRIVER=auto
APP_LMS_BETTER_AUTH_SECRET=replace-with-a-32-character-secret
APP_LMS_BETTER_AUTH_URL=https://your-app-domain.example/api/auth
APP_LMS_CORS_ORIGIN=https://your-app-domain.example
# Leave empty for same-origin browser -> server requests.
VITE_APP_LMS_SERVER_URL=
APP_LMS_CACHE_DRIVER=upstash
UPSTASH_REDIS_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_TOKEN=replace-with-your-upstash-token
APP_LMS_MEDIA_STORAGE_DRIVER=r2
MEDIA_SIGNING_SECRET=replace-with-a-separate-32-character-secret
APP_LMS_MEDIA_SIGNED_URL_TTL_SECONDS=3600
```

Notes:

- `APP_LMS_BETTER_AUTH_URL` must point at the deployed `/api/auth` base on the final public origin.
- `APP_LMS_CORS_ORIGIN` must match the browser origin serving the app.
- Leave `VITE_APP_LMS_SERVER_URL` unset when the browser talks to the same deployed origin.
- `APP_LMS_MEDIA_STORAGE_DRIVER=local` is for local development only; use `r2` for the Cloudflare deployment path.
- Choose `APP_LMS_CACHE_DRIVER=memory` only for single-instance or low-stakes environments. Use `redis` or `upstash` when you need durable shared auth secondary storage.
