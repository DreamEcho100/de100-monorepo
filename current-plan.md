# Current Plan: Proto Cook Modernization

Last updated: 2026-06-12

Current active phase: Phase 10A - Lab i18n, lifecycle docs, and manual hardening

Archived previous tracker:

- `docs/archive/current-plan-proto-cook-preflight-2026-06-12.md`

## Purpose

This tracker replaces the completed video-ready files roadmap with the active Proto Cook modernization work.

Proto Cook is the prototype host app for reusable product decisions. It is not an Proto Cook-branded product. Course/video features remain valid as a Vertical Module and Feature Lab, but active app, package, environment, CI, and docs identity must use Proto Cook terminology.

## Locked Decisions

1. Canonical app codename: `proto-cook`.
2. Hard rename the legacy course-app identity to `proto-cook`; no compatibility aliases.
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
18. Root `package.json` scripts are workspace orchestration only. Package/domain/service-specific commands must live in the owning package and be reached through Turbo or explicit `pnpm -F` commands.

## Phase Board

Status legend: Not Started, In Progress, Done, Blocked, Paused.

| Phase | Name                                      | Status      |
| ----- | ----------------------------------------- | ----------- |
| 1     | Planning and domain docs                  | Done        |
| 2     | Hard app/package/env rename               | Done        |
| 3     | DB squash and stale media cleanup         | Done        |
| 4     | Package script and typecheck hygiene      | Done        |
| 5     | CI split and service-backed smoke         | Done        |
| 6     | Files manual and Feature Lab coverage     | Done        |
| 7     | Solid state refactor and test audit       | Done        |
| 8     | Final gates, stale scans, and handoff      | Done        |
| 9     | Root script ownership cleanup             | Done        |
| 10A   | Lab i18n, lifecycle docs, and manual hardening | In Progress |
| 10B   | i18n package parity and type consistency | Not Started |
| 11    | Final QA, visible browser evaluation, and handoff | Not Started |

## Phase 1 - Planning and Domain Docs

### Objective

Preserve the completed files/video tracker, add canonical project language, and record the hard-to-reverse architectural decisions before source rewrites begin.

### Step Tracker

| Step | Task                                             | Status      | Evidence |
| ---- | ------------------------------------------------ | ----------- | -------- |
| 1    | Archive previous `current-plan.md`               | Done        | `docs/archive/current-plan-proto-cook-preflight-2026-06-12.md` |
| 2    | Rewrite `current-plan.md` with modernization plan | Done        | `current-plan.md` |
| 3    | Add root glossary                                | Done        | `CONTEXT.md` |
| 4    | Add ADRs for rename, env, and CI decisions       | Done        | `docs/adr/` |
| 5    | Run initial rename impact scans                  | Done        | Validation log |

### Exit Gates

1. Initial impact scan completed before the hard rename.
2. Phase 2 impact list captured in this tracker.

## Phase 2 - Hard App/Package/Env Rename

### Objective

Rename active identity from the legacy course-app naming to Proto Cook across paths, package names, imports, env variables, runtime defaults, Docker resources, cache prefixes, and docs.

### Scope

1. Rename active app path to `apps/proto-cook-web`.
2. Rename active app-domain packages to `packages/apps/proto-cook/*`.
3. Rename active app package identities to the `@de100/apps-proto-cook-*` namespace.
4. Rename env variables to:
   - `APP_PROTO_COOK_*`
   - `VITE_APP_PROTO_COOK_*`
   - `PROTO_COOK_APP_VITE_TRACE_MODE`
5. Rename defaults:
   - database default: `de100_proto_cook`
   - Docker resources: `proto-cook-postgres`, `proto-cook-redis`, `proto-cook-minio`
   - cache prefixes: `de100:proto-cook:*`
6. Update lockfile and workspace references with `pnpm install`.

### Exit Gates

1. `pnpm install`
2. `pnpm lint:ws`
3. `pnpm -F @de100/apps-proto-cook-web type:check`
4. Active stale rename scan is clean outside intentional archive/history.

