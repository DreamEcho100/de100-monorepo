# Current Plan: Proto Cook Modernization

Last updated: 2026-06-15

Current active phase: Phase 14 complete - awaiting remote CI verification and manual feedback

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
19. Reusable packages may export safe defaults, but app/domain policy must be injectable through options, adapters, predicates, or props. Hardcoded app assumptions do not belong in general packages.
20. Proto Cook Arabic localization uses Dev Arabic: natural Arabic UI prose with technical product, framework, provider, protocol, and storage names kept in English where that improves developer clarity.
21. CI remains workflow-level path filtered by explicit decision. These workflows should not be configured as required branch-protection checks unless skipped required workflow behavior is acceptable or an always-report wrapper is added.
22. Proto Cook local Docker Compose belongs to `@de100/apps-proto-cook-infra` at `packages/apps/proto-cook/infra/docker-compose.yml`; no root Compose compatibility file is kept for app-specific services.
23. CI workflow package selection is encoded by package-owned `ci:proto-cook:*` and `ci:general:*` scripts plus Turbo tasks, not root feature aliases.
24. CI MinIO uses the official `minio/minio:latest` image with bucket bootstrap handled by the MinIO smoke script.

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
| 10A   | Lab i18n, lifecycle docs, and manual hardening | Done |
| 10B   | i18n package parity and type consistency | Done |
| 11    | Final QA, visible browser evaluation, and handoff | Done |
| 12    | Reusable package assumption audit       | Done |
| 13    | Localization, docs, and CI hardening    | Done |
| 14    | CI, env, infra ownership, and docs hardening | Done |

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
- Done: the Proto Cook infra Compose file now binds MinIO explicitly with `--address ":9000"` so the host smoke test can connect.
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
| 6 | Run Phase 10A focused checks | Done | Validation log |

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
| 7 | Run Phase 10B focused checks | Done | Validation log |

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

### Status

- Done: package script-shape validation passed.
- Done: global format/lint, typecheck, tests, and Proto Cook web build passed.
- Done: stale active app/media scan only reports intentional CI scanner patterns and historical tracker wording.
- Done: headless Playwright browser evaluation passed for lab gating, product files gating, Hybrid/HTTP lab controls, generated fixtures, course-video lab, and lesson player shell.
- Done: headed Playwright browser evaluation passed with the same coverage for visible local browser execution.
- Done: final DX/UX evidence was appended to `docs/files-platform-dx-evaluation.md`.

## Follow-Up Backlog

1. Run the full manual files lab tutorials from `docs/proto-cook/files/06-labs-manual-testing.md` as a human walkthrough and record subjective product/DX feedback.
2. Decide whether to add a package-owned orphan-cleanup command or run a direct one-off Docker cleanup during a separate local maintenance pass.
3. Clean up old local Docker containers named with the legacy `de100-lms-*` prefix during a separate maintenance pass if they are no longer needed.
4. If production runtime warnings matter for the deployment target, raise the Nitro/esbuild target above ES2019 or isolate the bigint-producing dependency.
5. Push the split workflows and verify `proto-cook-ci.yml` and `general-packages-ci.yml` remotely with GitHub services.
6. Continue manual feedback after Phase 12, using the files lab tutorials as the checklist.
7. Package topology candidate: `packages/*/domains/solidjs` currently names framework integrations as `domains`; consider a future `integrations/solidjs` package-family rename only if the churn is justified by onboarding friction.
8. Package docs candidate: add package READMEs for major package families beyond the current UI README coverage.

## Phase 12 - Reusable Package Assumption Audit

### Objective

Audit workspace-global packages for app-owned assumptions, fix concrete leaks with injectable seams, and document remaining package-topology follow-up without opening a broad rewrite.

### Scope

1. Scan reusable package families:
   - `packages/i18n`
   - `packages/ui`
   - `packages/files`
2. Flag only assumptions that are app/domain policy or deployment/runtime policy:
   - app routes and route exclusions
   - app env names
   - storage provider defaults that should be configured by the app
   - service URLs/ports
   - cookie names and persistence policy
   - visible app copy
   - auth/role/product assumptions
