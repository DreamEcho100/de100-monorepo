# Files Platform DX Evaluation

Last updated: 2026-06-06

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
pnpm -F @de100/apps-lms-web test:browser:headed
pnpm -F @de100/apps-lms-web test:browser:ui
```

## Running Notes

- 2026-06-02: Phase 8 revised to migrate active LMS media usage to files before building the approach lab.
- 2026-06-02: Active `/files` page, `/api/files/*` read/control/upload routes, and initial `/files-lab` matrix scaffold added. Validation pending.
- 2026-06-02: Targeted validation passed for files domain typecheck/test/lint, LMS API typecheck/test/lint, LMS web typecheck/test/lint/build, route preload, and range response tests.
- 2026-06-02: Completed storage/env rename cleanup. Active files code now uses `APP_LMS_FILES_*`, files-native storage, files seed fixtures, files docs, and no package-exported media router/storage/schema/validator modules.
- 2026-06-02: Added focused HTTP/lab policy coverage for range responses, server-proxy upload protocol enablement (`xhr`/`tus` only), stress-track Tus selection, target-mode decisions, and generated image/audio/video/document/generic fixtures.
- 2026-06-02: Added explicit disabled routes for S3 multipart, Companion, and Transloadit under `/api/files/integrations/*`; this keeps unsupported provider paths deterministic instead of silently failing.
- 2026-06-02: Added `/api/files/{id}/variants/{variant}`. It reuses file readability checks, serves only ready/live variants, and is ready for Phase 9-generated image/video variants.
- 2026-06-02: Browser evaluation used Playwright because no VSCode integrated browser tool is available in this execution environment. Results: unauthenticated `/en/files-lab` redirects to `/en/login`; mocked-auth `/en/files-lab` rendered the original matrix lab, switched approach/track/visibility, and generated image/audio/video/document/generic fixtures.
- 2026-06-02: UX note: the lab is usable for comparing policy and form behavior, but real upload progress/cancel/retry/resume still needs Phase 9/10 provider-backed flows before a final API default can be recommended.
- 2026-06-02: Phase 8 closed. Remaining before final recommendation: processing-generated variants, provider-backed resumable/S3-style flows where configured, and side-by-side product-flow DX notes across RPC, HTTP, and hybrid.
- 2026-06-03: Phase 9 dropped RPC-native as a top-level path. `/en/files-lab` is now a comparison shell, `/en/files-lab/hybrid` exercises the recommended Hybrid path, and `/en/files-lab/http` exercises the maintained HTTP-native path.
- 2026-06-03: Terminology split is now explicit: API approach, storage backend, upload protocol, delivery strategy, integration, and processing mode. Companion and Transloadit are integrations, not upload protocols.
- 2026-06-03: Local development profiles are `local-fs` for simple offline work and `minio-s3` for S3-compatible parity. Cloudflare R2 production config uses `APP_LMS_FILES_STORAGE_DRIVER=s3` with `APP_LMS_FILES_S3_PROVIDER=r2`.
- 2026-06-03: Playwright browser evaluation passed for unauthenticated `/en/files-lab` gating plus mocked-auth `/en/files-lab`, `/en/files-lab/hybrid`, and `/en/files-lab/http`. The test exercises generated fixtures and the Hybrid/HTTP-native lab controls for track, storage profile, protocol, and visibility.
- 2026-06-06: Phase 10 processing runner added retry, cleanup, persisted job attempts/output/error, aggregate metadata, and generated variant persistence through app-injected operations.
- 2026-06-06: LMS upload completion now runs a local processing pipeline before marking files ready. Direct oRPC uploads and target-completion flows use the same processing bridge.
- 2026-06-06: Concrete variant behavior now covers image `optimized`, video `poster`, and audio `waveform`. Image variants use `sharp` when enabled and source-copy otherwise; video/audio variants use injected ffmpeg-shaped adapters, with disabled paths explicit when the adapter is absent.
- 2026-06-06: Product `/files` now queries and displays generated variants with links to `/api/files/{id}/variants/{variant}`. This makes variant delivery testable from the normal product flow, not only route-level tests.
- 2026-06-06: DX note: Hybrid remains the stronger default because processing state and target completion can stay typed through oRPC while binary delivery and variants remain normal HTTP routes. HTTP-native remains useful for external clients and route-first integrations, but needs more client wrapper code for equivalent type ergonomics.
- 2026-06-06: Phase 12 built smoke used host-level curl because sandboxed curl sessions could not reach the preview server namespace. Results: `/` returned 307 for locale routing; `/en`, `/en/files`, `/en/files-lab`, `/en/files-lab/hybrid`, `/en/files-lab/http`, and `/api/files/config` returned 200; `/api/files/integrations/s3-multipart` returned 501 as the expected disabled integration response.
- 2026-06-06: DB-backed read smoke reached `/api/files/{id}` but returned 500 because the configured local/runtime database does not have the fresh `files` table. Release precondition: run the files DB migrations before DB-backed read/control smoke in target environments.
- 2026-06-06: Final browser evaluation used Playwright because no VS Code integrated browser tool is exposed in this execution environment. Chromium passed unauthenticated lab gating and authenticated lab rendering for the comparison shell, Hybrid page, and HTTP-native page.
- 2026-06-06: Final recommendation: keep Hybrid as the default scalable project template, keep HTTP-native as a maintained full second path, and keep `orpc-direct` only as a small-file Hybrid capability. Provider-backed Tus, S3 multipart, Companion, Transloadit, and full video transcode remain configured-service work rather than local default behavior.
