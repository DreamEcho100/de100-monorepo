# Worklog

This log is append-only. Each entry records a meaningful implementation slice.

## 2026-05-17

### Slice: stale repo blocker cleanup

- fixed the LMS env loader so it resolves the actual repo root instead of `packages/apps`
- updated the app env example to match the active Better Auth and API contract
- repaired stale Alchemy paths so the infra package targets `apps/lms-web`
- fixed stale auth-client imports in the Solid app
- replaced broken shared UI imports with the actual `@de100/ui-solidjs` file-subpath imports
- repaired the app typecheck path for shared UI aliases and missing form dependencies

### Slice: DB driver switching baseline

- added `APP_LMS_DATABASE_DRIVER` with `auto`, `postgres`, and `neon-http` modes
- introduced pure driver-selection logic in `packages/apps/lms/db/src/driver.ts`
- updated the DB client factory to support both local Postgres and Neon
- added a focused Vitest unit test for driver resolution
- created the shared LMS Vitest config path already referenced by package scripts

### Slice: user-scoped todos and typed dashboard data

- added `user_id` ownership to the todo schema and generated the initial Drizzle migration
- switched todo RPC procedures from public access to authenticated access
- enforced per-user filtering for todo reads and per-user ownership checks for updates/deletes
- replaced the dashboard's manual private-data fetch with typed oRPC query options
- replaced the todos route's manual RPC wrapper with the typed oRPC client plus TanStack query-backed reads
- moved the main dashboard and todo route controls onto shared UI package components

### Slice: Cloudflare media baseline

- extended the Alchemy Cloudflare stack to provision public and private R2 buckets
- added a Cloudflare Images binding to the deployed web app
- bound bucket handles and bucket names into the app runtime so storage-aware routes can be added next
- fixed the infra package export target by adding the missing `src/index.ts`

### Slice: app identity cleanup

- renamed the active app package from the template placeholder to `@de100/apps-lms-web`
- replaced the landing page template copy with LMS-specific copy and shared UI components
- switched the landing page health check from manual fetch code to the typed oRPC query helper

### Slice: request-scoped media routes and demo

- added a request-scoped media storage helper so Cloudflare bucket bindings are read from the active request runtime
- added an authenticated upload route plus separate public and private media read routes
- enforced owner-prefix access for private media reads so one signed-in user cannot fetch another user's private objects
- added a protected `/media` demo route and linked it from the app header
- documented the end-to-end media request flow for later onboarding and hardening work

### Slice: shared Tailwind token and compatibility cleanup

- replaced the app's hardcoded RGB fallback with the shared Tailwind theme token layer
- imported the shared animation utilities and added the missing Tailwind compatibility utilities used by the shared UI package
- introduced shared CSS variables for repeated focus-ring and component-size values instead of repeating raw arbitrary pixel literals
- updated the shared UI base stylesheet to consume those variables in the highest-churn arbitrary-value spots
- validated the full production build for `@de100/apps-lms-web` after the styling cleanup

### Slice: starter surface cleanup

- added the missing app-level shell, nav, status, auth, todo, and API reference styles in `apps/lms-web/src/app.css`
- exposed the currently used shared Solid UI primitives from `@de100/ui-solidjs` so the app no longer depends on deep component file imports
- removed debug logging, placeholder wrappers, and tutorial comments from the app provider composition
- removed unused `@tanstack/form-devtools` and `@unpic/solid` dependencies from the app package
- replaced the stock `about` scaffold route with repo-specific starter content
- revalidated the app with a clean production build and follow-up typecheck

### Slice: package boundaries, validators, and locale/theme runtime

