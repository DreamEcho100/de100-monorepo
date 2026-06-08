# Current Plan: Video-Ready Files Platform

Last updated: 2026-06-08

Current active phase: Phase 13 - Provider-backed live smoke follow-up

Archived previous tracker:

- `docs/archive/current-plan-files-platform-rewrite-2026-06-06.md`

## 1. Purpose

This tracker replaces the completed files-platform rewrite tracker. The next goal is to make the files platform video-ready for LMS course content while keeping the packages general and app-injected.

The core transcript insight is locked: large course videos should not rely on raw MP4 playback as the main delivery model. The product default is HLS artifact groups stored in R2/MinIO, produced by ffmpeg-capable workers, and delivered through signed playback sessions.

## 2. Locked Decisions

1. Hybrid remains the recommended API approach:
   - oRPC owns typed control, status, upload planning, completion, signed access, and events.
   - HTTP/provider routes own large byte transfer, range reads, HLS manifests/segments, and external protocol compatibility.
2. HTTP-native remains a maintained second path.
3. Course video upload default is S3 multipart to MinIO/R2.
4. Processing default is storage-first:
   - original upload lands in storage
   - worker reads original
   - worker writes processed artifacts to storage
   - app persists artifact/job/playback records
5. Local pre-process is also supported as an admin/lab workflow.
6. R2 remote and MinIO local are primary storage targets.
7. Production storage should use separate public/private storage profiles.
8. Primary playback output is HLS plus poster.
9. HLS output is modeled as artifact groups and artifacts, not only `file_variants`.
10. `file_variants` remains for simple single-file outputs such as optimized images, thumbnails, poster-only, and waveform.
11. Signed HLS playback session token is the main private-video delivery strategy.
12. App proxy, public-path gating, per-object signed URLs, and signed cookies are documented alternate delivery adapters.
13. Product player default is native `<video>` plus lazy `hls.js`.
14. Lab prototypes compare package player, helper-only app player, and external-player integration.
15. Main protection posture is signed access only.
16. HLS AES-128 encryption is a working MVP prototype.
17. DRM prototypes are separate follow-up slices:

- self-owned R2/Shaka-style path
- Cloudflare Stream managed path
- docs for Mux, Bunny, and other providers

18. Processing is split into domain addon packages:

- `@de100/files-processing-image`
- `@de100/files-processing-video`
- `@de100/files-processing-audio`
- `@de100/files-processing-document`

19. Heavy processors live in addon packages, not core files packages.
20. ffmpeg default policy:

- prefer a maintained typed wrapper only after audit
- provide typed CLI runner proof of concept
- provide browser/WASM proof of concept for admin/lab workflows
- do not use `fluent-ffmpeg` as a default candidate because it is deprecated

21. LMS gets a dedicated files worker package/process.
22. Files package exposes explicit adapter interfaces. LMS injects DB, auth, entitlements, queues, storage, telemetry, and worker transport.
23. Queue adapters:

- Redis recommended
- DB polling fallback

24. MVP course integration is in scope:

- course, chapter, lesson, video asset, enrollment, preview/private playback
- enrolled users and admins can access private lessons
- preview lessons are readable by policy

25. Course-video route accepts MP4, MOV, WebM, and MKV initially.
26. Course-video balanced defaults:

- 2 GB max file size
- 2 hour max duration
- 480p, 720p, 1080p default ladder
- skip renditions above source
- local worker concurrency 1

27. Original retention is configurable per route. Course-video default keeps originals.
28. Captions:

- manual VTT support is core
- auto-captioning is an adapter interface and docs first

29. QoE analytics are in scope through DB events plus telemetry hooks.
30. Current files DB migrations may be squashed because there is no important DB data yet. Reset/migrate docs must be explicit.

## 3. Phase Board

Status legend: Not Started, In Progress, Done, Blocked, Paused.

| Phase | Name                                                       | Status      |
| ----- | ---------------------------------------------------------- | ----------- |
| 1     | Roadmap reset and foundation contracts                     | Done        |
| 2     | Squashed DB schema: artifacts, courses, captions, QoE      | Done        |
| 3     | Core package deepening: artifacts, HLS, workers, telemetry | Done        |
| 4     | Processing addon package topology                          | Done        |
| 5     | LMS files worker with Redis and DB-polling adapters        | Done        |
| 6     | HLS processing and storage-first artifact writer           | Done        |
| 7     | MinIO/R2 upload defaults and S3 multipart course uploads   | Done        |
| 8     | Course admin/product integration and gated labs            | Done        |
| 9     | Player prototypes, captions, QoE, browser evaluation       | Done        |
| 10    | HLS encryption and DRM prototypes                          | Done        |
| 11    | Docs, deployment guides, provider comparisons              | Done        |
| 12    | Final QA gates and DX/UX recommendation evidence           | Done        |
| 13    | Provider-backed MinIO/R2/live media smoke                  | Blocked     |

## 4. Phase 1: Roadmap Reset and Foundation Contracts

### Objective

Archive the completed files rewrite tracker, rewrite this roadmap, and add package-level foundation contracts so later phases can implement HLS/course/video work without inventing names or one-off app seams.

