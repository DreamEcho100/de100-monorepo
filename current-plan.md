# Current Plan: UI Domains Migration and Media UI Platform

## 1. Purpose

This file is the single execution guide for the upcoming UI platform work. It is intentionally detailed, sequential, and test-driven.

This plan covers:

1. Package topology migration for UI packages.
2. New shared foundation package.
3. New Solid domain UI package capabilities:
4. Uppy-based file uploader.
5. Unpic-based image components.
6. Foresight-based link preview utilities.
7. Typography primitives.
8. First-wave app adoption.
9. Testing, documentation, QA, and release gates.

This plan does not implement features by itself. It defines exactly what to do and in what order.

## 2. Core Goals

1. Standardize UI package structure and naming:
1. Move from old UI package path to domains path.
1. Introduce a shared UI package for reusable tokens and utilities.
1. Deliver feature-complete primitives for media and content UI:
1. File uploader with robust UX and reliability.
1. Image rendering with responsive optimization.
1. Link preview utility layer with predictive prefetch and metadata preview support.
1. Typography primitives for semantic, scalable styling.
1. Ensure production readiness:
1. Strong TypeScript contracts.
1. Accessibility support.
1. Light and dark mode support.
1. RTL support.
1. Test coverage for core logic in every phase.

## 3. Non-Goals For This Delivery

1. No full broad wrapper migration of every raw HTML element in the whole app.
2. No custom XHR chunk backend implementation in this delivery.
3. No server-side persistence for pinned previews in this delivery unless explicitly elevated later.
4. No unrelated refactors outside the defined phase scope.

## 4. Hard Constraints and Guardrails

1. Hard-cut migration from old package name to new package name. No compatibility alias package.
2. Keep implementation library-first:
3. Uploader is Uppy-based.
4. Image is Unpic-based.
5. Link prediction is Foresight-based utility integration.
6. Keep app-owned Link assembly model.
7. Include tests while implementing each phase, not at the end.
8. All new user-facing strings must support i18n through props plus defaults.
9. Maintain Tailwind v4 and CSS variable compatibility.
10. Maintain accessibility, responsiveness, dark/light, and RTL support.

## 5. Final Decisions Already Locked

1. Add container package at packages/ui/domains.
2. Add packages/ui/shared as @de100/ui-shared.
3. Move CSS baseline ownership to @de100/ui-shared now.
4. Rename domains package to @de100/ui-domains-solidjs.
5. Uploader supports all main file categories:
6. Images.
7. Documents.
8. Video.
9. Audio.
10. Arbitrary files.
11. Uploader transport default is Auto, using size plus network signal.
12. Uploader includes clipboard, camera capture, and IndexedDB queue persistence.
13. Provider compatibility target includes local, r2, s3-compatible, and future adapter contracts.
14. Link preview supports both predictive prefetch and metadata previews.
15. Link preview applies to internal and external links with policy checks.
16. Link preview action set includes open, open in new tab, copy, pin or save, dismiss.
17. Metadata preview cache TTL default is 30 minutes.
18. Security defaults include allowlist and SSRF guards via typed env-driven config.
19. Typography custom tone set baseline:
20. accent
21. subtle
22. success
23. warning
24. danger
25. info
26. Typography can include optional enterprise aliases when needed:
27. brand
28. neutral-strong
29. positive
30. caution
31. critical
32. highlight
33. Custom XHR chunk backend is deferred to next phase after this delivery.

## 6. High-Level Sequence Map

1. Phase 0: Preflight and baseline.
2. Phase 1: Topology migration and package rename.
3. Phase 2: Shared foundation package.
4. Phase 3: Uploader API and architecture.
5. Phase 4: Uploader implementation and integration.
6. Phase 5: Image component implementation.
7. Phase 6: Link preview utilities and endpoint contract.
8. Phase 7: Typography primitives.
9. Phase 8: App first-wave adoption.
10. Phase 8R: Adoption architecture realignment and prefetch model correction.
11. Phase 9: Docs, TSDoc, migration docs.
12. Phase 10: QA, verification, release gate.
13. Phase 11: Deferred next-phase backlog prep.

## 6.1 Live Execution Tracker

Last updated: 2026-06-01

Current delivery mode: sequential implementation with phase gates

Current active phase: Phase 11 Ready (Not Started)

Global status legend:

1. Not Started
2. In Progress
3. Blocked
4. Done
5. Paused

Phase board:

1. Phase 0: Done
2. Phase 1: Done
3. Phase 2: Done
4. Phase 3: Done
5. Phase 4: Done
6. Phase 5: Done
7. Phase 6: Done
8. Phase 7: Done
9. Phase 8: Done
10. Phase 8R: Done
11. Phase 9: Done
12. Phase 10: Done
13. Phase 11: Not Started

Execution policy:

1. Every step changes status in this file when completed.
2. Every validation command result is recorded in this file.
3. A phase is only marked Done when all exit criteria are satisfied.

---

## 7. Phase 0: Preflight and Baseline

### Objective

Prepare a safe starting point and define acceptance baselines before changing package topology.

### Step-by-Step

1. Confirm workspace root and baseline branch status.
2. Confirm current CI baseline commands and expected pass criteria.
3. Confirm current UI package references in root scripts, app scripts, and docs.
4. Confirm current Tailwind and CSS variable import order dependencies.
5. Confirm current media flow constraints in API and app.
6. Record baseline risks and rollback strategy.
7. Create and approve a phase test matrix that maps every feature to required tests.

### Required Outputs

1. Baseline checklist file or section complete.
2. Test matrix draft complete.
3. Risk and rollback notes complete.

### Required Tests in This Phase

1. No feature tests yet.
2. Add or update migration guard tests that verify:
3. package export paths resolve.
4. style import path is valid.
5. test filters include target packages.

### Exit Criteria

1. Baseline known.
2. Risk plan known.
3. Test matrix approved.

---

## 8. Phase 1: Topology Migration and Package Rename

### Objective

Move UI package structure and rename identities without breaking build and tests.

### Phase Status

Done

### Step Tracker (Live)

| Step | Task                                                                        | Status | Evidence                                 | Notes                                  |
| ---- | --------------------------------------------------------------------------- | ------ | ---------------------------------------- | -------------------------------------- |
| 1    | Update workspace discovery globs to include domains path                    | Done   | pnpm-workspace.yaml                      | Added packages/ui/domains/\*           |
| 2    | Create packages/ui/domains container package metadata                       | Done   | packages/ui/domains/package.json         | Created container manifest             |
| 3    | Move packages/ui/solidjs to packages/ui/domains/solidjs                     | Done   | packages/ui/domains/solidjs              | Folder moved                           |
| 4    | Rename package identity from @de100/ui-solidjs to @de100/ui-domains-solidjs | Done   | packages/ui/domains/solidjs/package.json | Package name updated                   |
| 5    | Update package export marker strings and root exports                       | Done   | packages/ui/domains/solidjs/src/index.ts | Export marker updated                  |
| 6    | Update app dependencies to new package names                                | Done   | apps/lms-web/package.json                | Dependency renamed                     |
| 7    | Update all imports in app and docs referencing old package                  | Done   | apps/lms-web, docs                       | Import strings updated                 |
| 8    | Update app tsconfig alias paths to moved package source                     | Done   | apps/lms-web/tsconfig.json               | Path aliases updated                   |
| 9    | Update Vite workspace dep lists and noExternal lists                        | Done   | apps/lms-web/vite.config.ts              | Workspace dep list updated             |
| 10   | Update root test filter scripts to use new package names                    | Done   | package.json                             | Turbo filter renamed                   |
| 11   | Regenerate lockfile and workspace links                                     | Done   | pnpm install                             | Workspace links and lockfile validated |

### Step-by-Step

1. Update workspace discovery globs to include domains path.
2. Create packages/ui/domains container package metadata.
3. Move packages/ui/solidjs to packages/ui/domains/solidjs.
4. Rename package identity from @de100/ui-solidjs to @de100/ui-domains-solidjs.
5. Update package export marker strings and root exports.
6. Update app dependencies to new package names.
7. Update all imports in app and docs referencing old package.
8. Update app tsconfig alias paths to moved package source.
9. Update Vite workspace dep lists and noExternal lists.
10. Update root test filter scripts to use new package names.
11. Regenerate lockfile and workspace links.

### Validation Log (Live)

