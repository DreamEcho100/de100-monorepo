# Course Video Files Architecture

## Product Default

Large course videos should use HLS artifact groups, not raw MP4 delivery as the main playback path.

The recommended production path is:

1. upload original video through the Hybrid API approach
2. use S3 multipart for large videos on MinIO/R2/S3-compatible storage
3. persist the original file
4. enqueue a worker job
5. worker generates HLS outputs with ffmpeg
6. worker writes artifacts to storage
7. app persists artifact groups and artifacts
8. app creates signed HLS playback sessions for entitled viewers
9. product player uses native `<video>` plus lazy `hls.js`

`@de100/files-*` packages stay general. Proto Cook injects DB, auth, course entitlements, queues, storage providers, telemetry, and worker process wiring.

## Current Package Responsibilities

| Package | Responsibility |
| --- | --- |
| `@de100/files-shared` | HLS/artifact schemas, playback session schemas, protection contracts, analytics contracts |
| `@de100/files-server` | artifact delivery, signed HLS sessions, playback source helpers, HLS protection helpers, DRM prototype descriptors, worker/pipeline primitives |
| `@de100/files-client` | framework-neutral upload planning/runtime and protocol executors |
| `@de100/files-domains-solidjs` | `FileUploader`, `createFileUploaderController`, `HlsVideoPlayer`, Solid helpers |
| `@de100/files-processing-video` | HLS ladder planning, ffmpeg command planning, artifact planning, AES-128 key artifact planning |
| `@de100/apps-proto-cook-api` | course services, files repositories, oRPC routers, processing bridge |
| `@de100/apps-proto-cook-worker` | Proto Cook worker config, queue adapters, run-once/loop primitives |

## Course Model

The Proto Cook integration uses these app-owned tables:

- courses
- course chapters
- course lessons
- course video assets
- course enrollments
- file artifact groups
- file artifacts
- file playback sessions
- file playback events

Entitlement policy:

- preview lessons are readable when the course is published
- enrolled or completed users can read private lessons
- course owner can read/manage their own draft/private lessons
- admin role is supported at the service boundary
- unauthorized private lessons do not receive playback sessions

## Artifact Groups

Use artifact groups for multi-object outputs:

- `hls`: normal signed HLS output
- `hls-encrypted`: HLS output with AES-128 key artifacts
- `drm`: future DRM-packaged output

Use `file_variants` for single-file outputs:

- optimized image
- poster-only output
- waveform
- thumbnails

HLS artifact groups contain:

- master manifest
- rendition manifests
- media segments
- poster
- captions
- metadata
- optional AES key artifact

## HLS Processing

The default course ladder is 480p, 720p, and 1080p, with source-aware skipping so low-resolution sources are not upscaled.

Initial accepted source formats:

- MP4
- MOV
- WebM
- MKV

Default course-video limits:

- 2 GB per file
- 2 hours per video
- local worker concurrency 1
- original retention configurable per route, with course default set to keep originals

The ffmpeg adapter is app-injected. Core packages only plan commands and validate artifact outputs.

## Playback

Recommended product player:

- `HlsVideoPlayer` from `@de100/files-domains-solidjs/client`
- native HLS when the browser supports it
- lazy `hls.js` fallback when needed
- caption tracks
- QoE event callback

Current product flow:

1. lesson route asks `orpc.courses.createPlaybackSession` for a playback session
2. router checks course/lesson entitlements
3. router creates a signed HLS session
4. router returns a typed playback source with token-scoped URLs
5. player requests `/api/files/playback/hls/{token}/{path}`
6. route validates session, token, artifact group, artifact path, and artifact readiness
7. telemetry records QoE events through `orpc.courses.recordPlaybackEvent`

## Protection Modes

Signed HLS is the default:

- simplest to operate
- works with standard HLS playback
- keeps entitlement decisions in the app
- limits casual URL sharing through token TTL
- does not provide DRM

AES-128 HLS is implemented as an MVP prototype:

- video planner creates AES-128 key metadata
- ffmpeg command planning supports key-info files
- worker persists `hls-key` artifacts
- manifests use package key URI placeholders
- server rewrites placeholders to signed playback key URLs
- key bytes are served only through `/api/files/playback/hls/{token}/keys/{keyId}`
- generic artifact reads refuse `hls-key`
- course playback sessions inherit `aes-128` from encrypted artifact-group metadata

AES-128 is useful for selected routes where copied segment URLs should be less useful. It is not DRM.

DRM is prototype-only:

- self-owned R2/Shaka-style descriptor
- Cloudflare Stream managed descriptor
- disabled/prototype descriptor helper

Do not make DRM the product default until a real lab proves packaging, license delivery, player support, entitlement integration, operational setup, and failure handling.

## Provider Comparison

| Path | Use when | Main tradeoff |
| --- | --- | --- |
| Self-owned R2/MinIO/AWS HLS | You want storage ownership, lower lock-in, app-owned entitlements, and package-level control | You own ffmpeg workers, HLS packaging, variants, security, monitoring, retries, and playback edge cases |
| Cloudflare Stream | You want managed upload/encoding/delivery in the Cloudflare ecosystem | Less control over packaging/storage shape and a separate managed-video workflow |
| Mux or similar managed video | You want managed encoding, analytics, player ecosystem, and operational simplicity | Provider lock-in and cost profile need separate product approval |
| Bunny or other video/CDN providers | You want a managed video/CDN path with provider-specific pricing/features | Provider APIs and security model become app-specific adapter work |

The project recommendation remains self-owned HLS on R2/MinIO for the default Proto Cook files platform, with managed providers documented as adapter choices.

## Optional Cloudflare Worker Edge Adapter

The current app route can serve signed HLS directly. A future Cloudflare Worker adapter can move private HLS delivery closer to R2:

- app creates playback session and token
- Worker validates token or calls an app introspection endpoint
- Worker reads R2 objects
- Worker rewrites AES key URLs if needed
- Worker applies cache policy only where safe

Keep the app as the source of truth for entitlements. Do not let an edge cache turn private session-scoped responses into public assets.

## Browser Evaluation

Phase 12 should evaluate:

- product lesson route with normal signed HLS
- encrypted HLS fixture where ffmpeg/worker/storage are available
- package player
- helper-only player
- external adapter prototype
- caption rendering
- QoE event submission
- range/seek behavior
- unauthorized private lesson behavior

Use the VS Code integrated browser if available. Otherwise use headed Playwright:

```sh
pnpm -F @de100/apps-proto-cook-web test:browser:headed
```

