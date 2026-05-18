# LMS Web

This is the active LMS starter app in the monorepo. It runs on SolidStart, uses Better Auth for email/password auth, Drizzle for persistence, TanStack Query for client data fetching, and oRPC for JSON-friendly application procedures.

The current starter also ships an app-owned i18n layer for English and Arabic plus cookie-backed theme preferences with SSR-safe hydration. Better Auth now reads and writes its secondary storage through `@de100/apps-lms-cache`, which supports `memory`, `redis`, and `upstash` drivers.

## Local setup

From the repo root:

```bash
pnpm install
cp .env.example .env.local
pnpm -F @de100/apps-lms-db db:up
pnpm -F @de100/apps-lms-db db:migrate
pnpm -F @de100/apps-lms-web db:seed
pnpm dev
```

If you switch `.env.local` to `APP_LMS_CACHE_DRIVER=redis`, also start the local Redis service first:

```bash
docker compose up -d lms-redis
```

If this local database was originally bootstrapped with `db:push` before the checked-in migrations existed, run `pnpm -F @de100/apps-lms-db db:reset` once and then repeat the migrate and seed steps.

The app expects the default local origin from `.env.local`:

- app: `http://127.0.0.1:3000`
- auth base URL: `http://127.0.0.1:3000/api/auth`

`.env.local` is the preferred local developer file. `.env` still works as a temporary fallback for older workflows, but the checked-in `.env.example` is now a template only and is no longer loaded at runtime.

Page routes are canonical under `/en/...` and `/ar/...`. The locale middleware will redirect bare page routes such as `/login` or `/dashboard`, but docs and manual tests should use the locale-prefixed URLs directly.

## Locale and theme preferences

- shared locale and theme runtime helpers live in `packages/apps/lms/i18n`
- cache drivers and the Better Auth secondary-storage facade live in `packages/apps/lms/cache`
- app-owned locale definitions and message catalogs live in `apps/lms-web/i18n/shared`, `apps/lms-web/i18n/server`, and `apps/lms-web/i18n/client`
- supported locales are English (`en`) and Arabic (`ar`)
- page routes are canonical under `/en/...` and `/ar/...`; the locale middleware redirects unprefixed page routes into that structure
- locale preference is stored in the `locale` cookie; the server falls back to `Accept-Language` when that cookie is absent
- theme preference is stored in the `theme` cookie with `system`, `light`, and `dark` values
- the server renders `lang`, `dir`, and initial theme state onto the document, then a pre-hydration script resolves `system` before the client mounts
- the top bar exposes both controls so you can verify locale and theme behavior without editing cookies manually

## Auth cache

- `APP_LMS_CACHE_DRIVER=memory` is the safe local default and keeps Better Auth secondary storage in-process.
- `APP_LMS_CACHE_DRIVER=redis` uses `REDIS_URL`, which matches the optional `lms-redis` Docker service in the repo root compose file.
- `APP_LMS_CACHE_DRIVER=upstash` uses `APP_LMS_UPSTASH_REDIS_URL` and `APP_LMS_UPSTASH_REDIS_TOKEN`.
- Better Auth keeps sessions in the database and mirrors secondary-storage reads and writes through the configured cache backend.

## Auth email delivery

- `APP_LMS_EMAIL_DRIVER=log` is the safe local default and writes verification/password-reset emails to the server logs.
- `APP_LMS_EMAIL_DRIVER=resend` uses `APP_LMS_EMAIL_FROM` plus `APP_LMS_RESEND_API_KEY` to deliver real emails through Resend.
- The current starter now sends Better Auth verification emails on sign-up and can send password-reset emails once you wire the corresponding UI flow.

## Seeded accounts

`pnpm -F @de100/apps-lms-web db:seed` is idempotent for the known demo users below. It creates users through Better Auth's own `signUpEmail` API, so the passwords are hashed the same way as a real sign-up.

| Account           | Password       | Intended use                                                |
| ----------------- | -------------- | ----------------------------------------------------------- |
| `owner@lms.test`  | `SeedDemo123!` | Main demo user with mixed todos and media metadata fixtures |
| `viewer@lms.test` | `SeedDemo123!` | Secondary user for cross-account checks                     |
| `empty@lms.test`  | `SeedDemo123!` | Baseline user with auth only and no seeded records          |

## What the seed includes

- users: Better Auth email/password accounts
- todos: completed and incomplete fixtures for CRUD testing
- media: representative metadata states across public/private and draft/ready

Important: seeded media behavior now depends on the active storage driver. With `APP_LMS_MEDIA_STORAGE_DRIVER=local`, `pnpm -F @de100/apps-lms-web db:seed` writes real fixture objects under `APP_LMS_MEDIA_LOCAL_ROOT`, so the seeded media links on `/media` open real content in local development. With `APP_LMS_MEDIA_STORAGE_DRIVER=r2`, the seed still creates metadata rows only because the script does not run with live Cloudflare bucket bindings.

## Why media uses both oRPC and routes

The media slice is intentionally split at the transport boundary:

- oRPC now handles media upload, listing, confirm, delete, capability reads, and signed-link issuance, with the `/media` page using TanStack Query `queryOptions()` and `mutationOptions()` throughout.
- app routes remain only for public/private/signed object reads because those paths return binary responses and need the live request runtime for object access.

That is why media is still not package-only oRPC end to end, even though app-facing management is now oRPC-first.

## Media storage configuration

The media layer supports two drivers behind one shared API surface:

- `APP_LMS_MEDIA_STORAGE_DRIVER=r2`: use Cloudflare R2 bindings and direct public URLs when available
- `APP_LMS_MEDIA_STORAGE_DRIVER=local`: store media on disk under `APP_LMS_MEDIA_LOCAL_ROOT` for local development and testing, including real seeded fixture objects created by `pnpm -F @de100/apps-lms-web db:seed`

Signed delivery works on both drivers. Direct public bucket URLs are only available on `r2`, so the UI exposes both capability flags on the `/media` page.

## Useful commands

From the repo root:

```bash
pnpm -F @de100/apps-lms-db db:up
pnpm -F @de100/apps-lms-db db:down
pnpm -F @de100/apps-lms-db db:reset
pnpm -F @de100/apps-lms-db db:migrate
pnpm -F @de100/apps-lms-db db:generate
docker compose up -d lms-redis
pnpm -F @de100/apps-lms-web db:seed
pnpm dev
pnpm -F @de100/apps-lms-infra deploy
pnpm -F @de100/apps-lms-infra destroy
```

From this package:

```bash
pnpm dev
pnpm dev:trace
pnpm type:check
pnpm test
pnpm db:seed
```

## Trace mode

When you need readable browser and server traces from Vite instead of the normal optimized output, create a dedicated local trace env and use the trace scripts.

From the repo root:

```bash
cp .env.trace.local.example .env.trace.local
pnpm --dir apps/lms-web dev:trace
```

Trace mode keeps names, enables dev/build sourcemaps, disables build minification, and stops Vite from ignoring dependency sourcemaps in the dev server. Normal `pnpm dev` and `pnpm build` behavior stays unchanged.

## Manual test checklist

Use the shared VS Code browser or your normal browser. Playwright is not required for the current starter/MVP workflow.

### Auth

1. Open `/en/login`.
2. Sign in with `owner@lms.test` and `SeedDemo123!`.
3. Use the sign-up toggle on the same page to confirm the restored auth UI exposes both sign-in and sign-up states.
4. Sign out and sign back in with `viewer@lms.test`.
5. Confirm each account only sees its own dashboard, todos, and media records.
6. Switch locale to Arabic and confirm the route changes to `/ar/...` while the form copy and `dir` update.
7. When `APP_LMS_EMAIL_DRIVER=log`, trigger sign-up or password-reset flows and verify the server logs print the generated Better Auth email links.

### Todos

1. Open `/en/dashboard` after signing in.
2. Confirm seeded todos render.
3. Create a new todo and verify the pending/loading state completes cleanly.
4. Toggle completion on an existing todo.
5. Delete a todo and confirm the list refreshes without a full reload.
6. Repeat the same checks with `empty@lms.test` to validate the empty state.

### Media management

1. Open `/en/media` while signed in.
2. Confirm the backend card shows the active storage driver and delivery capabilities.
3. Confirm the seeded metadata fixtures render with the expected visibility and status badges.
4. Use the form to upload a small local file and confirm the request completes through the shared oRPC surface.
5. Confirm the new upload appears as a draft.
6. Run the confirm action and verify the entry moves to `ready`.
7. Open the generated app access URL for the uploaded object.
8. If signed delivery is available, generate a signed URL for a ready item and open it.
9. Delete the uploaded object and confirm the list refreshes.

### Landing page and API reference

1. Open `/en` and confirm the landing page shows the seeded accounts, shared API health card, and direct entry points into auth, dashboard, todos, media, and API reference.
2. Open `/en/api/reference` and confirm the generated OpenAPI UI loads from `/api/reference/spec.json`.

### Notes about seeded media

- With `APP_LMS_MEDIA_STORAGE_DRIVER=local`, seeded media rows include real local objects, so you can validate seeded public/private reads directly from the `/media` page after running `db:seed`.
- With `APP_LMS_MEDIA_STORAGE_DRIVER=r2`, seeded media rows remain metadata-only until you upload real objects through the UI in a live bound runtime.
- Deleting a seeded row is safe in either mode because the bucket delete path is tolerant of a missing object.

## Production deploy

The production Cloudflare deployment path is defined by `packages/apps/lms/infra/alchemy.run.ts` and documented in `docs/setup/production-deployment.md`.

Common commands from the repo root:

```bash
pnpm --dir packages/apps/lms/infra exec alchemy configure
pnpm --dir packages/apps/lms/infra exec alchemy login
pnpm -F @de100/apps-lms-infra deploy
pnpm -F @de100/apps-lms-infra destroy
```

Use `APP_LMS_MEDIA_STORAGE_DRIVER=r2` plus the production database/auth/cache env settings before deploying. Leave `VITE_APP_LMS_SERVER_URL` unset for same-origin deployments unless you intentionally split browser and server origins.