1. PASS: `pnpm install`.
2. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/ui-domains-package-resolution.test.ts`.
3. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
4. PASS: `pnpm -F @de100/apps-lms-web type:check`.
5. PASS: `pnpm -F @de100/apps-lms-web build`.
6. PASS: `pnpm -F @de100/ui-domains-solidjs test`.
7. PASS: `rg` stale reference scan on migration scope returned `no stale references`.

### Blockers and Resolutions (Live)

1. Blocker: migration guard test initially imported the package root at runtime and failed with `Unknown file extension ".jsx"` from a transitive dependency.
2. Resolution: switched test assertions to `require.resolve` based resolution checks so export maps are validated without executing UI runtime modules.
3. Blocker: extensionless subpath check failed for `@de100/ui-domains-solidjs/libs/utils`.
4. Resolution: updated guard to resolve `@de100/ui-domains-solidjs/libs/utils.ts`, matching the current wildcard exports behavior.

### Required Outputs

1. New package topology in place.
2. No old package references in active app code paths.
3. Lockfile and workspace links updated.

### Required Tests in This Phase

1. Add or update tests that validate package root export resolution.
2. Add or update tests that validate key subpath export resolution.
3. Add or update tests that validate app style import resolves for shared CSS baseline.

### Exit Criteria

1. Typecheck passes for affected packages.
2. Build passes for affected packages.
3. Migration tests pass.

Exit criteria status: Met

---

## 9. Phase 2: Shared Foundation Package (@de100/ui-shared)

### Objective

Create a stable shared foundation for tokens, constants, and reusable utility contracts compatible with Tailwind v4.

### Phase Status

Done

### Step Tracker (Live)

| Step | Task                                                           | Status | Evidence                                                                                                            | Notes                                                             |
| ---- | -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1    | Scaffold package metadata and scripts                          | Done   | packages/ui/shared/package.json                                                                                     | Package created with scripts, exports, and dependencies           |
| 2    | Define public API surface for shared exports                   | Done   | packages/ui/shared/src/index.ts                                                                                     | Shared root barrel created                                        |
| 3    | Move shared CSS baseline ownership to @de100/ui-shared         | Done   | apps/lms-web/src/app.css                                                                                            | App now imports @de100/ui-shared/styles/base.css                  |
| 4    | Add shared style token constants and TS types                  | Done   | packages/ui/shared/src/libs/tokens.ts                                                                               | Token constants and types added                                   |
| 5    | Add shared utility helpers and typed configuration objects     | Done   | packages/ui/shared/src/libs/utils.ts, packages/ui/shared/src/libs/design-system.ts                                  | Shared helpers and typed config added                             |
| 6    | Ensure package export paths are simple and stable              | Done   | packages/ui/shared/package.json                                                                                     | Explicit root, styles, and libs exports added                     |
| 7    | Wire @de100/ui-domains-solidjs dependency to @de100/ui-shared  | Done   | packages/ui/domains/solidjs/package.json                                                                            | Domains package depends on ui-shared                              |
| 8    | Preserve domains import compatibility while changing ownership | Done   | packages/ui/domains/solidjs/src/libs/utils.ts, packages/ui/domains/solidjs/src/libs/design-system.ts                | Domains local utility/config files re-export shared ownership     |
| 9    | Update app/runtime wiring for shared package resolution        | Done   | apps/lms-web/package.json, apps/lms-web/vite.config.ts, apps/lms-web/src/libs/ui-domains-package-resolution.test.ts | App dependencies, Vite workspace deps, and resolver guard updated |
| 10   | Regenerate lockfile and workspace links                        | Done   | pnpm install                                                                                                        | Postinstall guard and workspace linking passed                    |
| 11   | Validate downstream build and tests                            | Done   | command log below                                                                                                   | Shared, domains, and app validations passed                       |

### Step-by-Step

1. Scaffold package metadata and scripts.
2. Define public API surface for shared exports.
3. Move shared CSS baseline ownership here.
4. Add shared style token constants and TS types.
5. Add shared utility helpers and typed configuration objects.
6. Ensure package export paths are simple and stable.
7. Wire @de100/ui-domains-solidjs dependency to @de100/ui-shared.

### Validation Log (Live)

1. PASS: `pnpm install`.
2. PASS: `pnpm -F @de100/ui-shared type:check`.
3. PASS: `pnpm -F @de100/ui-shared test`.
4. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
5. PASS: `pnpm -F @de100/ui-domains-solidjs test`.
6. PASS: `pnpm -F @de100/apps-lms-web type:check`.
7. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/ui-domains-package-resolution.test.ts`.
8. PASS: `pnpm -F @de100/apps-lms-web build`.

### Blockers and Resolutions (Live)

1. Blocker: workspace postinstall (`pnpm lint:ws`) failed because dependency keys in `packages/ui/domains/solidjs/package.json` were not alphabetically ordered.
2. Resolution: reordered dependencies and re-ran `pnpm install` until postinstall checks passed.
3. Blocker: nested CSS import indirection from `@de100/ui-shared/styles/base.css` into `tooling/tailwind/theme.css` caused build parser failure in Tailwind/Vite.
4. Resolution: moved the baseline token contract directly into `packages/ui/shared/src/styles/base.css` and validated with a clean app production build.

### Required Outputs

1. Shared package compiles independently.
2. Shared styles are importable by app and domains package.
3. Shared token constants are typed and documented.

### Required Tests in This Phase

1. Add tests for shared token contract values.
2. Add tests for shared utility behavior.
3. Add tests for export stability of shared package entry points.

### Exit Criteria

1. @de100/ui-shared typecheck passes.
2. @de100/ui-shared tests pass.
3. App build still resolves style baseline through new ownership.

Exit criteria status: Met

### Next Steps and Phase Sequencing (Detailed)

1. Phase 3 starts next and is contract-first only. No Uppy UI implementation code lands in Phase 3.
2. Phase 3 deliverables are locked to types/contracts/tests for uploader config, event model, transport policy, and adapter boundaries.
3. Phase 3 must end with a contract test suite that can run without browser-only Uppy plugin execution.
4. Phase 4 starts only after Phase 3 contract signatures are frozen and reviewed.
5. Phase 4 should be implemented in three vertical slices: core uploader engine, transport strategy and resilience, then advanced capture/persistence/enhancement hooks.
6. Phase 5 depends on Phase 4 public uploader APIs to avoid prop churn in media page integration.
7. Phase 6 should share the same contract-first pattern as Phase 3, including SSRF/allowlist guards before interactive UI wiring.
8. Phase 7 should consume shared tokens from @de100/ui-shared and avoid introducing new untyped tone names.
9. Phase 8 should be split into adoption waves with explicit target surfaces and rollback-safe checkpoints after each wave.
10. Phase 9 and Phase 10 should run as paired tracks: docs updates are drafted during feature phases, then finalized at release gate.

---

## 10. Phase 3: Uploader API and Architecture Design

### Objective

Define uploader contracts and adapter boundaries before implementation.

### Phase Status

Done

### Step Tracker (Live)

| Step | Task                                                          | Status | Evidence                                                                                    | Notes                                                                            |
| ---- | ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1    | Define uploader defaults and baseline constraints             | Done   | packages/ui/domains/solidjs/src/uploader/defaults.ts                                        | Added defaults for restrictions, transport, persistence, capture, i18n, and a11y |
| 2    | Define transport policy model and network-aware auto strategy | Done   | packages/ui/domains/solidjs/src/uploader/transport-policy.ts                                | Added explicit and auto transport selection with decision reasons                |
| 3    | Define provider adapter contract model                        | Done   | packages/ui/domains/solidjs/src/uploader/adapters.ts                                        | Added provider target, confirm, and cancel contract types                        |
| 4    | Define uploader event model and transition behavior           | Done   | packages/ui/domains/solidjs/src/uploader/events.ts                                          | Added event union, transition guard, and state reducer                           |
| 5    | Define uploader config contracts and default resolution       | Done   | packages/ui/domains/solidjs/src/uploader/contracts.ts                                       | Added typed config surface plus runtime validation                               |
| 6    | Add contract tests for defaults and config validation         | Done   | packages/ui/domains/solidjs/src/uploader/contracts.test.ts                                  | Added default and override coverage plus invalid-input assertions                |
| 7    | Add contract tests for transport policy selector logic        | Done   | packages/ui/domains/solidjs/src/uploader/transport-policy.test.ts                           | Added explicit mode, auto mode, and network threshold coverage                   |
| 8    | Add contract tests for event-state transition model           | Done   | packages/ui/domains/solidjs/src/uploader/events.test.ts                                     | Added lifecycle, retry, invalid transition, and progress clamp coverage          |
| 9    | Expose uploader contract layer through package API surface    | Done   | packages/ui/domains/solidjs/src/uploader/index.ts, packages/ui/domains/solidjs/src/index.ts | Exported uploader contracts from package root                                    |
| 10   | Validate phase gates                                          | Done   | command log below                                                                           | Typecheck and test gates all passing                                             |

### Validation Log (Live)

1. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
2. PASS: `pnpm -F @de100/ui-domains-solidjs test -- src/uploader/contracts.test.ts src/uploader/transport-policy.test.ts src/uploader/events.test.ts`.
3. PASS: `pnpm -F @de100/apps-lms-web type:check`.

### Blockers and Resolutions (Live)

1. Blocker: zsh failed to expand `src/uploader/*.test.ts` with `no matches found` due shell glob behavior.
2. Resolution: switched the gate command to explicit test file paths and reran successfully.

### Planned File Targets (Prepared)

1. packages/ui/domains/solidjs/src/uploader/contracts.ts
2. packages/ui/domains/solidjs/src/uploader/transport-policy.ts
3. packages/ui/domains/solidjs/src/uploader/events.ts
4. packages/ui/domains/solidjs/src/uploader/adapters.ts
5. packages/ui/domains/solidjs/src/uploader/defaults.ts
6. packages/ui/domains/solidjs/src/uploader/contracts.test.ts
7. packages/ui/domains/solidjs/src/uploader/transport-policy.test.ts
8. packages/ui/domains/solidjs/src/uploader/events.test.ts

### Detailed Entry Checklist

