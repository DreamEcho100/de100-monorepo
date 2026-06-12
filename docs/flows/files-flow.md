# Files Flow

## Goal

The current files flow proves the Proto Cook app can upload, list, process, generate variants, confirm, delete, and issue signed private-access links while keeping binary delivery on app/provider routes.

## Hybrid upload path

1. The signed-in user submits the form on `/files`.
2. The Solid `FileUploader` calls the framework-neutral files runtime.
3. The runtime calls `/api/files/upload-mode` or the equivalent oRPC handler to resolve the `FilesUploadPlan`.
4. Small eligible Hybrid files use `orpc-direct` when the client has an RPC adapter that supports `File`/`Blob`.
5. Target-based files call `/api/files/targets`, upload bytes through the selected protocol target, then call `/api/files/{fileId}/complete`.
6. Completion runs the app-injected processing bridge before the file becomes `ready`.
7. The client invalidates the files query and refreshes file records plus variants.

The same policy supports images, videos, audio, documents, and generic files. Large video/audio flows should select upload targets such as Tus or S3-compatible protocols when those services are configured.

## Management request path

1. `/files` reads records through `orpc.files.getAll.queryOptions()`.
2. Signed-access, delete, upload-session, processing-job, upload-part, and variant operations use typed oRPC handlers or matching `/api/files/*` routes.
3. Each successful write invalidates the relevant files query so the page refreshes from the API source of truth.

## HTTP-native path

1. HTTP-native clients start from `/api/files/config` and `/api/files/upload-mode`.
2. Server-proxy uploads use `/api/files/upload/{protocol}/{sessionId}` for enabled app-server protocols.
3. Provider-native uploads use target URLs created by `/api/files/targets`.
4. Completion, abort, signed access, variants, and reads stay under `/api/files/*`.
5. Disabled integrations such as Companion and Transloadit return explicit not-configured responses.

## Read request path

### Public files

1. The client requests `/api/files/public/[...key]`.
2. The route reads the object from `PUBLIC_FILES_BUCKET`.
3. The helper maps object metadata into the HTTP response.

### Private files

1. The client requests `/api/files/private/[...key]`.
2. The route requires a valid Better Auth session.
3. The route verifies that the requested key starts with the current user's storage prefix.
4. The route reads the object from `PRIVATE_FILES_BUCKET` only if that ownership check passes.

### Signed files

1. The client requests a signed access URL through `orpc.files.issueSignedAccess.mutationOptions()`.
2. The files router issues a short-lived token tied to the current user and files record.
3. The client follows `/api/files/signed/[token]`.
4. The signed route verifies the token, checks expiry, and then reads the private object through the same owner-scoped files helpers.

### Variant files

1. The client requests `/api/files/{id}/variants/{variant}`.
2. The route verifies the base file is readable.
3. The route selects a ready, live variant by kind.
4. The route streams the variant object through the same response helper used for normal file objects.

Range-capable reads are delivery policy. They support media playback and cache behavior, but they do not decide how uploads happen.

## Processing path

1. Upload completion creates or updates a processing job.
2. `runFilesProcessingJob()` marks the file `processing` and the job `running`.
3. The pipeline runs configured stages. The Proto Cook pipeline currently validates storage, records metadata, and generates variants.
4. Stage metadata, generated variants, errors, duration, attempts, and cleanup behavior are aggregated into job output.
5. On success, variants are persisted and the file is marked `ready`.
6. On failure, the job stores the serialized error and the file is marked `failed`.

Current Proto Cook variants are:

- image `optimized`
- video `poster`
- audio `waveform`

Optional dependencies are lazy. `sharp`, `file-type`, `exifr`, and `music-metadata` can be loaded as packages. `ffmpeg` and `ffprobe` require app-injected adapters or executables.

## Course video HLS path

Course videos use the same upload/runtime primitives, then move into a storage-first worker path:

1. Course-video uploads land in storage through the selected route policy.
2. The Proto Cook API attaches the uploaded file to a lesson video asset.
3. The API enqueues a `video-hls` or `video-hls-encryption` processing job.
4. The files worker loads the original, runs the ffmpeg-shaped adapter, writes staging outputs, validates generated artifacts, promotes outputs, and persists the artifact group.
5. Entitled viewers request a signed HLS playback session through `orpc.courses.createPlaybackSession`.
6. The product player reads token-scoped manifests, segments, captions, posters, and optional AES key URLs through `/api/files/playback/hls/{token}/{path}`.

See `docs/architecture/course-video-files.md` and `docs/setup/files-worker-deployment.md` for the full operational model.

## Current boundaries

- Hybrid is the recommended default, and HTTP-native remains the full second path
- `orpc-direct` is a small-file Hybrid capability, not a complete binary strategy for every workflow
- files procedures declare output schemas, error maps, and OpenAPI route metadata
- signed private-sharing links flow through oRPC or HTTP control endpoints, then use a dedicated signed-read route for binary delivery
- public, private, signed, variant, and range reads use direct app routes because they return binary responses and need runtime files bucket access
- private reads remain owner-prefixed at the route boundary
- public reads can return a direct URL when a public storage domain binding is available
- local filesystem storage is available for simple development, while `s3` with `APP_PROTO_COOK_FILES_S3_PROVIDER=r2|minio|aws|custom` is the production-parity model
- Tus, S3 multipart, Companion, and Transloadit require configured services or app-provided executors before they should carry product traffic

## Next likely steps

- finish Phase 11 docs and examples
- run Phase 12 full QA gates, stale media scans, built smoke checks, and browser evaluation
- decide whether any lab-only HTTP-native or integration code should graduate into normal product flows
