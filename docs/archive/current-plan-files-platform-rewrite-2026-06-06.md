# Current Plan: Files Platform Rewrite

Last updated: 2026-06-06

Current active phase: None - files platform rewrite complete

## 1. Purpose

This file is the execution tracker for the full files-platform rewrite. It replaces the completed UI-domains migration tracker and is now the source of truth for the UploadThing-style files platform work.

## 2. Locked Decisions

1. Hard rename media to files:
   - `/media` becomes `/files`.
   - `/api/media/*` becomes `/api/files/*`.
   - `orpc.media.*` becomes `orpc.files.*`.
   - media i18n keys become files i18n keys.
   - no compatibility aliases for media routes, APIs, or package exports.
2. Create fresh files schema. Existing media tables are not migrated or preserved.
3. Package topology:
   - `packages/files/shared` -> `@de100/files-shared`
   - `packages/files/server` -> `@de100/files-server`
   - `packages/files/client` -> `@de100/files-client`
   - `packages/files/domains/solidjs` -> `@de100/files-domains-solidjs`
4. Hybrid is the recommended default files API approach:
   - oRPC handles typed control, metadata, target creation, completion, abort, signed access, processing state, and events
   - HTTP/provider protocols handle large byte transfer, range reads, public/signed delivery, and external upload integrations
5. HTTP-native is maintained as a full second approach for framework-neutral clients, route-first apps, Uppy examples, external tools, webhooks, and non-oRPC consumers.
6. RPC-native is no longer a top-level approach:
   - direct small/medium uploads can use oRPC `File`/`Blob` inputs
   - direct downloads can use oRPC `File`/`Blob` outputs where the client link supports it
   - status/progress/live processing can use oRPC Event Iterator procedures
   - metadata/control procedures stay normal typed oRPC procedures
   - direct RPC transfer remains a capability inside Hybrid, not a full binary strategy for all file workflows
7. Plain HTTP routes remain first-class compatibility and protocol endpoints:
   - Uppy XHR/Tus/AwsS3/Companion/Transloadit integrations
   - resumable/chunked uploads, because native oRPC file upload does not provide chunked or resumable upload semantics
   - S3 multipart part signing/completion paths when driven by Uppy/AwsS3-compatible clients
   - public/CDN/range-cacheable downloads and provider callbacks/webhooks
   - fallback clients that cannot use oRPC `File`/`Blob` or Event Iterator support
8. The LMS app must exercise Hybrid and HTTP-native paths on real app/lab surfaces:

- at least one page/workflow uses Hybrid orchestration
- at least one different page/workflow uses HTTP-native routing
- both public and private upload/download behavior are tested
- Hybrid stays the project default, while HTTP-native remains fully maintained

9. The platform supports all configured file kinds, including images, video, audio, documents, and generic files. Direct oRPC upload limits are protocol policy limits, not file-kind support limits.
10. Every byte strategy must publish explicit limits:
   - `orpc-direct` and `xhr`: app-server payload limits
   - `tus`: chunk/session/expiration limits
   - `s3-put`: single-object upload limits
   - `s3-multipart`: provider multipart limits
   - `transloadit`: vendor/config limits
   - range reads: delivery policy, not upload policy
11. Storage drivers are `local` and `s3`, with `APP_LMS_FILES_S3_PROVIDER=r2|minio|aws|custom`.
12. Development storage has two supported profiles:
   - `local-fs` for offline filesystem development, tests, demos, and small/single-node projects
   - `minio-s3` for offline S3-compatible production-parity testing
13. Cloudflare R2 production config uses the generic S3-compatible model with provider `r2`.
14. The files platform is an UploadThing alternative with more provider, Uppy, and processing capabilities.
15. Uppy support is broad and lazy-loaded. Heavy integrations are mandatory only when explicitly enabled by config.
16. App operations are injectable:

- auth/context
- file records
- upload sessions
- upload parts
- variants
- processing jobs
- storage provider selection
- role-specific procedures

17. LMS must use the package for a full real integration, not a minimal proof of concept.
18. `@de100/files-server/orpc` is the first server integration. Docs must explain future adapters for tRPC, Hono, Express, Fastify, Nitro/H3, Workers, and other common JS backends.
19. `@de100/files-domains-solidjs` is the first client domain integration. Docs must explain future framework domains.

### oRPC Transport Findings

1. oRPC `RPCHandler` supports native `File` and `Blob` serialization/deserialization, and `RPCLink` is the preferred first-party browser client for this richer type support.
2. oRPC supports Event Iterator procedures for server-to-client streaming, progress events, processing state, and resumable event delivery with `lastEventId`; this is event streaming, not binary chunk upload resumability.
3. oRPC docs explicitly recommend a dedicated upload solution or custom body parser for uploads larger than 100 MB, because native oRPC file upload does not support chunked or resumable uploads.
4. `OpenAPIHandler` supports `Blob`, `File`, root-level `AsyncIteratorObject`, and root-level `ReadableStream<Uint8Array>`, but client-side `OpenAPILink` does not support `ReadableStream<Uint8Array>` until v2.
5. `OpenAPILink` has stricter limitations than `RPCLink`: nested `Blob`/`File` payloads must use `multipart/form-data` and bracket notation, with string-conversion limitations.
6. For this project, first-party app uploads/downloads should implement Hybrid and HTTP-native paths for public/private flows. Direct oRPC transfer is allowed only where the transfer is non-resumable and within configured direct-transfer limits. HTTP routes stay for standards/protocol interoperability, large/resumable flows, public delivery, range/cache behavior, and external integrations.
7. Scalable default: direct oRPC upload max is 25 MB. Files above that default route to provider/protocol targets unless an app route explicitly opts into a higher reviewed limit.
8. Video/audio support is not constrained by the direct oRPC limit; large media routes should advertise and select resumable/provider-native transports by default.

## 3. Current Coupling Baseline

The old media implementation is scattered across:

1. `packages/apps/lms/api/src/media-storage.ts`
2. `packages/apps/lms/api/src/routers/media.ts`
3. `packages/apps/lms/api/src/media-signed-access.ts`
4. `packages/apps/lms/db/src/schema/media.ts`
5. `packages/apps/lms/validators/src/internal/media.ts`
6. `apps/lms-web/src/media-page.tsx`
7. `apps/lms-web/src/libs/media-uploader-runtime.ts`
8. `apps/lms-web/src/libs/server/media-storage.ts`
9. `apps/lms-web/src/routes/api/media/*`
10. `apps/lms-web/src/routes/[locale]/media.tsx`
11. `packages/ui/domains/solidjs/src/libs/uploader/*`
12. `packages/ui/domains/solidjs/src/components/uploader.tsx`

Baseline findings:

1. `packages/apps/lms/media` does not exist.
2. Local and R2/S3-compatible storage already exist, but they are app-owned.
3. Signed storage read/write methods are placeholders in the current provider abstraction.
4. The app owns a simplified media uploader runtime that bypasses the richer Uppy runtime in the UI package.
5. Current docs explicitly defer custom chunked XHR and media status expansion; this rewrite pulls those concerns into the files platform.

## 4. Phase Board

Status legend: Not Started, In Progress, Done, Blocked, Paused.

| Phase | Name                                                | Status      |
| ----- | --------------------------------------------------- | ----------- |
| 0     | Tracker rewrite and baseline audit                  | Done        |
| 1     | Package scaffold and workspace resolution           | Done        |
| 2     | Shared contracts and schemas                        | Done        |
| 3     | Server core, providers, temp files, signed access   | Done        |
| 4     | Fresh LMS files schema and repositories             | Done        |
| 5     | oRPC integration and LMS `orpc.files.*`             | Done        |
| 6     | Uppy client runtime and plugin registry             | Done        |
| 7     | Solid files domain components and hooks             | Done        |
| 8     | HTTP compatibility routes and external integrations | Done        |
| 9     | Taxonomy, planner, storage profiles, and two labs   | Done        |
| 10    | Processing, variants, and recommendation evidence   | Done        |
| 11    | Documentation and examples                          | Done        |
| 12    | QA gates and release verification                   | Done        |

Execution policy:

1. Update this file after every meaningful implementation slice.
2. Record validation commands and outcomes before marking a phase done.
3. Do not mark a phase done until its exit gates pass or a specific exception is recorded.
4. Preserve unrelated dirty files unless explicitly instructed otherwise.

## 5. Phase 0: Tracker Rewrite and Baseline Audit

### Objective

Replace the old UI migration tracker with the files-platform execution tracker and record the media/files coupling baseline.

### Step Tracker

| Step | Task                                                   | Status | Evidence                                     | Notes                                                  |
| ---- | ------------------------------------------------------ | ------ | -------------------------------------------- | ------------------------------------------------------ |
| 1    | Inspect current worktree and existing plan             | Done   | `git status --short`, `current-plan.md` read | Unrelated dirty docs are present and must be preserved |
| 2    | Record current media coupling baseline                 | Done   | `rg` and targeted file reads                 | See section 3                                          |
| 3    | Overwrite `current-plan.md` with files rewrite tracker | Done   | `current-plan.md`                            | Replaced old UI migration tracker                      |
| 4    | Record initial validation outcome                      | Done   | Validation log                               | First scaffold/foundation gates passing                |

### Exit Gates

1. `current-plan.md` reflects files platform rewrite.
2. Baseline media coupling is recorded.
3. Next active phase is clear.

### Validation Log

1. PASS: `pnpm install`
2. PASS: `pnpm -F @de100/files-shared type:check`
3. PASS: `pnpm -F @de100/files-server type:check`
4. PASS: `pnpm -F @de100/files-client type:check`
5. PASS: `pnpm -F @de100/files-domains-solidjs type:check`

## 6. Phase 1: Package Scaffold and Workspace Resolution

### Objective

Create the `packages/files` topology and make every package resolvable by workspace tooling.

### Required Changes

1. Add workspace globs:
   - `packages/files/*`
   - `packages/files/domains/*`
