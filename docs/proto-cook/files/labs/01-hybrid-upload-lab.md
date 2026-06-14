# Files Labs 01 - Hybrid Upload Lab

Route:

```txt
/en/files-lab/hybrid
```

Hybrid is the recommended default. It uses oRPC for typed control-plane operations and HTTP/provider paths for large bytes, range reads, HLS artifacts, and Uppy-compatible protocols.

## Flow

```txt
browser form
  |
  | route slug + file metadata + selected storage profile
  v
oRPC control plane
  |
  | upload plan: protocol, limits, target, visibility
  v
HTTP/provider byte path
  |
  | upload bytes
  v
complete record + signed/private/public reads
```

## Auto Local-FS Check

1. Open `/en/files-lab/hybrid`.
2. Select:
   - track: `practical`
   - storage profile: `local-fs`
   - upload protocol: `auto`
   - visibility: `private`
3. Click `Generate fixtures`.
4. Click `Upload selected`.

Expected:

- The run log records a successful Hybrid upload.
- Each item shows target details and a completed record.
- Private files are not readable through public URL behavior.
- Small files can use app-server friendly paths.

Evidence to capture:

- UI: selected track, storage profile, upload protocol, and visibility.
- Network: oRPC control-plane request plus the selected byte path.
- Policy: private/public decision for at least one completed file.
- Storage: local-fs path or explicit storage profile log.

## Forced XHR Check

1. Keep storage profile `local-fs`.
2. Set upload protocol to `xhr`.
3. Upload a generated image and a document.

Expected:

- The app uses the HTTP upload route.
- Progress moves from pending to completed.
- Completion still happens through the typed files client runtime.

Evidence to capture:

- Network request under `/api/files/*`.
- Progress or run-log state before and after completion.
- Completed file record ID.

## Forced oRPC-Direct Check

1. Set upload protocol to `orpc-direct`.
2. Upload a small text or tiny image file.
3. Repeat with a larger file.

Expected:

- Small files are accepted when route limits allow the byte strategy.
- Oversized files fail with an explicit limit error.
- This remains a Hybrid capability, not a top-level RPC-native architecture.

Evidence to capture:

- Accepted small-file run-log entry.
- Rejected oversized-file error copy.
- Confirmation that the error names the limit instead of silently falling back.

## S3-Shaped Planning Check

1. Switch storage profile to `minio-s3`.
2. Set upload protocol to `auto`.
3. Upload generated fixtures.

Expected:

- Planner prefers S3-compatible direct object behavior when available.
- Large or stress-track files move toward multipart-shaped planning.
- If MinIO is not running, the error is explicit and points to provider availability.

Evidence to capture:

- Planner result for `auto`.
- MinIO/provider availability status.
- Any disabled or incomplete provider error.

## QA Checklist

| Check | Pass condition |
| --- | --- |
| Auto local-fs | Upload completes and policy evidence is visible |
| Forced XHR | Network uses `/api/files/*` and completion still records typed file metadata |
| Forced oRPC-direct | Small file succeeds; oversized file fails explicitly |
| MinIO/S3-shaped planning | Planner names S3-compatible path or provider config error |
| Localization | All visible labels and errors come from i18n copy |

## Feedback To Capture

```txt
Was the selected protocol obvious?
Did the target/status language tell you what happened?
Did the private/public visibility behavior match expectation?
Was any failure actionable without opening source code?
```