### Step Tracker

| Step | Task                                                  | Status | Evidence                                                                                                                      |
| ---- | ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1    | Archive previous `current-plan.md`                    | Done   | `docs/archive/current-plan-files-platform-rewrite-2026-06-06.md`                                                              |
| 2    | Rewrite `current-plan.md` with video-ready roadmap    | Done   | `current-plan.md`                                                                                                             |
| 3    | Add shared artifact/HLS/analytics contract schemas    | Done   | `packages/files/shared/src/artifacts.ts`, `packages/files/shared/src/analytics.ts`                                            |
| 4    | Add server operation interfaces for artifacts/workers | Done   | `packages/files/server/src/operations.ts`, `packages/files/server/src/worker.ts`, `packages/files/server/src/hls-playback.ts` |
| 5    | Add processing addon package shells                   | Done   | `packages/files/processing-{image,video,audio,document}`                                                                      |
| 6    | Run focused validation gates                          | Done   | Validation log                                                                                                                |

### Exit Gates

1. `pnpm -F @de100/files-shared type:check`
2. `pnpm -F @de100/files-shared test`
3. `pnpm -F @de100/files-server type:check`
4. `pnpm -F @de100/files-server test`
5. `pnpm -F @de100/files-processing-image type:check`
6. `pnpm -F @de100/files-processing-video type:check`
7. `pnpm -F @de100/files-processing-audio type:check`
8. `pnpm -F @de100/files-processing-document type:check`

## 5. Later Phase Details

### Phase 2 - Squashed DB Schema

Status: Done

1. Done: squashed the files/video schema into `0002_cloudy_mentor`.
2. Done: added artifact groups and artifacts for HLS/grouped outputs.
3. Done: added playback sessions for signed HLS access.
4. Done: added caption tracks and QoE playback events.
5. Done: added MVP LMS course tables:
   - courses
   - course chapters
   - course lessons
   - course video assets
   - course enrollments
6. Done: removed generated `0003` migration after folding it into `0002`.
7. Done: added LMS repository adapters/serializers for artifact groups, artifacts, playback sessions, and playback events.
8. Deferred to Phase 11 docs: expanded local/remote reset and migrate guide.

### Phase 3 - Core Package Deepening

Status: Done

Completed scope:

1. Promoted artifact/playback/event contracts from optional repository surfaces to first-class package workflows.
2. Added reusable artifact delivery helpers:
   - readable artifact lookup
   - HLS manifest response policy
   - segment response policy
   - file object response policy
3. Added shared entitlement helpers for file/course/lesson reads without LMS-specific coupling.
4. Added worker queue control helpers around enqueue, retry scheduling, and stale job recovery.
5. Added telemetry fanout helper that can write DB events and call telemetry adapters.
6. Added focused tests for these helpers before any worker/UI implementation.

### Phase 4 - Processing Addons

Status: Done

Completed scope:

1. Inspected the four addon shells and current shared/server processing contracts.
2. Kept shared contracts stable; addon-facing names live in the addon packages until cross-package reuse is proven.
3. Expanded the image addon with responsive rendition, placeholder, EXIF flag, output content-type, thumbnail, and source-aware size planning helpers.
4. Expanded the video addon with HLS TS/fMP4 plan helpers, source-aware ladder selection, poster/caption locations, accepted input detection, and ffmpeg adapter-facing types.
5. Expanded the audio addon with metadata, waveform, preview/transcode, normalization, transcript hook, and dependency planning helpers.
6. Expanded the document addon with PDF processing, preview planning, Office proof-of-concept opt-in, and document-kind detection helpers.
7. Added focused addon tests for runtime decisions that typecheck cannot catch.
8. Ran addon package and global gates before moving to the LMS worker phase.

### Phase 5 - LMS Files Worker

Status: Done

Completed scope:

1. Inspected existing LMS package topology, worker-related scripts, env conventions, DB repository contracts, and queue package choices.
2. Added `@de100/apps-lms-worker` as the dedicated LMS files worker package/process.
3. Added worker config parsing for local development defaults:
   - local worker concurrency 1
   - Redis queue when configured
   - DB-polling fallback when Redis is not configured
4. Added Redis queue adapter behind an injected client boundary.
5. Added DB-polling queue adapter using existing Drizzle-backed files job tables.
6. Wired worker job execution to injected LMS files operations and existing processing pipeline entrypoint.
7. Added worker oRPC prototypes:
   - internal-only
   - admin-browser limited namespace
   - public namespace lab prototype
8. Documented the production recommendation as internal-only in code-level policy.
9. Added focused tests for queue selection, enqueue/dequeue/ack/fail behavior, worker execution success/failure, and oRPC namespace capability policy.
10. Ran worker, API, env, DB, and global gates before moving to Phase 6 HLS processing.

### Phase 6 - HLS Processing

Status: Done

Completed scope:

1. Reconciled current video addon helpers, server artifact contracts, LMS storage adapters, and worker runner boundaries.
2. Added reusable HLS planning primitives in `@de100/files-processing-video`:
   - default ladder: 480p, 720p, 1080p
   - source-aware rendition skipping
   - TS output command planning
   - fMP4/CMAF plan shape retained for follow-up support
   - staging and promoted plan conversion
   - generated object validation
   - local pre-process command planning for admin/lab workflows
