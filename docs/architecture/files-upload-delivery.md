# Files Upload And Delivery Strategies

## Layered Terminology

Do not use a flat "transport" label. The files platform separates:

- API approach: `hybrid` or `http-native`
- storage backend: `local-fs`, `minio-s3`, `r2-s3`, or `s3-compatible`
- upload protocol: `orpc-direct`, `xhr`, `tus`, `s3-put`, `s3-multipart`, or `custom`
- delivery strategy: `orpc-blob`, `public-url`, `signed-url`, `private-http-route`, `provider-url`, or `range-http`
- integration: `companion` or `transloadit`
- processing mode: `none`, `local-pipeline`, `transloadit-assembly`, or `custom`

Companion and Transloadit are integrations, not upload protocols. Range reads are delivery policy, not upload policy.

## API Approaches

Hybrid is the recommended default:

- oRPC handles typed control-plane operations
- app/provider routes handle large byte transfer, range reads, provider-native uploads, HLS, and compatibility protocols
- `orpc-direct` remains a small-file capability inside Hybrid

HTTP-native is maintained as a full second path:

- useful for route-first apps, external clients, Uppy-heavy clients, and non-oRPC consumers
- weaker first-party type ergonomics unless wrapped by an app client
- best compatibility surface for browser media, range reads, and provider protocol testing

RPC-native is not a top-level approach.

## Upload Protocols

| Protocol | Use when | Current status |
| --- | --- | --- |
| `orpc-direct` | Small first-party Hybrid uploads where the RPC link supports `File`/`Blob` | Available as a capability, not for large course videos |
| `xhr` | App-server proxy uploads and simple compatibility | Fetch-backed executor available |
| `tus` | Resumable uploads through a configured Tus server | Requires configured service or app executor |
| `s3-put` | Small direct S3-compatible object upload with presigned URL | Fetch-backed executor available |
| `s3-multipart` | Large S3-compatible direct upload, especially course videos | Planner/target shape available; product use requires configured provider flow |
| `custom` | App-owned protocol adapter | Fetch-backed custom executor shape available |

Uppy references:

- XHR Upload: https://uppy.io/docs/xhr-upload/
- Tus: https://uppy.io/docs/tus/
- AWS S3: https://uppy.io/docs/aws-s3/

## Integrations

Companion:

- remote-source integration and optional S3 signing backend
- useful when the app wants Dropbox/Google Drive/etc. remote sources or Companion-managed S3 routes
- not enabled by default

Transloadit:

- managed upload/processing integration
- useful when vendor-managed assemblies should own processing
- not enabled by default

Disabled integrations must return deterministic not-configured responses.

## Delivery Strategies

| Strategy | Use when |
| --- | --- |
| `orpc-blob` | Small first-party direct download through an RPC adapter |
| `public-url` | Public assets can be exposed directly or through a public domain |
| `signed-url` | Short-lived app-issued access to a private object |
| `private-http-route` | Authenticated owner-scoped app route reads |
| `provider-url` | Provider-native object URLs or presigned provider URLs |
| `range-http` | Media playback, seek behavior, partial content, and cache-aware binary reads |

Course-video HLS uses signed playback session URLs under `/api/files/playback/hls/{token}/{path}`. AES key URLs use the same session namespace.

## Explicit Limits

Every byte path needs limits:

- `orpc-direct`: RPC payload limit and app memory budget
- `xhr`: app-server request limit, timeout, and proxy memory/disk policy
- `tus`: chunk size, session expiration, cleanup, and max file size
- `s3-put`: provider single-object PUT limit and route max file size
- `s3-multipart`: provider part size/count limits, abort policy, and incomplete upload cleanup
- Transloadit: vendor/config limits
- range reads: delivery authorization and cache policy, not upload size policy

For S3-compatible multipart limits, verify against the active provider. AWS S3 limits are documented at https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html; compatible providers can differ.

## Recommended Defaults

Local filesystem:

- small files: `orpc-direct` when eligible
- simple uploads: `xhr`
- reads: private/public/signed app routes
- video range reads: app HTTP routes

MinIO/R2/S3-compatible:

- small direct objects: `s3-put`
- large course videos: `s3-multipart`
- private course playback: signed HLS route
- public assets: public/provider URL where policy permits

Managed processing:

- Transloadit only when the route explicitly requests vendor-managed upload/processing and credentials are configured
- Companion only when remote-source ingestion or Companion-managed signing is required

## Testing Policy

Keep high-value tests:

- upload plan selection by file size, kind, route, storage backend, and forced override
- disabled integration behavior
- private/public/signed/range read behavior
- HLS signed playback and AES key route behavior
- app-server limits for `orpc-direct` and `xhr`
- provider target shape for S3 PUT and multipart

Avoid tests that duplicate TypeScript import/export guarantees unless they protect a known package-boundary regression.

