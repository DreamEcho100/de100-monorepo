# @de100/monorepo

This workspace currently centers on the LMS starter in `apps/lms-web`, backed by shared `auth`, `db`, `api`, `cache`, `env`, `i18n`, `infra`, and `validators` packages under `packages/apps/lms`.

## Quick start

1. Install dependencies.

```bash
pnpm install
```

2. Create a local env file from the checked-in example.

```bash
cp .env.example .env
```

3. Start the local Postgres container.

```bash
pnpm -F @de100/apps-lms-db db:up
```

If you want Better Auth secondary storage backed by local Redis instead of the default in-process cache, also start Redis and set `APP_LMS_CACHE_DRIVER=redis` plus `REDIS_URL` in `.env`.

```bash
docker compose up -d lms-redis
```

4. Apply the current migrations.

```bash
pnpm -F @de100/apps-lms-db db:migrate
```

If your local database was created earlier with `db:push` before migrations were generated, run `pnpm -F @de100/apps-lms-db db:reset` once and then rerun `pnpm -F @de100/apps-lms-db db:migrate`.

5. Seed the local database with Better Auth users plus demo todo and media metadata fixtures.

```bash
pnpm -F @de100/apps-lms-web db:seed
```

6. Start the app.

```bash
pnpm dev
```

## What `db:seed` does

- Creates known email/password users through Better Auth's own `signUpEmail` API so password hashing matches the real auth flow.
- Seeds mixed todo states for manual CRUD testing.
- Seeds representative media metadata states for management UI testing.
- Leaves real binary media object creation to the runtime upload flow because R2 bucket writes require Cloudflare request bindings that are not available in the plain Node seed script.

## Manual testing

- Use the shared VS Code browser or your normal browser. Playwright is not required for the current starter/MVP workflow.
- Prefer localized page routes such as `/en`, `/en/login`, and `/ar/login`. Bare page routes redirect through the locale middleware, but the locale-prefixed URLs are the canonical examples for docs, bookmarks, and manual checks.
- Sign in with a seeded account, then validate auth, todo CRUD, and media upload/management flows directly in the app.
- App-facing async flows should now read and write through oRPC plus TanStack Query; direct routes remain for auth and binary media reads.
- Use the top-bar language and theme controls to verify cookie-backed locale/theme persistence and SSR hydration behavior.
- When `APP_LMS_CACHE_DRIVER=redis` or `APP_LMS_CACHE_DRIVER=upstash`, Better Auth session, verification, and related ephemeral records should flow through the configured cache backend.
- Upload a small local file from the `/media` page when you want to verify real binary upload, access, confirm, and delete behavior.

## Deployment

Production deployment for the LMS starter goes through the infra package and Alchemy, not a separate Wrangler-first app config.

- Infra package: `packages/apps/lms/infra`
- Deploy guide: `docs/setup/production-deployment.md`

Typical commands from the repo root:

```bash
pnpm --dir packages/apps/lms/infra exec alchemy configure
pnpm --dir packages/apps/lms/infra exec alchemy login
pnpm -F @de100/apps-lms-infra deploy
pnpm -F @de100/apps-lms-infra destroy
```

Alchemy provisions the Cloudflare-side resources defined in `packages/apps/lms/infra/alchemy.run.ts`, including the deployed Vite app plus the public/private R2 buckets and Images binding used by the LMS media layer.

## More docs

See `apps/lms-web/README.md` for the LMS-specific setup, seeded accounts, architecture notes, and a manual test checklist.

## Package-owned DB commands

Database lifecycle and Drizzle commands now belong to the DB package, while seeding belongs to the app package.

Typical commands from the repo root:

```bash
pnpm -F @de100/apps-lms-db db:up
pnpm -F @de100/apps-lms-db db:logs
pnpm -F @de100/apps-lms-db db:migrate
pnpm -F @de100/apps-lms-db db:push
pnpm -F @de100/apps-lms-db db:generate
pnpm -F @de100/apps-lms-db db:studio
pnpm -F @de100/apps-lms-db db:down
pnpm -F @de100/apps-lms-db db:reset
pnpm -F @de100/apps-lms-web db:seed
pnpm -F @de100/apps-lms-infra deploy
```