3. Added deterministic ffmpeg command planning and master manifest generation.
4. Added HLS artifact input creation for:
   - master manifest
   - rendition manifests
   - segments
   - poster
   - metadata
5. Wired the LMS processing pipeline to an opt-in `video-hls` job path that:
   - uses an injected ffmpeg HLS adapter
   - writes staging objects through the LMS storage provider
   - validates required HLS outputs
   - promotes objects to the artifact prefix
   - cleans staging objects
   - persists artifact groups and artifacts
6. Kept normal upload-complete video behavior on the poster variant path until course routing decides when to enqueue `video-hls`.
7. Added focused tests for planner decisions, artifact key layout, staging/promote cleanup, local preprocess planning, and LMS artifact persistence.
8. Ran package/app/global gates before moving to Phase 7 storage/upload defaults.

### Phase 7 - Storage and Upload Defaults

Status: Done

Completed scope:

1. Reconciled files storage env parsing, upload planner defaults, route config shape, and LMS route slugs.
2. Added LMS files route config for `avatar`, `course-video`, `lesson-video`, and `lms-library`.
3. Added route-rule selection by kind, exact MIME type, and MIME wildcard.
4. Added `requiresResumable` to route-rule normalization and public route config output.
5. Wired `createFilesOrpcHandlers` to route-aware policy and storage backend selection.
6. Wired LMS `createUploadTarget` to storage-provider upload target helpers.
7. Added MinIO/R2/S3-compatible upload target helpers:
   - server route targets for `xhr` and `tus`
   - presigned single-part S3 PUT targets
   - multipart S3 init targets with provider upload IDs
8. Made course/lesson video routes default to `s3-multipart` planning/init on MinIO/R2/S3-compatible storage.
9. Preserved local filesystem behavior:
   - small avatar/image flows can use `orpc-direct`
   - local course video uses resumable/server target protocols
10. Added focused tests for route selection, local fallback, MinIO/R2 multipart selection, explicit overrides, and storage target shape.
11. Ran focused package/app checks and global format/lint, typecheck, and test gates.

### Phase 8 - Course Integration and Labs

Status: Done

Completed scope:

1. Reconciled current course DB tables, repositories, file records, artifact groups, playback sessions, route tree, and lab page structure.
2. Added LMS API/repository services for the MVP course model:
   - courses
   - chapters
   - lessons
   - course video assets
   - enrollments
3. Added course video asset attachment flow:
   - accepts uploaded video files from files routes
   - enqueue or record `video-hls` processing job
   - attach video file to the lesson asset
   - preserve original file retention policy
4. Implemented entitlement checks for course playback:
   - preview lesson readable by policy
   - enrolled user readable for private lessons
   - course owner/admin readable
   - unauthorized private lesson denied
5. Added `appRouter.courses`:
   - owner-scoped course/chapter/lesson creation
   - current-user enrollment
   - lesson video attachment
   - signed HLS playback-session creation
6. Added gated and product-shaped web routes:
   - `/files-lab/course-video`
   - `/courses/:courseSlug/:chapterSlug/:lessonSlug`
7. Preserved existing comparison surfaces:
   - Hybrid lab path retained as comparison surface
   - HTTP-native lab path retained as comparison surface
8. Kept player implementation minimal in Phase 8:
   - show HLS/session/artifact data and basic video element placeholder
   - defer `hls.js`, captions, QoE, and player comparison details to Phase 9
9. Added focused tests for:
   - preview/enrolled/admin/unauthorized entitlement outcomes
   - upload-to-asset attachment behavior
   - job enqueue/update behavior
10. Passed focused DB/API/web gates and final global gates.

### Phase 9 - Player, Captions, Analytics, Browser Evaluation

Status: Done

Completed scope:

1. Reconciled Phase 8 course routes, playback-session records, artifact groups, artifact delivery routes, package exports, and player dependencies.
2. Added `hls.js` to `@de100/files-domains-solidjs`.
3. Added server playback-source helpers for signed HLS sessions:
   - token-scoped master manifest URL
   - token-scoped caption track URLs
   - artifact relative-path matching
   - unsafe path rejection
4. Added `/api/files/playback/hls/{token}/{path}` for signed HLS artifact delivery.
5. Added the recommended reusable Solid player:
   - native `<video>` shell
   - native HLS when supported
   - lazy `hls.js` fallback chunk
   - caption tracks
   - QoE events for play, pause, progress, buffering, stalled, complete, errors, and rendition changes
6. Added helper-only and external-adapter prototypes to the course lesson page.
7. Extended `orpc.courses.createPlaybackSession` to return playback-source URLs beside the signed session.
8. Added `orpc.courses.recordPlaybackEvent` for signed-session QoE recording.
9. Added browser coverage for the course-video lab and product lesson shell.
10. Recorded DX/browser notes in `docs/files-platform-dx-evaluation.md`.
11. Deferred intentionally:
    - HLS AES-128 encryption
    - DRM prototypes
    - provider comparison docs
    - deployment guides

Exit gates:

1. `pnpm -F @de100/files-server type:check`
2. `pnpm -F @de100/files-server test`
3. `pnpm -F @de100/apps-lms-api type:check`
4. `pnpm -F @de100/apps-lms-api test`
5. `pnpm -F @de100/apps-lms-web type:check`
6. `pnpm -F @de100/apps-lms-web test`
7. `pnpm -F @de100/apps-lms-web build`
8. Global `pnpm format-and-lint:check`
9. Global `pnpm type:check`
10. Global `pnpm test`

### Phase 10 - Encryption and DRM Prototypes

Status: Done

Completed scope:

1. Reconciled current HLS artifact group model, signed playback route, worker output layout, and player URL contracts.
2. Confirmed no DB schema change was needed for the AES-128 MVP:
   - use `hls-encrypted` artifact groups
   - use `hls-key` artifacts
   - use artifact/group metadata for protection mode and key references
   - use signed playback sessions for key delivery
3. Added shared AES-128 protection contracts:
   - key-reference schema
   - package key URI creation/parsing
   - AES-128 hex normalization
   - DRM prototype descriptor schema
4. Added video processing support for AES-128 HLS:
   - encrypted plan shape
   - ffmpeg key-info command planning
   - key artifact object planning
   - `hls-encrypted` group classification
   - generated output validation for key artifacts
5. Added server HLS protection helpers:
   - manifest key URI rewriting
   - signed key request path parsing
   - key artifact lookup/metadata validation
   - manifest/key artifact classification
6. Wired LMS signed key delivery:
   - `/api/files/playback/hls/{token}/keys/{keyId}` serves key bytes only through valid signed sessions
   - `hls-key` artifacts are blocked from the generic artifact path
   - manifests rewrite package key placeholders into token-scoped key URLs
7. Wired `video-hls-encryption` as an opt-in LMS worker job path using injected ffmpeg adapter key material and key-info details.
8. Updated course playback sessions to inherit `aes-128` from encrypted artifact-group metadata.
9. Added DRM prototype descriptors without coupling core packages to a DRM vendor:
   - self-owned R2/Shaka-style path
   - Cloudflare Stream managed path
   - disabled/prototype descriptor helper
10. Updated DX evidence:
    - signed HLS remains the product default
    - AES-128 is available as a stronger selected-route prototype
    - DRM remains prototype-only until browser, entitlement, and provider evidence exists
11. Browser evidence for AES remains route/unit-level in this phase because a real encrypted media fixture requires ffmpeg/worker/storage smoke. Full visible playback evaluation moves to Phase 12 after Phase 11 documents the setup path.

Exit gates:

1. `pnpm -F @de100/files-shared type:check`
2. `pnpm -F @de100/files-server type:check`
3. `pnpm -F @de100/files-server test`
4. `pnpm -F @de100/files-processing-video type:check`
5. `pnpm -F @de100/files-processing-video test`
6. `pnpm -F @de100/apps-lms-api type:check`
7. `pnpm -F @de100/apps-lms-api test`
8. `pnpm -F @de100/apps-lms-web type:check`
9. `pnpm -F @de100/apps-lms-web test`
10. `pnpm -F @de100/apps-lms-web build`
11. Global `pnpm format-and-lint:check`
12. Global `pnpm type:check`
13. Global `pnpm test`

### Phase 11 - Docs and Deployment Guides

Status: Done

Completed scope:

1. Inventoried current docs and examples for stale files/media/video wording.
2. Added R2/MinIO setup docs:
   - local MinIO profile
   - remote R2 profile
   - generic S3-compatible env model
   - separate public/private bucket guidance
   - Docker compose/local smoke instructions
3. Added LMS files worker deployment docs:
   - package/process entrypoint
   - Redis queue recommended path
   - DB-polling fallback
   - ffmpeg/ffprobe dependency requirements
   - concurrency, retries, staging-prefix promote, cleanup
4. Added optional Cloudflare Worker edge adapter notes:
   - signed HLS delivery boundary
   - R2 access shape
   - cache/security considerations
5. Added course video integration guide:
   - course/chapter/lesson/video asset model
   - upload route defaults
   - HLS processing job
   - preview/private entitlement behavior
   - product player usage
6. Added processing addon docs:
   - image addon capabilities
   - video addon HLS/AES planning
   - audio addon capabilities
   - document addon capabilities
7. Added upload and delivery docs:
   - S3 multipart default for course videos
   - Tus/XHR alternatives
   - signed HLS playback
   - AES-128 prototype
   - DRM prototype boundaries
   - QoE events and telemetry hooks
8. Added provider comparison notes:
   - R2, MinIO, AWS S3
   - Cloudflare Stream, Mux, Bunny, other managed video providers
   - self-owned HLS vs managed-video tradeoffs
9. Updated examples matching current exports:
   - Solid `FileUploader`
   - framework-neutral runtime
   - server pipeline
   - `HlsVideoPlayer`
   - AES-128 HLS planning helpers
10. Updated `.env.example` and environment docs with files worker env defaults.
11. Linked docs from `docs/README.md` and related architecture/flow docs.
12. Ran doc hygiene scans and package/app/global gates.