### Status

- Done: active paths, package names, imports, env prefixes, Docker resources, cache prefixes, and lockfile references are renamed to Proto Cook.
- Done: `pnpm install` completed after the rename and regenerated the lockfile.
- Done: `pnpm -F @de100/apps-proto-cook-web type:check` passes.
- Done: active stale app identity scan is clean outside `docs/archive/**`, `_old/**`, `_ignore/**`, generated output, and lockfile history.

## Phase 3 - DB Squash and Stale Media Cleanup

### Objective

Squash disposable migrations into a fresh files/course/artifact schema and remove active old media terminology.

### Scope

1. Replace migration history with a fresh current-state migration using files terminology.
2. Remove active legacy storage/page/API/router/env references from the pre-files migration.
3. Keep legitimate browser/platform uses of `media`:
   - CSS media queries
   - HTML/source `media`
   - media playback metrics and media element terminology
4. Add stale terminology scan scripts for old app identity and old files-era media identity.

### Exit Gates

1. DB package typecheck/test.
2. Stale app identity scan.
3. Stale old media API/env/router scan.

### Status

- Done: previous migration history was archived under `docs/archive/proto-cook-pre-squash-migrations-2026-06-12/`.
- Done: active DB migration history was regenerated as a fresh files/course/artifact schema.
- Done: active old media API/env/router scan is clean with legitimate platform/browser dependency terms handled separately from old app storage terminology.

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

### Status

- Done: common package scripts were added to checkable packages and the package generator template.
- Done: active JS/MJS/config typecheck coverage was added through root and package `tsconfig.json` includes.
- Done: root package script-shape validator was added as `pnpm lint:workspace-package-scripts`.
- Done: `pnpm lint:workspace-package-scripts` passes.
- Done: global `pnpm type:check` passed before the latest Solid store refactor; rerun remains part of Phase 8.

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
5. `pnpm -F @de100/apps-proto-cook-infra minio:smoke`

### Status

- Done: legacy `.github/workflows/ci.yml` was replaced by `proto-cook-ci.yml` and `general-packages-ci.yml`.
- Done: workflow actions were moved to the requested current major lines through direct usage and the shared setup action.
- Done: Proto Cook CI now uses service-backed Postgres, Redis, and MinIO.
- Done: checked-in CI env writer was added and now supports `--output` for local validation without overwriting `.env.local`.
- Done: `node scripts/write-proto-cook-ci-env.mjs --output /tmp/proto-cook-ci.env` passes.

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

### Status

- Done: ordered files manual was added under `docs/proto-cook/files`.
- Done: `docs/README.md` links the Proto Cook files manual.
- Done: provider smoke, HLS playback, processing/variants, and entitlement Feature Lab routes were added beside the Hybrid, HTTP-native, and course-video labs.
- Pending: app test/build gates remain in Phase 8.

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

### Status

- Done: files approach lab cohesive UI state was moved to `createStore`.
- Done: course video lab cohesive workflow state was moved to `createStore`.
- Done: files page upload/signed-access UI state was moved to `createStore`.
- Done: course lesson playback UI state was moved to `createStore`.
- Done: local Solid guidance now documents property-level store tracking, path setters, shallow merge behavior, array update care, and when to prefer stores over independent signals.
- Done: remaining app `createSignal`/`createMemo`/`createEffect` usage was audited. Independent primitive form/menu/hydration state remains signal-based where clearer.
- Done: low-value app package-resolution smoke test was removed because active tests and JS/MJS typecheck now cover package exports.

## Phase 8 - Final Gates and Handoff

### Objective

Run full validation, record remaining risks, and leave the repository with clear next steps.

### Exit Gates

1. `pnpm install`
2. `pnpm format-and-lint:check`
3. `pnpm type:check`
4. `pnpm test`
5. `pnpm -F @de100/apps-proto-cook-web build`
6. `pnpm -F @de100/apps-proto-cook-infra minio:up`
7. `pnpm -F @de100/apps-proto-cook-infra minio:smoke`
8. Stale app identity scan clean.
9. Stale old media API/env/router scan clean.
10. Manual docs updated with any discovered failures.

