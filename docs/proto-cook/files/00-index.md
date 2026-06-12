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

Canonical local checks:

```sh
pnpm install
pnpm type:check
pnpm test
pnpm -F @de100/apps-proto-cook-web build
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
