# Current Plan: Proto Cook Modernization

Last updated: 2026-06-12

Current active phase: Phase 1 - Planning and domain docs

Archived previous tracker:

- `docs/archive/current-plan-proto-cook-preflight-2026-06-12.md`

## Purpose

This tracker replaces the completed video-ready files roadmap with the active Proto Cook modernization work.

Proto Cook is the prototype host app for reusable product decisions. It is not an LMS-branded product. Course/video features remain valid as a Vertical Module and Feature Lab, but active app, package, environment, CI, and docs identity must use Proto Cook terminology.

## Locked Decisions

1. Canonical app codename: `proto-cook`.
2. Hard rename active `lms` identity to `proto-cook`; no compatibility aliases.
3. Keep `Course` as a Vertical Module/lab domain, not as the app identity.
4. Canonical environment prefixes:
   - `APP_PROTO_COOK_*`
   - `VITE_APP_PROTO_COOK_*`
5. App-domain env package stays at `packages/apps/proto-cook/env`.
6. Serverless dashboards remain the deployment source for env vars; the env package parses `process.env`.
7. Existing DB/migration history is disposable and can be squashed into a fresh files/course/artifact schema.
8. Active stale `media` storage/page/API/router/env references are removed. Legitimate browser/platform terms such as CSS media queries, `source.media`, and media playback metrics are allowed.
9. Empty packages do not need `test` scripts. Packages with behavior should have tests.
10. Package script policy applies to packages with checkable surfaces:
    - `clean`
    - `format-and-lint:check`
    - `format-and-lint:fix`
    - `format:check`
    - `format:fix`
    - `lint:check`
    - `lint:fix`
    - `type:check`
11. JS/MJS/config/test files that are part of active packages are covered by typecheck.
12. CI is split into app-specific and reusable-package workflows:
    - `proto-cook-ci.yml`
    - `general-packages-ci.yml`
13. Proto Cook CI uses GitHub service containers for Postgres, Redis, and MinIO.
14. Files manual lives under `docs/proto-cook/files`.
15. Feature Labs are gated/manual surfaces, not default product flows.
16. Cohesive Solid state should use `createStore`; independent primitive state can remain signals.
17. `docs/archive/**` may preserve historical terminology. Active docs/source may not.

## Phase Board

Status legend: Not Started, In Progress, Done, Blocked, Paused.

| Phase | Name                                      | Status      |
| ----- | ----------------------------------------- | ----------- |
| 1     | Planning and domain docs                  | In Progress |
| 2     | Hard app/package/env rename               | Not Started |
| 3     | DB squash and stale media cleanup         | Not Started |
| 4     | Package script and typecheck hygiene      | Not Started |
| 5     | CI split and service-backed smoke         | Not Started |
| 6     | Files manual and Feature Lab coverage     | Not Started |
| 7     | Solid state refactor and test audit       | Not Started |
| 8     | Final gates, stale scans, and handoff      | Not Started |

## Phase 1 - Planning and Domain Docs

### Objective

Preserve the completed files/video tracker, add canonical project language, and record the hard-to-reverse architectural decisions before source rewrites begin.

### Step Tracker

| Step | Task                                             | Status      | Evidence |
| ---- | ------------------------------------------------ | ----------- | -------- |
| 1    | Archive previous `current-plan.md`               | Done        | `docs/archive/current-plan-proto-cook-preflight-2026-06-12.md` |
| 2    | Rewrite `current-plan.md` with modernization plan | Done        | `current-plan.md` |
| 3    | Add root glossary                                | In Progress | `CONTEXT.md` |
| 4    | Add ADRs for rename, env, and CI decisions       | In Progress | `docs/adr/` |
| 5    | Run initial rename impact scans                  | Not Started | Validation log |

### Exit Gates

1. `rg -n "apps/lms-web|packages/apps/lms|@de100/apps-lms|APP_LMS|VITE_APP_LMS|LMS_APP_VITE_TRACE_MODE|/api/media|orpc\\.media" . --glob '!node_modules/**' --glob '!.git/**' --glob '!docs/archive/**'`
2. Phase 2 impact list captured in this tracker.

## Phase 2 - Hard App/Package/Env Rename

### Objective

Rename active identity from LMS to Proto Cook across paths, package names, imports, env variables, runtime defaults, Docker resources, cache prefixes, and docs.

### Scope

1. Rename paths:
   - `apps/lms-web` -> `apps/proto-cook-web`
   - `packages/apps/lms/*` -> `packages/apps/proto-cook/*`
2. Rename package identities:
   - `@de100/apps-lms-web` -> `@de100/apps-proto-cook-web`
   - `@de100/apps-lms-*` -> `@de100/apps-proto-cook-*`
   - `@de100/apps-lms` -> `@de100/apps-proto-cook`
3. Rename env variables:
   - `APP_LMS_*` -> `APP_PROTO_COOK_*`
   - `VITE_APP_LMS_*` -> `VITE_APP_PROTO_COOK_*`
   - `LMS_APP_VITE_TRACE_MODE` -> `PROTO_COOK_APP_VITE_TRACE_MODE`
4. Rename defaults:
   - database default: `de100_proto_cook`
   - Docker resources: `proto-cook-postgres`, `proto-cook-redis`, `proto-cook-minio`
   - cache prefixes: `de100:proto-cook:*`
5. Update lockfile and workspace references with `pnpm install`.

### Exit Gates

1. `pnpm install`
2. `pnpm lint:ws`
3. `pnpm -F @de100/apps-proto-cook-web type:check`
4. Active stale rename scan is clean outside intentional archive/history.