- moved Docker-backed DB lifecycle scripts into `@de100/apps-lms-db` and removed the root `db:*` command aliases
- activated `@de100/apps-lms-validators` with shared, server, and client surfaces so auth forms and API routers no longer import Zod directly
- created `@de100/i18n-core` and `@de100/i18n-domains/solidjs` with core and Solid-specific runtime helpers for locale and theme preference handling
- added app-owned English and Arabic catalogs under `i18n/*`
- wired SSR document `lang`, `dir`, and theme state from cookies plus `Accept-Language`, with a pre-hydration theme bootstrap script for `system`
- added top-bar locale and theme controls that persist `locale` and `theme` cookies and keep hydration aligned with the server snapshot
- revalidated the new package and app with focused typechecks plus a clean production build

### Slice: cache-backed auth secondary storage

- created `@de100/apps-lms-cache` with `memory`, `redis`, and `upstash` drivers behind one small cache facade
- extended `@de100/apps-lms-env` and `.env.example` with cache driver settings and connection variables
- added an optional `lms-redis` service to the root Docker compose file for local Redis-backed auth storage
- wired Better Auth `secondaryStorage` through the cache package while preserving database session storage
- revalidated the cache, env, auth, and web packages with focused typechecks plus a clean production build

### Slice: oRPC-first media and mutation alignment

- moved media management actions onto the shared oRPC surface so the `/media` page now uses TanStack Query mutations for upload, confirm, delete, and signed-link issuance
- added a storage-driver abstraction with `r2` and local filesystem backends behind the same media storage helpers
- exposed media backend capability flags to the UI so the app can show whether direct public URLs and signed delivery are available
- added stateless signed media access with app-issued URLs and a dedicated signed binary read route
- documented the current transport split: oRPC for management, app routes for binary streaming

- added server-side media upload validation for `File` input and visibility selection in `@de100/apps-lms-validators`
- added `media.upload` to the shared LMS oRPC router so uploads now reuse the same protected API surface as list, confirm, and delete
- moved the `/media` page off the standalone upload endpoint and onto TanStack Query mutations backed by oRPC `mutationOptions()`
- moved the `/todos` page off manual `.call()` mutation handling and onto TanStack Query mutation state
- moved the API reference page off manual mount-time fetch state and onto TanStack Query
- added explicit oRPC output schemas, route metadata, and typed error declarations for the system, todo, and media procedures
- removed the obsolete standalone media upload route so binary routes are now reserved for actual object reads

## 2026-05-18

### Slice: localized shell restore and deployment docs

- restored the real app shell header and locale-safe auth-related navigation in the dormant components instead of keeping the temporary debug shell
- replaced the static login placeholder with the shared sign-in and sign-up form components backed by Better Auth and the shared validators package
- replaced the home-page hydration placeholder with a localized landing page that surfaces the seeded demo accounts, shared API health check, and direct entry points to auth, dashboard, todos, media, and API reference
- refreshed the root and app READMEs to use locale-prefixed route examples and the current starter feature surface
- added a dedicated Alchemy plus Cloudflare production deployment guide under `docs/setup/production-deployment.md`
- updated setup and architecture docs to reference the current env model, media bindings, and infra package deployment path

### Slice: localized route ownership completion

- moved the remaining dashboard, todos, and media implementations out of flat route files into shared page modules under `apps/lms-web/src`
- pointed the `[locale]` route entries at those shared page modules so page ownership now lives entirely under the locale-prefixed route tree
- removed the obsolete flat page routes for dashboard, todos, and media after confirming nothing else still imported them
- carried the media page forward without the previous select-class Tailwind warning so the moved page modules lint cleanly
- revalidated the localized routing slice with focused editor diagnostics plus the existing i18n routing and server tests

### Slice: app typecheck cleanup

- moved the Better Auth client fetch override onto `fetchOptions.customFetchImpl` and typed the custom fetch inputs explicitly
- tightened API request input narrowing so `Request` values stay intact while relative string and `URL` inputs still resolve against the active origin
- made locale preference resolution return a concrete app locale code and simplified the locale middleware cookie persistence typing to rely on inferred request-event types
- added the narrow `#libs/*` tsconfig path mapping the app compiler needs when it follows `@de100/ui-solidjs` into source files
- revalidated the app with a clean `@de100/apps-lms-web` typecheck, a passing app lint check, and the focused i18n route/server tests

