# Current Plan: Video-Ready Files Platform

Last updated: 2026-06-07

Current active phase: Phase 3 - Core package deepening: artifacts, HLS, workers, telemetry

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
| 3     | Core package deepening: artifacts, HLS, workers, telemetry | In Progress |
| 4     | Processing addon package topology                          | Not Started |
| 5     | LMS files worker with Redis and DB-polling adapters        | Not Started |
| 6     | HLS processing and storage-first artifact writer           | Not Started |
| 7     | MinIO/R2 upload defaults and S3 multipart course uploads   | Not Started |
| 8     | Course admin/product integration and gated labs            | Not Started |
| 9     | Player prototypes, captions, QoE, browser evaluation       | Not Started |
| 10    | HLS encryption and DRM prototypes                          | Not Started |
| 11    | Docs, deployment guides, provider comparisons              | Not Started |
| 12    | Final QA gates and DX/UX recommendation evidence           | Not Started |

## 4. Phase 1: Roadmap Reset and Foundation Contracts

### Objective

Archive the completed files rewrite tracker, rewrite this roadmap, and add package-level foundation contracts so later phases can implement HLS/course/video work without inventing names or one-off app seams.

### Step Tracker

| Step | Task                                                 | Status      | Evidence |
| ---- | ---------------------------------------------------- | ----------- | -------- |
| 1    | Archive previous `current-plan.md`                   | Done        | `docs/archive/current-plan-files-platform-rewrite-2026-06-06.md` |
| 2    | Rewrite `current-plan.md` with video-ready roadmap   | Done        | `current-plan.md` |
| 3    | Add shared artifact/HLS/analytics contract schemas   | Done        | `packages/files/shared/src/artifacts.ts`, `packages/files/shared/src/analytics.ts` |
| 4    | Add server operation interfaces for artifacts/workers | Done        | `packages/files/server/src/operations.ts`, `packages/files/server/src/worker.ts`, `packages/files/server/src/hls-playback.ts` |
| 5    | Add processing addon package shells                  | Done        | `packages/files/processing-{image,video,audio,document}` |
| 6    | Run focused validation gates                         | Done        | Validation log |

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

Status: In Progress

Execution order:

1. Promote artifact/playback/event contracts from optional repository surfaces to first-class package workflows.
2. Add reusable artifact delivery helpers:
   - readable artifact lookup
   - HLS manifest response policy
   - segment response policy
   - signed playback-session validation
3. Add shared entitlement helpers for file/course/lesson reads without LMS-specific coupling.
4. Add worker queue control helpers around enqueue, ack, fail, retry, and stale job recovery.
5. Add telemetry fanout helper that can write DB events and call telemetry adapters.
6. Add focused tests for these helpers before any worker/UI implementation.

### Phase 4 - Processing Addons

1. Add image addon with responsive images, placeholders, EXIF handling, AVIF/WebP, and dominant color interfaces.
2. Add video addon with HLS TS and fMP4/CMAF presets, poster extraction, caption attachment, and ffmpeg adapter interfaces.
3. Add audio addon with metadata, waveform, preview/transcode, and transcript hooks.
4. Add document addon with PDF processing and Office-conversion proof-of-concept seams.

### Phase 5 - LMS Files Worker

1. Add dedicated LMS files worker package/process.
2. Add Redis queue adapter and DB-polling fallback.
3. Add worker oRPC prototypes:
   - internal-only
   - admin-browser limited namespace
   - public namespace lab prototype
4. Document the production recommendation as internal-only.

### Phase 6 - HLS Processing

1. Implement storage-first worker path.
2. Implement local pre-process admin/lab path.
3. Generate HLS artifact groups with master manifest, renditions, segments, poster, metadata, and cleanup records.
4. Default ladder: 480p, 720p, 1080p with source-aware skipping.
5. Default retry model: staging-prefix write, validate, promote, cleanup.

### Phase 7 - Storage and Upload Defaults

