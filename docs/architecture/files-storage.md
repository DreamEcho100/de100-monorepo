# Files Storage And Delivery Architecture

## Current baseline

The files layer supports two app-level storage drivers behind one shared server abstraction:

- `s3`: S3-compatible object storage. The provider profile is selected with `APP_LMS_FILES_S3_PROVIDER=r2|minio|aws|custom`.
- `local`: a Node-only local filesystem fallback for offline development, tests, demos, and small single-node projects.

The active self-host deployment guidance expects these storage-related primitives for the `s3` driver:

- `PUBLIC_FILES_BUCKET`: R2 bucket for public or cache-friendly assets
- `PRIVATE_FILES_BUCKET`: R2 bucket for authenticated or owner-scoped objects

These bindings are described by the current infra docs under `packages/apps/lms/infra/docs`.

For the end-to-end production deployment path, see `docs/setup/production-deployment.md`.

For storage setup examples across local filesystem, MinIO, R2, AWS S3, and custom S3-compatible providers, see `docs/setup/files-storage-r2-minio.md`.

The active driver is selected through `APP_LMS_FILES_STORAGE_DRIVER`. When `APP_LMS_FILES_STORAGE_DRIVER=local`, objects are stored under `APP_LMS_FILES_LOCAL_ROOT` and the same app-facing files URLs still work. Runtime policy maps this profile to `local-fs`. When `APP_LMS_FILES_STORAGE_DRIVER=s3`, configure `APP_LMS_FILES_S3_PROVIDER` plus the generic `APP_LMS_FILES_S3_*` endpoint, region, bucket, and credential values. Runtime policy maps these profiles to `r2-s3`, `minio-s3`, or `s3-compatible`.

## Why split public and private buckets

Public and private objects have different access, caching, and signing requirements.

The split keeps those concerns separate from the start:

- public assets can be served aggressively and later attached to a custom delivery domain
- private assets can stay behind app-issued URLs, auth checks, or signed access flows

## Current delivery model

- S3-compatible object storage is the generic production path for files and raw file blobs.
- The `r2` provider profile resolves request runtime bucket bindings first, then falls back to hosted `APP_LMS_FILES_S3_*` configuration.
- The `minio` provider profile is the recommended local production-parity path when developers need S3-compatible behavior offline.
- local storage mirrors the same public/private bucket split on disk for development and test flows
- generated variants are stored through the same storage provider and served by app routes

## Current access flows

- Hybrid is the recommended app template: oRPC owns typed control-plane operations, `orpc-direct` is available for small first-party uploads, and HTTP/provider routes handle binary/range/provider-native paths.
- HTTP-native is maintained as a full second path for teams that prefer route-first integration with Uppy and external tools.
- public objects resolve through `/api/files/public/[...key]`
- private owner-only objects resolve through `/api/files/private/[...key]`
- signed reads resolve through `/api/files/signed/[token]`
- generated variants resolve through `/api/files/{id}/variants/{variant}`
- range-capable reads are a delivery strategy, not an upload protocol

Signed reads are app-issued and stateless. The files router signs `{ fileId, userId, exp }` with `APP_LMS_FILES_SIGNING_SECRET` or `APP_LMS_BETTER_AUTH_SECRET`, and the signed route reloads the files record before streaming the object.

Delivery strategies are separate from upload protocols:

- `orpc-blob`: small first-party direct transfer through an RPC adapter
- `public-url`: direct public delivery when a provider/domain can expose the object
- `signed-url`: short-lived app-issued private access
- `private-http-route`: authenticated app route reads
- `provider-url`: S3-compatible provider-native upload/read target
- `range-http`: app route delivery with byte-range support for media playback

Upload protocols are selected separately: `orpc-direct`, `xhr`, `tus`, `s3-put`, `s3-multipart`, or `custom`. Companion and Transloadit are integrations, not protocols. The default client executors cover fetch-backed `xhr`, `s3-put`, and `custom`; Tus, S3 multipart, Companion, and Transloadit require configured services or app-provided executors.

## Capabilities surfaced to the UI

The files API exposes a lightweight capability contract so the app can explain the active backend:

- `driver`: `s3` or `local`
- `provider`: `r2`, `minio`, `aws`, `custom`, or `null`
- `supportsDirectPublicUrl`: `true` for S3-compatible providers with public/provider URLs
- `supportsSignedDelivery`: `true` for both current drivers

That lets the `/files` page adapt its actions without hard-coding environment assumptions.

The product `/files` page also lists generated variants for ready files. Current LMS processing produces:

- image `optimized`
- video `poster`
- audio `waveform`

Image variants use `sharp` when available and fall back to source-copy output when optional dependencies are unavailable. Video and audio variants require an injected ffmpeg-shaped adapter.

## Bound values available to the app

- `PUBLIC_FILES_BUCKET`
- `PRIVATE_FILES_BUCKET`
- `IMAGES`
- `PUBLIC_FILES_BUCKET_NAME`
- `PRIVATE_FILES_BUCKET_NAME`
- `PUBLIC_FILES_DEV_DOMAIN`

## Current gaps

- provider-backed Tus and S3 multipart flows need configured services before they are recommended for product traffic
- Companion and Transloadit routes are explicit disabled-integration paths until app config enables them
- full managed video transcoding remains a future product workflow beyond poster and waveform generation