## Phase 3 - DB Squash and Stale Media Cleanup

### Objective

Squash disposable migrations into a fresh files/course/artifact schema and remove active old media terminology.

### Scope

1. Replace migration history with a fresh current-state migration using files terminology.
2. Remove active `/media`, `/api/media`, `orpc.media`, `APP_*_MEDIA_*`, and old media storage docs.
3. Keep legitimate browser/platform uses of `media`:
   - CSS media queries
   - HTML/source `media`
   - media playback metrics and media element terminology
4. Add stale terminology scan scripts for old app identity and old files-era media identity.

### Exit Gates

1. DB package typecheck/test.
2. Stale app identity scan.
3. Stale old media API/env/router scan.

## Phase 4 - Package Script and Typecheck Hygiene

### Objective

Normalize package scripts and make typecheck cover active JS/MJS/config/test files.

### Scope

1. Add common scripts to packages with checkable surfaces.
2. Add `test` only where behavior exists.
3. Update `@turbo/generators/templates/package.json.hbs`.
4. Update package `tsconfig.json` includes for active scripts/config/tests.
5. Convert fragile JS/MJS scripts to checked JSDoc or TypeScript where needed.
6. Add behavior tests for env/infra/app scripts that have real logic.

### Exit Gates

1. `pnpm format-and-lint:check`
2. `pnpm type:check`
3. `pnpm test`
4. Package script-shape validation passes.

## Phase 5 - CI Split and Service-Backed Smoke

### Objective

Replace stale CI with two strict workflows and app smoke jobs backed by GitHub services.

### Scope

1. Replace `.github/workflows/ci.yml` with:
   - `.github/workflows/proto-cook-ci.yml`
   - `.github/workflows/general-packages-ci.yml`
2. Use path-filtered strict triggers.
3. Use service containers for:
   - Postgres
   - Redis
   - MinIO
4. Replace repeated env heredocs with a checked-in CI env writer.
5. Update action majors:
   - `actions/checkout@v6`
   - `actions/setup-node@v6`
   - `actions/cache@v5`
6. Proto Cook CI runs:
   - workspace lint
   - format/lint
   - typecheck
   - tests
   - web build
   - stale scans
   - MinIO/files smoke
   - hosted smoke
7. General packages CI runs:
   - format/lint
   - typecheck
   - behavior tests
   - script-shape validation

### Exit Gates

1. Workflows validate locally by YAML/static inspection.
2. `pnpm format-and-lint:check`
3. `pnpm type:check`
4. `pnpm test`
5. `pnpm files:minio:smoke`

## Phase 6 - Files Manual and Feature Lab Coverage

### Objective

Create a detailed manual-testing and architecture manual for the Files Platform and ensure labs match the current architecture.

### Files Manual

Create `docs/proto-cook/files`:

1. `00-index.md`
2. `01-architecture.md`
3. `02-upload-and-storage-flows.md`
4. `03-processing-and-artifacts.md`
5. `04-hls-playback-and-entitlements.md`
6. `05-minio-r2-and-provider-smoke.md`
7. `06-labs-manual-testing.md`
8. `07-troubleshooting-and-expected-failures.md`

Each file includes diagrams, expected behavior, failure modes, and manual test steps where relevant.

### Feature Labs

Update or add gated labs for:

1. Hybrid files flow.
2. HTTP-native files flow.
3. Course video upload and processing.
4. Provider smoke.
5. HLS playback/session behavior.
6. Processing/variants.
7. Entitlement matrix.

### Exit Gates

1. Manual docs linked from `docs/README.md`.
2. Feature Lab routes listed in manual test guide.
3. App typecheck/test/build.

## Phase 7 - Solid State Refactor and Test Audit

### Objective

Improve Solid state locality and remove redundant tests that only duplicate typecheck/import resolution.

### Scope

1. Audit `createSignal`, `createMemo`, and `createEffect` usage.
2. Refactor cohesive object-shaped state to `createStore`, especially:
   - files approach lab
   - course video lab
   - files page
   - course lesson page
   - complex uploader/state hooks
3. Preserve simple independent signals.
4. Update Solid guidance with current `createStore` behavior:
   - property reads track independently
   - setters support path syntax
   - object updates shallow-merge
   - arrays need explicit update care
5. Remove low-value import/package-resolution tests once typecheck covers active JS/MJS/test files.
6. Keep behavior tests for env parsing, upload planning, storage selection, MinIO smoke, HLS/session/entitlements, labs, and CI script-shape validation.

### Exit Gates

1. Focused app/lab tests.
2. Files package tests.
3. Global `pnpm type:check`.
4. Global `pnpm test`.

## Phase 8 - Final Gates and Handoff

### Objective

Run full validation, record remaining risks, and leave the repository with clear next steps.

### Exit Gates

1. `pnpm install`
2. `pnpm format-and-lint:check`
3. `pnpm type:check`
4. `pnpm test`
5. `pnpm -F @de100/apps-proto-cook-web build`
6. `pnpm files:minio:up`
7. `pnpm files:minio:smoke`
8. Stale app identity scan clean.
9. Stale old media API/env/router scan clean.
10. Manual docs updated with any discovered failures.

## Validation Log

- 2026-06-12: Confirmed latest GitHub action release pages before CI update:
  - `actions/checkout` latest major line is v6.
  - `actions/setup-node` latest major line is v6.
  - `actions/cache` latest major line is v5 and requires Actions Runner 2.327.1+ for self-hosted runners.
- 2026-06-12: User confirmed `proto-cook` as the canonical rename target and no compatibility aliases.