1. Map each required capability to an explicit TypeScript contract before adding implementation code.
2. Separate browser runtime concerns from pure contract logic so tests can run in Vitest without browser plugin execution.
3. Freeze stable names for transport modes, event names, and adapter boundaries before moving to Phase 4.
4. Confirm i18n string strategy in contracts: user-facing copy passes through props with defaults.
5. Confirm accessibility contract includes labels and status announcement hooks.

### Detailed Exit Gate Commands

1. `pnpm -F @de100/ui-domains-solidjs type:check`
2. `pnpm -F @de100/ui-domains-solidjs test -- src/uploader/contracts.test.ts src/uploader/transport-policy.test.ts src/uploader/events.test.ts`
3. `pnpm -F @de100/apps-lms-web type:check`

### Step-by-Step

1. Define uploader configuration interface:
1. restrictions.
1. transport mode.
1. auto-switch thresholds.
1. persistence options.
1. capture options.
1. enhancement pipeline hooks.
1. Define uploader event model:
1. file added.
1. progress.
1. success.
1. error.
1. retry.
1. cancel.
1. complete.
1. Define transport policy model:
1. xhr.
1. tus.
1. auto.
1. network-aware auto strategy.
1. Define provider adapter contract model for app integration.
1. Define enhancement middleware hook interfaces.
1. Define uploader i18n prop model and defaults.
1. Define accessibility responsibilities and aria behavior.

### Required Outputs

1. Public uploader type interfaces.
2. Adapter interfaces.
3. Event and state contracts.

### Required Tests in This Phase

1. Add contract tests for config validation and defaults.
2. Add contract tests for transport policy selector logic.
3. Add contract tests for event-state transition model.

### Exit Criteria

1. API signatures stable.
2. Core contract tests pass.

Exit criteria status: Met

### Next Steps and Phase Sequencing (Detailed)

1. Phase 4 starts with implementation slice 1 only (core uploader engine) using the finalized contracts from Phase 3 with zero signature drift.
2. Transport policy from Phase 3 is treated as source of truth in Phase 4; UI layer does not duplicate threshold logic.
3. Provider adapter contract from Phase 3 is the only bridge between uploader internals and app media backend interactions.
4. Phase 4 slice completion gates run per slice to keep regressions local before moving to the next slice.
5. Phase 5 should start only after Phase 4 public uploader props stabilize to avoid image component API churn from parallel refactors.
6. Phase 6 should begin with security and contract layer first, mirroring the successful Phase 3 contract-first pattern.
7. Phase 7 should consume `@de100/ui-shared` tokens and avoid adding new untyped semantic tones.
8. Phase 8 should be executed in wave order with clear rollback boundaries: media first, then shell surfaces, then content pages.

---

## 11. Phase 4: Uploader Implementation (Uppy-based)

### Objective

Implement a feature-complete uploader wrapper on top of Uppy with robust UX and typed state.

### Phase Status

Done

### Step Tracker (Live)

| Step | Task                                                                       | Status | Evidence                                                                                                                                                                                                                                                              | Notes                                                                 |
| ---- | -------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1    | Add provider adapter bridge utilities and upload request shaping           | Done   | packages/ui/domains/solidjs/src/uploader/provider-bridge.ts                                                                                                                                                                                                           | Added candidate mapping, metadata shaping, target/confirm/cancel glue |
| 2    | Add queue persistence runtime for memory and IndexedDB                     | Done   | packages/ui/domains/solidjs/src/uploader/persistence/indexeddb-queue.ts                                                                                                                                                                                               | Added queue store abstraction plus record serialization helpers       |
| 3    | Implement Uppy runtime factory and lazy plugin mounts                      | Done   | packages/ui/domains/solidjs/src/uploader/uppy-factory.ts                                                                                                                                                                                                              | Added dashboard/dropzone lazy mounts, transport policy, upload engine |
| 4    | Implement uploader controller and Solid hook                               | Done   | packages/ui/domains/solidjs/src/uploader/use-uploader.ts                                                                                                                                                                                                              | Added state machine wiring, announcements, runtime orchestration      |
| 5    | Implement uploader UI component with dropzone and dashboard modes          | Done   | packages/ui/domains/solidjs/src/uploader/uploader.tsx                                                                                                                                                                                                                 | Added helper text, restrictions, retry/pause/resume/cancel controls   |
| 6    | Add Phase 4 tests for hook/runtime/persistence/interaction helper coverage | Done   | packages/ui/domains/solidjs/src/uploader/use-uploader.test.ts, packages/ui/domains/solidjs/src/uploader/uppy-factory.test.ts, packages/ui/domains/solidjs/src/uploader/uploader.test.ts, packages/ui/domains/solidjs/src/uploader/persistence/indexeddb-queue.test.ts | Added state, restoration, enhancement hook, keyboard/pointer coverage |
| 7    | Export Phase 4 uploader public API surface                                 | Done   | packages/ui/domains/solidjs/src/uploader/index.ts                                                                                                                                                                                                                     | Added exports for runtime, hook, component, and persistence           |
| 8    | Run package and app validation gates                                       | Done   | validation log below                                                                                                                                                                                                                                                  | All required gates passed                                             |

### Validation Log (Live)

1. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
2. PASS: `pnpm -F @de100/ui-domains-solidjs test`.
3. PASS: `pnpm -F @de100/ui-domains-solidjs format-and-lint:check` (non-blocking warning: dropzone semantic-role suggestion).
4. PASS: `pnpm -F @de100/apps-lms-web type:check`.
5. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/server/media-storage.test.ts`.
6. PASS: `pnpm -F @de100/apps-lms-web build`.

### Blockers and Resolutions (Live)

1. Blocker: Phase 4 implementation introduced strict contract mismatches (adapter record shape, capture/i18n field names, item state field naming).
2. Resolution: aligned runtime/controller/component and tests to existing Phase 3 contracts and default schema (`providerId`, `UploaderRecordRef`, i18n `browseCta`, capture constraints).
3. Blocker: Biome a11y checks flagged non-semantic interactive dropzone markup.
4. Resolution: updated uploader container semantics, removed redundant list role, and retained explicit dropzone keyboard interaction role with a non-blocking semantic warning.

### Implementation Outcome (Phase 4)

1. Core Uppy runtime now supports queued file orchestration, transport selection, provider-target upload flow, retry handling, pause/resume/cancel controls, and upload completion signaling.
2. Queue persistence now supports IndexedDB or memory fallback with restore-on-init behavior.
3. Enhancement pipeline hooks now execute before provider target creation and propagate metadata to adapter contracts.
4. Solid hook/controller and uploader UI surface are now implemented and exported for app adoption.
5. Phase 4 test coverage now includes controller transitions, persistence restoration behavior, interaction helper behavior, and enhancement invocation behavior.

### Planned File Targets (Prepared)

1. packages/ui/domains/solidjs/src/uploader/uppy-factory.ts
2. packages/ui/domains/solidjs/src/uploader/use-uploader.ts
3. packages/ui/domains/solidjs/src/uploader/uploader.tsx
4. packages/ui/domains/solidjs/src/uploader/persistence/indexeddb-queue.ts
5. packages/ui/domains/solidjs/src/uploader/provider-bridge.ts
6. packages/ui/domains/solidjs/src/uploader/use-uploader.test.ts
7. packages/ui/domains/solidjs/src/uploader/uploader.test.ts
8. packages/ui/domains/solidjs/src/uploader/persistence/indexeddb-queue.test.ts
9. packages/ui/domains/solidjs/src/uploader/uppy-factory.test.ts

### Detailed Entry Checklist

1. Lock `contracts.ts`, `transport-policy.ts`, and `adapters.ts` as Phase 3 stable surfaces before writing implementation code.
2. Add Uppy dependencies only when slice 1 begins and verify baseline bundle impact before adding optional plugins.
3. Keep heavy plugin loading lazy and side-effect free for SSR compatibility.
4. Keep app backend communication fully delegated to provider adapter bridge.
5. Keep all user-facing labels and notices i18n-overridable by props.

### Implementation Slices (Careful Sequence)

1. Slice 1: core uploader engine with typed config wiring and state transitions.
2. Slice 2: transport policy integration for xhr, tus, and auto strategy with retry/cancel/resume controls.
3. Slice 3: capture and persistence features including clipboard, camera, and IndexedDB queue restore.
4. Slice 4: enhancement middleware pipeline hooks and provider adapter bridge.
5. Slice 5: accessibility and interaction polish with keyboard and screen reader verification.

### Detailed Guardrails

1. Keep plugin loading lazy for heavy Uppy surfaces and keep baseline bundle impact measurable.
2. Keep provider integration behind typed adapter contracts from Phase 3; avoid hard-coding app-specific endpoints in component internals.
3. Keep all user-visible strings overridable through props for i18n compliance.
4. Keep direct custom chunk-backend behavior deferred; leave extension seams only.

### Detailed Exit Gate Commands

1. `pnpm -F @de100/ui-domains-solidjs type:check`
2. `pnpm -F @de100/ui-domains-solidjs test`
3. `pnpm -F @de100/apps-lms-web test -- src/libs/server/media-storage.test.ts`
4. `pnpm -F @de100/apps-lms-web build`

### Step-by-Step

1. Build Uppy instance factory with typed metadata/body contracts.
2. Implement lazy loading strategy for heavy plugins.
3. Integrate desired UI composition path:
4. dashboard mode.
5. dropzone mode.
6. Add visible helper text and restrictions text support.
7. Implement transport strategy application:
8. xhr mode.
9. tus mode.
10. auto mode.
11. Implement auto mode with configurable threshold and network signal.
12. Add retry behavior:
13. auto transient retry.
14. manual retry controls.
15. Add pause, resume, cancel controls.
16. Add clipboard capture integration.
17. Add camera capture integration.
18. Add IndexedDB queue persistence adapter.
19. Add enhancement hooks:
20. compression hook.
21. image dimension extraction hook.
22. video thumbnail stub hook.
23. checksum/dedupe detection hook.
24. virus scan stub hook.
25. Add provider adapter bridge for app media flow integration.
26. Expose uploader component and low-level hooks.

### Required Outputs

1. Uploader component.
2. Uploader hooks and utilities.
3. Transport adapters.
4. Persistence adapter.

### Required Tests in This Phase

1. Hook tests for uploader state machine.
2. Tests for transport selection in xhr, tus, auto modes.
3. Tests for retries, pause, resume, cancel.
4. Tests for persistence adapter behavior and restoration.
5. Component interaction tests for keyboard and pointer flows.
6. A11y tests for labels, role usage, and announcements.
7. Tests for enhancement hook invocation and output contracts.

### Exit Criteria

1. Uploader works with provider adapters in app integration path.
2. Uploader core tests pass.
3. No regressions in existing media flow tests.

Exit criteria status: Met

### Next Steps and Phase Sequencing (Detailed)

1. Phase 5 should begin with contract-first image API definitions (`contracts.ts` and utility policy) before adding rendering components.
2. Preserve the newly exported uploader API as stable while Phase 5 lands, so app integration can proceed without uploader prop churn.
3. In Phase 5, implement image primitives in two slices: base image behavior first, then art-direction composition.
4. Run Phase 5 gates package-first (`@de100/ui-domains-solidjs`) before app build checks to keep regressions localized.
5. Phase 6 should mirror Phase 3 and Phase 5 sequencing: security/policy contracts first, then foresight runtime utilities, then app wiring.
6. Phase 6 should define preview metadata schema and SSRF/allowlist policy before any network-triggered preview behavior ships.
7. Phase 7 should consume `@de100/ui-shared` token surfaces directly and avoid introducing untyped or ad-hoc typography tone names.
8. Phase 8 adoption should be wave-gated and rollback-safe: media surfaces first, shell surfaces second, content pages third.
9. Each upcoming phase should append to `docs/worklog.md` immediately after passing its phase gates to keep auditability continuous.
10. Phase 9 and Phase 10 should be prepared incrementally during implementation phases rather than deferred into a single final documentation pass.

---

## 12. Phase 5: Image Components (Unpic-based)

### Objective

Provide image primitives with responsive behavior, performance defaults, and robust fallback handling.

### Phase Status

Done

### Reconciliation Log (Live)

1. PASS: staged Phase 1-4 package resolution guard already uses `require.resolve` assertions.
2. PASS: active app and package imports use `@de100/ui-domains-solidjs`; remaining `@de100/ui-solidjs` references are historical notes or `_old` backup content.
3. PASS: external Unpic Solid and provider docs are reachable; GitHub `solid-uppy` reference remains non-blocking for Phase 5.

### Baseline Validation Log (Live)

1. PASS: `pnpm -F @de100/ui-shared type:check`.
2. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
3. PASS: `pnpm -F @de100/apps-lms-web type:check`.

### Implementation Log (Live)

1. PASS: Added `@unpic/solid` to `@de100/ui-domains-solidjs`; `pnpm add` completed and workspace postinstall `sherif` check passed.
2. PASS: Added image contracts, policy utilities, `Image`, `ArtDirectedImage`, image barrel exports, and root package exports.
3. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
4. PASS: Added package-local Vitest Solid transform config for deterministic `.tsx` component rendering tests.
5. PASS: Added image and art-directed image tests for layout policy, loading defaults, placeholders, fallback source policy, responsive output, decorative image accessibility, and picture/source composition.
6. PASS: Extended app package resolution guard for Phase 5 image component and contract subpaths.

### Validation Log (Live)

1. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
2. PASS: `pnpm -F @de100/ui-domains-solidjs test -- "src/image/*.test.ts"`; Vitest executed the package suite and all 33 tests passed, including 11 Phase 5 image tests.
3. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/ui-domains-package-resolution.test.ts`; all 32 app tests selected by the app config passed, including 5 package-resolution tests.
4. PASS: `pnpm -F @de100/ui-domains-solidjs format-and-lint:check`; exited successfully with the known Phase 4 uploader semantic-role warning only.
5. PASS: `pnpm -F @de100/apps-lms-web build`; build completed with existing AWS/Rollup circular chunk and esbuild target warnings.

### Planned File Targets (Prepared)

1. packages/ui/domains/solidjs/src/components/image.tsx
2. packages/ui/domains/solidjs/src/components/art-directed-image.tsx
3. packages/ui/domains/solidjs/src/image/contracts.ts
4. packages/ui/domains/solidjs/src/image/image-utils.ts
5. packages/ui/domains/solidjs/src/image/image.test.ts
6. packages/ui/domains/solidjs/src/image/art-directed-image.test.ts

### Detailed Entry Checklist

1. Keep size and aspect-ratio requirements explicit in prop contracts to prevent CLS regressions.
2. Ensure fallback and placeholder behavior is deterministic and testable without network calls.
3. Keep provider option passthrough typed and validated at boundaries.
4. Keep art-direction API additive and backward-compatible with base image props.

### Detailed Exit Gate Commands

1. `pnpm -F @de100/ui-domains-solidjs type:check`
2. `pnpm -F @de100/ui-domains-solidjs test -- src/image/*.test.ts`
3. `pnpm -F @de100/apps-lms-web build`

### Step-by-Step

1. Implement main image wrapper based on @unpic/solid.
2. Add required sizing policy:
3. width and height.
4. or aspect ratio.
5. Add lazy and priority behavior defaults.
6. Add async decoding defaults.
7. Add fallback source strategy.
8. Add placeholder strategies:
9. dominant color.
10. blur placeholder when data available.
11. skeleton shimmer.
12. Add provider options and operations passthrough.
13. Implement art-direction companion using picture and source composition.
14. Expose typed props and i18n labels where needed.

### Required Outputs

1. Image component.
2. Art-directed image component.
3. Shared image prop types.

### Required Tests in This Phase

1. Tests for layout policy and no-CLS contract.
2. Tests for fallback behavior on load failure.
3. Tests for placeholder mode rendering.
4. Tests for responsive srcset and sizes output.
5. Tests for art-direction source selection behavior.

### Exit Criteria

1. Image component tests pass.
2. Integration is ready for first-wave adoption points.

Exit criteria status: Met

---

## 13. Phase 6: Link Preview Utilities (Foresight + Metadata Contract)

### Objective

Deliver utility layer for predictive prefetch and metadata previews while keeping Link composition in app.

### Phase Status

Done

### Kickoff Log (Live)

1. Started Phase 6 implementation from the contract and security layer first.
2. Phase 6 will ship in this order: contracts and security policy, foresight manager and prefetch hook, preview card model, then gate validation and closeout.

### Implementation Log (Live)

1. PASS: Added `js.foresight` to `@de100/ui-domains-solidjs` and updated lockfile/workspace graph.
2. PASS: Implemented link-preview contract layer in `contracts.ts` including trigger/behavior resolution, i18n defaults, and metadata request/response schemas.
3. PASS: Implemented security policy utilities in `security-policy.ts` including allowlist checks, blocked host rules, protocol enforcement, and SSRF/private-network guards.
4. PASS: Implemented Foresight runtime manager in `foresight-manager.ts` with lazy runtime loading, SSR-safe no-op behavior, and settings update helpers.
5. PASS: Implemented prefetch controller and Solid hook in `use-link-prefetch.ts` for immediate, intent, focus, and touch trigger behavior.
6. PASS: Implemented preview action model in `preview-card-model.ts` with typed action callbacks and default i18n labels.
7. PASS: Added and passed focused tests for contracts, security policy, prefetch lifecycle, and preview actions.
8. PASS: Exported link-preview public API from `src/link-preview/index.ts` and package root `src/index.ts`.
9. PASS: Extended app package-resolution guard coverage for link-preview contract and security subpath exports.

### Validation Log (Live)

1. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
2. PASS: `pnpm -F @de100/ui-domains-solidjs test -- "src/link-preview/*.test.ts"`; package suite executed and all 43 tests passed, including 10 link-preview tests.
3. PASS: `pnpm -F @de100/apps-lms-web type:check`.
4. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/ui-domains-package-resolution.test.ts`; app suite executed and package-resolution coverage passed with 6 assertions.

### Blockers and Resolutions (Live)

1. Blocker: test mock typing for `registerForesight` callback drifted from the runtime callback contract and failed package typecheck.
2. Resolution: aligned the test to inspect mock call options and trigger the registered callback through typed call payload, then re-ran all Phase 6 gates.

### Planned File Targets (Prepared)

1. packages/ui/domains/solidjs/src/link-preview/foresight-manager.ts
2. packages/ui/domains/solidjs/src/link-preview/use-link-prefetch.ts
3. packages/ui/domains/solidjs/src/link-preview/contracts.ts
4. packages/ui/domains/solidjs/src/link-preview/preview-card-model.ts
5. packages/ui/domains/solidjs/src/link-preview/security-policy.ts
6. packages/ui/domains/solidjs/src/link-preview/use-link-prefetch.test.ts
7. packages/ui/domains/solidjs/src/link-preview/security-policy.test.ts
8. packages/ui/domains/solidjs/src/link-preview/contracts.test.ts
9. packages/ui/domains/solidjs/src/link-preview/preview-card-model.test.ts
10. packages/ui/domains/solidjs/src/link-preview/index.ts
11. packages/ui/domains/solidjs/src/index.ts
12. apps/lms-web/src/libs/ui-domains-package-resolution.test.ts

### Detailed Entry Checklist

1. Implement allowlist and SSRF guard contracts before wiring any interactive preview behavior.
2. Keep foresight registration lifecycle utilities app-owned and idempotent.
3. Define metadata response contracts with strict schema-first validation.
4. Keep trigger-mode semantics explicit for hover, focus, touch, and immediate modes.

### Detailed Exit Gate Commands

1. `pnpm -F @de100/ui-domains-solidjs type:check`
2. `pnpm -F @de100/ui-domains-solidjs test -- src/link-preview/*.test.ts`
3. `pnpm -F @de100/apps-lms-web type:check`

### Step-by-Step

1. Implement foresight manager initialization utility wrapper.
2. Implement element registration utility for app-level links.
3. Add support for prefetchBehavior modes:
4. intent delayed default.
5. immediate.
6. focus.
7. touch strategy support.
8. Implement callback adapter contract for app prefetch actions.
9. Define metadata endpoint request and response contract.
10. Implement preview card model with required actions:
11. open.
12. open new tab.
13. copy.
14. pin or save.
15. dismiss.
16. Implement policy guard integration:
17. allowlist.
18. SSRF checks.
19. environment-based config.
20. Implement metadata cache behavior with default TTL.
21. Add i18n props and defaults for preview UI strings.

### Required Outputs

1. Link prefetch utility hooks.
2. Metadata endpoint contract definitions.
3. Preview card utility model and optional component helpers.

### Required Tests in This Phase

1. Hook lifecycle tests for register and unregister behavior.
2. Tests for trigger behavior across pointer, keyboard, touch.
3. Tests for prefetchBehavior mode switching.
4. Contract tests for metadata endpoint schema.
5. Security tests for allowlist and SSRF guard behavior.
6. Tests for preview card action callbacks.

### Exit Criteria

1. Link utility tests pass.
2. Security policy tests pass.
3. Contract is ready for app integration.

Exit criteria status: Met

### Next Steps and Phase Sequencing (Detailed)

1. Phase 7 starts immediately with contract-first typography primitives, and no app adoption code is allowed during Phase 7.
2. Phase 7 should ship in four slices: contracts and variants, semantic component rendering, tone/direction behavior, then tests and export hardening.
3. Phase 8 starts only after Phase 7 gates pass and typography exports are frozen to avoid adoption churn.
4. Phase 8 should run as wave-gated adoption with rollback-safe checkpoints after each wave before expanding surface area.
5. Phase 9 documentation drafting should begin during Phase 7 and Phase 8, then finalize in Phase 10 release gates.

---

## 14. Phase 7: Typography Primitives

### Objective

Provide semantic heading and paragraph primitives with scalable variants and theming behavior.

### Phase Status

Done

### Kickoff Plan (Live)

1. Start with `typography/contracts.ts` and `typography/variants.ts` so variant/tone names are frozen before component implementation.
2. Implement `components/typography.tsx` only after contract types are stable and tested.
3. Keep typography primitives package-scoped in Phase 7; app consumption begins in Phase 8.

### Step Tracker (Live)

| Step | Task                                                               | Status | Evidence | Notes                                                     |
| ---- | ------------------------------------------------------------------ | ------ | -------- | --------------------------------------------------------- |
| 1    | Define typography contracts and semantic element map               | Done   | packages/ui/domains/solidjs/src/typography/contracts.ts | Locked variants, tones, direction/alignment contracts     |
| 2    | Define variant and tone class mapping utilities                    | Done   | packages/ui/domains/solidjs/src/typography/variants.ts | Consumes shared tone tokens plus enterprise alias mapping |
| 3    | Implement semantic typography primitives and polymorphic rendering | Done   | packages/ui/domains/solidjs/src/components/typography.tsx | Added `Typography` and semantic wrappers `H1` through `P` |
| 4    | Add focused tests for semantic tags, variants, tones, and RTL/dir | Done   | packages/ui/domains/solidjs/src/typography/typography.test.ts | Added semantic, variant, tone, custom-slot, and dir tests |
| 5    | Export typography API from package root and validate gates         | Done   | packages/ui/domains/solidjs/src/index.ts, apps/lms-web/src/libs/ui-domains-package-resolution.test.ts | Exported package APIs and extended resolver coverage |

### Implementation Log (Live)

1. PASS: Added typography contracts with semantic tag, variant, alignment, direction, shared tone, and enterprise alias types.
2. PASS: Added variant and tone resolution utilities with deterministic class mapping, alias resolution, and custom tone slot overrides.
3. PASS: Implemented `Typography` plus semantic wrappers `H1`, `H2`, `H3`, `H4`, `H5`, `H6`, and `P`.
4. PASS: Added typography barrel exports and package root exports.
5. PASS: Added focused typography tests for semantic rendering, variant mapping, tone alias behavior, dark/light tone classes, and RTL direction overrides.
6. PASS: Extended app package-resolution guard with typography component and contract subpath assertions.

### Validation Log (Live)

1. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
2. PASS: `pnpm -F @de100/ui-domains-solidjs test -- "src/typography/*.test.ts"`; Vitest executed package tests and all 50 tests passed, including 7 typography tests.
3. PASS: `pnpm -F @de100/apps-lms-web type:check`.
4. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/ui-domains-package-resolution.test.ts`; app suite passed and package-resolution assertions increased to 7.
5. PASS: `pnpm -F @de100/apps-lms-web build`; build passed with existing non-blocking AWS/Rollup circular dependency and esbuild target warnings.

### Blockers and Resolutions (Live)

1. Blocker: strict typing on polymorphic `Dynamic` rendering produced `ref` incompatibility for the semantic tag union during package typecheck.
2. Resolution: switched to explicit semantic element branches (`h1`-`h6` and `p`) while keeping shared class/tone resolution and public API unchanged.

### Planned File Targets (Prepared)

1. packages/ui/domains/solidjs/src/components/typography.tsx
2. packages/ui/domains/solidjs/src/typography/contracts.ts
3. packages/ui/domains/solidjs/src/typography/variants.ts
4. packages/ui/domains/solidjs/src/typography/typography.test.ts
5. packages/ui/domains/solidjs/src/typography/index.ts
6. packages/ui/domains/solidjs/src/index.ts
7. apps/lms-web/src/libs/ui-domains-package-resolution.test.ts

### Detailed Entry Checklist

1. Keep semantic element rendering and variant styling concerns separated for testability.
2. Reuse tone contracts from `@de100/ui-shared` tokens; avoid introducing ad-hoc tone names.
3. Ensure RTL and dir overrides are explicit in props and class mapping.
4. Keep typography defaults accessible and contrast-safe in light and dark modes.

### Detailed Exit Gate Commands

1. `pnpm -F @de100/ui-domains-solidjs type:check`
2. `pnpm -F @de100/ui-domains-solidjs test -- src/typography/*.test.ts`
3. `pnpm -F @de100/apps-lms-web build`

### Step-by-Step

1. Implement semantic components:
1. H1
1. H2
1. H3
1. H4
1. H5
1. H6
1. P
1. Add token-style variant model:
1. display-xl
1. title-lg
1. body-md
1. caption-sm
1. Add tone model:
1. semantic token tones.
1. custom tone slots.
1. optional enterprise alias support.
1. Add light and dark mode style behavior.
1. Add RTL-safe spacing and alignment defaults.
1. Add optional per-component direction override.
1. Add i18n-aware optional prop labels where needed.

### Implementation Slices (Careful Sequence)

1. Slice 1: contracts and variant dictionary (`contracts.ts`, `variants.ts`) with no rendering yet.
2. Slice 2: semantic component implementation with variant/tone application and explicit `dir` override behavior.
3. Slice 3: focused tests for semantic rendering, variant mapping, and tone alias behavior.
4. Slice 4: package export hardening and resolver test updates.

### Required Outputs

1. Typography components with typed variant props.
2. Shared tone and variant type definitions.

### Required Tests in This Phase

1. Tests for semantic element rendering.
2. Tests for variant class mapping logic.
3. Tests for tone mapping and alias behavior.
4. Tests for dark and light mode rendering state.
5. Tests for RTL and dir override behavior.

### Exit Criteria

1. Typography tests pass.
2. Components are ready for app adoption.

Exit criteria status: Met

### Next Steps and Phase Sequencing (Detailed)

1. Phase 8 starts with baseline validation only, then Wave 1 media adoption; do not mix Wave 2 shell adoption into the same commit range.
2. Before every adoption wave, run and record baseline gates (`type:check`, package-resolution test, `build`) so regressions have a known-good checkpoint.
3. Keep Phase 8 commits wave-isolated to preserve rollback safety and reduce conflict risk with ongoing app feature work.
4. Begin drafting Phase 9 docs during each Wave completion (API snippets, migration notes, usage examples), then finalize docs at Phase 10 gate.
5. Reserve Phase 10 for full QA consolidation and release readiness only after all Phase 8 waves are marked complete.

---

## 15. Phase 8: App First-Wave Adoption

### Objective

Adopt new primitives in prioritized app surfaces to validate real usage and consistency.

### Phase Status

Done

### Step Tracker (Live)

| Step | Task | Status | Evidence | Notes |
| ---- | ---- | ------ | -------- | ----- |
| 1 | Wave 1 media adoption (uploader bridge + image primitives + typography touchpoints) | Done | `apps/lms-web/src/media-page.tsx`, `apps/lms-web/src/libs/media-uploader-runtime.ts`, `apps/lms-web/src/libs/media-uploader-runtime.test.ts` | Added app runtime bridge for uploader and image previews with `Image`/`ArtDirectedImage` |
| 2 | Wave 2 shell adoption (header/user-menu link utility integration) | Done | `apps/lms-web/src/components/header.tsx`, `apps/lms-web/src/components/user-menu.tsx`, `apps/lms-web/src/components/prefetch-anchor.tsx`, `apps/lms-web/src/libs/route-prefetch.ts` | Added `useLinkPrefetch` powered route prefetch links in app-owned link assembly points |
| 3 | Wave 3 auth surface typography adoption | Done | `apps/lms-web/src/components/sign-in-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, `verify-email-form.tsx` | Replaced repeated auth heading/notice text with typography primitives |
| 4 | Wave 4 content page adoption | Done | `apps/lms-web/src/home-page.tsx`, `about-page.tsx`, `dashboard-page.tsx`, `todos-page.tsx`, `api-reference-page.tsx` | Adopted typography primitives across content/status/section text surfaces |
| 5 | Add/update integration-oriented app coverage for adoption utilities | Done | `apps/lms-web/src/libs/route-prefetch.test.ts`, `apps/lms-web/src/libs/media-uploader-runtime.test.ts` | Added focused tests for route prefetch mapping and media uploader runtime flow |
| 6 | Run Phase 8 gates and record results | Done | Validation log below | All required Phase 8 gate commands passed |

### Validation Log (Live)

1. PASS: `pnpm -F @de100/apps-lms-web type:check`.
2. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/ui-domains-package-resolution.test.ts`.
3. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/media-uploader-runtime.test.ts src/libs/route-prefetch.test.ts`.
4. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/server/media-storage.test.ts`.
5. PASS: `pnpm -F @de100/apps-lms-web test`.
6. PASS: `pnpm -F @de100/apps-lms-web build`.
7. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`.
8. PASS: `pnpm -F @de100/ui-domains-solidjs test`.

### Blockers and Resolutions (Live)

1. Blocker: `prefetch-anchor.tsx` initially failed typecheck because Solid event handler unions are not always directly callable.
2. Resolution: simplified event wiring to dedicated `onFocus`/`onTouchStart` handlers for prefetch triggers.
3. Blocker: media uploader runtime tests initially failed by loading package-root JSX transitive dependencies.
4. Resolution: switched runtime/test imports to uploader subpath exports (`uploader/*.ts`) to keep tests in source-only modules.
5. Note: app build still reports pre-existing Rollup circular chunk warnings and esbuild target warnings, but build completes successfully and matches prior known-warning profile.

### Kickoff Plan (Prepared)

1. Run baseline app gates and record results before any Wave 1 edits:
2. `pnpm -F @de100/apps-lms-web type:check`
3. `pnpm -F @de100/apps-lms-web test -- src/libs/ui-domains-package-resolution.test.ts`
4. `pnpm -F @de100/apps-lms-web build`
5. Start Wave 1 with media page adoption only (`media-page.tsx` and immediate upload helpers/tests).
6. Keep Wave 1 strictly limited to uploader/image/typography composition and avoid shell or auth refactors.
7. After Wave 1 passes, checkpoint and then continue sequentially through Wave 2, Wave 3, and Wave 4.

### Wave 1 Detailed Slice (Phase 8 Entry)

1. Integrate `Uploader` into media page flow with existing provider adapter contracts unchanged.
2. Replace high-value image surfaces with `Image`/`ArtDirectedImage` where layout contracts are known.
3. Use typography primitives for media-page headings and helper copy where they replace repeated class strings safely.
4. Validate with:
5. `pnpm -F @de100/apps-lms-web type:check`
6. `pnpm -F @de100/apps-lms-web test -- src/libs/server/media-storage.test.ts`
7. `pnpm -F @de100/apps-lms-web build`

### Entry Preconditions (Must Be True Before Wave 1)

1. Phase 6 and Phase 7 must be marked `Exit criteria status: Met`.
2. Uploader, image, link-preview, and typography exports must be frozen for this delivery cycle.
3. Baseline app gates must pass before each new wave starts:
4. `pnpm -F @de100/apps-lms-web type:check`
5. `pnpm -F @de100/apps-lms-web test -- src/libs/ui-domains-package-resolution.test.ts`
6. `pnpm -F @de100/apps-lms-web build`

### Adoption Waves (Careful Rollout)

1. Wave 1: media page uploader integration and validation.
2. Wave 2: shared shell surfaces (header and user menu) for typography and preview utilities.
3. Wave 3: auth forms for typography consistency and messaging surfaces.
4. Wave 4: content pages (home, about, dashboard, todos, api reference).

### Wave Execution Matrix (Detailed)

| Wave | Scope | Primary Files | Required Validation Before Next Wave |
| ---- | ----- | ------------- | ------------------------------------ |
| 1 | Media adoption | `src/media-page.tsx`, media upload helpers/tests | `type:check`, media integration tests, `build` |
| 2 | Shell and navigation adoption | `src/components/header.tsx`, `src/components/user-menu.tsx` | `type:check`, shell interaction tests, `build` |
| 3 | Auth surface adoption | `src/components/sign-in-form.tsx`, `src/components/sign-up-form.tsx`, `src/components/forgot-password-form.tsx`, `src/components/reset-password-form.tsx`, `src/components/verify-email-form.tsx` | `type:check`, auth form tests, `build` |
| 4 | Content page adoption | `src/home-page.tsx`, `src/about-page.tsx`, `src/dashboard-page.tsx`, `src/todos-page.tsx`, `src/api-reference-page.tsx` | full app tests, `build`, regression sweep |

### Per-Wave Rollback Guard

1. Keep each wave in isolated commits so revert scope stays small.
2. Do not merge a wave until all wave validation commands pass.
3. If a wave fails with broad regressions, revert only that wave and continue from last green checkpoint.

### Detailed Entry Checklist

1. Freeze public APIs for uploader, image, link-preview, and typography before Wave 1.
2. Add per-wave rollback notes before each migration slice.
3. Keep i18n key additions scoped to wave-specific features to simplify review.
4. Run integration tests and app build after every wave before continuing.

### Detailed Exit Gate Commands

1. `pnpm -F @de100/apps-lms-web type:check`
2. `pnpm -F @de100/apps-lms-web test`
3. `pnpm -F @de100/apps-lms-web build`
4. `pnpm -F @de100/ui-domains-solidjs test`

### Step-by-Step

1. Integrate uploader and related flows in media page.
2. Integrate image primitives where immediate value exists.
3. Integrate link utility into app-owned link assembly points.
4. Replace repeated typography patterns in first-wave files.
5. Ensure i18n keys and defaults are wired for new strings.
6. Validate no regressions in existing page behavior.

### First-Wave Target Areas

1. media page.
2. header and user menu.
3. auth forms.
4. home.
5. about.
6. dashboard.
7. todos.
8. api reference page.

### Required Outputs

1. New primitives used in selected production app surfaces.
2. Existing behavior parity maintained.

### Required Tests in This Phase

1. Add or update integration tests for media page uploader workflows.
2. Add or update integration tests for link preview utility usage.
3. Add or update tests for typography adoption in major page templates.

### Exit Criteria

1. App typecheck passes.
2. App build passes.
3. App integration tests pass.

Exit criteria status: Met

---

## 15R. Phase 8R: Adoption Architecture Realignment

### Objective

Correct adoption architecture before final docs so route preloading is route-owned, package boundaries are consistent, and uploader transport runs through maintained Uppy plugins.

### Phase Status

Done

### Step Tracker (Live)

| Step | Task | Status | Evidence | Notes |
| ---- | ---- | ------ | -------- | ----- |
| 1 | Activate Phase 8R tracker and pause Phase 9 | Done | `current-plan.md` | Phase board and active phase state updated |
| 2 | Realign package boundaries (`components` vs `libs`) with compatibility shims | Done | `packages/ui/domains/solidjs/src/components/uploader.tsx`, `packages/ui/domains/solidjs/src/libs/{link-preview,typography,uploader}` | Non-visual internals moved under `src/libs/*`; old paths now transitional re-export shims |
| 3 | Replace `PrefetchAnchor`/route-map prefetch with `AppLink` + `AuthAppLink` + route-owned `preload` | Done | `apps/lms-web/src/components/{app-link,auth-app-link}.tsx`, `apps/lms-web/src/routes/[locale]/*` | Removed centralized route map files and moved preload ownership into route modules |
| 4 | Refactor uploader execution path to Uppy transport plugins (`@uppy/xhr-upload`, `@uppy/tus`) | Done | `packages/ui/domains/solidjs/src/libs/uploader/uppy-factory.ts` | Browser upload execution now plugin-driven; non-browser test/runtime fallback preserved for deterministic CI |
| 5 | Apply lean-test policy for this realignment slice | Done | `apps/lms-web/src/components/*link*.test.ts`, `apps/lms-web/src/routes/[locale]/route-preload.test.ts` | Route-map tests removed and replaced with focused link gating + route preload behavior coverage |
| 6 | Run Phase 8R gates and record results | Done | command log below | All Phase 8R gate commands passed |
| 7 | Close Phase 8R and resume Phase 9 | Done | `current-plan.md` | Phase board updated; Phase 9 resumed |

### Validation Log (Live)

1. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`
2. PASS: `pnpm -F @de100/ui-domains-solidjs test -- "src/uploader/*.test.ts" "src/link-preview/*.test.ts" "src/typography/*.test.ts"`
3. PASS: `pnpm -F @de100/apps-lms-web type:check`
4. PASS: `pnpm -F @de100/apps-lms-web test -- "src/components/*link*.test.ts" "src/routes/**/*.test.ts" src/libs/ui-domains-package-resolution.test.ts`
5. PASS: `pnpm -F @de100/apps-lms-web build` (with pre-existing Rollup/esbuild warnings)

