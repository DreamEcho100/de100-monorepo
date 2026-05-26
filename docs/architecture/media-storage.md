# Media Storage Architecture

## Current baseline

The media layer now supports two storage drivers behind one shared server abstraction:

- `r2`: the managed object-storage path backed by runtime bucket bindings
- `local`: a Node-only local filesystem fallback for local development and testing

The active self-host deployment guidance expects three storage-related primitives for the `r2` driver:

- `PUBLIC_MEDIA_BUCKET`: R2 bucket for public or cache-friendly assets
- `PRIVATE_MEDIA_BUCKET`: R2 bucket for authenticated or owner-scoped objects

These bindings are described by the current infra docs under `packages/apps/lms/infra/docs`.

For the end-to-end production deployment path, see `docs/setup/production-deployment.md`.

The active driver is selected through `APP_LMS_MEDIA_STORAGE_DRIVER`. When `APP_LMS_MEDIA_STORAGE_DRIVER=local`, objects are stored under `APP_LMS_MEDIA_LOCAL_ROOT` and the same app-facing media URLs still work.

## Why split public and private buckets

Public and private objects have different access, caching, and signing requirements.

The split keeps those concerns separate from the start:

- public assets can be served aggressively and later attached to a custom delivery domain
- private assets can stay behind app-issued URLs, auth checks, or signed access flows

## Current delivery model

- R2 is the generic object store for files and raw media blobs in deployed environments
- the `r2` read/write adapter resolves request runtime bucket bindings first, then falls back to hosted `APP_LMS_MEDIA_S3_*` configuration
- local storage mirrors the same public/private bucket split on disk for development and test flows
- image and video transformation layers are follow-up work, because they are product-specific beyond the current repo-safe baseline

## Current access flows

- upload, confirm, delete, list, and capability reads go through oRPC
- binary reads stay on app routes because they return raw object bodies
- public objects resolve through `/api/media/public/[...key]`
- private owner-only objects resolve through `/api/media/private/[...key]`
- signed reads resolve through `/api/media/signed/[token]`

Signed reads are app-issued and stateless. The media router signs `{ mediaId, userId, exp }` with `APP_LMS_MEDIA_SIGNING_SECRET` or `APP_LMS_BETTER_AUTH_SECRET`, and the signed route reloads the media record before streaming the object.

## Capabilities surfaced to the UI

The media API exposes a lightweight capability contract so the app can explain the active backend:

- `driver`: `r2` or `local`
- `supportsDirectPublicUrl`: `true` only for `r2`
- `supportsSignedDelivery`: `true` for both current drivers

That lets the `/media` page adapt its actions without hard-coding environment assumptions.

## Bound values available to the app

- `PUBLIC_MEDIA_BUCKET`
- `PRIVATE_MEDIA_BUCKET`
- `IMAGES`
- `PUBLIC_MEDIA_BUCKET_NAME`
- `PRIVATE_MEDIA_BUCKET_NAME`
- `PUBLIC_MEDIA_DEV_DOMAIN`

## Current gaps

- image optimization and variant generation are not implemented yet
- managed image and video pipelines are not full product flows yet
- large-file resumable or multipart uploads are still a follow-up if the starter grows beyond simple form uploads
