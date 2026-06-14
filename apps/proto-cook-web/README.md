# Proto Cook Web

This is the active Proto Cook starter app in the monorepo. It runs on SolidStart, uses Better Auth for email/password auth, Drizzle for persistence, TanStack Query for client data fetching, and oRPC for JSON-friendly application procedures.

The current starter also ships an app-owned i18n layer for English and Arabic plus cookie-backed theme preferences with SSR-safe hydration. Better Auth now reads and writes its secondary storage through `@de100/apps-proto-cook-cache`, which supports `memory`, `redis`, and `upstash` drivers.

## Local setup

From the repo root:

```bash
pnpm install
cp .env.example .env.local
pnpm -F @de100/apps-proto-cook-db db:up
pnpm -F @de100/apps-proto-cook-db db:migrate
pnpm -F @de100/apps-proto-cook-web db:seed
pnpm dev
```

If you switch `.env.local` to `APP_PROTO_COOK_CACHE_DRIVER=redis`, also start the local Redis service first:

```bash
pnpm -F @de100/apps-proto-cook-infra redis:up
```

The app expects the default local origin from `.env.local`:

- app: `http://127.0.0.1:3000`
- browser URL: `http://127.0.0.1:3000/en` or `http://localhost:3000/en`
- auth base URL: `http://127.0.0.1:3000/api/auth`

The default dev server binds to all local interfaces and fails loudly if port `3000` is already in use. If a sandboxed tool or Codex-run command prints Vite's ready message but the browser still reports `ERR_CONNECTION_REFUSED`, start `pnpm dev` from a normal VS Code/local terminal instead; sandboxed network namespaces can make that server unreachable from the host browser.

`.env.local` is the preferred local developer file. `.env` still works as a temporary fallback for older workflows, but the checked-in `.env.example` is now a template only and is no longer loaded at runtime.

Page routes are canonical under `/en/...` and `/ar/...`. The locale middleware will redirect bare page routes such as `/login` or `/dashboard`, but docs and manual tests should use the locale-prefixed URLs directly.

## Locale and theme preferences

- shared locale and theme runtime helpers live in `packages/apps/proto-cook/i18n`
- cache drivers and the Better Auth secondary-storage facade live in `packages/apps/proto-cook/cache`
- app-owned locale definitions and message catalogs live in `apps/proto-cook-web/i18n/shared`, `apps/proto-cook-web/i18n/server`, and `apps/proto-cook-web/i18n/client`
- supported locales are English (`en`) and Arabic (`ar`)
- page routes are canonical under `/en/...` and `/ar/...`; the locale middleware redirects unprefixed page routes into that structure
- locale preference is stored in the `locale` cookie; the server falls back to `Accept-Language` when that cookie is absent
- theme preference is stored in the `theme` cookie with `system`, `light`, and `dark` values
- the server renders `lang`, `dir`, and initial theme state onto the document, then a pre-hydration script resolves `system` before the client mounts
- the top bar exposes both controls so you can verify locale and theme behavior without editing cookies manually

## Auth cache

- `APP_PROTO_COOK_CACHE_DRIVER=memory` is the safe local default and keeps Better Auth secondary storage in-process.
- `APP_PROTO_COOK_CACHE_DRIVER=redis` uses `REDIS_URL`, which matches the optional `proto-cook-redis` Docker service owned by `@de100/apps-proto-cook-infra`.
- `APP_PROTO_COOK_CACHE_DRIVER=upstash` uses `APP_PROTO_COOK_UPSTASH_REDIS_URL` and `APP_PROTO_COOK_UPSTASH_REDIS_TOKEN`.
- Better Auth keeps sessions in the database and mirrors secondary-storage reads and writes through the configured cache backend.

## Auth email delivery

- `APP_PROTO_COOK_EMAIL_DRIVER=log` is the safe local default and writes verification/password-reset emails to the server logs.
- `APP_PROTO_COOK_EMAIL_DRIVER=resend` uses `APP_PROTO_COOK_EMAIL_FROM` plus `APP_PROTO_COOK_RESEND_API_KEY` to deliver real emails through Resend.
- The current starter now sends Better Auth verification emails on sign-up and can send password-reset emails once you wire the corresponding UI flow.

## Seeded accounts