### Status

- Done: all automated gates listed above passed.
- Done: `pnpm -F @de100/apps-proto-cook-infra minio:up` required stopping legacy local containers that were occupying port `9000`; the renamed `de100-proto-cook-minio` container now starts and publishes `9000-9001`.
- Done: `docker-compose.yml` now binds MinIO explicitly with `--address ":9000"` so the host smoke test can connect.
- Done: build completed with non-blocking Nitro/esbuild bigint target warnings; track separately if runtime target support becomes a deployment issue.

## Phase 9 - Root Script Ownership Cleanup

### Objective

Remove package/domain-specific commands from the root manifest and make root scripts workspace orchestration only.

### Scope

1. Remove root files/MinIO aliases.
2. Remove root app-domain lint aliases.
3. Rename the root package script validator to `lint:workspace-package-scripts`.
4. Make root `test` and `test:watch` generic Turbo commands without package filters.
5. Move localized error and files-storage coupling checks into the Proto Cook API package lint flow.
6. Move local service and MinIO lifecycle helpers into the Proto Cook infra package.
7. Update CI and active docs to use package-owned scripts.

### Step Tracker

| Step | Task | Status | Evidence |
| ---- | ---- | ------ | -------- |
| 1 | Clean root `package.json` scripts | Done | Root now exposes only workspace-level orchestration and workspace policy checks. |
| 2 | Move API/files lint checks into API package | Done | `@de100/apps-proto-cook-api` runs localized-error and files-storage coupling checks from package lint/check scripts. |
| 3 | Move MinIO/service helpers into infra package | Done | `@de100/apps-proto-cook-infra` owns `services:*` and `minio:*` scripts. |
| 4 | Update CI and docs command references | Done | Workflows/docs call package-owned scripts. |
| 5 | Run validation gates | Done | See validation log. |

### Exit Gates

1. `pnpm lint:workspace-package-scripts`
2. `pnpm format-and-lint:check`
3. `pnpm type:check`
4. `pnpm test`
5. `pnpm -F @de100/apps-proto-cook-infra services:status`
6. `pnpm -F @de100/apps-proto-cook-infra minio:status`
7. `pnpm -F @de100/apps-proto-cook-web build`
8. No active root script references to package/domain-specific aliases.

### Status

- Done: root scripts now expose workspace orchestration only.
- Done: root `test` and `test:watch` are generic Turbo commands without package filters.
- Done: package/domain checks moved into package-owned lint/check scripts.
- Done: local service and MinIO lifecycle commands moved to `@de100/apps-proto-cook-infra`.
- Done: CI and active docs now call package-owned service/smoke scripts.
- Done: Phase 9 exit gates passed.

## Phase 10A - Lab i18n, Lifecycle Docs, and Manual Hardening

### Objective

Address the remaining active-app hardening feedback: all visible UI text should use the i18n layer, local service lifecycle should be documented clearly, and Feature Lab docs should become full manual-testing tutorials.

### Scope

1. Move all active visible app copy to the current i18n setup.
2. Fix semantic stale translations that still describe the old app identity.
3. Add a targeted hardcoded active UI copy scanner with data-literal allowlists.
4. Expand `docs/proto-cook/files` into per-lab tutorials with setup, steps, expected behavior, failure modes, cleanup, and feedback checklists.
5. Update Feature Lab pages so static checklist-style labs either become runnable surfaces or clearly document disabled/placeholder paths.
6. Document foreground dev-server shutdown versus package-owned Docker service lifecycle.
7. Keep root scripts workspace-only.

### Step Tracker