### Phase 12 - Final QA and Evidence

Status: Done

Completed scope:

1. Ran global typecheck and test gates.
2. Built the LMS web app.
3. Ran stale media/env scans for active source and current-facing docs/env.
4. Ran built API smoke against the generated Node server:
   - files config returned 200
   - disabled S3 multipart, Companion, and Transloadit integration routes returned 501
5. Ran DB migration smoke against local Docker Postgres:
   - Postgres started healthy
   - migrations applied successfully
   - files/course/artifact/playback tables exist
6. Ran real local ffmpeg encrypted-HLS smoke:
   - generated a tiny MP4 fixture
   - generated AES-128 key material
   - generated HLS manifest and encrypted segment
   - verified manifest key and segment references
7. Added product files browser coverage for unauthenticated gating.
8. Ran headless and headed Playwright browser evaluation:
   - product files route gating
   - files lab gating
   - Hybrid lab
   - HTTP-native lab
   - course-video lab
   - product lesson shell
9. Updated the DX report with recommendation evidence.

Notes:

- VS Code integrated-browser automation is not exposed in this Codex environment, so headed Playwright is the visible-browser path.
- Page-level curl/load-event smoke is not the authoritative evidence for SolidStart streaming pages in this environment; browser assertions are. API curl smoke is clean.
- Full MinIO/R2 provider-backed live smoke moves to Phase 13 because MinIO is not in the repo compose file, the local MinIO image is absent, and the image pull was blocked by the approval system.

### Phase 13 - Provider-Backed Live Smoke Follow-Up

Status: Blocked

Blocked on:

1. Local MinIO image/service availability or permission to pull the image.
2. Optional real R2 credentials for remote smoke.

Execution order when unblocked:

1. Add a repo-owned MinIO compose override or documented local service command.
2. Create public/private buckets.
3. Configure local files storage with the MinIO S3-compatible profile.
4. Run upload target smoke for small PUT and large multipart planning.
5. Run worker-backed `video-hls` and `video-hls-encryption` jobs against MinIO.
6. Verify artifact promotion, signed manifest read, signed key read, range delivery, and cleanup behavior.
7. Optionally repeat a narrow R2 smoke with real credentials.
8. Record final provider-backed evidence and close Phase 13.

## 6. Validation Log

