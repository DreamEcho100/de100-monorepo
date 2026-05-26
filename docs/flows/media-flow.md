# Media Flow

## Goal

The current media baseline proves that the LMS app can upload, list, confirm, delete, and issue signed private-access links through the shared oRPC surface while still serving binary objects through app routes with private files kept owner-scoped.

## Upload request path

1. The signed-in user submits the form on `/media`.
2. The page calls `orpc.media.upload.mutationOptions()` through TanStack Query `createMutation`.
3. The RPC handler forwards the request into `packages/apps/lms/api` and creates the typed context from the live request.
4. `protectedProcedure` requires a valid Better Auth session before the media router runs.
5. The upload procedure validates the `File` and requested visibility through `@de100/apps-lms-validators/server`.
6. The media helper builds a storage key under the current user namespace and writes the object into either `PUBLIC_MEDIA_BUCKET` or `PRIVATE_MEDIA_BUCKET`.
7. The procedure persists the draft media row in the DB and returns the serialized media record, including the app-facing access URL.

## Management request path

1. `/media` reads records through `orpc.media.getAll.queryOptions()`.
2. Confirm and delete actions use `createMutation` with `orpc.media.confirmUpload.mutationOptions()` and `orpc.media.delete.mutationOptions()`.
3. Each successful write invalidates the shared `orpc.media.getAll.queryKey()` cache so the page refreshes from the API source of truth.

## Read request path

### Public media

1. The client requests `/api/media/public/[...key]`.
2. The route reads the object from `PUBLIC_MEDIA_BUCKET`.
3. The helper maps object metadata into the HTTP response.

### Private media

1. The client requests `/api/media/private/[...key]`.
2. The route requires a valid Better Auth session.
3. The route verifies that the requested key starts with the current user's storage prefix.
4. The route reads the object from `PRIVATE_MEDIA_BUCKET` only if that ownership check passes.

### Signed media

1. The client requests a signed access URL through `orpc.media.issueSignedAccess.mutationOptions()`.
2. The media router issues a short-lived token tied to the current user and media record.
3. The client follows `/api/media/signed/[token]`.
4. The signed route verifies the token, checks expiry, and then reads the private object through the same owner-scoped media helpers.

## Current boundaries

- uploads and management now flow through oRPC, including `File` input handling for the current starter-sized payloads
- media procedures now also declare explicit output schemas, error maps, and OpenAPI route metadata
- signed private-sharing links now flow through oRPC for issuance and a dedicated signed-read route for binary delivery
- public and private object reads still use direct app routes because they return binary responses and need runtime media bucket access
- private reads remain owner-prefixed at the route boundary
- public reads can return a direct URL when a public storage domain binding is available
- local filesystem storage is available for development, while R2 remains the production-oriented backend
- image transformation and video-specific workflows are still follow-up work

## Next likely steps

- validate the generated OpenAPI shape in the API reference UI and extend the same metadata discipline to any remaining thin procedures
- decide where managed image and video variants belong in the product surface
- add media variants, optimization pipelines, and clearer unsupported-state UX for backend-specific capabilities