| Step | Task | Status | Evidence |
| ---- | ---- | ------ | -------- |
| 1 | Localize active lab/course/player UI copy through app i18n messages | Done | `apps/proto-cook-web/i18n/shared/messages/*`, lab pages |
| 2 | Add package-owned active lab UI-copy scanner | Done | `scripts/check-proto-cook-lab-ui-copy.mjs`, web package scripts |
| 3 | Finish per-lab tutorial docs | Done | `docs/proto-cook/files/labs/*` |
| 4 | Link lab tutorials from files manual index and overview | Done | `docs/proto-cook/files/00-index.md`, `06-labs-manual-testing.md` |
| 5 | Document dev-server and Docker service lifecycle | Done | `docs/proto-cook/files/07-troubleshooting-and-expected-failures.md` |
| 6 | Run Phase 10A focused checks | Pending | Validation log |

### Exit Gates

1. `pnpm format-and-lint:check`
2. `pnpm type:check`
3. `pnpm test`
4. `pnpm -F @de100/apps-proto-cook-web build`
5. Hardcoded active UI copy scan clean or only allowed data literals.
6. Stale active terminology scan clean outside archives/build/vendor paths.

## Phase 10B - i18n Package Parity and Type Consistency

### Objective

Keep the current `defineTranslation` API compatible with the passed-on Maze pattern while making the i18n packages less brittle, better tested, and easier to consume from Solid and SolidStart.

### Scope

1. Keep `defineTranslation` exported for plural, enum, and formatter metadata.
2. Keep source-locale module augmentation as the source of typed keys and params.
3. Type non-source locale files with `I18nLocaleMessages<typeof sourceMessages>` so translated strings do not need to match source literals exactly.
4. Add core tests for plain params, typed params, plural, enum, repeated placeholders, fallback locales, missing keys, and `onError`.
5. Make Solid `t` reactive after locale changes and pass all available locale messages plus fallback locale into `generateI18nConfig`.
6. Add useful Maze parity through cleaner interfaces:
   - optional lazy locale loading
   - `isLoadingTranslations`
   - overlapping load interruption
   - localized path helpers
   - `I18nA`
   - SolidStart request-locale and localized redirect helpers
7. Update the local TypeScript skill with package-grade TypeScript guidance.

### Step Tracker

| Step | Task | Status | Evidence |
| ---- | ---- | ------ | -------- |
| 1 | Add i18n core behavior tests and package test script | Done | `@de100/i18n-core test` |
| 2 | Tighten core types/runtime around locale messages and formatting | Done | `packages/i18n/core` |
| 3 | Add Solid provider lazy-loading/reactive translation parity | Done | `packages/i18n/domains/solidjs` |
| 4 | Add localized link and route helper exports | Done | `packages/i18n/domains/solidjs` |
| 5 | Migrate app helpers mechanically where covered by tests | Done | `apps/proto-cook-web/i18n` wraps package routing helper |
| 6 | Update TypeScript skill guidance | Done | `.agents/skills/typescript-best-practices/SKILL.md` |
| 7 | Run Phase 10B focused checks | In Progress | Core and Solid domain focused checks passed; app checks pending. |

### Exit Gates

1. `pnpm -F @de100/i18n-core type:check`
2. `pnpm -F @de100/i18n-core test`
3. `pnpm -F @de100/i18n-domains-solidjs type:check`
4. `pnpm -F @de100/i18n-domains-solidjs test`
5. `pnpm -F @de100/apps-proto-cook-web type:check`
6. `pnpm -F @de100/apps-proto-cook-web lint:lab-ui-copy`

## Phase 11 - Final QA, Browser Evaluation, and Handoff

### Objective

Run final package/app gates, stale scans, visible browser lab evaluation, and record final handoff notes.

### Execution Order

1. Run package script-shape validation.
2. Run global format/lint check and fix only if needed.
3. Run global typecheck.
4. Run global tests.
5. Build Proto Cook web.
6. Run stale terminology and no-`formatI18nTemplate` scans.
7. Run visible/manual browser evaluation from `docs/proto-cook/files/labs`.
8. Record final DX/UX notes and residual risks.

## Follow-Up Backlog