3. Keep legitimate reusable defaults when they are safe and overrideable.
4. Fix concrete leaks by adding options, adapters, predicates, or props.
5. Record unresolved architecture candidates as follow-up, not hidden TODOs.

### Step Tracker

| Step | Task | Status | Evidence |
| ---- | ---- | ------ | -------- |
| 1 | Run reusable-package assumption scans | Done | Validation log |
| 2 | Fix concrete app-owned assumption leaks | Done | Source diffs |
| 3 | Record package-topology follow-up candidates | Done | Follow-up backlog |
| 4 | Run focused package checks | Done | Validation log |
| 5 | Run global format/lint, typecheck, and tests | Done | Validation log |

### Exit Gates

1. Focused scans produce no unreviewed app-owned assumptions in workspace-global packages.
2. `pnpm -F @de100/i18n-core type:check`
3. `pnpm -F @de100/i18n-core test`
4. `pnpm -F @de100/i18n-domains-solidjs type:check`
5. `pnpm -F @de100/i18n-domains-solidjs test`
6. `pnpm -F @de100/ui-domains-solidjs type:check`
7. `pnpm format-and-lint:check`
8. `pnpm type:check`
9. `pnpm test`

### Status

- Done: package scans found concrete leaks in files/UI packages and broader topology candidates.
- Done: `@de100/files-shared` export `filesBalancedCourseHlsPreset` was hard-renamed to generic `filesBalancedHlsPreset`.
- Done: remaining course wording was removed from `packages/files` tests, making the package-family course-term scan clean.
- Done: `@de100/files-server` entitlement adapter no longer exposes `canReadCourseLesson`; it now exposes generic `canReadSubject` through `FilesEntitlementSubject`.
- Done: Proto Cook API now owns the `course-lesson` entitlement subject shape when integrating course playback with the files package.
- Done: reusable UI package READMEs no longer describe themselves as Proto Cook-only packages.
- Done: stale absolute docs links to the old `proto-cook` workspace path were replaced with stable repo-relative path text.

## Phase 13 - Localization, Docs, and CI Hardening

### Objective

Close the user-reported gaps around Arabic locale parity, manual files lab documentation depth, and CI workflow ownership without changing app runtime behavior or files-platform APIs.

### Scope

1. Add a locale parity behavior test for Proto Cook messages:
   - recursive key parity between English and Arabic
   - placeholder name/type parity
   - no requirement that translated strings equal English literals
2. Fix known English/Arabic semantic drift:
   - stale finance auth copy
   - obsolete future-phase upload copy
   - Arabic wording that confuses generic files with public files
   - Arabic course/enrollment wording around course video labs
3. Upgrade `docs/proto-cook/files` into a usable manual for:
   - manual UI testing
   - operator/service lifecycle checks
   - concise QA pass/fail checks
4. Tighten CI ownership while keeping workflow-level path filters:
   - Proto Cook CI owns app env, service containers, stale scans, web build, MinIO smoke, and hosted smoke
   - General Packages CI owns reusable package-family validation
   - no root feature/service scripts are added
5. Document the GitHub Actions path-filter caveat in workflow files.

### Step Tracker

| Step | Task | Status | Evidence |
| ---- | ---- | ------ | -------- |
| 1 | Add locale parity test and fix known locale drift | Done | `apps/proto-cook-web/i18n/shared/messages/locale-parity.test.ts` |
| 2 | Upgrade files lab docs with evidence/checklist structure | Done | `docs/proto-cook/files` |
| 3 | Tighten CI workflow ownership and path-filter notes | Done | `.github/workflows/*.yml` |
| 4 | Run focused app locale tests | Done | Validation log |
| 5 | Run final Phase 13 gates | Done | Validation log |

### Status