### Next-Phase Execution Order (Prepared)

1. Phase 9 resumes only after this phase is marked Done and architecture notes are updated to reflect route-owned preload and `AppLink`/`AuthAppLink`.
2. Phase 10 runs as release gate consolidation: lint/type/test/build/manual QA on the updated architecture.
3. Phase 11 remains deferred-only and should contain only explicitly postponed scope after Phase 10 is green.

---

## 16. Phase 9: Documentation and Developer Experience

### Objective

Ensure engineers can use and maintain new platform capabilities.

### Phase Status

Done

### Step Tracker (Live)

| Step | Task | Status | Evidence | Notes |
| ---- | ---- | ------ | -------- | ----- |
| 1 | Document Phase 8R architecture realignment in migration docs | Done | `docs/setup/ui-domains-migration.md` | Captures `AppLink`/`AuthAppLink`, route-owned preload, and transitional shims |
| 2 | Refresh package API docs/examples for `@de100/ui-domains-solidjs` + `@de100/ui-shared` | Done | `packages/ui/domains/solidjs/README.md`, `packages/ui/shared/README.md` | Added package usage, boundaries, and validation notes |
| 3 | Update onboarding + frontend architecture docs with current naming and usage | Done | `docs/onboarding.md`, `docs/architecture/frontend-styling.md`, `docs/README.md` | Updated boundary/import guidance and docs index |
| 4 | Prepare Phase 10 release-gate checklist and QA runbook inputs | Done | `docs/setup/phase10-release-checklist.md` | Added ordered automated/manual gate runbook |
| 5 | Close Phase 9 and hand off to Phase 10 | Done | `current-plan.md`, `docs/worklog.md` | Phase 9 complete and handoff documented |

