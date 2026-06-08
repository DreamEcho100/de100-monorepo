# Files Platform Architecture

## Recommended shape

The files platform is split into reusable packages plus the LMS app integration:

- `@de100/files-shared`: constants, schemas, route config, provider config, transfer policy, status transitions, processing contracts, IDs, size, and time helpers.
- `@de100/files-server`: app-injected operations, storage providers, signed access, temp-file utilities, oRPC handlers, event helpers, and processing pipeline runner.
- `@de100/files-client`: framework-neutral client, upload planner/runtime, protocol executors, and lazy Uppy plugin helpers.
- `@de100/files-domains-solidjs`: Solid components and hooks over the framework-neutral client/runtime.

Hybrid is the recommended default. oRPC owns typed control operations such as config, upload-mode resolution, direct small upload, target creation, completion, abort, signed access, variants, jobs, sessions, parts, and events. HTTP/provider routes own byte delivery, range reads, server-proxy uploads, provider-native upload targets, and external protocol compatibility.

HTTP-native is maintained as the full second path for route-first apps, Uppy-heavy clients, external tools, non-oRPC consumers, browser media playback, and interoperability tests.

RPC-native is not a top-level approach. `orpc-direct` is a Hybrid capability for small first-party flows when the active oRPC link supports `File`/`Blob` transfer and the configured direct-upload limit accepts the file.

## Public interfaces

The core selection API is `selectFilesUploadMode(input)`, which returns a `FilesUploadPlan`. The plan separates:

- API approach: `hybrid` or `http-native`
- storage backend: `local-fs`, `minio-s3`, `r2-s3`, or `s3-compatible`
- upload protocol: `orpc-direct`, `xhr`, `tus`, `s3-put`, `s3-multipart`, or `custom`
- delivery strategy: `orpc-blob`, `public-url`, `signed-url`, `private-http-route`, `provider-url`, or `range-http`
- integrations: `companion` and `transloadit`
- processing mode: `none`, `local-pipeline`, `transloadit-assembly`, or `custom`

Client code starts from `createFilesClient()`. It can use `/api/files/*` by default, or accept an app-provided `rpc` adapter for direct oRPC upload/download/events. Queueing and upload control live in `createFilesUploaderRuntime()`. Solid apps use `FileUploader` or `createFileUploaderController()` from `@de100/files-domains-solidjs/client`.

Server integrations provide `FilesOperations`: context creation, file records, upload sessions, upload parts, variants, and processing jobs. Storage is selected through `createFilesStorageProvider()` or an app-owned provider factory. Signed access uses the server helpers from `@de100/files-server/signed-access`.

Processing uses `createFilesPipeline()` and `runFilesProcessingJob()`. Pipeline stages aggregate metadata, emit variants, run cleanup callbacks, retry configured failures, persist processing job output, and update file status.

## LMS integration

The product `/files` page uses the Hybrid path. It lists files, uploads through the Solid uploader/runtime, requests signed access, shows generated variants, and links binary reads through `/api/files/*`.

The lab routes keep both approaches visible:

- `/en/files-lab`: comparison shell
- `/en/files-lab/hybrid`: Hybrid controls and fixtures
- `/en/files-lab/http`: HTTP-native controls and fixtures

The HTTP surface is intentionally broad: public/private/signed reads, range delivery, config, upload-mode resolution, target creation, completion, abort, variants, disabled integration routes, and server-proxy upload protocol routes.

Course-video HLS is documented separately in `docs/architecture/course-video-files.md`. That guide covers HLS artifact groups, signed playback sessions, AES-128 HLS, DRM prototypes, provider tradeoffs, and browser evaluation expectations.

Processing addons are documented in `docs/architecture/files-processing-addons.md`. Upload protocols, integrations, delivery strategies, and byte-path limits are documented in `docs/architecture/files-upload-delivery.md`.

## Protocol, processing, and security policy

Upload protocols and integrations are different layers. `orpc-direct`, `xhr`, `tus`, `s3-put`, `s3-multipart`, and `custom` are upload protocols. Companion and Transloadit are integrations. Range reads are delivery policy, not an upload protocol.

Every byte strategy has explicit limits. `orpc-direct` and `xhr` are constrained by app-server payload limits. Tus is constrained by chunk, session, and expiration policy. S3 single-part and multipart paths are constrained by provider limits. Transloadit is constrained by vendor and app config.

The default client executors support fetch-backed `xhr`, `s3-put`, and `custom`. Tus, S3 multipart, Companion, and Transloadit require configured services or app-provided executors. Disabled integrations return explicit not-configured responses.

Processing jobs are app-injected. The LMS app currently runs validate, metadata, and variant stages after upload completion, persists job attempts/output/error, persists variants, and updates file status. Temp-file helpers in `@de100/files-server/temp-files` are available for stages that need scoped working directories or local byte copies; cleanup callbacks run after success or failure.

The security model is owner-scoped by default. Private reads require a session and verify the requested key belongs to the current user prefix. Signed access is short-lived and reloads the file record before streaming bytes. Public and private buckets stay separate, and generated variants inherit the file readability check before delivery.

## Future adapters

The current server adapter is oRPC. Future adapters should preserve the same app-injected `FilesOperations` contract and only replace the procedure/router binding layer. The intended server targets are tRPC, Hono, Express, Fastify, Nitro/H3, and Workers.

The current client domain is Solid. Future React, Vue, Svelte, and other framework domains should wrap `@de100/files-client` rather than reimplementing protocol selection, queueing, signed access, or Uppy loading.