- Done: English and Arabic auth/files lab copy was realigned around Proto Cook, files, labs, and course-video terminology.
- Done: locale parity is now tested by recursive key and placeholder comparison instead of relying only on structural TypeScript compatibility.
- Done: files lab tutorials now include evidence capture, expected failure modes, service lifecycle checks, and QA checklists.
- Done: Proto Cook CI remains app/service-smoke focused; General Packages CI now runs reusable package-family Turbo filters instead of full workspace app checks.
- Done: generated Playwright output is excluded from the Proto Cook web Biome scan.

### Exit Gates

1. `pnpm -F @de100/apps-proto-cook-web test`
2. `pnpm format-and-lint:check`
3. `pnpm type:check`
4. `pnpm test`
5. `pnpm -F @de100/apps-proto-cook-web build`
6. Active stale scan remains clean outside intentional scanner patterns, archives, generated output, and historical tracker text.

## Phase 14 - CI, Env, Infra Ownership, And Docs Hardening

### Objective

Fix the CI failures reported from GitHub Actions and make ownership explicit for env parsing, local services, workflow-scoped Turbo scripts, and docs.

### Scope

1. Parse CI-style boolean env strings in `@de100/apps-proto-cook-env`:
   - `APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE`
   - `DISABLE_ORPC_OUTPUT_VALIDATION`
2. Keep projected/internal env values typed as real booleans after parsing.
3. Add env tests for string boolean values such as `"true"`, `"false"`, `"1"`, and `"0"`.
4. Move Proto Cook Compose ownership from root to `packages/apps/proto-cook/infra/docker-compose.yml`.
5. Update infra and DB scripts so package-owned commands use the moved Compose file.
6. Fix GitHub Actions MinIO startup:
   - official `minio/minio:latest` image
   - explicit `server /data --address ":9000" --console-address ":9001"` command
   - bucket creation remains in the MinIO smoke script
7. Add workflow-scoped CI package scripts:
   - `ci:proto-cook:*`
   - `ci:general:*`
8. Define matching Turbo tasks and update workflows to run the scoped task names.
9. Update setup, storage, CI, lab, and troubleshooting docs to use infra/package-owned commands.

### Step Tracker

| Step | Task | Status | Evidence |
| ---- | ---- | ------ | -------- |
| 1 | Fix env boolean parsing and add tests | Done | `packages/apps/proto-cook/env/src/server.ts`, `server.test.ts` |
| 2 | Move Compose file into infra ownership | Done | `packages/apps/proto-cook/infra/docker-compose.yml` |
| 3 | Update package scripts for infra, DB, and workflow-scoped CI | Done | package manifests, `turbo.json` |
| 4 | Fix CI MinIO service and workflow commands | Done | `.github/workflows/*.yml` |
| 5 | Update docs for command ownership and CI convention | Done | `docs/setup/ci-workflows.md`, setup docs |
| 6 | Run focused and full validation gates | Done | Validation log |

### Status

- Done: CI-style env booleans now parse string inputs with `z.stringbool()` while the projected server env remains typed as real booleans.
- Done: Proto Cook Compose ownership moved from the repo root to `@de100/apps-proto-cook-infra`, with infra and DB scripts updated to use the package-owned file.
- Done: GitHub Actions MinIO startup now uses the official `minio/minio:latest` image and an explicit server command; bucket bootstrap remains in the MinIO smoke script.
- Done: workflow-scoped Turbo task ownership is encoded through package `ci:proto-cook:*` and `ci:general:*` scripts plus `turbo.json` tasks.
- Done: setup, storage, DX, README, and CI docs now point to package-owned service commands and explain the CI script convention.
- Done: focused, full, and infra validation gates passed locally. Remote GitHub workflow verification remains a follow-up because it requires pushing the workflow changes.

### Exit Gates