1. Make MinIO the local S3-compatible parity path.
2. Make R2 the documented remote target.
3. Course videos default to S3 multipart.
4. Tus and XHR remain configured/documented alternatives.
5. Keep local filesystem for small offline/demo paths only.

### Phase 8 - Course Integration and Labs

1. Add MVP course admin and product routes.
2. Attach processed HLS outputs to lessons.
3. Implement enrollment + preview entitlement.
4. Add gated labs for Hybrid, HTTP-native, local pre-process, worker processing, and player comparisons.

### Phase 9 - Player, Captions, Analytics, Browser Evaluation

1. Add package player with native video + lazy `hls.js`.
2. Add helper-only and external-player lab prototypes.
3. Add manual VTT captions.
4. Add auto-caption adapter docs.
5. Add QoE analytics DB event adapter and telemetry hook adapter.
6. Run VS Code browser/manual evaluation and headed Playwright unless one path fails after enough attempts.

### Phase 10 - Encryption and DRM Prototypes

1. Add HLS AES-128 MVP.
2. Add self-owned R2/Shaka-style DRM prototype.
3. Add Cloudflare Stream managed DRM prototype.
4. Document Mux, Bunny, and other managed provider tradeoffs.

### Phase 11 - Docs and Deployment Guides

1. R2/MinIO setup.
2. Worker deployment.
3. Cloudflare Worker optional edge adapter.
4. Course video integration.
5. Addon packages.
6. Upload, processing, signed playback, HLS encryption, DRM, and QoE.

### Phase 12 - Final QA and Evidence

1. Full package typecheck/test gates.
2. LMS app typecheck/test/build.
3. Stale media scan.
4. DB reset/migrate smoke.
5. MinIO/HLS smoke.
6. Browser evaluation evidence.
7. Final DX/UX recommendation report.

## 6. Validation Log

1. PASS: `pnpm install`
2. PASS: `pnpm -F @de100/files-shared type:check`
3. PASS: `pnpm -F @de100/files-shared test`
4. PASS: `pnpm -F @de100/files-server type:check`
5. PASS: `pnpm -F @de100/files-server test`
6. PASS: `pnpm -F @de100/files-processing-image type:check`
7. PASS: `pnpm -F @de100/files-processing-video type:check`
8. PASS: `pnpm -F @de100/files-processing-audio type:check`
9. PASS: `pnpm -F @de100/files-processing-document type:check`
10. PASS: `pnpm -F @de100/files-shared format-and-lint:check`
11. PASS: `pnpm -F @de100/files-server format-and-lint:check`
12. PASS: `pnpm -F @de100/files-processing-image format-and-lint:check`
13. PASS: `pnpm -F @de100/files-processing-video format-and-lint:check`
14. PASS: `pnpm -F @de100/files-processing-audio format-and-lint:check`
15. PASS: `pnpm -F @de100/files-processing-document format-and-lint:check`
16. PASS: `pnpm -F @de100/apps-lms-db type:check`
17. PASS: `pnpm -F @de100/apps-lms-db test`
18. PASS: `pnpm -F @de100/apps-lms-db format-and-lint:check`
19. PASS: `pnpm -F @de100/apps-lms-api type:check`
20. PASS: `pnpm -F @de100/apps-lms-api test -- src/files-repositories.test.ts`
21. PASS: `pnpm -F @de100/apps-lms-api format-and-lint:check`
22. PASS: `pnpm -F @de100/files-server type:check`
23. PASS: migration metadata JSON parse and `0002_snapshot.prevId === 0001_snapshot.id`

## 7. Phase 3 Active Notes

Phase 3 should stay package-level. Do not build the LMS worker, course UI, or HLS processing implementation yet.

Exit gates:

1. `pnpm -F @de100/files-server type:check`
2. `pnpm -F @de100/files-server test`
3. `pnpm -F @de100/apps-lms-api type:check`
4. `pnpm -F @de100/apps-lms-api test -- src/files-repositories.test.ts`
5. `pnpm -F @de100/files-server format-and-lint:check`
