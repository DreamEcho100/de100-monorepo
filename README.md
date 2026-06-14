# @de100/monorepo

This workspace currently centers on the Proto Cook starter in `apps/proto-cook-web`, backed by shared `auth`, `db`, `api`, `cache`, `env`, `i18n`, `infra`, and `validators` packages under `packages/apps/proto-cook`.

## Quick start

1. Install dependencies.

```bash
pnpm install
```

2. Create the preferred local env file from the checked-in template.

```bash
cp .env.example .env.local
```

3. Start the local Postgres container.

```bash
pnpm -F @de100/apps-proto-cook-db db:up
```

If you want Better Auth secondary storage backed by local Redis instead of the default in-process cache, also start Redis and set `APP_PROTO_COOK_CACHE_DRIVER=redis` plus `REDIS_URL` in `.env.local`.

```bash
pnpm -F @de100/apps-proto-cook-infra redis:up
```

4. Apply the current migrations.

```bash
pnpm -F @de100/apps-proto-cook-db db:migrate
```

5. Seed the local database with Better Auth users plus demo todo and files metadata fixtures.

```bash
pnpm -F @de100/apps-proto-cook-web db:seed
```

6. Start the app.

```bash
pnpm dev
```

## What `db:seed` does

- Creates known email/password users through Better Auth's own `signUpEmail` API so password hashing matches the real auth flow.
- Seeds mixed todo states for manual CRUD testing.
- Seeds representative files metadata states for management UI testing.
- Leaves real binary files object creation to the runtime upload flow because seed runs in plain Node and does not perform live object-storage writes.

## Manual testing

- Use the shared VS Code browser or your normal browser. Playwright is not required for the current starter/MVP workflow.
- Prefer localized page routes such as `/en`, `/en/login`, and `/ar/login`. Bare page routes redirect through the locale middleware, but the locale-prefixed URLs are the canonical examples for docs, bookmarks, and manual checks.
- Sign in with a seeded account, then validate auth, todo CRUD, and files upload/management flows directly in the app.
- App-facing async flows should now read and write through oRPC plus TanStack Query; direct routes remain for auth and binary files reads.
- Use the top-bar language and theme controls to verify cookie-backed locale/theme persistence and SSR hydration behavior.
- When `APP_PROTO_COOK_CACHE_DRIVER=redis` or `APP_PROTO_COOK_CACHE_DRIVER=upstash`, Better Auth session, verification, and related ephemeral records should flow through the configured cache backend.
- Upload a small local file from the `/files` page when you want to verify real binary upload, access, confirm, and delete behavior.
- With `APP_PROTO_COOK_EMAIL_DRIVER=log`, Better Auth verification and password-reset emails are written to the local server logs instead of being sent through a hosted provider.

## Verification status

This README now separates implemented behavior from proven behavior.

- `implemented-and-evidenced`: Phase 3 provider-boundary validation and guardrails
  - Evidence: [docs/evidence/2026-05-25-phase3-provider-refactor-validation.md](docs/evidence/2026-05-25-phase3-provider-refactor-validation.md)
- `implemented-and-evidenced`: Phase 4 frontend standardization regression on home/about/files in `en` and `ar`
  - Evidence: [docs/evidence/2026-05-25-phase4-ui-regression.md](docs/evidence/2026-05-25-phase4-ui-regression.md)
- `implemented-and-unverified`: full browser matrix from Phase 1 (all four flows in both locales with evidence artifacts for each flow)
- `implemented-and-unverified`: hosted smoke pass (deployed Better Auth, Resend, Upstash-backed secondary storage, R2 files upload/read/signed access, production migration rehearsal)

Evidence index: [docs/evidence/README.md](docs/evidence/README.md)

## Deployment

Production deployment for the Proto Cook starter now goes through the self-host infra package command surface.

- Infra package: `packages/apps/proto-cook/infra`
- Deploy guide: `docs/setup/production-deployment.md`

Typical commands from the repo root:

```bash
pnpm -F @de100/apps-proto-cook-infra selfhost:preflight
pnpm -F @de100/apps-proto-cook-infra selfhost:health
pnpm -F @de100/apps-proto-cook-infra selfhost:verify
pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:public
pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:hosted -- --url https://your-app-domain.example --env staging
pnpm -F @de100/apps-proto-cook-infra selfhost:verify:full
pnpm -F @de100/apps-proto-cook-infra selfhost:evidence:init -- staging
```

Legacy deployment references are archived under `_old/backup-v1` for historical rollback context only.

## More docs

See `apps/proto-cook-web/README.md` for the Proto Cook-specific setup, seeded accounts, architecture notes, and a manual test checklist.

## Package-owned DB commands

Database lifecycle and Drizzle commands now belong to the DB package, while seeding belongs to the app package.

Typical commands from the repo root:

```bash
pnpm -F @de100/apps-proto-cook-db db:up
pnpm -F @de100/apps-proto-cook-db db:logs
pnpm -F @de100/apps-proto-cook-db db:migrate
pnpm -F @de100/apps-proto-cook-db db:generate
pnpm -F @de100/apps-proto-cook-db db:studio
pnpm -F @de100/apps-proto-cook-db db:down
pnpm -F @de100/apps-proto-cook-db db:reset
pnpm -F @de100/apps-proto-cook-web db:seed
pnpm -F @de100/apps-proto-cook-infra selfhost:verify
pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:hosted -- --url https://your-app-domain.example --env staging
pnpm -F @de100/apps-proto-cook-infra selfhost:verify:full
pnpm -F @de100/apps-proto-cook-infra selfhost:evidence:init -- staging
```