1. PASS: `pnpm install`
2. PASS: `pnpm format-and-lint:fix`
3. PASS: `pnpm type:fix`
4. PASS: `pnpm test`
5. PASS: migration metadata JSON parse and `0002_snapshot.prevId === 0001_snapshot.id`
6. PASS: `pnpm -F @de100/files-server format-and-lint:fix`
7. PASS: `pnpm -F @de100/files-server type:check`
8. PASS: `pnpm -F @de100/files-server test`
9. PASS: `pnpm -F @de100/files-server format-and-lint:check`
10. PASS: `pnpm format-and-lint:fix`
11. NOTE: `pnpm type:fix` is not a current root script; use `pnpm type:check` for global type validation.
12. PASS: `pnpm type:check`
13. FAIL then fixed: first `pnpm test` failed because the four processing addon packages had `test` scripts but no test files.
14. PASS: `pnpm -F @de100/files-processing-image -F @de100/files-processing-video -F @de100/files-processing-audio -F @de100/files-processing-document format-and-lint:fix`
15. PASS: `pnpm -F @de100/files-processing-image -F @de100/files-processing-video -F @de100/files-processing-audio -F @de100/files-processing-document type:check`
16. PASS: `pnpm -F @de100/files-processing-image -F @de100/files-processing-video -F @de100/files-processing-audio -F @de100/files-processing-document test`
17. PASS: `pnpm -F @de100/files-processing-image -F @de100/files-processing-video -F @de100/files-processing-audio -F @de100/files-processing-document format-and-lint:check`
18. PASS: `pnpm test`
19. FAIL then fixed: `pnpm format-and-lint:check` exposed a raw localized ORPC error in `packages/apps/lms/api/src/routers/files.ts`.
20. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:fix`
21. PASS: `pnpm format-and-lint:check`
22. PASS: final `pnpm type:check`
23. PASS: final `pnpm test`
24. PASS: `pnpm install` after adding the LMS worker workspace importer and refreshing the lockfile.
25. PASS: `pnpm -F @de100/apps-lms-worker format-and-lint:fix`
26. PASS: `pnpm -F @de100/apps-lms-worker type:check`
27. PASS: `pnpm -F @de100/apps-lms-worker test`
28. PASS: `pnpm -F @de100/apps-lms-worker format-and-lint:check`
29. PASS: `pnpm -F @de100/apps-lms-api type:check`
30. PASS: `pnpm -F @de100/apps-lms-api test`
31. PASS: `pnpm -F @de100/apps-lms-env type:check`
32. PASS: `pnpm -F @de100/apps-lms-db type:check`
33. PASS: `pnpm -F @de100/apps-lms-db test`
34. PASS: global `pnpm format-and-lint:check`
35. PASS: global `pnpm type:check`
36. PASS: global `pnpm test`
37. PASS: `pnpm install` after adding `@de100/files-processing-video` to `@de100/apps-lms-api`.
38. PASS: `pnpm -F @de100/files-processing-video format-and-lint:fix`
39. PASS: `pnpm -F @de100/files-processing-video type:check`
40. PASS: `pnpm -F @de100/files-processing-video test`
41. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:fix`
42. PASS: `pnpm -F @de100/apps-lms-api type:check`
43. PASS: `pnpm -F @de100/apps-lms-api test`
44. PASS: `pnpm -F @de100/files-server type:check`
45. PASS: `pnpm -F @de100/files-server test`
46. PASS: `pnpm -F @de100/apps-lms-worker type:check`
47. PASS: `pnpm -F @de100/apps-lms-worker test`
48. PASS: global `pnpm format-and-lint:check`
49. PASS: global `pnpm type:check`
50. PASS: global `pnpm test`
51. PASS: `pnpm install` after adding `@aws-sdk/s3-request-presigner` for S3 PUT signing.
52. PASS: `pnpm -F @de100/files-shared format-and-lint:fix`
53. PASS: `pnpm -F @de100/files-server format-and-lint:fix`
54. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:fix`
55. PASS: `pnpm -F @de100/files-client format-and-lint:fix`
56. FAIL then fixed: initial Phase 7 focused typecheck exposed `selectFileRouteRule` returning `undefined` from indexed lookups.
57. FAIL then fixed: initial API typecheck exposed nullable/Node-vs-DOM request typing at LMS storage-backend resolution.
58. PASS: `pnpm -F @de100/files-shared type:check`
59. PASS: `pnpm -F @de100/files-shared test`
60. PASS: `pnpm -F @de100/files-server type:check`
61. PASS: `pnpm -F @de100/files-server test`
62. PASS: `pnpm -F @de100/files-client type:check`
63. PASS: `pnpm -F @de100/files-client test`
64. PASS: `pnpm -F @de100/apps-lms-env type:check`
65. PASS: `pnpm -F @de100/apps-lms-api type:check`
66. PASS: `pnpm -F @de100/apps-lms-api test`
67. PASS: `pnpm -F @de100/apps-lms-web type:check`
68. PASS: `pnpm -F @de100/apps-lms-web test`
69. PASS: global `pnpm format-and-lint:check`
70. PASS: global `pnpm type:check`
71. PASS: global `pnpm test`
72. PASS: final global `pnpm format-and-lint:check` after updating Phase 8 tracker notes.
73. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check` after adding LMS course file services.
74. PASS: `pnpm -F @de100/apps-lms-api type:check` after adding LMS course file services.
75. PASS: `pnpm -F @de100/apps-lms-api test` after adding LMS course file services.
76. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:fix` after adding the course oRPC router.
77. FAIL then fixed: initial course-router API typecheck exposed nullable access-context narrowing in lesson video attach and playback-session handlers.
78. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
79. PASS: `pnpm -F @de100/apps-lms-api type:check`
80. PASS: `pnpm -F @de100/apps-lms-api test`
81. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:fix` after adding course lab/product routes.
82. PASS: `pnpm -F @de100/apps-lms-web type:check`
83. PASS: `pnpm -F @de100/apps-lms-web test`
84. PASS: `pnpm -F @de100/apps-lms-db type:check`
85. PASS: `pnpm -F @de100/apps-lms-db test`
86. PASS: global `pnpm format-and-lint:check`
87. PASS: global `pnpm type:check`
88. FAIL then fixed: global `pnpm test` exposed a timing-sensitive `@de100/apps-lms-cache` memory TTL test using a 1ms TTL.
89. PASS: `pnpm -F @de100/apps-lms-cache format-and-lint:check`
90. PASS: `pnpm -F @de100/apps-lms-cache type:check`
91. PASS: `pnpm -F @de100/apps-lms-cache test`
92. PASS: final global `pnpm format-and-lint:check`
93. PASS: final global `pnpm type:check`
94. PASS: final global `pnpm test`
95. PASS: `pnpm -F @de100/files-domains-solidjs add hls.js` after pnpm store access was allowed.
96. PASS: `pnpm -F @de100/files-server format-and-lint:check`
97. PASS: `pnpm -F @de100/files-server type:check`
98. PASS: `pnpm -F @de100/files-server test`
99. PASS: `pnpm -F @de100/files-domains-solidjs format-and-lint:check`
100. PASS: `pnpm -F @de100/files-domains-solidjs type:check`
101. PASS: `pnpm -F @de100/files-domains-solidjs test`
102. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
103. PASS: `pnpm -F @de100/apps-lms-api type:check`
104. PASS: `pnpm -F @de100/apps-lms-api test`
105. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:fix`
106. PASS: `pnpm -F @de100/apps-lms-web type:check`
107. PASS: `pnpm -F @de100/apps-lms-web test`
108. PASS: `pnpm -F @de100/apps-lms-web build` with expected lazy `hls.js` chunk-size warning and existing esbuild bigint-target warnings.
109. FAIL then fixed: first `pnpm -F @de100/apps-lms-web test:browser` course lesson smoke asserted the document title as visible UI.
110. PASS: `pnpm -F @de100/apps-lms-web test:browser`; Chromium verified unauthenticated lab gating, Hybrid/HTTP labs, course-video lab, and lesson shell.
111. PASS: `pnpm -F @de100/apps-lms-web test:browser:headed`; visible Chromium path passed the same browser suite.
112. FAIL then fixed: first global `pnpm format-and-lint:check` picked up generated `apps/lms-web/test-results/.last-run.json` from Playwright.
113. PASS: global `pnpm format-and-lint:check` after removing generated Playwright output.
114. PASS: global `pnpm type:check`
115. PASS: global `pnpm test`
116. PASS: final global `pnpm format-and-lint:check` after Phase 9 tracker and DX report updates.
117. NOTE: Phase 10 reconciliation found no DB schema change is needed for the AES-128 MVP; use `hls-encrypted` groups, `hls-key` artifacts, artifact metadata, and signed-session key delivery.
118. PASS: `pnpm -F @de100/files-shared format-and-lint:fix` after adding protection contracts.
119. PASS: `pnpm -F @de100/files-server format-and-lint:fix` after adding HLS protection and DRM prototype helpers.
120. PASS: `pnpm -F @de100/files-processing-video format-and-lint:fix` after adding AES-128 HLS planning.
121. PASS: `pnpm -F @de100/apps-lms-web format-and-lint:fix` after wiring signed key delivery.
122. PASS: `pnpm -F @de100/files-shared type:check`
123. PASS: `pnpm -F @de100/files-shared test`
124. PASS: `pnpm -F @de100/files-server type:check`
125. PASS: `pnpm -F @de100/files-server test`
126. PASS: `pnpm -F @de100/files-processing-video type:check`
127. PASS: `pnpm -F @de100/files-processing-video test`
128. PASS: `pnpm -F @de100/apps-lms-api type:check`
129. PASS: `pnpm -F @de100/apps-lms-api test`
130. PASS: `pnpm -F @de100/apps-lms-web type:check`
131. PASS: `pnpm -F @de100/apps-lms-web test`
132. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:fix` after wiring `video-hls-encryption` through the LMS processing bridge.
133. PASS: `pnpm -F @de100/apps-lms-api type:check`
134. PASS: `pnpm -F @de100/apps-lms-api test`
135. PASS: `pnpm -F @de100/files-processing-video type:check`
136. PASS: `pnpm -F @de100/files-processing-video test`
137. PASS: `pnpm -F @de100/files-server type:check`
138. PASS: `pnpm -F @de100/files-server test`
139. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:fix` after deriving course playback-session protection mode from artifact-group metadata.
140. PASS: `pnpm -F @de100/apps-lms-api type:check`
141. PASS: `pnpm -F @de100/apps-lms-api test`
142. PASS: `pnpm -F @de100/apps-lms-web build`
143. PASS: global `pnpm format-and-lint:check`
144. PASS: global `pnpm type:check`
145. PASS: global `pnpm test`
146. DONE: Phase 10 closed. Phase 11 is active with docs, deployment guides, provider comparisons, and Phase 12 smoke/evidence prep as the next execution path.
147. PASS: final global `pnpm format-and-lint:check` after closing Phase 10 and activating Phase 11 in the tracker.
148. PASS: final global `pnpm format-and-lint:check` after replacing stale Phase 10 active notes with closure notes.
149. NOTE: Phase 11 inventory found the active docs already cover base files architecture/storage/flow/examples, but video-ready deployment details are still spread out. Historical `/media` references remain only in archive/evidence/worklog files and are intentionally preserved as history.
150. DONE: Phase 11 docs slice added storage setup, worker deployment, and course-video HLS architecture guides; linked them from the docs index and existing files architecture/storage/flow docs.
151. DONE: Phase 11 examples/env slice added worker env examples and current-export examples for `HlsVideoPlayer` plus AES-128 HLS planning.
152. DONE: Phase 11 addon/protocol slice added processing-addon and upload/delivery strategy docs with explicit protocol, integration, delivery, and limit terminology.
153. PASS: active docs/env stale scan found no legacy media env/API/router names, old R2 driver wording, old transport wording, or stale variant-not-implemented wording. Broad scan only reports historical archive entries.
154. PASS: global `pnpm format-and-lint:check`
155. PASS: global `pnpm type:check`
156. PASS: global `pnpm test`
157. PASS: `pnpm -F @de100/apps-lms-web build` with expected lazy `hls.js` chunk warning and existing Nitro/esbuild bigint-target warnings.
158. DONE: Phase 11 closed. Phase 12 is active with final package gates, stale scans, built smoke, DB migrate smoke, MinIO/HLS smoke, browser evaluation, and recommendation evidence as the next execution path.
159. PASS: final global `pnpm format-and-lint:check` after closing Phase 11 and activating Phase 12 in the tracker.
160. PASS: final active docs/env stale scan produced no matches after tracker wording cleanup.
161. PASS: final global `pnpm format-and-lint:check` after tightening the HLS player example QoE callback type and tracker wording.
162. PASS: Phase 12 global `pnpm type:check`.
163. PASS: Phase 12 global `pnpm test`.
164. PASS: Phase 12 `pnpm -F @de100/apps-lms-web build` with expected lazy `hls.js` chunk warning and existing Nitro/esbuild bigint-target warnings.
165. PASS: built API smoke against generated Node server: files config returned 200; disabled S3 multipart, Companion, and Transloadit integrations returned 501.
166. NOTE: page-level curl/load-event smoke is not authoritative for SolidStart streaming pages in this environment. Browser assertions are used for page evidence.
167. PASS: local Docker Postgres started healthy; local DB migrations applied successfully with only PostgreSQL identifier-truncation notices.
168. PASS: migrated table inspection found files, file upload sessions/parts, variants, artifact groups/artifacts, caption tracks, playback sessions/events, processing jobs, courses, chapters, lessons, enrollments, and course video assets.
169. PASS: real local ffmpeg encrypted-HLS smoke generated a 3-second MP4 fixture, AES-128 key, HLS manifest, and encrypted segment; manifest contains key and segment references.
170. BLOCKED: full MinIO provider smoke could not run because the local MinIO image/service is unavailable and the image pull was blocked by the approval system.
171. FAIL then fixed: adding product files browser coverage first exposed a Playwright load-event timeout for the unauthenticated redirect. The page rendered login, so the smoke now waits for navigation commit and asserts visible login UI.
172. PASS: `pnpm -F @de100/apps-lms-web test:browser` with product files gating, files lab gating, Hybrid lab, HTTP-native lab, course-video lab, and product lesson shell.
173. PASS: `pnpm -F @de100/apps-lms-web test:browser:headed` with the same browser coverage.
174. DONE: Phase 12 local QA and DX/UX recommendation evidence closed. Phase 13 is the only remaining provider-backed live smoke follow-up and is blocked on MinIO/R2 service availability.
175. PASS: final global `pnpm format-and-lint:check` after browser-test and DX-report updates.
176. PASS: final global `pnpm type:check` after browser-test and DX-report updates.
177. PASS: final global `pnpm test` after browser-test and DX-report updates.

## 7. Phase 9 Completion Notes

Phase 9 closed the playback experience slice. It intentionally did not build HLS AES-128 encryption, DRM prototypes, provider comparison docs, or deployment guides.

Phase 8 closure notes:

1. Reconciled existing course tables, artifact groups, playback sessions, files repositories, `/files`, `/files-lab/hybrid`, and `/files-lab/http`.
2. Added LMS course file services for:
   - course/chapter/lesson creation
   - enrollment upsert
   - video asset attachment
   - `video-hls` processing job queueing
   - signed HLS playback-session creation
3. Added explicit course access policy:
   - preview lessons are readable when published
   - enrolled/completed users can read private lessons
   - course owners can manage and read draft/private lessons
   - admin role remains supported at the package/service boundary
   - unauthorized private lessons are denied
4. Added `appRouter.courses` with owner-scoped admin operations and public playback-session creation.
5. Added gated `/files-lab/course-video` for course creation, lesson creation, uploaded-video attachment, and signed playback-session requests.
6. Added product-shaped `/courses/:courseSlug/:chapterSlug/:lessonSlug` playback shell.
7. Kept final player work minimal: the product route shows a video placeholder and signed token data; native video + lazy `hls.js` moves to Phase 9.
8. Fixed an unrelated flaky cache TTL test discovered by global `pnpm test`.
9. Focused DB/API/web checks and final global gates passed.

Phase 9 completed scope:

1. `hls.js` lives in `@de100/files-domains-solidjs`, not the LMS app directly.
2. The package player exposes the reusable default:
   - native `<video>`
   - native HLS when available
   - lazy `hls.js` fallback
   - caption tracks
   - QoE event callback
3. The LMS lesson route compares:
   - package player
   - helper-only app-composed video element
   - external-player adapter prototype
4. HLS URLs are token-scoped through `/api/files/playback/hls/{token}/{path}`.
5. Playback-session creation now returns a typed playback source for the player.
6. QoE recording writes through the files telemetry event path.
7. Browser evidence:
   - no VS Code integrated browser tool is exposed in this execution environment
   - headless Playwright passed
   - headed Playwright passed
8. Build evidence:
   - the route chunk stays small
   - `hls.js` is emitted as a separate lazy chunk and triggers a chunk-size warning, which is expected for this dependency
   - existing Nitro/esbuild bigint-target warnings remain unrelated to Phase 9

## 8. Phase 10 Closure Notes

Phase 10 closed the protection prototype slice. Signed HLS remains the default until AES-128 and DRM evidence proves a better tradeoff in real playback and operations smoke.

Closure checklist:

1. Done: confirm encrypted HLS can use artifact metadata/key artifacts for the MVP.
2. Done: add package-level AES-128 contract names before app route wiring.
3. Done: keep key delivery signed-session scoped; do not expose provider keys or bucket object keys.
4. Done: keep DRM prototypes isolated behind lab/prototype flags.
5. Done: update `docs/files-platform-dx-evaluation.md` with protection tradeoffs as evidence appears.
6. Done: wire `video-hls-encryption` as an opt-in LMS worker job path using injected ffmpeg adapter key material/key-info details.
7. Done: run build and final global gates before closing Phase 10.