1. `pnpm install`
2. `pnpm -F @de100/apps-proto-cook-env type:check`
3. `pnpm -F @de100/apps-proto-cook-env test`
4. `env APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE=true pnpm -F @de100/apps-proto-cook-api test -- src/files-storage.test.ts`
5. `pnpm turbo run ci:proto-cook:type:check --dry=json`
6. `pnpm turbo run ci:proto-cook:test --dry=json`
7. `pnpm turbo run ci:general:type:check --dry=json`
8. `pnpm turbo run ci:general:test --dry=json`
9. `pnpm format-and-lint:check`
10. `pnpm type:check`
11. `pnpm test`
12. `pnpm -F @de100/apps-proto-cook-web build`
13. `pnpm -F @de100/apps-proto-cook-infra services:up`
14. `pnpm -F @de100/apps-proto-cook-infra services:status`
15. `pnpm -F @de100/apps-proto-cook-infra minio:smoke`
16. `pnpm -F @de100/apps-proto-cook-infra services:down`

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
- 2026-06-14: Audited package-level static assumptions after user review. `@de100/i18n-core` now keeps exported cookie/theme defaults but allows custom cookie names, max age, cookie attributes, and theme defaults through client/server options.
- 2026-06-14: `@de100/i18n-domains-solidjs` now forwards configurable i18n preference cookies/theme defaults through the provider and SolidStart helper seams.
- 2026-06-14: `@de100/ui-domains-solidjs` sidebar/mobile behavior defaults are injectable: sidebar cookie name/max age, keyboard shortcut, mobile breakpoint, widths, and mobile sr-only copy. Uploader dropzone warning fixed by using `fieldset`.
- 2026-06-14: `pnpm -F @de100/i18n-core type:check` passed.
- 2026-06-14: `pnpm -F @de100/i18n-core test` passed with 12 tests.
- 2026-06-14: `pnpm -F @de100/i18n-domains-solidjs type:check` passed.
- 2026-06-14: `pnpm -F @de100/ui-domains-solidjs type:check` passed.
- 2026-06-14: `pnpm -F @de100/i18n-domains-solidjs test` passed with 2 tests.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-web lint:lab-ui-copy` passed.
- 2026-06-14: `pnpm lint:workspace-package-scripts` passed.
- 2026-06-14: `pnpm format-and-lint:check` passed.
- 2026-06-14: `pnpm type:check` passed.
- 2026-06-14: `pnpm test` passed.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-web build` passed with existing non-blocking Nitro/esbuild bigint target warnings.
- 2026-06-14: Active stale terminology/no-`formatI18nTemplate` scan is clean except intentional CI scanner regexes and historical tracker text.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-web test:browser` passed with 4 Playwright tests covering unauthenticated files/product gating, authenticated Hybrid/HTTP lab rendering and fixture generation, course-video lab rendering, and lesson player shell rendering.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-web test:browser:headed` passed with the same 4 tests. This satisfies the automated visible-browser gate available to Codex; full human tutorial walkthrough remains a feedback backlog item.
- 2026-06-14: `pnpm format-and-lint:check` passed after final tracker and DX report updates.
- 2026-06-14: Phase 12 started to audit reusable packages for app-owned assumptions after Phase 11 closed.
- 2026-06-14: Targeted reusable-package scans found and removed concrete leaks: course-named files HLS preset, course-specific files-server entitlement adapter, Proto Cook-only reusable UI README wording, and stale absolute docs links to an old local workspace path.
- 2026-06-14: `rg -n "Course|course" packages/files` produced no active matches after neutralizing files package tests and public names.
- 2026-06-14: `pnpm -F @de100/files-shared type:check` passed.
- 2026-06-14: `pnpm -F @de100/files-shared test` passed with 10 files and 34 tests.
- 2026-06-14: `pnpm -F @de100/files-server type:check` passed.
- 2026-06-14: `pnpm -F @de100/files-server test` passed with 17 files and 54 tests.
- 2026-06-14: `pnpm -F @de100/files-processing-video type:check` passed.
- 2026-06-14: `pnpm -F @de100/files-processing-video test` passed with 1 file and 9 tests.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-api type:check` passed.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-api test` passed with 7 files and 27 tests.
- 2026-06-14: `pnpm -F @de100/i18n-core type:check` passed.
- 2026-06-14: `pnpm -F @de100/i18n-core test` passed with 3 files and 12 tests.
- 2026-06-14: `pnpm -F @de100/i18n-domains-solidjs type:check` passed.
- 2026-06-14: `pnpm -F @de100/i18n-domains-solidjs test` passed with 1 file and 2 tests.
- 2026-06-14: `pnpm -F @de100/ui-shared type:check` passed.
- 2026-06-14: `pnpm -F @de100/ui-domains-solidjs type:check` passed after correcting the uploader `fieldset` ref type.
- 2026-06-14: `pnpm format-and-lint:check` passed for Phase 12.
- 2026-06-14: `pnpm type:check` passed with 43 Turbo tasks.
- 2026-06-14: `pnpm test` passed with 19 Turbo test tasks.
- 2026-06-14: Phase 13 started to fix Arabic/English locale drift, deepen `docs/proto-cook/files` manual testing docs, and tighten CI workflow ownership while keeping workflow-level path filters.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-web test -- i18n/shared/messages/locale-parity.test.ts` passed; Vitest also ran the existing app test suite for 13 files and 42 tests.
- 2026-06-14: `pnpm format-and-lint:check` initially failed because generated `apps/proto-cook-web/test-results/.last-run.json` was ignored by Git but included by Biome. Fixed by excluding `test-results` and `playwright-report` in the app Biome config.
- 2026-06-14: `pnpm format-and-lint:check` passed after the generated-output exclude.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-web type:check` passed after tightening the locale placeholder parser.
- 2026-06-14: `pnpm type:check` passed with 43 Turbo tasks.
- 2026-06-14: `pnpm test` passed with 19 Turbo test tasks.
- 2026-06-14: `pnpm -F @de100/apps-proto-cook-web build` passed with the existing non-blocking Nitro/esbuild bigint target warnings.
- 2026-06-14: Active stale app identity scan is clean. Active old media terminology scan only reports historical tracker wording and legitimate dependency naming such as `@solid-primitives/media`.
- 2026-06-14: Turbo dry runs for the General Packages CI package-family filters succeeded for reusable package `type:check` and `test` tasks.
- 2026-06-15: Phase 14 started from reported GitHub Actions failures: string boolean env parsing rejected `APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE`, and CI MinIO could not pull `bitnami/minio:latest`.
- 2026-06-15: `pnpm install` passed after adding the Proto Cook env test dependency and updating package scripts.
- 2026-06-15: `pnpm -F @de100/apps-proto-cook-env type:check` passed.
- 2026-06-15: `pnpm -F @de100/apps-proto-cook-env test` passed after covering CI-style boolean strings and isolating the test env from local `.env.local` leakage.
- 2026-06-15: `env APP_PROTO_COOK_FILES_S3_FORCE_PATH_STYLE=true pnpm -F @de100/apps-proto-cook-api test -- src/files-storage.test.ts` passed; Vitest ran the API suite with 7 files and 27 tests.
- 2026-06-15: Turbo dry runs passed for `ci:proto-cook:type:check`, `ci:proto-cook:test`, `ci:general:type:check`, and `ci:general:test`.
- 2026-06-15: `pnpm format-and-lint:check` passed after formatting the new env test.
- 2026-06-15: `pnpm type:check` passed with 43 Turbo tasks.
- 2026-06-15: `pnpm test` passed with 20 Turbo test tasks after increasing the env dynamic-import test timeout.
- 2026-06-15: `pnpm -F @de100/apps-proto-cook-web build` passed with the existing non-blocking Nitro/esbuild bigint target warnings.
- 2026-06-15: `pnpm -F @de100/apps-proto-cook-infra services:up`, `services:status`, `minio:smoke`, and `services:down` passed using the infra-owned Compose file. Docker reported old orphan `de100-lms-*` containers; cleanup is tracked as a follow-up.
- 2026-06-15: Active stale env/app/media scan is clean except intentional CI scanner regexes and historical archive material.
