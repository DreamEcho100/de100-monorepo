# Proto Cook Files Manual

This directory is the operator and developer manual for the Files Platform inside Proto Cook.

Read in order:

1. `01-architecture.md` - package topology, app adapters, and API approach.
2. `02-upload-and-storage-flows.md` - upload protocols, storage profiles, and delivery strategies.
3. `03-processing-and-artifacts.md` - jobs, processors, variants, artifact groups, and cleanup.
4. `04-hls-playback-and-entitlements.md` - course-video playback sessions, private access, and labs.
5. `05-minio-r2-and-provider-smoke.md` - local MinIO parity, R2 production shape, and smoke checks.
6. `06-labs-manual-testing.md` - manual lab routes, scenarios, inputs, and expected behavior.
7. `07-troubleshooting-and-expected-failures.md` - known failure modes and diagnosis steps.

Per-lab tutorials live under `labs/`:

1. `labs/00-lab-setup.md` - shared setup, service lifecycle, and run notes.
2. `labs/01-hybrid-upload-lab.md` - recommended Hybrid API checks.
3. `labs/02-http-native-upload-lab.md` - maintained HTTP-native path checks.
4. `labs/03-provider-smoke-lab.md` - local-fs, MinIO, and provider-shape checks.
5. `labs/04-course-video-lab.md` - course video upload and artifact workflow.
6. `labs/05-hls-playback-session-lab.md` - signed HLS playback session checks.
7. `labs/06-processing-variants-lab.md` - variants, processing jobs, and artifacts.
8. `labs/07-entitlement-matrix-lab.md` - preview, private, enrolled, admin, and expiry checks.
9. `labs/08-cleanup-and-feedback.md` - cleanup, service shutdown, and feedback format.

Canonical local checks:

```sh
pnpm install
pnpm type:check
pnpm test
pnpm -F @de100/apps-proto-cook-web build
pnpm -F @de100/apps-proto-cook-infra services:status
pnpm -F @de100/apps-proto-cook-infra minio:up
pnpm -F @de100/apps-proto-cook-infra minio:smoke
```

Current recommendation:

```txt
Hybrid API:
  oRPC handles typed control, upload planning, completion, signed access, and events.
  HTTP/provider routes handle large bytes, range reads, HLS artifacts, and Uppy protocols.

Storage:
  local-fs for simple offline development.
  minio-s3 for local S3-compatible parity.
  r2-s3 for remote production storage.

Video:
  upload original -> storage
  worker -> ffmpeg HLS artifacts
  app -> signed playback session
  player -> native video + lazy hls.js
```
