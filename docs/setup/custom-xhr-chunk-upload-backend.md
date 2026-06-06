# Custom XHR Chunk Upload Backend Handoff

This document is a next-cycle spec. It does not change the current delivery.

## Current Baseline

The current uploader platform has two layers:

- `@de100/ui-domains-solidjs` owns the typed uploader contracts, Uppy-backed runtime, protocol selection, queue persistence, and provider adapter boundary.
- `apps/lms-web` currently adapts the files page to the app files API through `@de100/files-client` and `@de100/files-domains-solidjs`.

The current app files API uploads starter-sized `File` payloads through oRPC and persists files rows with `draft`, `ready`, or `deleted` status. Large-file chunking is intentionally deferred.

## Goal

Add a backend contract that can receive large files through chunked XHR uploads without replacing the existing public uploader adapter shape. The UI package should continue to depend on `UploaderProviderAdapter`, while the app/backend decides whether the target maps to simple upload, resumable Tus, or app-owned chunked XHR.

## Non-Goals

- Do not replace `@uppy/xhr-upload` or `@uppy/tus`.
- Do not add product-specific transcoding or scanning in the upload endpoint itself.
- Do not expose private bucket keys to the browser.
- Do not make chunk upload the only path. Small files should keep the simpler direct path.

## Proposed API Surface

The next-cycle backend should expose an upload session contract. Names can change during implementation, but the shape should stay stable.

### Create Session

`POST /api/files/uploads/chunked`

Request:

```json
{
  "fileName": "lesson-video.mp4",
  "contentType": "video/mp4",
  "size": 104857600,
  "visibility": "private",
  "chunkSize": 5242880,
  "checksum": {
    "algorithm": "sha256",
    "value": "optional-full-file-checksum"
  },
  "metadata": {
    "fileKind": "video",
    "lastModified": 1760000000000
  }
}
```

Response:

```json
{
  "uploadId": "upload_01h...",
  "targetId": "upload_01h...",
  "fileId": "file_01h...",
  "chunkSize": 5242880,
  "expiresAt": "2026-06-02T12:00:00.000Z",
  "receivedParts": []
}
```

Rules:

- Require an authenticated user.
- Validate visibility, content type, size, and chunk size with server validators.
- Persist an upload session row before accepting chunks.
- Create a files row in `draft` or a future upload-session-specific state, but do not expose it as `ready`.

### Upload Part

`PUT /api/files/uploads/chunked/{uploadId}/parts/{partNumber}`

Headers:

```text
Content-Type: application/octet-stream
Content-Length: <bytes>
X-Upload-Part-Checksum: optional-part-checksum
```

Response:

```json
{
  "uploadId": "upload_01h...",
  "partNumber": 1,
  "size": 5242880,
  "etag": "part-etag-or-hash"
}
```

Rules:

- Require upload ownership.
- Reject expired, completed, canceled, or failed sessions.
- Enforce exact part ordering only if the selected storage backend requires it. Otherwise allow idempotent retry by part number.
- Store part metadata transactionally after the object write succeeds.

### Complete Session

`POST /api/files/uploads/chunked/{uploadId}/complete`

Request:

```json
{
  "parts": [
    {
      "partNumber": 1,
      "etag": "part-etag-or-hash"
    }
  ]
}
```

Response:

```json
{
  "fileId": "file_01h...",
  "status": "draft",
  "visibility": "private"
}
```

Rules:

- Verify that all expected bytes were received.
- Verify declared part metadata against stored part metadata.
- Assemble or finalize the backend object.
- Keep the files row as `draft` unless the next-cycle status migration explicitly changes confirmation semantics.

### Abort Session

`DELETE /api/files/uploads/chunked/{uploadId}`

Response:

```json
{
  "uploadId": "upload_01h...",
  "aborted": true
}
```

Rules:

- Require upload ownership.
- Delete staged parts when the backend supports cleanup.
- Mark the session canceled or failed. Do not hard-delete audit metadata by default.

### Get Session

`GET /api/files/uploads/chunked/{uploadId}`

Response:

```json
{
  "uploadId": "upload_01h...",
  "fileId": "file_01h...",
  "status": "active",
  "chunkSize": 5242880,
  "receivedParts": [
    {
      "partNumber": 1,
      "size": 5242880,
      "etag": "part-etag-or-hash"
    }
  ],
  "expiresAt": "2026-06-02T12:00:00.000Z"
}
```

Rules:

- Use this endpoint for resume after reload.
- Return enough part state for the client to skip already accepted chunks.

## Storage Model

Recommended tables:

- `file_upload_sessions`
- `file_upload_parts`

Recommended session fields:

- `id`
- `file_id`
- `user_id`
- `visibility`
- `storage_key`
- `file_name`
- `content_type`
- `size`
- `chunk_size`
- `status`: `active`, `completing`, `completed`, `canceled`, `failed`, `expired`
- `expires_at`
- `created_at`
- `updated_at`

Recommended part fields:

- `upload_id`
- `part_number`
- `size`
- `etag`
- `checksum_algorithm`
- `checksum_value`
- `created_at`

## Uploader Adapter Mapping

The app adapter can preserve the current `UploaderProviderAdapter` shape:

- `createUploadTarget` creates an upload session and returns:
  - `targetId`: upload session id
  - `uploadUrl`: session upload endpoint or session base URL
  - `method`: `PUT`
  - `headers`: any required session headers
- `confirmUpload` calls complete/confirm and returns the existing `UploaderRecordRef`.
- `cancelUpload` calls abort.

If chunk orchestration cannot fit cleanly into `@uppy/xhr-upload`, add an app-owned runtime adapter that still emits the existing uploader events. Do not push chunk-specific endpoint knowledge into the UI package.

## Validation Requirements

- Maximum file size.
- Minimum and maximum chunk size.
- Maximum part count.
- Allowed files visibility.
- Allowed MIME types.
- Session ownership.
- Session expiry.
- Optional checksum validation.

## Failure Semantics

- Part retry should be idempotent by `uploadId + partNumber`.
- Complete should fail if bytes or part metadata do not match.
- Abort should be safe to call multiple times.
- Expired sessions should be cleanup candidates and should not produce ready files.

## Tests Required Next Cycle

- session creation validates ownership, size, MIME type, visibility, and chunk size
- part upload rejects wrong owner, expired sessions, invalid part number, and oversized chunks
- part upload is idempotent for repeated accepted parts
- complete verifies missing parts and mismatched part metadata
- abort marks the session canceled and calls storage cleanup
- app uploader runtime resumes accepted parts after reload
- existing simple upload path still passes

## Acceptance Checklist

- Small files still use the current simple upload path.
- Large files can resume after tab reload.
- Cancel cleans up backend state or marks it for cleanup.
- files records are never `ready` until the finalization path succeeds.
- The UI package public contracts remain stable.