### Validation Log (Live)

1. PASS: docs coverage updated for migration, security architecture, package APIs, and Phase 10 checklist.
2. PASS: `pnpm -F @de100/apps-lms-web type:check`
3. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`
4. PASS: docs index/reference scan confirms new docs are linked from `docs/README.md` and `docs/worklog.md`.

### Immediate Execution Order (Detailed)

1. Write package API docs and examples first (`@de100/ui-domains-solidjs`, `@de100/ui-shared`) so Phase 8 shipped surfaces have canonical references.
2. Add migration-focused notes for app-side adoption utilities (`app-link`, `auth-app-link`, media uploader runtime bridge) and list where they are used.
3. Update onboarding and styling architecture docs after API docs are drafted, to keep cross-doc naming consistent.
4. Perform one final documentation consistency sweep before Phase 10 gates, then lock docs for QA verification.

### Detailed Sequencing (Prepared)

1. Draft docs incrementally at the end of each Phase 8 wave instead of waiting for a single bulk docs pass.
2. Keep API docs and examples coupled: every exported primitive added in prior phases must have at least one usage snippet.
3. Capture migration notes in two layers: quick-start migration checklist and deeper architecture rationale.
4. Hold a documentation consistency sweep immediately before Phase 10 so release-gate QA validates final copy, not drafts.

### Step-by-Step

1. Add full TSDoc for all public APIs in shared and domains packages.
2. Write package README for @de100/ui-shared.
3. Write package README for @de100/ui-domains-solidjs.
4. Write migration guide old package to new package names and import paths.
5. Write architecture note for link preview security model.
6. Update onboarding and styling architecture docs with new package names and import rules.
7. Add test matrix documentation and test ownership notes.

### Required Outputs

1. Updated docs complete.
2. Migration guide complete.
3. Security architecture note complete.

### Required Tests in This Phase

1. Documentation lint or consistency checks if available.
2. Validate examples compile where applicable.

### Exit Criteria

1. Documentation complete and coherent.
2. Examples and references are aligned with actual code.

Exit criteria status: Met

---

## 17. Phase 10: QA, Verification, and Release Gate

### Objective

Run final quality gates and confirm release readiness.

### Phase Status

Done

### Step Tracker (Live)

| Step | Task | Status | Evidence | Notes |
| ---- | ---- | ------ | -------- | ----- |
| 1 | Run workspace install/link validation | Done | `pnpm install` | Lockfile up to date; workspace postinstall/lint gate passed |
| 2 | Run format/lint checks (`ui-shared`, `ui-domains-solidjs`, `apps-lms-web`) | Done | `pnpm -F @de100/{ui-shared,ui-domains-solidjs,apps-lms-web} format-and-lint:check` | App package required formatter fixes; all checks now pass |
| 3 | Run typechecks (`ui-shared`, `ui-domains-solidjs`, `apps-lms-web`) | Done | `pnpm -F @de100/{ui-shared,ui-domains-solidjs,apps-lms-web} type:check` | All package/app typechecks passed |
| 4 | Run tests (`ui-shared`, `ui-domains-solidjs`, `apps-lms-web`) | Done | `pnpm -F @de100/{ui-shared,ui-domains-solidjs,apps-lms-web} test` | All suites passed (22 files / 105 tests) |
| 5 | Run app production build | Done | `pnpm -F @de100/apps-lms-web build` | Build passed (known existing AWS/esbuild warnings retained) |
| 6 | Manual QA + docs/deferred checks | Done | build-runtime smoke + docs/deferred verification | Fixed preload runtime regression, revalidated routes, confirmed docs/deferred artifacts |
| 7 | Close Phase 10 and mark release readiness | Done | `current-plan.md`, `docs/worklog.md` | Phase 10 gates complete with runtime fix and verification evidence |

### Validation Log (Live)

1. PASS: `pnpm install` (workspace links valid, no lockfile drift)
2. PASS: `pnpm -F @de100/ui-shared format-and-lint:check`
3. PASS: `pnpm -F @de100/ui-domains-solidjs format-and-lint:check` (non-blocking semantic-role warning remains)
4. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check` (after `biome check --write`)
5. PASS: `pnpm -F @de100/ui-shared type:check`
6. PASS: `pnpm -F @de100/ui-domains-solidjs type:check`
7. PASS: `pnpm -F @de100/apps-lms-web type:check`
8. PASS: `pnpm -F @de100/ui-shared test` (3 files / 8 tests)
9. PASS: `pnpm -F @de100/ui-domains-solidjs test` (15 files / 50 tests)
10. PASS: `pnpm -F @de100/apps-lms-web test` (11 files / 47 tests)
11. PASS: `pnpm -F @de100/apps-lms-web build` (initial build gate passed; runtime smoke then found preload regression)
12. FIX: Route preload regression (`ReferenceError: preloadDashboardRoute is not defined`) resolved by making route preload dependencies non-exported internals and keeping `route.preload` self-contained.
13. PASS: Revalidation after fix:
    - `pnpm -F @de100/apps-lms-web format-and-lint:check`
    - `pnpm -F @de100/apps-lms-web type:check`
    - `pnpm -F @de100/apps-lms-web test`
    - `pnpm -F @de100/apps-lms-web build`
14. PASS: Built-runtime smoke (`PORT=4173 node .output/server/index.mjs` + `curl`) returned non-500 responses for `GET /` (307), `GET /en` (200), `GET /en/dashboard` (200), and `GET /en/media` (200); no server-side preload reference errors remained.
15. PASS: Docs/deferred checks confirmed:
    - `docs/setup/ui-domains-migration.md`
    - `docs/architecture/link-preview-security.md`
    - `docs/setup/phase10-release-checklist.md`
    - Phase 11 deferred section remains isolated in `current-plan.md`

### Entry Preconditions (Detailed)

1. Phase 9 docs and migration references are marked complete and reviewed.
2. Phase 8 adoption tests stay green on latest branch tip (`type:check`, `test`, `build`).
3. `docs/worklog.md` includes Phase 8 and Phase 9 evidence links so QA logging stays contiguous.

### Gate Order (Prepared)

1. Run install/link validation first to avoid noisy downstream failures caused by stale workspace state.
2. Run formatting/linting second, then typecheck, then tests, then build for deterministic failure triage.
3. Keep a single QA checklist runbook and mark each manual check with pass/fail evidence in `docs/worklog.md`.
4. Gate release readiness on three explicit artifacts: command log, manual QA log, and documentation completion checklist.

### Detailed Execution Order (Next)

