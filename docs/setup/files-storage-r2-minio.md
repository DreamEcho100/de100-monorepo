# Files Storage Setup: Local, MinIO, R2, And S3-Compatible Providers

## Purpose

This guide documents the storage profiles used by the files platform after the video-ready rewrite. The product direction is:

- use `local` only for simple offline development, tests, demos, and small single-node projects
- use `s3` plus `APP_LMS_FILES_S3_PROVIDER=minio` for local production-parity testing
- use `s3` plus `APP_LMS_FILES_S3_PROVIDER=r2` for the default remote production profile
- keep public and private buckets separate

The code-level storage contract lives in `@de100/files-server`. LMS owns environment parsing, provider creation, DB persistence, auth, and route wiring.

## Provider References

Use these upstream docs when changing provider behavior:

- Cloudflare R2 S3 API: https://developers.cloudflare.com/r2/api/s3/
- Cloudflare R2 S3 API compatibility table: https://developers.cloudflare.com/r2/api/s3/api/
- MinIO container docs: https://min.io/docs/minio/container/index.html
- Amazon S3 multipart upload limits: https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
- Uppy AWS S3 plugin: https://uppy.io/docs/aws-s3/

Do not bake provider pricing into project docs. Provider pricing and limits can change; keep those decisions in deployment notes or release evidence.

## Storage Profiles

| Profile | Env shape | Runtime storage backend | Intended use |
| --- | --- | --- | --- |
| Local filesystem | `APP_LMS_FILES_STORAGE_DRIVER=local` | `local-fs` | Offline development, tests, demos |
| MinIO | `APP_LMS_FILES_STORAGE_DRIVER=s3`, `APP_LMS_FILES_S3_PROVIDER=minio` | `minio-s3` | Local S3-compatible parity |
| Cloudflare R2 | `APP_LMS_FILES_STORAGE_DRIVER=s3`, `APP_LMS_FILES_S3_PROVIDER=r2` | `r2-s3` | Default remote production storage |
| AWS S3 | `APP_LMS_FILES_STORAGE_DRIVER=s3`, `APP_LMS_FILES_S3_PROVIDER=aws` | `s3-compatible` | AWS-native deployment |
| Custom S3-compatible | `APP_LMS_FILES_STORAGE_DRIVER=s3`, `APP_LMS_FILES_S3_PROVIDER=custom` | `s3-compatible` | Spaces, Wasabi, self-hosted providers, or app-provided endpoints |

Do not set the storage driver to an R2-specific value. R2 is modeled as the S3-compatible driver with provider `r2`.

## Local Filesystem

Use this for the fastest local loop:

```env
APP_LMS_FILES_STORAGE_DRIVER=local
APP_LMS_FILES_LOCAL_ROOT=./.local/files
APP_LMS_FILES_SIGNED_URL_TTL_SECONDS=3600
```

This mode mirrors public/private buckets under the local root, but it does not provide S3 multipart behavior. Course-video upload policy should therefore use local/server-proxy fallbacks unless a route explicitly forces S3-compatible testing.

## MinIO Local S3-Compatible Parity

Use MinIO when you need to exercise S3-style keys, buckets, presigned PUT, S3 multipart target planning, provider URL behavior, and future S3-backed HLS smoke.

Environment:

```env
APP_LMS_FILES_STORAGE_DRIVER=s3
APP_LMS_FILES_S3_PROVIDER=minio
APP_LMS_FILES_S3_ENDPOINT=http://127.0.0.1:9000
APP_LMS_FILES_S3_REGION=us-east-1
APP_LMS_FILES_S3_ACCESS_KEY_ID=minioadmin
APP_LMS_FILES_S3_SECRET_ACCESS_KEY=minioadmin
APP_LMS_FILES_S3_PUBLIC_BUCKET=public-files
APP_LMS_FILES_S3_PRIVATE_BUCKET=private-files
APP_LMS_FILES_S3_FORCE_PATH_STYLE=true
APP_LMS_FILES_SIGNED_URL_TTL_SECONDS=3600
```

The repo compose file includes a local MinIO service:

```sh
pnpm files:minio:up
```

The smoke script creates buckets automatically, but normal local environments should keep
the buckets separate:

- `public-files`
- `private-files`

Recommended CORS for browser direct upload tests should allow the local app origin, upload methods used by the current executor, and headers needed for presigned S3 operations. Do not use permissive production CORS rules by default.

## Cloudflare R2 Remote Profile

R2 uses the generic S3-compatible env contract:

```env
APP_LMS_FILES_STORAGE_DRIVER=s3
APP_LMS_FILES_S3_PROVIDER=r2
APP_LMS_FILES_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
APP_LMS_FILES_S3_REGION=auto
APP_LMS_FILES_S3_ACCESS_KEY_ID=replace-with-access-key-id
APP_LMS_FILES_S3_SECRET_ACCESS_KEY=replace-with-secret-access-key
APP_LMS_FILES_S3_PUBLIC_BUCKET=public-files
APP_LMS_FILES_S3_PRIVATE_BUCKET=private-files
APP_LMS_FILES_S3_FORCE_PATH_STYLE=true
```

The app should keep two buckets or equivalent isolated prefixes:

- public bucket: public images, public downloads, or cache-friendly course preview assets
- private bucket: user-owned uploads, private originals, private HLS manifests, private HLS segments, AES key artifacts

Do not mix public and private course-video artifacts in the same delivery path. Private HLS should be read through signed playback sessions, app proxy, provider-signed URLs, or a future edge adapter.

## AWS S3 Or Custom S3-Compatible Providers

For AWS S3:

```env
APP_LMS_FILES_STORAGE_DRIVER=s3
APP_LMS_FILES_S3_PROVIDER=aws
APP_LMS_FILES_S3_ENDPOINT=https://s3.<region>.amazonaws.com
APP_LMS_FILES_S3_REGION=<region>
APP_LMS_FILES_S3_ACCESS_KEY_ID=replace-with-access-key-id
APP_LMS_FILES_S3_SECRET_ACCESS_KEY=replace-with-secret-access-key
APP_LMS_FILES_S3_PUBLIC_BUCKET=public-files
APP_LMS_FILES_S3_PRIVATE_BUCKET=private-files
APP_LMS_FILES_S3_FORCE_PATH_STYLE=false
```

For a custom S3-compatible provider:

```env
APP_LMS_FILES_STORAGE_DRIVER=s3
APP_LMS_FILES_S3_PROVIDER=custom
APP_LMS_FILES_S3_ENDPOINT=https://storage.example.com
APP_LMS_FILES_S3_REGION=us-east-1
APP_LMS_FILES_S3_ACCESS_KEY_ID=replace-with-access-key-id
APP_LMS_FILES_S3_SECRET_ACCESS_KEY=replace-with-secret-access-key
APP_LMS_FILES_S3_PUBLIC_BUCKET=public-files
APP_LMS_FILES_S3_PRIVATE_BUCKET=private-files
APP_LMS_FILES_S3_FORCE_PATH_STYLE=true
```

Provider-specific endpoint, addressing, CORS, multipart, and signed URL behavior must be validated with provider smoke tests before recommending it for product traffic.

## Upload Protocol Defaults

The course-video route should prefer:

- `s3-multipart` for MinIO/R2/S3-compatible large videos
- `s3-put` for smaller direct S3-compatible objects where route policy permits it
- `xhr` as a server-proxy fallback
- `tus` only when a Tus service is configured
- `orpc-direct` only for small Hybrid flows, not large course video

Companion and Transloadit are integrations, not upload protocols. They remain disabled until configured.

## Delivery Defaults

Recommended private course-video delivery is signed HLS:

- course playback procedure creates a signed HLS playback session
- the app returns a token-scoped master manifest URL
- manifests, segments, captions, posters, and AES keys are read through `/api/files/playback/hls/{token}/{path}`
- key artifacts are not exposed through generic file routes

Other supported delivery strategies remain available for app-specific policy:

- public URL
- signed URL
- private HTTP route
- provider URL
- range HTTP
- app proxy
- signed cookies

## Smoke Checklist

For local filesystem:

```sh
pnpm -F @de100/apps-lms-db db:up
pnpm -F @de100/apps-lms-db db:migrate
pnpm -F @de100/apps-lms-web dev
```

For MinIO parity:

```sh
docker compose up -d lms-postgres lms-redis
pnpm files:minio:up
pnpm -F @de100/apps-lms-db db:migrate
pnpm files:minio:smoke
pnpm -F @de100/apps-lms-web dev
```

Then verify:

- `/en/files` loads
- `/en/files-lab/hybrid` loads
- `/en/files-lab/http` loads
- `/api/files/config` reports the expected driver/provider
- `/api/files/upload-mode` selects S3-compatible protocol paths for course-video route policy when configured

`pnpm files:minio:smoke` validates the provider path directly:

- creates public and private buckets when missing
- writes and reads public/private objects
- starts and aborts a multipart upload
- generates a short encrypted HLS fixture with ffmpeg
- uploads the original, manifest, AES key, and segment objects
- verifies manifest, key, segment range read, object metadata, and cleanup behavior
