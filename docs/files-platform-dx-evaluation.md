# Files Platform DX Evaluation

Last updated: 2026-06-12

This report tracks the files API comparison after dropping RPC-native as a top-level approach. Hybrid is the recommended default candidate, HTTP-native is maintained as the full second path, and `orpc-direct` remains a small-file capability inside Hybrid.

## Approach Matrix

| Approach | Status | Pros | Cons | Evidence |
| --- | --- | --- | --- | --- |
| Hybrid | Recommended default candidate; separate lab route added | Typed control plane, route-owned binary/range/provider paths, `orpc-direct` for small first-party flows, good long-term DX for app teams | Requires clear docs on where JSON/control ends and binary/provider protocols begin | `/files-lab/hybrid`, shared planner tests, web lab policy tests |
| HTTP-native | Maintained full second path; separate lab route added | Best compatibility for browser playback, public delivery, Uppy, Tus, S3-style multipart, external tools, and non-oRPC clients | Weaker first-party type surface unless wrapped carefully | `/files-lab/http`, `/api/files/*`, range/variant/protocol tests |

## Browser Evaluation Plan

1. Try VSCode integrated browser against the gated files lab shell and both approach pages when available.
2. If VSCode browser access is unavailable, run a Playwright browser evaluation instead.
3. Exercise generated fixtures and user-selected files across image, video, audio, document, and generic file forms.
4. Record hands-on notes for developer experience and user experience before recommending a long-term default.

Visible local runs are available with:

```bash
pnpm -F @de100/apps-proto-cook-web test:browser:headed
pnpm -F @de100/apps-proto-cook-web test:browser:ui
```

## Course Video Player Prototypes

| Prototype | Role | Current evidence | DX note |
| --- | --- | --- | --- |
| Package player | Recommended product default | `HlsVideoPlayer` in `@de100/files-domains-solidjs`; native HLS first, lazy `hls.js` fallback, caption tracks, QoE callback | Best default for Proto Cook/product surfaces because playback, captions, and telemetry wiring are one component boundary |
| Helper-only player | App-composed comparison path | Proto Cook lesson page composes its own `<video>` with package QoE event helper | Useful when an app needs full markup control, but it repeats caption/QoE details quickly |
| External adapter prototype | Integration boundary test | Proto Cook lesson page wraps package player and annotates telemetry as an external-player adapter | Keeps a future Shaka/video.js/Mux-player adapter possible without coupling core packages to one player |

Signed HLS playback currently uses `/api/files/playback/hls/{token}/{path}`. The oRPC course playback-session procedure returns a typed playback source containing the master manifest URL, caption tracks, token, session id, and master artifact id.

The `hls.js` dependency is intentionally lazy-loaded by the package player. Production builds emit it as a separate large chunk; that warning is expected for the dependency and does not mean the lesson route eagerly bundles the player fallback.

## Protection Prototypes

Signed HLS remains the product default. It is the simplest posture to operate, works with normal browser playback, and keeps entitlement checks app-owned. It limits casual URL sharing through session TTLs, but it is not DRM.

AES-128 HLS is now an MVP package/server capability:

- `@de100/files-shared` defines AES key references and DRM prototype descriptors.
- `@de100/files-processing-video` can plan `aes-128` HLS outputs, ffmpeg key-info usage, key artifacts, and `hls-encrypted` artifact groups.
- `@de100/files-server` rewrites package key URI placeholders into signed playback key URLs.
- Proto Cook serves HLS key bytes only through signed session paths like `/api/files/playback/hls/{token}/keys/{keyId}`.
- HLS key artifacts are not served through the generic artifact path.

AES-128 improves resistance to simple copied segment URLs, but it is still not DRM. A user with a valid session can still play and potentially capture the content.

DRM remains prototype-only:

| Prototype | Status | Main benefit | Main cost |
| --- | --- | --- | --- |
| Self-owned R2/Shaka-style | Typed descriptor only | Lower provider lock-in, compatible with self-owned storage | High operational complexity: licenses, packaging, player integration, platform-specific DRM systems |
| Cloudflare Stream managed | Typed descriptor only | Easier managed path if Cloudflare is already the video vendor | Higher provider lock-in and a separate managed-video workflow |

No DRM path should become the product default until a real playback lab proves browser support, entitlement integration, operational setup, and failure modes.

## Running Notes