## 2026-05-26

### Slice: self-host deployment runbook completion

- expanded infra deployment docs from scaffold notes to actionable Coolify+Caddy and Traefik runbooks with concrete command gates
- added provider-specific setup guides for Hetzner, DigitalOcean, and Hostinger under `packages/apps/lms/infra/docs/providers`
- added operational runbooks for migration cutover, rollback recovery, and security incidents under `packages/apps/lms/infra/docs/runbooks`
- added post-deploy smoke and security hardening checklists under `packages/apps/lms/infra/docs/checklists`
- added hosted deployment smoke evidence template under `docs/evidence/templates/hosted-deploy-smoke-template.md`
- linked new checklists/runbooks into self-host overview, orchestration docs, and production deployment setup docs

### Slice: self-host public smoke automation

- added `packages/apps/lms/infra/scripts/selfhost-smoke-public.mjs` to validate key public routes and OpenAPI endpoint behavior
- added infra scripts `selfhost:smoke:public` and `selfhost:verify:full` in `packages/apps/lms/infra/package.json`
- integrated the new smoke command into infra docs command surface and production deployment workflow
- updated post-deploy smoke checklist to include the automated public smoke gate

### Slice: CI gate normalization and hosted smoke procedure

- simplified CI test execution in `.github/workflows/ci.yml` to use the root `pnpm test` orchestration only
- added CI baseline note documenting the intentionally validated profile (postgres + memory cache + local media)
- removed stale `db:push` guidance from root `README.md` package DB command list
- extended `docs/setup/environment.md` with smoke env var documentation and a clear dev command matrix
- added detailed hosted smoke operator flow in `packages/apps/lms/infra/docs/checklists/hosted-smoke-run-procedure.md`
- linked the new hosted smoke procedure across deployment docs, infra docs, and smoke checklist guidance
- added hosted smoke artifact naming and checklist-to-evidence mapping in `docs/evidence/README.md`

### Slice: CI smoke runtime hardening

- added a dedicated CI smoke job in `.github/workflows/ci.yml` that builds the app, waits for `/health`, and runs `selfhost:verify:full`
- switched the smoke startup command to `node apps/lms-web/.output/server/index.mjs` so CI uses the same Nitro runtime shape as production

### Slice: hosted smoke evidence scaffolding

- added `selfhost:evidence:init` command in `@de100/apps-lms-infra` to scaffold dated hosted-smoke evidence files from template
- wired the new command into infra docs, hosted smoke procedure, and production deployment flow for one-step evidence initialization
- removed the final historical `db:push` migration note from root `README.md` for consistency with current package-owned DB command guidance

### Slice: final readiness polish

- removed the remaining active `db:push` historical note from `apps/lms-web/README.md` and aligned its deploy command list with `selfhost:verify:full` plus `selfhost:evidence:init`
- hardened `.github/workflows/ci.yml` Turbo env expressions with empty-string fallbacks so optional remote-cache secrets and vars do not block CI in repositories without Turbo remote caching configured
- documented `APP_LMS_EVIDENCE_ENV` in `docs/setup/environment.md` so evidence scaffolding defaults are visible in the env contract

### Slice: hosted smoke one-shot orchestration

- added `selfhost:smoke:hosted` in `@de100/apps-lms-infra` to run `selfhost:verify:full` and scaffold evidence in one command for a target origin
- wired the one-shot hosted smoke path through infra docs, hosted smoke procedure, production deployment setup, and evidence index mapping
- aligned root and app README command examples to include the new hosted smoke orchestration command
- switched the CI smoke job to execute `selfhost:smoke:hosted` with `--skip-evidence-init`, so CI validates the same hosted smoke orchestration path used for deploy operations