`pnpm -F @de100/apps-proto-cook-web db:seed` is idempotent for the known demo users below. It creates users through Better Auth's own `signUpEmail` API, so the passwords are hashed the same way as a real sign-up.

| Account                  | Password       | Intended use                                                |
| ------------------------ | -------------- | ----------------------------------------------------------- |
| `owner@proto-cook.test`  | `SeedDemo123!` | Main demo user with mixed todos and files metadata fixtures |
| `viewer@proto-cook.test` | `SeedDemo123!` | Secondary user for cross-account checks                     |
| `empty@proto-cook.test`  | `SeedDemo123!` | Baseline user with auth only and no seeded records          |

## What the seed includes

- users: Better Auth email/password accounts
- todos: completed and incomplete fixtures for CRUD testing
- files: representative metadata states across public/private and draft/ready

Important: seeded files behavior depends on the active storage driver. With `APP_PROTO_COOK_FILES_STORAGE_DRIVER=local`, `pnpm -F @de100/apps-proto-cook-web db:seed` writes real fixture objects under `APP_PROTO_COOK_FILES_LOCAL_ROOT`, so the seeded files links on `/files` open real content in local development. With `APP_PROTO_COOK_FILES_STORAGE_DRIVER=s3`, the seed still creates metadata rows only because the script does not run with live runtime storage bindings.

## Why files support Hybrid and HTTP-native paths

The files slice intentionally keeps two scalable API approaches:

- Hybrid is the recommended default: oRPC handles typed control-plane work, `orpc-direct` remains available for small first-party flows, and HTTP/provider routes handle binary, range, and provider-native paths.
- HTTP-native is maintained as the full route-first second path for Uppy, browser playback, and external-tool compatibility.

The comparison shell lives at `/en/files-lab`, with concrete labs at `/en/files-lab/hybrid` and `/en/files-lab/http`.

## Files storage configuration

The files layer supports two drivers behind one shared API surface:

- `APP_PROTO_COOK_FILES_STORAGE_DRIVER=s3`: use S3-compatible object storage. Select `APP_PROTO_COOK_FILES_S3_PROVIDER=r2|minio|aws|custom`.
- `APP_PROTO_COOK_FILES_STORAGE_DRIVER=local`: store files on disk under `APP_PROTO_COOK_FILES_LOCAL_ROOT` for local development and testing, including real seeded fixture objects created by `pnpm -F @de100/apps-proto-cook-web db:seed`.

Signed delivery works on both drivers. Provider/public URLs are available on configured S3-compatible profiles, so the UI exposes capability flags on the `/files` page.

## Useful commands

From the repo root:

```bash
pnpm -F @de100/apps-proto-cook-db db:up
pnpm -F @de100/apps-proto-cook-db db:down
pnpm -F @de100/apps-proto-cook-db db:reset
pnpm -F @de100/apps-proto-cook-db db:migrate
pnpm -F @de100/apps-proto-cook-db db:generate
pnpm -F @de100/apps-proto-cook-infra redis:up
pnpm -F @de100/apps-proto-cook-web db:seed
pnpm dev
curl -I http://127.0.0.1:3000/
pnpm -F @de100/apps-proto-cook-infra selfhost:preflight
pnpm -F @de100/apps-proto-cook-infra selfhost:verify
pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:public
pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:hosted -- --url https://your-app-domain.example --env staging
pnpm -F @de100/apps-proto-cook-infra selfhost:verify:full
```

From this package:

```bash
pnpm dev
pnpm type:check
pnpm test
pnpm db:seed
```

## Trace mode

When you need readable browser and server traces from Vite instead of the normal optimized output, add the following to the env file

```env
PROTO_COOK_APP_VITE_TRACE_MODE="1"
```

Trace mode keeps names, enables dev/build sourcemaps, disables build minification, and stops Vite from ignoring dependency sourcemaps in the dev server. Normal `pnpm dev` and `pnpm build` behavior stays unchanged.

## Evidence and verification status

Use these labels when reading this file:

- `implemented-and-evidenced`: behavior is implemented and linked to an artifact in `docs/evidence`.
- `implemented-and-unverified`: behavior is implemented, but a matching evidence artifact is still pending.

Current status matrix:

- Browser regression after shared UI cleanup (`home`, `about`, files, locale + theme checks): `implemented-and-evidenced`
  - Evidence: [docs/evidence/2026-05-25-phase4-ui-regression.md](docs/evidence/2026-05-25-phase4-ui-regression.md)
- Files provider boundary + guardrails: `implemented-and-evidenced`
  - Evidence: [docs/evidence/2026-05-25-phase3-provider-refactor-validation.md](docs/evidence/2026-05-25-phase3-provider-refactor-validation.md)
- Driver and service proof matrix (`memory`, `redis`, `upstash`, `local`, `s3`, `r2/minio/aws/custom`, `log`, `resend`): `implemented-and-unverified`
  - Note: this matrix remains documented and supported in code/config, but direct per-driver evidence files are still pending.

Evidence index: [docs/evidence/README.md](docs/evidence/README.md)

## Manual test checklist

Use the shared VS Code browser or your normal browser. Playwright is not required for the current starter/MVP workflow.

### Auth

1. Open `/en/login`.
2. Sign in with `owner@proto-cook.test` and `SeedDemo123!`.
3. Use the sign-up toggle on the same page to confirm the restored auth UI exposes both sign-in and sign-up states.
4. Sign out and sign back in with `viewer@proto-cook.test`.
5. Confirm each account only sees its own dashboard, todos, and files records.
6. Switch locale to Arabic and confirm the route changes to `/ar/...` while the form copy and `dir` update.
7. When `APP_PROTO_COOK_EMAIL_DRIVER=log`, trigger sign-up or password-reset flows and verify the server logs print the generated Better Auth email links.

### Todos

1. Open `/en/dashboard` after signing in.
2. Confirm seeded todos render.
3. Create a new todo and verify the pending/loading state completes cleanly.
4. Toggle completion on an existing todo.
5. Delete a todo and confirm the list refreshes without a full reload.
6. Repeat the same checks with `empty@proto-cook.test` to validate the empty state.

### Files management

1. Open `/en/files` while signed in.
2. Confirm the backend card shows the active storage driver and delivery capabilities.
3. Confirm the seeded metadata fixtures render with the expected visibility and status badges.
4. Use the form to upload a small local file and confirm the request completes through the shared oRPC surface.
5. Confirm the new upload appears as a draft.
6. Run the confirm action and verify the entry moves to `ready`.
7. Open the generated app access URL for the uploaded object.
8. If signed delivery is available, generate a signed URL for a ready item and open it.
9. Delete the uploaded object and confirm the list refreshes.
10. Open `/en/files-lab`, `/en/files-lab/hybrid`, and `/en/files-lab/http` to compare API approach behavior.

### Landing page and API reference

1. Open `/en` and confirm the landing page shows the seeded accounts, shared API health card, and direct entry points into auth, dashboard, todos, files, and API reference.
2. Open `/en/api/reference` and confirm the generated OpenAPI UI loads from `/api/reference/spec.json`.

### Notes about seeded files

- With `APP_PROTO_COOK_FILES_STORAGE_DRIVER=local`, seeded files rows include real local objects, so you can validate seeded public/private reads directly from the `/files` page after running `db:seed`.
- With `APP_PROTO_COOK_FILES_STORAGE_DRIVER=s3`, seeded files rows remain metadata-only until you upload real objects through the UI in a live bound runtime.
- Deleting a seeded row is safe in either mode because the bucket delete path is tolerant of a missing object.

## Production deploy

The active deployment track is self-hosted and documented in `docs/deployment/self-hosted/overview.md` and `packages/apps/proto-cook/infra/docs/README.md`.

Common commands from the repo root:

```bash
pnpm -F @de100/apps-proto-cook-infra selfhost:preflight
pnpm -F @de100/apps-proto-cook-infra selfhost:health
pnpm -F @de100/apps-proto-cook-infra selfhost:verify
pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:hosted -- --url https://your-app-domain.example --env staging
pnpm -F @de100/apps-proto-cook-infra selfhost:verify:full
pnpm -F @de100/apps-proto-cook-infra selfhost:evidence:init -- staging
```

Use the mode matrix from `packages/apps/proto-cook/env/src/server.ts` to choose database, cache, files, and email drivers before deployment.