- 2026-06-02: Phase 8 revised to migrate active Proto Cook media usage to files before building the approach lab.
- 2026-06-02: Active `/files` page, `/api/files/*` read/control/upload routes, and initial `/files-lab` matrix scaffold added. Validation pending.
- 2026-06-02: Targeted validation passed for files domain typecheck/test/lint, Proto Cook API typecheck/test/lint, Proto Cook web typecheck/test/lint/build, route preload, and range response tests.
- 2026-06-02: Completed storage/env rename cleanup. Active files code now uses `APP_PROTO_COOK_FILES_*`, files-native storage, files seed fixtures, files docs, and no package-exported media router/storage/schema/validator modules.
- 2026-06-02: Added focused HTTP/lab policy coverage for range responses, server-proxy upload protocol enablement (`xhr`/`tus` only), stress-track Tus selection, target-mode decisions, and generated image/audio/video/document/generic fixtures.
- 2026-06-02: Added explicit disabled routes for S3 multipart, Companion, and Transloadit under `/api/files/integrations/*`; this keeps unsupported provider paths deterministic instead of silently failing.
- 2026-06-02: Added `/api/files/{id}/variants/{variant}`. It reuses file readability checks, serves only ready/live variants, and is ready for Phase 9-generated image/video variants.
- 2026-06-02: Browser evaluation used Playwright because no VSCode integrated browser tool is available in this execution environment. Results: unauthenticated `/en/files-lab` redirects to `/en/login`; mocked-auth `/en/files-lab` rendered the original matrix lab, switched approach/track/visibility, and generated image/audio/video/document/generic fixtures.
- 2026-06-02: UX note: the lab is usable for comparing policy and form behavior, but real upload progress/cancel/retry/resume still needs Phase 9/10 provider-backed flows before a final API default can be recommended.
- 2026-06-02: Phase 8 closed. Remaining before final recommendation: processing-generated variants, provider-backed resumable/S3-style flows where configured, and side-by-side product-flow DX notes across RPC, HTTP, and hybrid.
- 2026-06-03: Phase 9 dropped RPC-native as a top-level path. `/en/files-lab` is now a comparison shell, `/en/files-lab/hybrid` exercises the recommended Hybrid path, and `/en/files-lab/http` exercises the maintained HTTP-native path.
- 2026-06-03: Terminology split is now explicit: API approach, storage backend, upload protocol, delivery strategy, integration, and processing mode. Companion and Transloadit are integrations, not upload protocols.
- 2026-06-03: Local development profiles are `local-fs` for simple offline work and `minio-s3` for S3-compatible parity. Cloudflare R2 production config uses `APP_PROTO_COOK_FILES_STORAGE_DRIVER=s3` with `APP_PROTO_COOK_FILES_S3_PROVIDER=r2`.
- 2026-06-03: Playwright browser evaluation passed for unauthenticated `/en/files-lab` gating plus mocked-auth `/en/files-lab`, `/en/files-lab/hybrid`, and `/en/files-lab/http`. The test exercises generated fixtures and the Hybrid/HTTP-native lab controls for track, storage profile, protocol, and visibility.
- 2026-06-06: Phase 10 processing runner added retry, cleanup, persisted job attempts/output/error, aggregate metadata, and generated variant persistence through app-injected operations.
- 2026-06-06: Proto Cook upload completion now runs a local processing pipeline before marking files ready. Direct oRPC uploads and target-completion flows use the same processing bridge.
- 2026-06-06: Concrete variant behavior now covers image `optimized`, video `poster`, and audio `waveform`. Image variants use `sharp` when enabled and source-copy otherwise; video/audio variants use injected ffmpeg-shaped adapters, with disabled paths explicit when the adapter is absent.
- 2026-06-06: Product `/files` now queries and displays generated variants with links to `/api/files/{id}/variants/{variant}`. This makes variant delivery testable from the normal product flow, not only route-level tests.
- 2026-06-06: DX note: Hybrid remains the stronger default because processing state and target completion can stay typed through oRPC while binary delivery and variants remain normal HTTP routes. HTTP-native remains useful for external clients and route-first integrations, but needs more client wrapper code for equivalent type ergonomics.
- 2026-06-06: Phase 12 built smoke used host-level curl because sandboxed curl sessions could not reach the preview server namespace. Results: `/` returned 307 for locale routing; `/en`, `/en/files`, `/en/files-lab`, `/en/files-lab/hybrid`, `/en/files-lab/http`, and `/api/files/config` returned 200; `/api/files/integrations/s3-multipart` returned 501 as the expected disabled integration response.
- 2026-06-06: DB-backed read smoke reached `/api/files/{id}` but returned 500 because the configured local/runtime database does not have the fresh `files` table. Release precondition: run the files DB migrations before DB-backed read/control smoke in target environments.
- 2026-06-06: Final browser evaluation used Playwright because no VS Code integrated browser tool is exposed in this execution environment. Chromium passed unauthenticated lab gating and authenticated lab rendering for the comparison shell, Hybrid page, and HTTP-native page.
- 2026-06-06: Final recommendation: keep Hybrid as the default scalable project template, keep HTTP-native as a maintained full second path, and keep `orpc-direct` only as a small-file Hybrid capability. Provider-backed Tus, S3 multipart, Companion, Transloadit, and full video transcode remain configured-service work rather than local default behavior.
- 2026-06-07: Video-ready Phase 9 added the signed HLS playback route, reusable Solid `HlsVideoPlayer`, helper-only player prototype, external-adapter prototype, typed playback-source response, and QoE event recording.
- 2026-06-07: Browser evaluation covered unauthenticated files-lab gating, authenticated Hybrid/HTTP labs, the course-video lab, and the product lesson shell. Headless `test:browser` passed, and headed `test:browser:headed` also passed. No VS Code integrated browser tool is exposed to Codex in this environment.
- 2026-06-07: Player DX note: keep the package player as the product default. The helper-only path is useful proof that apps can compose their own player, but it repeats caption and telemetry details. The external-adapter path is the right future seam for Shaka/video.js/Mux-style integrations.
- 2026-06-07: Protection remains signed HLS only. AES-128 and DRM prototypes move to the next phase; do not recommend them until implementation and browser evidence exist.
- 2026-06-08: Phase 10 AES-128 MVP added shared protection contracts, video processing key planning, key artifact modeling, signed key delivery, and manifest key-URI rewriting. Recommendation remains signed HLS by default; AES-128 is available as a stronger prototype for selected course-video routes.
- 2026-06-08: Course playback sessions now inherit `aes-128` from encrypted artifact-group metadata, so signed key delivery is exercised by the normal course playback-session path instead of being only a route-level capability.
- 2026-06-08: Phase 10 DRM work intentionally stayed at descriptor/prototype boundaries. Self-owned R2/Shaka-style and Cloudflare Stream managed paths are represented for evaluation without adding provider SDK/player coupling to core files packages.
- 2026-06-08: Phase 12 global QA passed: root typecheck, root tests, Proto Cook web build, active stale scans, and current-facing docs/env stale scans. The build still emits the expected lazy `hls.js` chunk warning and existing Nitro/esbuild bigint-target warnings.
- 2026-06-08: Built API smoke passed against the generated Node server: files config returned 200, while disabled S3 multipart, Companion, and Transloadit integration routes returned 501. Page-level curl/load-event smoke is not reliable evidence for SolidStart streaming pages in this environment; browser assertions are the page evidence.
- 2026-06-08: Local DB migration smoke passed against Docker Postgres. Migrations applied successfully and table inspection confirmed files, upload sessions/parts, variants, artifact groups/artifacts, captions, playback sessions/events, processing jobs, courses, chapters, lessons, enrollments, and course video assets.
- 2026-06-08: Real local ffmpeg encrypted-HLS smoke passed without MinIO: generated a short MP4 fixture, AES-128 key, HLS manifest, and encrypted segment. The manifest contains the expected key and segment references.
- 2026-06-08: Full MinIO provider-backed smoke remains blocked: the repo compose file does not include MinIO, no local MinIO image is available, and pulling the image was rejected by the approval system. This should move to a provider-backed follow-up with either a repo-owned MinIO compose override or explicit local service setup.
- 2026-06-08: Browser evaluation now covers product files unauthenticated gating, files lab unauthenticated gating, authenticated Hybrid/HTTP labs, course-video lab, and product lesson shell. Headless and headed Playwright both passed. No VS Code integrated browser automation is exposed to Codex here.
- 2026-06-08: Recommendation is unchanged after final local QA: keep Hybrid as the default scalable path, keep HTTP-native as the maintained second path, keep signed HLS as the product protection default, treat AES-128 HLS as an opt-in stronger prototype, and keep DRM/provider-managed video as adapter/prototype work until real provider-backed playback evidence exists.
- 2026-06-12: Provider-backed local MinIO smoke is now repo-owned through `docker-compose.yml`, `pnpm -F @de100/apps-proto-cook-infra minio:up`, and `pnpm -F @de100/apps-proto-cook-infra minio:smoke`. The smoke passed against `http://127.0.0.1:9000` with run id `phase13-2026-06-12T05-34-09-434Z-d768b94d-6f89-4f3f-909b-d09ba9dd78d2`.
- 2026-06-12: MinIO evidence now covers public/private bucket creation, public/private object round trips, multipart init/abort, local ffmpeg AES-128 HLS generation, provider upload of original/manifest/key/segment artifacts, manifest/key readback, segment range read, object metadata, and cleanup.
- 2026-06-12: DX note: local S3-compatible parity is no longer theoretical. MinIO now covers the self-owned R2-style storage path locally. Real R2 remains a credentialed production smoke, not a blocker for the local video-ready package recommendation.