2. Create package manifests and tsconfigs for:
   - `@de100/files-shared`
   - `@de100/files-server`
   - `@de100/files-client`
   - `@de100/files-domains-solidjs`
3. Add package exports and import maps.
4. Add minimal package root exports.
5. Add package-resolution smoke coverage.
6. Update app/package dependencies only when a package is actively consumed.

### Step Tracker

| Step | Task                                                            | Status | Evidence                                                             | Notes                                                   |
| ---- | --------------------------------------------------------------- | ------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| 1    | Add workspace discovery for files packages                      | Done   | `pnpm-workspace.yaml`                                                | Added `packages/files/*` and `packages/files/domains/*` |
| 2    | Add container manifests                                         | Done   | `packages/files/package.json`, `packages/files/domains/package.json` | Required for Sherif workspace checks                    |
| 3    | Add package manifests, tsconfigs, Biome configs, Vitest configs | Done   | `packages/files/**`                                                  | Four package workspaces created                         |
| 4    | Add root exports                                                | Done   | `src/index.ts` files                                                 | Minimal exports in all packages                         |
| 5    | Refresh workspace links and lockfile                            | Done   | `pnpm install`                                                       | Sherif clean after adding containers                    |

### Exit Gates

1. `pnpm install`
2. `pnpm -F @de100/files-shared type:check`
3. `pnpm -F @de100/files-server type:check`
4. `pnpm -F @de100/files-client type:check`
5. `pnpm -F @de100/files-domains-solidjs type:check`

### Validation Log