1. Run the exact ordered checklist in `docs/setup/phase10-release-checklist.md` without parallel gate skipping.
2. If any gate fails, fix only that gate's scope first, re-run the same gate, then continue forward.
3. After all automated gates pass, run manual QA and log evidence in `docs/worklog.md`.
4. Do not mark release-ready until docs references and deferred scope status are rechecked at branch tip.

### Step-by-Step

1. Run workspace install and link validation.
2. Run format and lint checks in affected packages.
3. Run typecheck in affected packages and app.
4. Run tests in affected packages and app.
5. Run app build.
6. Boot app dev server and smoke-check critical flows.
7. Execute manual QA checklist:
8. keyboard accessibility.
9. uploader drag and drop.
10. retries and cancel flows.
11. clipboard capture.
12. camera capture.
13. link preview trigger modes.
14. dark mode.
15. light mode.
16. responsive layouts.
17. RTL behavior.
18. Confirm docs and migration guide are included.
19. Confirm deferred items are documented as deferred.

### Required Outputs

1. Verification report with results per gate.
2. Final release readiness status.

### Required Tests in This Phase

1. Re-run complete affected test suite.
2. Confirm zero skipped critical tests in changed areas.

### Exit Criteria

1. All automated checks pass.
2. Manual QA pass.
3. Docs pass.
4. Release status marked ready.

Exit criteria status: Met

---

## 18. Phase 11: Deferred Next-Phase Backlog (Not in Current Delivery)

### Objective

Prepare and isolate deferred large-scope items for the next cycle.

### Handoff Artifacts (Prepared)

1. A scoped technical spec for custom XHR chunk upload backend contracts and fallback behavior.
2. A migration-impact memo for expanded media status values across API, validators, and app rendering.
3. A compatibility and rollout playbook for optional server-side pin persistence.

### Deferred Item Set

1. Custom XHR chunk backend implementation.
2. Expanded media status model:
3. scanning
4. processing
5. failed
6. Optional server-side persistence for pinned previews.

### Preparation Steps

1. Write concrete next-phase spec for custom XHR chunk endpoints.
2. Define migration strategy for media status schema changes.
3. Define compatibility and rollout strategy for existing records.

### Detailed Phase 11 Execution Order (Next)

1. Draft and review the XHR chunk upload backend contract spec first so transport-mode evolution has a stable API target.
2. Land media-status migration design second (schema, validators, UI state mapping, backfill plan) before implementation tickets are opened.
3. Finalize optional pinned-preview persistence rollout plan last, after status-model scope is frozen.
4. Open implementation issues only after all three artifacts are reviewed and accepted as deferred-to-next-cycle scope.

### Sequencing Notes (Detailed)

1. Finalize Phase 11 backlog artifacts only after Phase 10 release gate is green so deferred scope does not leak into release-critical changes.
2. Keep each deferred artifact tied to one owner and one acceptance checklist to reduce next-cycle kickoff ambiguity.
3. First cleanup candidate after release: remove transitional shim paths under `src/{uploader,typography,link-preview}` once all app and package consumers are migrated to root/libs surfaces.

---

## 19. Test Strategy Matrix (Mandatory Throughout)

### Migration Core Logic

1. Export path resolution tests.
2. Style baseline import resolution tests.
3. Script filter and package discovery checks.

### Uploader Core Logic

1. State machine and transition tests.
2. Transport policy tests.
3. Retry and cancellation tests.
4. Persistence adapter tests.
5. Enhancement middleware tests.
6. A11y behavior tests.

### Image Core Logic

1. Layout and sizing policy tests.
2. Placeholder and fallback tests.
3. Responsive generation tests.
4. Art-direction tests.

### Link Preview Core Logic

1. Registration lifecycle tests.
2. Trigger policy tests.
3. Metadata contract tests.
4. Security guard tests.
5. Interaction action tests.

### Typography Core Logic

1. Semantic tag output tests.
2. Variant mapping tests.
3. Tone and alias mapping tests.
4. Theme mode tests.
5. RTL and dir override tests.

### App Integration Logic

1. Media flow integration tests.
2. Link preview integration tests.
3. Typography adoption regression tests.

---

## 20. Resource Catalog

### Uploader Resources (Uppy)

1. Quick Start:
   https://uppy.io/docs/quick-start/
2. Choosing uploader:
   https://uppy.io/docs/guides/choosing-uploader/
3. XHR Upload:
   https://uppy.io/docs/xhr-upload/
4. Tus Upload:
   https://uppy.io/docs/tus/
5. Dashboard:
   https://uppy.io/docs/dashboard/
6. Drag and Drop:
   https://uppy.io/docs/drag-drop/
7. Solid wrapper reference for ideas:
   https://github.com/lxsmnsyc/solid-uppy/blob/main/packages/solid-uppy/src/index.ts

### Image Resources (Unpic)

1. Solid image docs:
   https://unpic.pics/img/solid/
2. Providers index:
   https://unpic.pics/providers

### Link Prediction and Prefetch Resources (Foresight)

1. What is Foresight:
   https://foresightjs.com/docs/getting-started/what-is-foresightjs
2. Initialize manager:
   https://foresightjs.com/docs/getting-started/initialize-the-manager
3. First element registration:
   https://foresightjs.com/docs/getting-started/your-first-element

### Accessibility Pattern Reference (Read-only)

1. Local reference code for solid-aria patterns under \_ignore path is for learning only.
2. No edits should be made under \_ignore paths without explicit approval.

---

## 21. File and Area Checklist

### Topology and Package Metadata

1. /home/viavi/Desktop/workspaces/github/lms/pnpm-workspace.yaml
2. /home/viavi/Desktop/workspaces/github/lms/package.json
3. /home/viavi/Desktop/workspaces/github/lms/pnpm-lock.yaml
4. /home/viavi/Desktop/workspaces/github/lms/packages/ui/domains/package.json
5. /home/viavi/Desktop/workspaces/github/lms/packages/ui/shared/package.json
6. /home/viavi/Desktop/workspaces/github/lms/packages/ui/domains/solidjs/package.json

### App Wiring

1. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/package.json
2. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/tsconfig.json
3. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/vite.config.ts
4. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/app.css

### Feature Integration Surfaces

1. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/media-page.tsx
2. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/components/header.tsx
3. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/components/user-menu.tsx
4. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/components/sign-in-form.tsx
5. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/components/sign-up-form.tsx
6. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/components/forgot-password-form.tsx
7. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/components/reset-password-form.tsx
8. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/components/verify-email-form.tsx
9. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/home-page.tsx
10. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/about-page.tsx
11. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/dashboard-page.tsx
12. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/todos-page.tsx
13. /home/viavi/Desktop/workspaces/github/lms/apps/lms-web/src/api-reference-page.tsx

### Existing Backend Contract References

1. /home/viavi/Desktop/workspaces/github/lms/packages/apps/lms/api/src/routers/media.ts
2. /home/viavi/Desktop/workspaces/github/lms/packages/apps/lms/validators/src/internal/media.ts

### Docs and Worklog

1. /home/viavi/Desktop/workspaces/github/lms/docs/onboarding.md
2. /home/viavi/Desktop/workspaces/github/lms/docs/architecture/frontend-styling.md
3. /home/viavi/Desktop/workspaces/github/lms/docs/worklog.md

---

## 22. Risk Register and Mitigation

### Risk 1: Topology migration breaks imports

1. Mitigation: perform migration in one cohesive slice with resolver tests.
2. Mitigation: regenerate lockfile immediately after rename.

### Risk 2: CSS baseline move causes token regressions

1. Mitigation: validate app build after CSS ownership move.
2. Mitigation: add tests for style import path validity.

### Risk 3: Uploader complexity expands scope

1. Mitigation: keep custom XHR chunk backend deferred.
2. Mitigation: keep library-first Uppy integration in this cycle.

### Risk 4: Link preview security risk

1. Mitigation: enforce allowlist and SSRF checks via typed config.
2. Mitigation: add security tests for blocked targets.

### Risk 5: Incomplete test coverage

1. Mitigation: phase gates require matching core-logic test files.
2. Mitigation: no phase completion without passing required tests.

---

## 23. Definition of Done (Global)

All items below must be true:

1. Package migration complete and stable.
2. Shared and domains packages compile and test successfully.
3. Uploader, image, link preview utilities, and typography primitives are implemented and tested.
4. App first-wave adoption completed in target areas.
5. Core logic tests implemented in every phase and passing.
6. Full TSDoc and user docs complete.
7. Security and accessibility checks completed.
8. Manual QA checklist completed and signed off.

---

## 24. Sequential Execution Checklist (Quick Runbook)

1. Complete Phase 0 baseline and test matrix.
2. Execute Phase 1 migration and validate migration tests.
3. Execute Phase 2 shared foundation and validate shared tests.
4. Execute Phase 3 uploader contracts and validate contract tests.
5. Execute Phase 4 uploader implementation and validate uploader tests.
6. Execute Phase 5 image implementation and validate image tests.
7. Execute Phase 6 link utilities and metadata contract and validate link/security tests.
8. Execute Phase 7 typography implementation and validate typography tests.
9. Execute Phase 8 app adoption and validate integration tests.
10. Execute Phase 9 documentation and migration guide updates.
11. Execute Phase 10 full QA and release gate.
12. Document deferred backlog in Phase 11.

This is the authoritative order. Do not skip test tasks between phases.