1. Run the manual files labs from `docs/proto-cook/files/06-labs-manual-testing.md` in a visible browser and record product/DX feedback.
2. Decide whether to remove legacy stopped Docker containers with `docker compose up --remove-orphans` during a separate local cleanup.
3. If production runtime warnings matter for the deployment target, raise the Nitro/esbuild target above ES2019 or isolate the bigint-producing dependency.
4. Push the split workflows and verify `proto-cook-ci.yml` and `general-packages-ci.yml` remotely with GitHub services.
5. Complete Phase 10A/10B before opening new Files Platform feature work.

## Validation Log

- 2026-06-12: Confirmed latest GitHub action release pages before CI update:
  - `actions/checkout` latest major line is v6.
  - `actions/setup-node` latest major line is v6.
  - `actions/cache` latest major line is v5 and requires Actions Runner 2.327.1+ for self-hosted runners.
- 2026-06-12: User confirmed `proto-cook` as the canonical rename target and no compatibility aliases.
- 2026-06-12: `pnpm install` passed after Proto Cook package rename and lockfile update.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-web type:check` passed after the files approach lab and course video lab store refactors.
- 2026-06-12: `pnpm lint:workspace-package-scripts` passed.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-api lint:files-storage-coupling` passed.
- 2026-06-12: Active stale app identity and old media API/env/router scans are clean outside explicit archive/history/generated exclusions.
- 2026-06-12: Raw active app/package path scan is clean after pruning an empty stale API directory and generated old-name install/cache artifacts.
- 2026-06-12: CI env writer validated with `node scripts/write-proto-cook-ci-env.mjs --output /tmp/proto-cook-ci.env`.
- 2026-06-12: `pnpm lint:ws` passed.
- 2026-06-12: `pnpm format-and-lint:check` passed.
- 2026-06-12: `pnpm type:check` passed.
- 2026-06-12: `pnpm test` passed.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-web build` passed with non-blocking Nitro/esbuild bigint target warnings.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-infra minio:up` passed after stopping legacy local containers that occupied port `9000`.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-infra minio:smoke` passed against `http://127.0.0.1:9000`.
- 2026-06-12: Phase 9 started after root `package.json` was found to expose files/i18n/package-specific commands.
- 2026-06-12: `pnpm lint:workspace-package-scripts` passed after root script cleanup.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-api lint:localized-errors` passed.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-api lint:files-storage-coupling` passed.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-infra services:status` passed with Docker socket access; only MinIO is currently running locally.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-infra minio:status` passed with Docker socket access.
- 2026-06-12: `pnpm format-and-lint:check` passed with API-owned localized-error and files-storage coupling checks running through the API package.
- 2026-06-12: `pnpm type:check` passed.
- 2026-06-12: generic root `pnpm test` passed after removing hardcoded package filters.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-web build` passed with the existing non-blocking Nitro/esbuild bigint target warnings.
- 2026-06-12: `pnpm -F @de100/apps-proto-cook-infra minio:smoke` passed against `http://127.0.0.1:9000` with run id `phase13-2026-06-12T16-02-24-559Z-8e796edd-50cd-409b-8a25-c2ed37478f77`.
- 2026-06-12: Phase 10A/10B started. Decision recorded: keep `defineTranslation`, remove `formatI18nTemplate`, finish lab docs, and improve i18n parity without breaking the passed-on Maze pattern.
- 2026-06-12: Removed app-specific route exclusion/static asset assumptions from `@de100/i18n-core`; apps now inject `shouldLocalizePathname`.
- 2026-06-12: `pnpm -F @de100/i18n-core type:check` passed after i18n tuple/message typing and routing helper updates.
- 2026-06-12: `pnpm -F @de100/i18n-core test` passed with 10 runtime tests.
- 2026-06-12: `pnpm -F @de100/i18n-domains-solidjs type:check` passed after reactive `t`, lazy translation loading, loading state, localized link, and SolidStart helper updates.
- 2026-06-12: `pnpm -F @de100/i18n-domains-solidjs test` passed with 2 server helper tests.
- 2026-06-12: Updated local `typescript-best-practices` skill with package-grade API seams, module augmentation, `as const satisfies`, template-literal inference, and type-test guidance.