1. PASS: `pnpm install`
2. PASS: `pnpm -F @de100/files-shared type:check`
3. PASS: `pnpm -F @de100/files-server type:check`
4. PASS: `pnpm -F @de100/files-client type:check`
5. PASS: `pnpm -F @de100/files-domains-solidjs type:check`
6. PASS: `pnpm -F @de100/files-shared format-and-lint:check`
7. PASS: `pnpm -F @de100/files-server format-and-lint:check`
8. PASS: `pnpm -F @de100/files-client format-and-lint:check`
9. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check`

## 7. Phase 2: Shared Contracts and Schemas

### Objective

Create the framework-agnostic contract layer used by server, client, domain packages, and LMS app code.

### Required Changes

1. Define branded IDs, route slugs, file kinds, visibility/access modes, upload modes, provider modes, statuses, and processing job states.
2. Implement size and time parsing helpers.
3. Implement file route config types inspired by UploadThing but adapted to this platform.
4. Implement provider config discriminated unions for local, S3-compatible profiles, built-in provider APIs, and custom adapters.
5. Implement Zod schemas and inferred types.
6. Implement normalized error codes.

### Progress Log

1. Done: added file kind, visibility, status, upload session status, processing job status, transport, and Uppy plugin constants.
2. Done: added branded ID helpers.
3. Done: added size and time parsing helpers.
4. Done: added UploadThing-style route config normalization.
5. Done: added provider config discriminated unions for local, S3-compatible profiles, GCS, Azure, and custom adapters.
6. Done: added Zod schemas for file records, upload target input/output, and platform config.
7. Done: added focused tests for size helpers, route config, and provider config.
8. Done: added status transition helpers and transition tests.
9. Done: added deeper schema parsing coverage for upload target input/output and platform config.
10. Phase 2 closure complete: shared contracts, helpers, provider unions, status transitions, and schema parsing coverage are passing.

### Exit Gates

1. Shared typecheck passes.
2. Unit tests cover size/time parsing, route config normalization, provider unions, status transitions, and schema parsing.

### Validation Log

1. PASS: `pnpm -F @de100/files-shared type:check`
2. PASS: `pnpm -F @de100/files-shared test`
3. PASS: `pnpm -F @de100/files-shared format-and-lint:check`
4. PASS: `pnpm -F @de100/files-shared type:check` after status transition/schema coverage updates
5. PASS: `pnpm -F @de100/files-shared test` after status transition/schema coverage updates
6. PASS: `pnpm -F @de100/files-shared format-and-lint:check` after status transition/schema coverage updates

## 8. Phase 3: Server Core, Providers, Temp Files, Signed Access

### Objective

Move reusable server storage and signing behavior into `@de100/files-server`.

### Required Changes

1. Implement storage provider interface.
2. Implement local storage adapter.
3. Implement S3-compatible adapter and provider profiles for AWS S3, R2, MinIO, DigitalOcean Spaces, Wasabi, and compatible custom endpoints.
4. Add custom adapter interface.
5. Add upload target creation for server proxy, presigned PUT, multipart, Tus, and custom targets.
6. Add temp-file utilities and cleanup contracts.
7. Add signed access token utilities.
8. Add object response helpers.
9. Add app-injected operation interfaces for persistence, auth, roles, sessions, parts, variants, jobs, and callbacks.

### Progress Log

1. Done: added app-injected operations interfaces for context, files, sessions, and upload target creation.
2. Done: added route builder foundation with `.input()`, `.middleware()`, `.onUploadError()`, and `.onUploadComplete()`.
3. Done: added router config extraction.
4. Done: added storage provider interface.
5. Done: added local storage adapter.
6. Done: added S3-compatible provider foundation for get, put, delete, bucket names, and public URLs.
7. Done: added custom provider injection path.
8. Done: added signed access token issue/verify utilities.
9. Done: added object response helper.
10. Done: added processing pipeline stage interface and runner foundation.
11. Done: added concrete upload target creation for XHR/server proxy and Tus through deterministic server-relative routes.
12. Done: added S3 presigned PUT target creation through `@aws-sdk/s3-request-presigner`.
13. Done: added S3 multipart upload initiation and upload ID target fields.
14. Done: added custom adapter injection coverage.
15. Done: added temp-file utilities with cleanup contracts.
16. Done: added object response tests for public metadata and private no-store behavior.
17. Phase 3 closure complete: server core, provider targets, temp files, signed access, and object response behavior are passing.

### Exit Gates

1. Server typecheck passes.
2. Provider contract tests pass for local, S3-compatible config, and custom adapter modes.
3. Signed access and object response tests pass.

### Validation Log

1. PASS: `pnpm -F @de100/files-server type:check`
2. PASS: `pnpm -F @de100/files-server test`
3. PASS: `pnpm -F @de100/files-server format-and-lint:check`
4. PASS: `pnpm -F @de100/files-server type:check` after upload target/temp utility updates
5. PASS: `pnpm -F @de100/files-server test` after upload target/temp utility updates
6. PASS: `pnpm -F @de100/files-server format-and-lint:check` after upload target/temp utility updates

## 9. Phase 4: Fresh LMS Files Schema and Repositories

### Objective

Add fresh Drizzle-backed files persistence for LMS and wire it to the package interfaces.

### Required Changes

1. Add fresh files tables:
   - `files`
   - `file_upload_sessions`
   - `file_upload_parts`
   - `file_variants`
   - `file_processing_jobs`
2. Add LMS repository adapter implementing package persistence interfaces.
3. Keep old media schema untouched but unused.
4. Add app env projection for files config while removing media config in adoption phase.

### Execution Order

1. Inspect the current LMS DB schema/index naming and migration-generation conventions.
2. Add fresh file enums and tables with no media aliases:
   - `files`
   - `file_upload_sessions`
   - `file_upload_parts`
   - `file_variants`
   - `file_processing_jobs`
3. Add schema relations and exports.
4. Add repository adapter code that implements `@de100/files-server` operation interfaces.
5. Add repository contract tests using the LMS test DB pattern.
6. Update `current-plan.md` with validation results before moving to Phase 5 completion work.

### Progress Log

1. Done: added fresh `files`, `file_upload_sessions`, `file_upload_parts`, `file_variants`, and `file_processing_jobs` schema.
2. Done: added fresh file enums and indexes with no media aliases.
3. Done: added schema relations and DB exports.
4. Done: generated `0002_cloudy_mentor.sql` migration and metadata.
5. Done: added LMS API repository adapters for files, sessions, parts, variants, and processing jobs.
6. Done: extended `@de100/files-server` operation interfaces for parts, variants, and processing jobs.
7. Done: added repository serializer contract tests.
8. Phase 4 closure complete: DB schema/migration and repository adapters are passing.

### Exit Gates

1. LMS DB typecheck passes.
2. Repository contract tests pass.

### Validation Log

1. PASS: `pnpm install` after adding LMS DB/API package dependencies
2. PASS: `pnpm -F @de100/apps-lms-db db:generate`
3. PASS: `pnpm -F @de100/apps-lms-db type:check`
4. PASS: `pnpm -F @de100/apps-lms-db test`
5. PASS: `pnpm -F @de100/apps-lms-db format-and-lint:check`
6. PASS: `pnpm -F @de100/apps-lms-api type:check`
7. PASS: `pnpm -F @de100/apps-lms-api test`
8. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
9. PASS: `pnpm -F @de100/files-server type:check` after operation interface expansion
10. PASS: `pnpm -F @de100/files-server test` after operation interface expansion
11. PASS: `pnpm -F @de100/files-server format-and-lint:check` after operation interface expansion

## 10. Phase 5: oRPC Integration and LMS `orpc.files.*`

### Objective

Expose the primary files platform API through oRPC, including typed metadata/control operations, direct `File`/`Blob` upload/download procedures, and event-streamed progress/status procedures.

### Required Changes

1. Add `@de100/files-server/orpc` procedure factory for both control and direct transfer procedures.
2. Add route builder APIs:
   - `createFilesRouter`
   - typed route config
   - `.input()`
   - `.middleware()`
   - `.onUploadComplete()`
   - `.onUploadError()`
3. Add LMS files router with app-owned auth, role policies, metadata, and callbacks.
4. Add `orpc.files.*` operations for config, direct upload, direct download, upload target creation, completion, abort, list, get, delete, signed access, sessions, variants, and processing jobs.
5. Add event iterator procedures for upload/session/progress/job updates.
6. Add direct transfer policy:
   - default direct upload max: 25 MB
   - app and route configs may lower the limit
   - raising the limit requires explicit app review because native oRPC upload is not resumable/chunked
   - direct oRPC transfer only for non-resumable flows
   - large video/audio routes default to resumable or provider-native targets, not direct oRPC upload
   - large/resumable/provider-native flows receive upload targets for Phase 8 HTTP compatibility/protocol routes
7. Implement both public and private direct oRPC upload/download procedures for DX evaluation.
8. Add body-parser extension where needed to avoid loading supported direct uploads entirely into memory.

### Progress Log

1. Done: added `@de100/files-server/orpc` export.
2. Done: added `createFilesOrpcHandlers` foundation for app-injected context and repository operations.
3. Updated: Phase 5 now treats oRPC as the primary files API, including direct `File`/`Blob` transfer and Event Iterator progress procedures.
4. Done: added shared transfer policy for direct oRPC vs upload target mode selection, with 25 MB default direct limit and large video/audio target fallback.
5. Done: expanded `createFilesOrpcHandlers` with direct upload, direct download, upload-mode resolution, and event iterator fallback handlers.
6. Done: added LMS files storage adapter, LMS files oRPC handler factory, and `filesRouter` registered as `orpc.files.*`.
7. Done: added protected direct upload and target creation procedures; public get/list/direct download/upload-mode procedures.
8. Done: added focused tests for transfer policy, server oRPC handlers, LMS upload-mode policy, and removed the low-value router exposure test.
9. Done: added completion, abort, config, signed access, upload-session, part, variant, and processing-job procedures to `createFilesOrpcHandlers` and `orpc.files.*`.
10. Done: added a reusable in-memory files event bus and wired LMS upload/processing watch procedures to real async sources.
11. Done: kept direct oRPC upload/download on `orpc.files.*`; plain HTTP direct/range routes stay deferred to Phase 8 compatibility work.
12. Done: direct oRPC upload uses the 25 MB scalable default and rejects resumable/large flows so video/audio can route to Tus/S3/provider-native targets.
13. Done: body-parser extension is not required for the current native oRPC `File`/`Blob` path under the 25 MB default; raising direct limits remains an explicit app review item.

### Phase 5 DX Notes

1. Direct oRPC upload has the best first-party type surface for small public/private files: one procedure, typed metadata, and a normal `File` payload.
2. Direct oRPC download is clean for clients using `RPCLink`, but browser/media playback still needs Phase 8 HTTP routes for range requests, CDN/cache behavior, and external tool compatibility.
3. Public upload means authenticated upload with `visibility: "public"` in this phase. Anonymous public upload is intentionally not added until a route requires it.
4. Private reads rely on repository visibility checks; signed access is protected and issues `/api/files/signed/*` URLs for Phase 8 HTTP delivery.
5. Event Iterator streaming works well for control/status updates, but it does not replace resumable binary upload protocols.

### Execution Order

1. Update `createFilesOrpcHandlers` to cover config, direct upload, direct download, target creation, completion, abort, list, get, delete, signed access, sessions, variants, and jobs.
2. Add oRPC transfer contracts for:
   - `files.uploadDirect`: accepts `File`/`Blob` plus metadata and route slug
   - `files.downloadDirect`: returns `File`/`Blob` plus headers/metadata where supported by the active link
   - `files.watchUpload`: Event Iterator for upload/session progress
   - `files.watchProcessing`: Event Iterator for processing/variant/job progress
3. Add direct transfer limit and mode selection so clients choose direct oRPC transfer only when the file is at or below 25 MB by default, within route/app limits, and resumability is not required.
4. Add file-kind-aware route examples for image, video, audio, document, and generic files.
5. Add LMS files route config and app-owned auth/context creation.
6. Wire `createLmsFilesRepositories` into LMS API operations.
7. Add `filesRouter` under the API routers and expose it as `orpc.files.*`.
8. Add public/private/role-gated oRPC tests plus direct upload/download and event iterator tests.
9. Record oRPC DX findings for public/private upload and download before the Phase 8 comparison.
10. Re-run LMS API typecheck/tests/lint before closing Phase 5.

### Exit Gates

1. LMS API typecheck passes.
2. oRPC procedure tests pass for public/private/role-gated contexts.
3. Direct oRPC upload/download tests pass for supported `File`/`Blob` flows.
4. Event Iterator progress/status tests pass.
5. Tests prove large/resumable flows are routed to compatibility/protocol targets instead of direct oRPC transfer.
6. DX notes are recorded for public/private direct oRPC upload and download.
7. Video/audio route tests prove large media chooses resumable/provider-native transport by default.

### Validation Log

1. PASS: `pnpm install` after API files dependency updates
2. PASS: `pnpm -F @de100/files-shared type:check`
3. PASS: `pnpm -F @de100/files-shared test`
4. PASS: `pnpm -F @de100/files-shared format-and-lint:check`
5. PASS: `pnpm -F @de100/files-server type:check`
6. PASS: `pnpm -F @de100/files-server test`
7. PASS: `pnpm -F @de100/files-server format-and-lint:check`
8. PASS: `pnpm -F @de100/apps-lms-api type:check`
9. PASS: `pnpm -F @de100/apps-lms-api test`
10. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
11. PASS: `pnpm -F @de100/apps-lms-web type:check`
12. PASS: `pnpm -F @de100/files-server type:check` after Phase 5 completion/control procedures
13. PASS: `pnpm -F @de100/files-server test` after Phase 5 completion/control procedures
14. PASS: `pnpm -F @de100/files-server format-and-lint:check` after Phase 5 completion/control procedures
15. PASS: `pnpm -F @de100/apps-lms-api type:check` after expanded `orpc.files.*`
16. PASS: `pnpm -F @de100/apps-lms-api test` after expanded `orpc.files.*`
17. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check` after expanded `orpc.files.*`
18. PASS: `pnpm -F @de100/apps-lms-web type:check` after expanded `AppRouter`

## 11. Phase 6: Uppy Client Runtime and Plugin Registry

### Objective

Create the framework-agnostic client uploader and lazy Uppy integration platform.

### Required Changes

1. Move reusable uploader runtime concepts out of `@de100/ui-domains-solidjs` into `@de100/files-client`.
2. Add typed helper generation from file router types.
3. Add plugin registry with lazy imports for:
   - Dashboard
   - DragDrop
   - DropTarget
   - FileInput
   - StatusBar
   - Informer
   - Webcam
   - Audio
   - ScreenCapture
   - ImageEditor
   - Compressor
   - ThumbnailGenerator
   - GoldenRetriever
   - RemoteSources/Companion
   - XHRUpload
   - Tus
   - AwsS3
   - Transloadit
4. Support pause, resume, retry, cancel, persistence, and progress aggregation.
5. Add media-kind-aware transport selection:
   - small image/document/audio/video files may use direct oRPC when within policy
   - large video/audio files default to Tus, S3 multipart, or provider-native resumable paths
   - route config can force or disable transports by media kind
6. Test enabled and disabled optional dependency paths.

### Progress Log

1. Done: added `@de100/files-client` package and root exports.
2. Done: added framework-agnostic `createFilesClient` helper with upload target requests.
3. Done: added Uppy plugin registry covering the planned plugin set.
4. Done: added lazy plugin loader with optional dependency error handling.
5. Done: added tests for enabled and disabled plugin import paths.
6. Done: reconciled `@de100/files-client` with the Phase 5 oRPC surface through config, mode resolution, direct RPC adapter hooks, completion, abort, signed access, and event-stream adapter hooks.
7. Done: added typed route helpers for route-slug-safe client wrappers.
8. Done: added queue runtime with target/direct transfer orchestration, aggregate progress, persistence hooks, retry, pause, cancel, and abort-session behavior.
9. Done: added default fetch-backed target transport executors for XHR/S3/custom target flows.
10. Done: added Uppy-compatible plugin installation and plugin-backed transport executor for Tus, AwsS3, XHRUpload, Companion, and Transloadit.
11. Done: added focused client tests for direct oRPC selection, large video target transport, queue persistence, cancel/abort, Uppy plugin installation, transport-plugin mapping, and plugin-backed execution.
12. Done: client/domain typecheck, tests, and lint passed after the runtime updates.
13. Phase 6 closure complete: client runtime orchestration, lazy Uppy execution hooks, persistence hooks, pause/resume/retry/cancel, route helpers, and large media target-routing coverage are passing.

### Execution Order

1. Reconcile `@de100/files-client` against the completed Phase 5 oRPC surface: config, mode resolution, direct upload/download, upload target creation, completion, abort, signed access, and watch streams.
2. Add typed client helpers that keep route slug, visibility, metadata, and transfer mode decisions aligned with `orpc.files.config` and `resolveUploadMode`.
3. Implement Uppy runtime orchestration:
   - direct oRPC upload helper for allowed small files
   - XHR target execution
   - Tus target execution
   - S3/AwsS3 target execution surface for Phase 8 routes
   - Companion/Transloadit opt-in loader paths
4. Add queue persistence, retry, pause/resume, cancel/abort, and progress aggregation using package-level abstractions.
5. Add large video/audio policy coverage proving default selection moves to Tus/S3 multipart/provider-native targets instead of oRPC direct upload.
6. Keep tests focused on runtime decisions, lazy optional dependency behavior, and adapter contract invariants; do not add import-only tests.
7. Update `current-plan.md` after each runtime slice and close Phase 6 only after client typecheck/test/lint pass.

### Exit Gates

1. Client typecheck passes.
2. Uppy mode and lazy optionality tests pass.

### Validation Log

1. PASS: `pnpm -F @de100/files-client type:check`
2. PASS: `pnpm -F @de100/files-client test`
3. PASS: `pnpm -F @de100/files-client format-and-lint:check`
4. PASS: `pnpm -F @de100/files-client type:check` after runtime orchestration updates
5. PASS: `pnpm -F @de100/files-client test` after runtime orchestration updates
6. PASS: `pnpm -F @de100/files-client format-and-lint:check` after runtime orchestration updates
7. PASS: `pnpm -F @de100/files-domains-solidjs type:check` after client contract expansion
8. PASS: `pnpm -F @de100/files-domains-solidjs test` after client contract expansion
9. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check` after client contract expansion
10. PASS: `pnpm -F @de100/apps-lms-web type:check` after files client runtime updates

## 12. Phase 7: Solid Files Domain Components and Hooks

### Objective

Create Solid-specific files UI and hooks without tying core package logic to Solid.

### Required Changes

1. Add generated Solid helpers.
2. Add `useFileUploader`.
3. Add uploader/dropzone/dashboard/upload button components.
4. Add file list/gallery/progress/cancel/retry/resume components.
5. Preserve accessibility, i18n override support, responsive states, and route-config-aware validation.

### Progress Log

1. Done: added `@de100/files-domains-solidjs` package and root/client exports.
2. Done: added `createFileUploaderController` with queue, upload, cancel, and clear-completed behavior.
3. Done: added initial `FileUploader` Solid component shell.
4. Done: added controller test using an injected files client.
5. Done: reconciled the Solid controller with `createFilesUploaderRuntime`, including aggregate progress, pause/resume/retry/cancel, clear-completed, persistence hooks, rejections, metadata, visibility, and runtime injection.
6. Done: added Solid route helper wrapper around `createFilesRouteHelpers`.
7. Done: expanded the component set with `FileUploader`, `FilesDropzone`, `FilesDashboard`, `FilesUploadButton`, `FilesProgress`, `FilesList`, and `FilesGallery`.
8. Done: added route-config-aware validation helpers for accept strings, file kind, size, and count restrictions.
9. Done: added i18n override behavior for validation messages and component labels.
10. Done: added keyboard file-picker helper coverage and kept tests behavioral.
11. Phase 7 closure complete: Solid files domain components/hooks are passing typecheck, tests, and lint.

### Execution Order

1. Reconcile the Solid controller against the completed `@de100/files-client` runtime:
   - use `createFilesUploaderRuntime`
   - expose pause/resume/retry/cancel
   - surface aggregate progress and item records/targets
2. Add Solid route helpers that wrap `createFilesRouteHelpers` without coupling the domain package to the LMS app router.
3. Expand components:
   - `FileUploader`
   - `FilesDropzone`
   - `FilesDashboard`
   - `FilesUploadButton`
   - `FilesProgress`
   - `FilesList`
   - `FilesGallery`
4. Add route-config-aware validation props for accepted kinds, size/count limits, and visibility defaults.
5. Add accessibility and i18n override behavior:
   - keyboard file selection
   - dropzone labels/status text
   - progress labels
   - cancel/retry/resume button labels
6. Keep tests behavioral: controller state, keyboard/drop interaction, i18n label overrides, route validation, and cancel/retry/resume actions. Avoid import-only tests.
7. Update `current-plan.md` after each Solid component/runtime slice and close Phase 7 only after Solid domain typecheck/test/lint pass.

### Exit Gates

1. Solid files domain typecheck passes.
2. Component behavior, accessibility, and i18n tests pass.

### Validation Log

1. PASS: `pnpm -F @de100/files-domains-solidjs type:check`
2. PASS: `pnpm -F @de100/files-domains-solidjs test`
3. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check`
4. PASS: `pnpm -F @de100/files-domains-solidjs type:check` after runtime/component expansion
5. PASS: `pnpm -F @de100/files-domains-solidjs test` after runtime/component expansion
6. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check` after runtime/component expansion
7. PASS: `pnpm -F @de100/apps-lms-web type:check` after Solid files domain expansion

## 13. Phase 8: Files Migration, HTTP Routes, and API Approach Lab

### Objective

Finish the active LMS media-to-files migration first, then build HTTP compatibility routes and the initial API approach lab. Phase 9 superseded the original three-way lab by dropping RPC-native as a top-level approach and keeping Hybrid plus HTTP-native.

### Phase 8A: Hard Media-to-Files Migration

Required changes:

1. Replace active `/media` app route usage with `/files`.
2. Replace active `/api/media/*` route usage with `/api/files/*`.
3. Replace active `orpc.media.*` app/API usage with `orpc.files.*`.
4. Replace media i18n keys and UI copy with files keys and copy.
5. Replace app-owned media uploader runtime usage with `@de100/files-client` and `@de100/files-domains-solidjs` usage where practical.
6. Remove `mediaRouter` from the active `appRouter` once files coverage replaces the old surface.
7. Keep fresh `files` schema as the active source of truth. Do not add media compatibility aliases.

Step tracker:

| Step | Task                                      | Status      | Evidence | Notes                                                 |
| ---- | ----------------------------------------- | ----------- | -------- | ----------------------------------------------------- |
| 1    | Update Phase 8 tracker and DX report path | Done        | `current-plan.md`, DX report | Split into 8A-8D                                      |
| 2    | Audit active stale media app/API usage    | Done        | `rg` scans | Active route/page/router media usages identified       |
| 3    | Migrate API/router active files surface   | Done        | `routers/index.ts` | Removed active `mediaRouter`; `orpc.files.*` remains mounted |
| 4    | Migrate LMS web files page and route      | Done        | `/[locale]/files`, `files-page.tsx`, files i18n | `/media` route removed; `/files` uses `orpc.files.*`  |
| 5    | Migrate seed/docs/runtime references      | Done        | seed script, files env/storage/docs | Replaced legacy storage/env bridge with files-native names |
| 6    | Run Phase 8A validation gates             | Done        | validation log, active stale scan | Active source/package docs stale media scans passed |

### Phase 8B: `/api/files/*` HTTP Compatibility Routes

Required changes:

1. Add public, private, signed, variant, and range-aware read routes for CDN/browser/tool compatibility.
2. Add server proxy/XHR upload route for Uppy XHRUpload compatibility.
3. Add Tus route integration or disabled-path contract when the runtime is not configured.
4. Add S3 multipart part-signing/completion routes or mocked provider contract paths.
5. Add Companion and Transloadit disabled-path contracts now; real integrations remain config-gated.
6. Wire routes to files repositories/storage through `@de100/files-server` and LMS auth/context.
7. Use local storage for real route tests and mocks for S3/Tus/Companion/Transloadit protocol-shape tests.

### Phase 8C: API Approach Matrix Lab

Approaches to exercise:

1. HTTP-native:
   - file operations use `/api/files/*` routes for upload/download/control
   - strict mode forbids `orpc.files.*` for file operations
   - stress mode exercises mocked S3/Tus route paths and disabled-path behavior
2. Hybrid:
   - oRPC handles JSON/control operations such as config, target creation, completion, abort, signed access, and metadata
   - HTTP routes handle binary/protocol upload/download/range/resumable paths
   - strict mode proves the protocol boundary is explicit

Historical note: Phase 8 initially tracked Full RPC as an approach. Phase 9 dropped it as a top-level path and retained `orpc-direct` only as a Hybrid small-file capability.

Lab shape:

1. One gated lab shell with Hybrid and HTTP-native pages plus strict, practical, and stress tracks.
2. Generated fixtures plus user-selected files.
3. Forms cover image, video, audio, document, generic file, public/private visibility, signed reads, direct reads, progress, cancel/retry/resume, range playback, disabled provider paths, and mocked S3/Tus-style flows.
4. Product `/files` can exist after migration, but final approach selection stays deferred until matrix results are documented.

### Phase 8D: DX/UX Notes and Browser Evaluation Prep

Required changes:

1. Create and maintain `docs/files-platform-dx-evaluation.md`.
2. Record pros/cons for Hybrid and HTTP-native workflows as each path is implemented.
3. Record typing, streaming/progress, cache/range behavior, auth ergonomics, browser support, testability, operational cost, and user-flow friction.
4. Prepare final browser evaluation:
   - try VSCode integrated browser when available
   - otherwise use Playwright against the matrix lab
   - document the hands-on UX notes in the DX report

### Execution Order

1. Complete Phase 8A before lab work:
   - update tracker and DX report
   - migrate active app/API media usage to files
   - remove active `mediaRouter` after files coverage replaces it
   - validate stale active media usage with targeted `rg`
2. Complete Phase 8B read routes first:
   - public file read
   - private file read
   - signed file read
   - variant read
   - range-aware responses for video/audio playback
3. Complete Phase 8B upload compatibility routes:
   - XHR/server-proxy upload
   - Tus resumable upload
   - S3 multipart part signing and completion
   - provider-native direct target callback shape where needed
4. Add optional integration disabled-path/contract routes:
   - Companion
   - Transloadit
   - provider callbacks/webhooks
5. Build Phase 8C matrix lab after the active files migration and core route paths exist.
6. Add focused tests for migration, public/private/signed/range behavior, XHR target upload, Tus/S3 mocked or disabled-path behavior, matrix mode switching, generated fixtures, and gated lab access.
7. Record DX observations in both this tracker and `docs/files-platform-dx-evaluation.md` as soon as each approach path is usable.
8. Close Phase 8 only after migration, route tests, matrix lab tests, app typecheck, and app build pass.

### DX Evaluation Matrix

| Approach  | Current status                           | Early pros                                                                   | Early cons                                                        | Evidence        |
| --------- | ---------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------- |
| HTTP-native | Routes, lab scaffold, and disabled integration contracts added | Best protocol/tool/browser compatibility | Weaker first-party type surface unless wrapped carefully | `/api/files/*`, variant/range/helper/protocol tests |
| Hybrid | Lab scaffold and target-mode policy tests added | Likely best scalable default for typed control plus binary/protocol delivery | Requires maintaining a clear boundary and two client paths | `/files-lab`, policy tests, browser smoke |

### Phase 8 Progress Notes

1. Done: added `docs/files-platform-dx-evaluation.md` as the separate approach-comparison report.
2. Done: replaced active `/[locale]/media` route with `/[locale]/files`.
3. Done: added `files-page.tsx` using `orpc.files.*` and the `@de100/files-domains-solidjs` uploader.
4. Done: removed the active app-owned media uploader runtime.
5. Done: removed mounted `/api/media/*` route files so they are not compatibility aliases.
6. Done: added `/api/files/*` read routes for public, private, and signed file access with range-aware responses.
7. Done: added `/api/files/*` JSON/control compatibility routes for config, upload-mode, upload targets, completion, delete, signed access, and abort.
8. Done: added `/api/files/upload/{protocol}/{sessionId}` server-proxy upload route for local XHR/Tus-shaped uploads.
9. Done: added initial gated `/files-lab` matrix route, later superseded by Phase 9's `/files-lab/hybrid` and `/files-lab/http` pages.
10. Done: replaced the legacy media storage bridge with files-native storage, env names, seed fixtures, and current-facing docs.
11. Pass: focused active stale scan found no mounted app/API usage of `orpc.media`, `/media`, `/api/media`, `media-page`, or `media-uploader-runtime`.
12. Pass: files route/page/lab changes typecheck, lint, test, and build in the targeted gates below.
13. Done: removed old media API router/storage/signed-access files, DB schema export, and validator package media exports so wildcard package exports no longer expose active media modules.
14. Done: added focused tests for range-aware file responses, server-proxy upload protocol policy, and files lab generated fixture/track policy.
15. Pass: current-facing docs scan found no old `/media`, `/api/media`, `orpc.media`, `APP_LMS_MEDIA_*`, or media doc-path references.
16. Done: renamed the root storage-coupling guard from media to files and wired root lint/check scripts to `pnpm lint:files-storage-coupling`.
17. Done: added explicit disabled integration contract routes for S3 multipart, Companion, and Transloadit under `/api/files/integrations/*`.
18. Done: added `/api/files/{id}/variants/{variant}` as the HTTP variant delivery route; it serves only ready, live variants for files the current request can read.
19. Done: added Playwright browser evaluation coverage for gated `/files-lab` access and authenticated generated-fixture interaction.
20. Pass: Phase 8 focused lint, typecheck, tests, storage-coupling guard, and Playwright browser evaluation passed.

### Phase 8 Closure Notes

1. Active LMS media usage has been hard-migrated to files without media compatibility aliases.
2. HTTP compatibility routes now cover public, private, signed, variant, range-aware reads, JSON/control operations, upload targets, upload completion, abort, delete, signed access, and local XHR/Tus-shaped server-proxy upload.
3. S3 multipart, Companion, and Transloadit have explicit disabled-path contracts for this deployment; real provider implementation remains config-gated and should be revisited after the API approach decision.
4. `/files-lab` exists as the gated comparison surface; Phase 9 split it into Hybrid and HTTP-native workflow pages across strict, practical, and stress tracks.
5. Browser evaluation used Playwright because no VSCode integrated browser tool is available in this execution environment.
6. Phase 9 owns actual processing output: thumbnails, variants, metadata, cleanup, retry, and optional video/audio/image tooling. The Phase 8 variant route is ready to serve those outputs once produced.

### Exit Gates

1. Active LMS app/API usage has migrated from media to files with no media compatibility aliases.
2. Route/helper tests pass for signed, variant-selection, range access, and disabled integration behavior.
3. Enabled/disabled integration tests pass for local XHR/Tus-shaped server-proxy policy plus explicit disabled S3 multipart, Companion, and Transloadit contracts.
4. Matrix lab tests pass for track policy, generated fixtures, gated access, and authenticated browser rendering.
5. DX matrix records current findings for public/private upload/download/read flows across Hybrid and HTTP-native approaches, with final recommendation deferred until Phase 10 product hardening.
6. Large file policy covers video/audio protocol selection and range-aware reads; resumable/provider-native UX remains explicitly disabled or deferred until configured provider work.
7. `docs/files-platform-dx-evaluation.md` exists and contains browser evaluation notes.

## 14. Phase 9: Taxonomy, Planner, Storage Profiles, and Two Labs

### Objective

Drop RPC-native as a top-level approach, replace flat transport terminology with layered files planning, rename storage to a generic S3-compatible model, and split the lab into full Hybrid and HTTP-native paths.

### Required Changes

1. Rename the storage env model:
   - `APP_LMS_FILES_STORAGE_DRIVER=local|s3`
   - `APP_LMS_FILES_S3_PROVIDER=r2|minio|aws|custom`
   - existing R2 deployments become `driver=s3` and `provider=r2`
2. Replace flat `UploadTransport` terminology with layered contracts:
   - API approach: `hybrid` or `http-native`
   - upload protocol: `orpc-direct`, `xhr`, `tus`, `s3-put`, `s3-multipart`, or `custom`
   - delivery strategy: `orpc-blob`, `public-url`, `signed-url`, `private-http-route`, `provider-url`, or `range-http`
   - integration: `companion` or `transloadit`
   - processing mode: `none`, `local-pipeline`, `transloadit-assembly`, or `custom`
3. Add `FilesUploadPlan` and selector policy:
   - project defaults first
   - route overrides second
   - runtime file/backend/capability selection third
   - explicit lab/admin override last
4. Keep `orpc-direct` as a protocol/capability inside Hybrid, not as a top-level approach.
5. Split `/files-lab` into a comparison shell plus:
   - `/files-lab/hybrid`
   - `/files-lab/http`
6. Add optional visible browser scripts:
   - Playwright headed mode
   - Playwright UI mode
7. Add MinIO docs/env examples for local S3-compatible testing without making MinIO mandatory.

### Execution Order

1. Update this tracker and DX report with the two-approach decision.
2. Add shared taxonomy constants, schemas, and upload planner tests.
3. Update server/client package types from `transport` semantics to protocol semantics while preserving field compatibility where needed for current route bodies.
4. Update LMS env parsing and storage helpers from `r2` driver wording to generic `s3` provider wording.
5. Replace current lab policy and routes with Hybrid and HTTP-native lab surfaces.
6. Add MinIO docs/env examples and Playwright headed/UI scripts.
7. Run focused package/app validation and record outcomes here.

### Progress Log

1. Done: tracker updated to make Hybrid the recommended default, HTTP-native the maintained second path, and RPC-native a non-top-level capability.
2. Done: shared taxonomy constants/schemas now separate API approach, upload protocol, delivery strategy, integration, processing mode, and storage backend.
3. Done: shared upload planner selects `orpc-direct`, `xhr`, `tus`, `s3-put`, `s3-multipart`, or `custom` from approach, backend, file size/kind, route policy, processing mode, enabled integrations, and explicit overrides.
4. Done: shared schemas reject `companion`/`transloadit` as upload protocols while accepting them as integrations.
5. Done: server/client/app code now uses protocol naming for upload plans, targets, sessions, tests, and route params.
6. Done: `/files-lab` is a gated comparison shell, with concrete `/files-lab/hybrid` and `/files-lab/http` workflow pages.
7. Done: env templates, storage architecture docs, deployment docs, and infra preflight now use `APP_LMS_FILES_STORAGE_DRIVER=local|s3` plus `APP_LMS_FILES_S3_PROVIDER=r2|minio|aws|custom`.
8. Done: visible browser scripts are available as `test:browser:headed` and `test:browser:ui`.
9. Done: Playwright browser coverage verifies gated `/files-lab`, Hybrid lab controls, HTTP-native lab controls, and generated fixtures.

### Exit Gates

1. Shared taxonomy/planner tests pass.
2. Env parsing supports `local`, `s3+r2`, and `s3+minio`.
3. `companion` and `transloadit` are accepted as integrations and rejected as upload protocols.
4. Hybrid and HTTP-native lab tests pass.
5. Web typecheck/test/build/browser gates pass.
6. Active stale media/env scan passes.

## 15. Phase 10: Processing, Variants, and Recommendation Evidence

### Objective

Implement app-injectable processing and generated variants, then use the Hybrid and HTTP-native labs to produce final recommendation evidence.

### Required Changes

1. Add pipeline stage interfaces:
   - validate
   - magic-number detection
   - scan hook
   - store
   - extract metadata
   - thumbnails
   - variants
   - optimize/transcode
   - complete/error/delete cleanup
2. Add utilities around `sharp`, `file-type`, EXIF metadata, audio metadata, ffmpeg/ffprobe adapters, and temp files.
3. Let LMS inject job handling and persistence operations.
4. Add cleanup and retry behavior.
5. Add file processing contracts for:
   - video metadata extraction
   - video poster/thumbnail variants
   - optional video transcode/optimization hooks
   - audio metadata/waveform or preview hooks where configured
   - image thumbnail/optimization variants
6. Record developer experience:
   - type surface
   - route/procedure discoverability
   - auth ergonomics
   - upload progress/cancel/retry/resume implementation cost
   - provider integration complexity
7. Record user experience:
   - perceived latency
   - progress clarity
   - error recovery
   - video/audio playback and range behavior
   - private/public/signed access clarity
8. Keep Hybrid as the project default and HTTP-native as the full second path.

### Execution Order

1. Phase 10A: add processing contracts and utilities in `@de100/files-shared` and `@de100/files-server`.
2. Phase 10B: wire LMS Drizzle-backed processing jobs into the app-injected pipeline runner.
3. Phase 10C: generate image thumbnails/optimized variants first, then add video poster/metadata contracts before optional transcode work.
4. Phase 10D: expose generated variants through existing `/api/files/{id}/variants/{variant}` delivery.
5. Phase 10E: exercise Hybrid and HTTP-native labs across local-fs and mocked/minio-s3 style policy paths, then record DX/UX notes.

### Progress Log

1. Done: Phase 10A added shared processing contracts, generated variant schemas, a lifecycle-aware server pipeline runner, retry/cleanup behavior, and an optional dependency registry for `file-type`, `sharp`, EXIF, audio metadata, ffmpeg, and ffprobe adapters.
2. Done: Phase 10B expanded the processing job repository contract to persist attempts, input/output, error, and run-after metadata, then wired LMS upload completion through the app-injected runner.
3. Done: Phase 10C added concrete variant paths: `optimized` images use `sharp` when enabled and fall back to a local source-copy variant when optional dependencies are unavailable; video `poster` and audio `waveform` variants use injected ffmpeg-shaped adapters when configured.
4. Done: Phase 10D exposes generated variants through the existing `/api/files/{id}/variants/{variant}` route and the product `/files` page now links generated variants for ready files.
5. Done: Phase 10E validation and recommendation evidence are recorded in `docs/files-platform-dx-evaluation.md`. Hybrid remains the recommended default, while HTTP-native remains the full second path for external and route-first clients.

### Exit Gates

1. Pipeline tests pass for success, failure, retry, and cleanup.
2. LMS processing job integration tests pass.
3. Video/audio metadata and variant pipeline tests pass when optional dependencies are enabled, and disabled-path tests prove lazy optionality.
4. `docs/files-platform-dx-evaluation.md` contains recommendation evidence for Hybrid and HTTP-native.
5. LMS web typecheck, tests, build, and browser lab checks pass.

### Validation Log

1. PASS: `pnpm -F @de100/files-shared type:check`
2. PASS: `pnpm -F @de100/files-shared test`
3. PASS: `pnpm -F @de100/files-server type:check`
4. PASS: `pnpm -F @de100/files-server test`
5. PASS: `pnpm -F @de100/apps-lms-api type:check`
6. PASS: `pnpm -F @de100/apps-lms-api test`
7. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
8. PASS: `pnpm -F @de100/apps-lms-web type:check`
9. PASS: `pnpm -F @de100/apps-lms-web test`
10. PASS: `pnpm -F @de100/apps-lms-web build` with existing esbuild bigint-target warnings
11. PASS: `pnpm -F @de100/apps-lms-web test:browser` with existing esbuild bigint-target warnings; verifies `/en/files-lab`, `/en/files-lab/hybrid`, and `/en/files-lab/http`
12. PASS: `pnpm lint:files-storage-coupling`

## 16. Phase 11: Documentation and Examples

### Objective

Document the new platform in enough detail for future server/client integrations.

### Required Changes

1. Add architecture docs for Hybrid as default and HTTP-native as the maintained second path.
2. Add oRPC integration guide, including `orpc-direct` as a Hybrid small-file capability.
3. Add storage provider guide for `local`, `s3`, `APP_LMS_FILES_S3_PROVIDER`, R2, MinIO, AWS S3, and custom S3-compatible providers.
4. Add Uppy protocol/integration guide:
   - `xhr`, `tus`, `s3-put`, and `s3-multipart` are upload protocols
   - `companion` and `transloadit` are integrations
   - range reads are a delivery strategy
5. Add processing pipeline guide.
6. Add temp files and cleanup guide.
7. Add security guide.
8. Add examples for SolidJS and LMS.
9. Add Hybrid vs HTTP-native DX comparison notes for public/private upload/download.
10. Add future adapter notes for tRPC, Hono, Express, Fastify, Nitro/H3, Workers, React, Vue, Svelte, and other framework domains.

### Execution Order

1. Document the Hybrid default architecture and the maintained HTTP-native path, including where `orpc-direct` fits as a small-file Hybrid capability.
2. Document storage setup for local filesystem, MinIO S3-compatible development, Cloudflare R2, AWS S3, and custom S3-compatible providers.
3. Document upload protocols and integrations separately: `xhr`, `tus`, `s3-put`, `s3-multipart`, `companion`, `transloadit`, range reads, and signed/provider delivery.
4. Document the processing pipeline, optional dependency loading, image/video/audio variant hooks, job lifecycle, retry, and cleanup behavior.
5. Add SolidJS and LMS examples that match the current package exports and product `/files` usage.
6. Run docs/source stale scans for `APP_LMS_MEDIA_*`, `/media`, `/api/media`, `orpc.media`, and old transport wording before moving to Phase 12.

### Progress Log

1. Done: documented and configured the default LMS web dev server for explicit host binding and strict port behavior, so local browser reachability failures are easier to diagnose.
2. Done: updated local setup docs to use `http://127.0.0.1:3000/en` or `http://localhost:3000/en` and to call out sandboxed dev-server network isolation.
3. Done: verified the app after the dev reachability fix with typecheck, lint/format check, unit tests, and production build.
4. Done: targeted current-facing docs/env scan found no active stale `APP_LMS_MEDIA_*`, `/media`, `/api/media`, or `orpc.media` examples outside historical tracker context.
5. Done: added the files platform architecture guide and files platform examples guide, then linked both from the docs index.
6. Done: updated storage and flow docs to describe current Hybrid/HTTP-native behavior, delivery strategies, upload protocols, processing jobs, and generated variant delivery.
7. Done: documented temp-file, cleanup, disabled integration, signed access, owner-scope, and public/private bucket security policy in the files platform architecture guide.
8. Done: final current-facing docs/env stale scan passed, package/app typechecks passed, app lint/format check passed, app tests passed, and app production build passed.
9. Done: Phase 11 is closed and Phase 12 is active.

### Validation Log

1. PASS: `pnpm -F @de100/apps-lms-web type:check` after dev reachability config update.
2. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check` after docs/config updates.
3. PASS: `pnpm -F @de100/apps-lms-web test` after dev reachability docs/config updates.
4. PASS: `pnpm -F @de100/apps-lms-web build` after dev reachability config update, with existing esbuild bigint-target warnings.
5. PASS: targeted current-facing docs/env scan found no active stale media examples in `apps/lms-web/vite.config.ts`, `apps/lms-web/README.md`, `docs/setup/environment.md`, or `.env.example`; remaining matches are historical entries in this tracker.
6. PASS: `pnpm -F @de100/files-shared type:check` after Phase 11 docs/examples pass.
7. PASS: `pnpm -F @de100/files-server type:check` after Phase 11 docs/examples pass.
8. PASS: `pnpm -F @de100/files-client type:check` after Phase 11 docs/examples pass.
9. PASS: `pnpm -F @de100/files-domains-solidjs type:check` after Phase 11 docs/examples pass.
10. PASS: `pnpm -F @de100/apps-lms-web type:check` after Phase 11 docs/examples pass.
11. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check` after Phase 11 docs/examples pass.
12. PASS: `pnpm -F @de100/apps-lms-web test` after Phase 11 docs/examples pass.
13. PASS: `pnpm -F @de100/apps-lms-web build` after Phase 11 docs/examples pass, with existing esbuild bigint-target warnings.
14. PASS: current-facing stale docs/env scan found no active `APP_LMS_MEDIA`, `/api/media`, `orpc.media`, `APP_LMS_FILES_STORAGE_DRIVER=r2`, or `file_upload_transport` references.

### Exit Gates

1. Docs are linked from docs index.
2. Examples match package exports and app usage.
3. Docs stale scan has no active `APP_LMS_MEDIA_*`, `/media`, `/api/media`, or `orpc.media` references.

## 17. Phase 12: QA Gates and Release Verification

### Objective

Run final verification and close the rewrite.

### Required Gates

1. `pnpm -F @de100/files-shared type:check`
2. `pnpm -F @de100/files-shared test`
3. `pnpm -F @de100/files-server type:check`
4. `pnpm -F @de100/files-server test`
5. `pnpm -F @de100/files-client type:check`
6. `pnpm -F @de100/files-client test`
7. `pnpm -F @de100/files-domains-solidjs type:check`
8. `pnpm -F @de100/files-domains-solidjs test`
9. `pnpm -F @de100/apps-lms-api type:check`
10. `pnpm -F @de100/apps-lms-web type:check`
11. `pnpm -F @de100/apps-lms-web test`
12. `pnpm -F @de100/apps-lms-web build`
13. Stale media usage scan.
14. Built app smoke for `/files` and core file routes.
15. Public/private Hybrid vs HTTP-native DX review is complete and final default recommendation is ready for user decision.
16. Hybrid and HTTP-native labs have exercised strict, practical, and stress tracks before final recommendation.
17. Browser evaluation is complete:
    - VSCode integrated browser used if available
    - otherwise Playwright browser test used
    - hands-on notes recorded in `docs/files-platform-dx-evaluation.md`

### Execution Order

1. Run full package gates for files packages:
   - `pnpm -F @de100/files-shared type:check`
   - `pnpm -F @de100/files-shared test`
   - `pnpm -F @de100/files-server type:check`
   - `pnpm -F @de100/files-server test`
   - `pnpm -F @de100/files-client type:check`
   - `pnpm -F @de100/files-client test`
   - `pnpm -F @de100/files-domains-solidjs type:check`
   - `pnpm -F @de100/files-domains-solidjs test`
2. Run LMS gates:
   - `pnpm -F @de100/apps-lms-api type:check`
   - `pnpm -F @de100/apps-lms-api test`
   - `pnpm -F @de100/apps-lms-web type:check`
   - `pnpm -F @de100/apps-lms-web test`
   - `pnpm -F @de100/apps-lms-web build`
3. Run stale scans:
   - active source scan for `APP_LMS_MEDIA`, `/api/media`, `orpc.media`, `media-page`, and `media-uploader`
   - docs/env scan for stale media names, `APP_LMS_FILES_STORAGE_DRIVER=r2`, and old `transport` wording
   - `pnpm lint:files-storage-coupling`
4. Run built app smoke checks:
   - start the built `.output/server/index.mjs`
   - verify `/`, `/en`, `/en/files`, `/en/files-lab`, `/en/files-lab/hybrid`, `/en/files-lab/http`
   - verify core `/api/files/*` config/read/control endpoints where auth allows
5. Run browser evaluation:
   - use VS Code integrated browser if available from the local environment
   - otherwise run `pnpm -F @de100/apps-lms-web test:browser`
   - record hands-on notes in `docs/files-platform-dx-evaluation.md`
6. Produce final release/recommendation notes:
   - Hybrid remains recommended default unless Phase 12 evidence contradicts it
   - HTTP-native remains maintained as the second path
   - list deferred provider-backed Tus, S3 multipart, Companion, Transloadit, and full video transcode work

### Progress Log

1. Done: Phase 12 full package and LMS gates passed.
2. Done: Root `pnpm dev` reachability issue is resolved by the user change to `turbo.json` `dev.persistent = true`; this is the correct Turbo setting for a long-running Vite dev task.
3. Done: stale media/env scans are clean after replacing the final stale seed message that referred to `APP_LMS_FILES_STORAGE_DRIVER=r2`.
4. Done: built app smoke passed for `/`, `/en`, `/en/files`, `/en/files-lab`, `/en/files-lab/hybrid`, `/en/files-lab/http`, `/api/files/config`, and the deterministic disabled S3 multipart integration route.
5. Done with recorded exception: a DB-backed missing-file read probe reached the files route but returned `500` because the configured local/runtime database does not have the fresh `files` table. The release precondition is to run files DB migrations before DB-backed read/control smoke in a target environment.
6. Done: Playwright browser evaluation passed because no VS Code integrated browser tool is available from this execution environment. Visible local runs remain available through `test:browser:headed` and `test:browser:ui`.
7. Done: final recommendation evidence is recorded in `docs/files-platform-dx-evaluation.md`. Hybrid remains the recommended default; HTTP-native remains the maintained second path.

## 18. Validation Log

1. PASS: `pnpm install`
2. PASS: `pnpm -F @de100/files-shared type:check`
3. PASS: `pnpm -F @de100/files-server type:check`
4. PASS: `pnpm -F @de100/files-client type:check`
5. PASS: `pnpm -F @de100/files-domains-solidjs type:check`
6. PASS: `pnpm -F @de100/files-shared test`
7. PASS: `pnpm -F @de100/files-server test`
8. PASS: `pnpm -F @de100/files-client test`
9. PASS: `pnpm -F @de100/files-domains-solidjs test`
10. PASS: `pnpm -F @de100/files-shared format-and-lint:check`
11. PASS: `pnpm -F @de100/files-server format-and-lint:check`
12. PASS: `pnpm -F @de100/files-client format-and-lint:check`
13. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check`
14. PASS: `pnpm -F @de100/files-shared type:check` after Phase 2 closure updates
15. PASS: `pnpm -F @de100/files-shared test` after Phase 2 closure updates
16. PASS: `pnpm -F @de100/files-shared format-and-lint:check` after Phase 2 closure updates
17. PASS: `pnpm install` after adding `@aws-sdk/s3-request-presigner` catalog/dependency
18. PASS: `pnpm -F @de100/files-server type:check` after Phase 3 closure updates
19. PASS: `pnpm -F @de100/files-server test` after Phase 3 closure updates
20. PASS: `pnpm -F @de100/files-server format-and-lint:check` after Phase 3 closure updates
21. PASS: `pnpm install` after Phase 4 LMS dependency updates
22. PASS: `pnpm -F @de100/apps-lms-db db:generate`
23. PASS: `pnpm -F @de100/apps-lms-db type:check`
24. PASS: `pnpm -F @de100/apps-lms-db test`
25. PASS: `pnpm -F @de100/apps-lms-db format-and-lint:check`
26. PASS: `pnpm -F @de100/apps-lms-api type:check`
27. PASS: `pnpm -F @de100/apps-lms-api test`
28. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
29. PASS: `pnpm -F @de100/files-server type:check` after Phase 4 operation interface expansion
30. PASS: `pnpm -F @de100/files-server test` after Phase 4 operation interface expansion
31. PASS: `pnpm -F @de100/files-server format-and-lint:check` after Phase 4 operation interface expansion
32. PASS: `pnpm install` after Phase 5 API files dependency updates
33. PASS: `pnpm -F @de100/files-shared type:check` after transfer policy updates
34. PASS: `pnpm -F @de100/files-shared test` after transfer policy updates
35. PASS: `pnpm -F @de100/files-shared format-and-lint:check` after transfer policy updates
36. PASS: `pnpm -F @de100/files-server type:check` after oRPC direct transfer handler updates
37. PASS: `pnpm -F @de100/files-server test` after oRPC direct transfer handler updates
38. PASS: `pnpm -F @de100/files-server format-and-lint:check` after oRPC direct transfer handler updates
39. PASS: `pnpm -F @de100/apps-lms-api type:check` after `orpc.files.*` wiring
40. PASS: `pnpm -F @de100/apps-lms-api test` after `orpc.files.*` wiring
41. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check` after `orpc.files.*` wiring
42. PASS: `pnpm -F @de100/apps-lms-web type:check` after `AppRouter` files surface update
43. PASS: `pnpm -F @de100/files-server type:check` after Phase 5 completion/control procedures
44. PASS: `pnpm -F @de100/files-server test` after Phase 5 completion/control procedures
45. PASS: `pnpm -F @de100/files-server format-and-lint:check` after Phase 5 completion/control procedures
46. PASS: `pnpm -F @de100/apps-lms-api type:check` after expanded `orpc.files.*`
47. PASS: `pnpm -F @de100/apps-lms-api test` after expanded `orpc.files.*`
48. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check` after expanded `orpc.files.*`
49. PASS: `pnpm -F @de100/apps-lms-web type:check` after expanded `AppRouter`
50. PASS: `pnpm -F @de100/files-client type:check` after Phase 6 runtime orchestration updates
51. PASS: `pnpm -F @de100/files-client test` after Phase 6 runtime orchestration updates
52. PASS: `pnpm -F @de100/files-client format-and-lint:check` after Phase 6 runtime orchestration updates
53. PASS: `pnpm -F @de100/files-domains-solidjs type:check` after files client contract expansion
54. PASS: `pnpm -F @de100/files-domains-solidjs test` after files client contract expansion
55. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check` after files client contract expansion
56. PASS: `pnpm -F @de100/apps-lms-web type:check` after files client runtime updates
57. PASS: `pnpm -F @de100/files-domains-solidjs type:check` after Phase 7 runtime/component expansion
58. PASS: `pnpm -F @de100/files-domains-solidjs test` after Phase 7 runtime/component expansion
59. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check` after Phase 7 runtime/component expansion
60. PASS: `pnpm -F @de100/apps-lms-web type:check` after Phase 7 Solid files domain expansion
61. PASS: `pnpm install` after adding web files package dependencies
62. PASS: `pnpm -F @de100/files-domains-solidjs type:check` after reactive visibility/upload-complete callback
63. PASS: `pnpm -F @de100/apps-lms-api type:check` after removing active `mediaRouter`
64. PASS: `pnpm -F @de100/apps-lms-web type:check` after `/files` and `/files-lab` migration
65. PASS: `pnpm -F @de100/files-domains-solidjs test` after files uploader callback update
66. PASS: `pnpm -F @de100/apps-lms-api test -- src/files-orpc.test.ts src/files-repositories.test.ts`
67. PASS: `pnpm -F @de100/apps-lms-web test -- 'src/routes/[locale]/route-preload.test.ts'`
68. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check`
69. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
70. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/server/files-object-response.test.ts`
71. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check`
72. PASS: `pnpm -F @de100/apps-lms-web type:check`
73. PASS: `pnpm -F @de100/apps-lms-web test`
74. PASS: `pnpm -F @de100/apps-lms-web build` with existing Nitro/esbuild warnings about bigint target and duplicate bundled key
75. PASS: focused active stale media scan for mounted app/API paths returned no matches
76. PASS: `pnpm -F @de100/apps-lms-env type:check` after hard files env rename
77. PASS: `pnpm -F @de100/apps-lms-api type:check` after files-native storage replacement
78. PASS: `pnpm -F @de100/apps-lms-web type:check` after seed/files env cleanup
79. PASS: `pnpm -F @de100/apps-lms-validators type:check` after replacing media shared validator exports with files exports
80. PASS: focused active stale media scan found no old media route/router/storage/schema/env/validator references in active app/API/package source
81. PASS: current-facing docs stale scan found no `/media`, `/api/media`, `orpc.media`, `APP_LMS_MEDIA_*`, or media doc-path references
82. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/files-lab-policy.test.ts src/libs/server/files-upload-transports.test.ts src/libs/server/files-object-response.test.ts`
83. PASS: `pnpm -F @de100/apps-lms-web type:check` after files lab policy/transport tests
84. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:fix` fixed import ordering/formatting
85. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check`
86. PASS: `pnpm -F @de100/apps-lms-api test`
87. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
88. PASS: `pnpm -F @de100/apps-lms-env format-and-lint:check`
89. PASS: `pnpm -F @de100/apps-lms-validators format-and-lint:check`
90. PASS: `pnpm -F @de100/apps-lms-web test`
91. PASS: `pnpm -F @de100/apps-lms-web build` with existing Nitro/esbuild warnings about bigint target and duplicate bundled key
92. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:fix` after disabled integration routes, Playwright config, and variant read route
93. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check`
94. PASS: `pnpm -F @de100/apps-lms-web type:check`
95. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/server/files-object-response.test.ts src/libs/server/files-disabled-integrations.test.ts src/libs/server/files-upload-transports.test.ts src/libs/files-lab-policy.test.ts`
96. PASS: `pnpm lint:files-storage-coupling`
97. PASS: `pnpm -F @de100/apps-lms-web test:browser` with existing build warning about bigint literals targeting es2019
98. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check` after plan/DX updates
99. PASS: `pnpm -F @de100/apps-lms-web type:check` after plan/DX updates
100. PASS: `pnpm -F @de100/apps-lms-web test` after plan/DX updates
101. PASS: active source stale media scan for `orpc.media`, `/media`, `/api/media`, `media-page`, `media-uploader-runtime`, and `APP_LMS_MEDIA` returned no matches
102. PASS: `pnpm -F @de100/files-shared type:check` after Phase 9 taxonomy/planner rewrite
103. PASS: `pnpm -F @de100/files-shared test` after Phase 9 taxonomy/planner rewrite
104. PASS: `pnpm -F @de100/files-server type:check` after Phase 9 protocol/storage target rewrite
105. PASS: `pnpm -F @de100/files-server test` after Phase 9 protocol/storage target rewrite
106. PASS: `pnpm -F @de100/files-client type:check` after Phase 9 protocol executor rewrite
107. PASS: `pnpm -F @de100/files-client test` after Phase 9 protocol executor rewrite
108. PASS: `pnpm -F @de100/files-domains-solidjs type:check` after Phase 9 runtime plan shape update
109. PASS: `pnpm -F @de100/files-domains-solidjs test` after Phase 9 runtime plan shape update
110. PASS: `pnpm -F @de100/apps-lms-env type:check` after Phase 9 generic S3 storage env rewrite
111. PASS: `pnpm -F @de100/apps-lms-api type:check` after Phase 9 protocol/session rewrite
112. PASS: `pnpm -F @de100/apps-lms-api test` after Phase 9 protocol/session rewrite
113. PASS: `pnpm -F @de100/files-client type:check` after renaming protocol executor module
114. PASS: `pnpm -F @de100/files-client test` after renaming protocol executor module
115. PASS: `pnpm -F @de100/apps-lms-web type:check` after Hybrid/HTTP-native lab route split
116. PASS: `pnpm -F @de100/apps-lms-web test -- src/libs/files-lab-policy.test.ts src/libs/server/files-upload-protocols.test.ts` after lab/protocol helper rewrite
117. PASS: current-facing stale media/env scan found no `APP_LMS_MEDIA`, `/media`, `orpc.media`, `media-page`, `media-uploader`, `APP_LMS_FILES_STORAGE_DRIVER=r2`, or `file_upload_transport` references
118. PASS: `pnpm -F @de100/files-shared format-and-lint:check`
119. PASS: `pnpm -F @de100/files-server format-and-lint:check`
120. PASS: `pnpm -F @de100/files-client format-and-lint:check`
121. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check`
122. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
123. PASS: `pnpm -F @de100/apps-lms-env type:check`
124. PASS: `pnpm -F @de100/apps-lms-env format-and-lint:check`
125. PASS: `pnpm -F @de100/apps-lms-validators format-and-lint:check`
126. PASS: `pnpm -F @de100/files-shared type:check`
127. PASS: `pnpm -F @de100/files-shared test`
128. PASS: `pnpm -F @de100/files-server type:check`
129. PASS: `pnpm -F @de100/files-server test`
130. PASS: `pnpm -F @de100/files-client type:check`
131. PASS: `pnpm -F @de100/files-client test`
132. PASS: `pnpm -F @de100/apps-lms-api type:check`
133. PASS: `pnpm -F @de100/apps-lms-api test`
134. PASS: `pnpm -F @de100/apps-lms-web type:check`
135. PASS: `pnpm -F @de100/apps-lms-web test`
136. PASS: `pnpm lint:files-storage-coupling`
137. PASS: `pnpm -F @de100/apps-lms-web build` with existing esbuild bigint-target warnings
138. PASS: `pnpm -F @de100/apps-lms-web test:browser` with existing esbuild bigint-target warnings; verifies `/en/files-lab`, `/en/files-lab/hybrid`, and `/en/files-lab/http`
139. PASS: final current-facing stale media/env scan found no `APP_LMS_MEDIA`, `/media`, `orpc.media`, `media-page`, `media-uploader`, `APP_LMS_FILES_STORAGE_DRIVER=r2`, or `file_upload_transport` references
140. PASS: `pnpm -F @de100/files-shared type:check` after Phase 10 processing contracts
141. PASS: `pnpm -F @de100/files-shared test` after Phase 10 processing contracts
142. PASS: `pnpm -F @de100/files-server type:check` after Phase 10 pipeline runner
143. PASS: `pnpm -F @de100/files-server test` after Phase 10 pipeline runner
144. PASS: `pnpm -F @de100/apps-lms-api type:check` after LMS processing/variant integration
145. PASS: `pnpm -F @de100/apps-lms-api test` after LMS image/video/audio processing integration
146. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check` after LMS processing formatting
147. PASS: `pnpm -F @de100/apps-lms-web type:check` after product variant links
148. PASS: `pnpm -F @de100/apps-lms-web test` after product variant links
149. PASS: `pnpm -F @de100/apps-lms-web build` with existing esbuild bigint-target warnings after Phase 10 closure
150. PASS: `pnpm -F @de100/apps-lms-web test:browser` with existing esbuild bigint-target warnings after Phase 10 closure
151. PASS: `pnpm lint:files-storage-coupling` after Phase 10 closure
152. PASS: `pnpm -F @de100/apps-lms-web type:check` after dev reachability config update
153. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check` after docs/config updates
154. PASS: `pnpm -F @de100/apps-lms-web test` after dev reachability docs/config updates
155. PASS: `pnpm -F @de100/apps-lms-web build` after dev reachability config update, with existing esbuild bigint-target warnings
156. PASS: targeted current-facing docs/env stale scan found no active stale media examples; remaining matches are historical tracker context
157. PASS: `pnpm -F @de100/files-shared type:check` after Phase 11 docs/examples pass
158. PASS: `pnpm -F @de100/files-server type:check` after Phase 11 docs/examples pass
159. PASS: `pnpm -F @de100/files-client type:check` after Phase 11 docs/examples pass
160. PASS: `pnpm -F @de100/files-domains-solidjs type:check` after Phase 11 docs/examples pass
161. PASS: `pnpm -F @de100/apps-lms-web type:check` after Phase 11 docs/examples pass
162. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check` after Phase 11 docs/examples pass
163. PASS: `pnpm -F @de100/apps-lms-web test` after Phase 11 docs/examples pass
164. PASS: `pnpm -F @de100/apps-lms-web build` after Phase 11 docs/examples pass, with existing esbuild bigint-target warnings
165. PASS: current-facing docs/env stale scan found no active `APP_LMS_MEDIA`, `/api/media`, `orpc.media`, `APP_LMS_FILES_STORAGE_DRIVER=r2`, or `file_upload_transport` references
166. PASS: `pnpm -F @de100/files-shared type:check` during Phase 12 final package gates
167. PASS: `pnpm -F @de100/files-shared test` during Phase 12 final package gates
168. PASS: `pnpm -F @de100/files-server type:check` during Phase 12 final package gates
169. PASS: `pnpm -F @de100/files-server test` during Phase 12 final package gates
170. PASS: `pnpm -F @de100/files-client type:check` during Phase 12 final package gates
171. PASS: `pnpm -F @de100/files-client test` during Phase 12 final package gates
172. PASS: `pnpm -F @de100/files-domains-solidjs type:check` during Phase 12 final package gates
173. PASS: `pnpm -F @de100/files-domains-solidjs test` during Phase 12 final package gates
174. PASS: `pnpm -F @de100/apps-lms-api type:check` during Phase 12 final LMS gates
175. PASS: `pnpm -F @de100/apps-lms-api test` during Phase 12 final LMS gates
176. PASS: `pnpm -F @de100/apps-lms-web type:check` after final seed stale-message cleanup
177. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check` after final seed stale-message cleanup
178. PASS: `pnpm -F @de100/apps-lms-web test` after final seed stale-message cleanup
179. PASS: `pnpm lint:files-storage-coupling` during Phase 12 final scans
180. PASS: final stale scan for `APP_LMS_MEDIA`, `/api/media`, `orpc.media`, `media-page`, `media-uploader`, `APP_LMS_FILES_STORAGE_DRIVER=r2`, and `file_upload_transport` returned no matches
181. PASS: `pnpm -F @de100/apps-lms-web build` after final seed stale-message cleanup, with existing esbuild bigint-target warnings
182. PASS: built smoke via host-level curl returned `/` 307, `/en` 200, `/en/files` 200, `/en/files-lab` 200, `/en/files-lab/hybrid` 200, `/en/files-lab/http` 200, `/api/files/config` 200, and `/api/files/integrations/s3-multipart` 501 as expected for a disabled integration
183. PASS with release precondition: `/api/files/missing-file-id` reached the DB-backed files route but returned 500 because the configured local/runtime database does not have the fresh `files` table; run files DB migrations before DB-backed route smoke in target environments
184. PASS: `pnpm -F @de100/apps-lms-web test:browser` with existing esbuild bigint-target warnings; Chromium verified unauthenticated lab gating and authenticated lab shell, Hybrid page, and HTTP-native page
185. PASS: `pnpm -F @de100/files-shared format-and-lint:check` during Phase 12 final formatting/lint pass
186. PASS: `pnpm -F @de100/files-server format-and-lint:check` during Phase 12 final formatting/lint pass
187. PASS: `pnpm -F @de100/files-client format-and-lint:check` during Phase 12 final formatting/lint pass
188. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check` during Phase 12 final formatting/lint pass
189. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check` during Phase 12 final formatting/lint pass
190. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:fix` formatted generated Playwright `test-results/.last-run.json`
191. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:check` after final tracker/DX updates
192. PASS: final active source/docs/env stale scan returned no matches outside the historical tracker
193. PASS: added app-level ignore rules for Playwright `test-results`/`playwright-report`, removed generated test output, and reran `pnpm -F @de100/apps-lms-web format-and-lint:check`

## 19. References

1. Local UploadThing clone: `_ignore/uploadthing`
2. UploadThing file router, server adapters, client helpers, and Solid package source.
3. Uppy docs and plugins.
4. Tus resumable upload docs and server implementations.
5. Pushduck, EdgeStore, and UploadKit ecosystem patterns.
6. AWS S3 presigning docs.
7. `sharp`
8. `file-type`
9. EXIF, audio metadata, and ffmpeg/ffprobe ecosystem docs.
10. oRPC File Upload and Download docs: `https://orpc.dev/docs/file-upload-download`
11. oRPC RPC Handler docs: `https://orpc.dev/docs/rpc-handler`
12. oRPC RPC Protocol docs: `https://orpc.dev/docs/advanced/rpc-protocol`
13. oRPC Event Iterator docs: `https://orpc.dev/docs/event-iterator`
14. oRPC OpenAPI Handler/OpenAPILink docs for handler/link-specific binary and stream limitations.
