# Files Status Migration Handoff

This document is a next-cycle migration memo. It does not change the current delivery.

## Current Baseline

The current files table stores:

```ts
type FileStatus = "draft" | "ready" | "deleted";
```

Current behavior:

- upload creates a `draft` row
- confirm moves `draft` to `ready`
- delete soft-deletes the row and sets `deleted`
- signed/private/public reads only expose usable files when access checks pass

The current files page groups records into drafts and ready files.

## Target Status Set

The next cycle can expand the status enum to:

```ts
type FileStatus = "draft" | "scanning" | "processing" | "ready" | "failed" | "deleted";
```

Recommended meanings:

- `draft`: uploaded object exists, but user confirmation or finalization has not happened
- `scanning`: object is waiting for security/content checks or those checks are running
- `processing`: object is accepted and file variants, metadata extraction, or thumbnails are running
- `ready`: file is available for normal access
- `failed`: scanning, processing, or finalization failed
- `deleted`: file was soft-deleted and should not appear in normal lists

Avoid adding `uploading` to `files.status` unless upload sessions are also promoted into first-class file records. Uploading is currently better modeled as upload-session state.

## State Transitions

Recommended transition graph:

```text
draft -> scanning
draft -> processing
draft -> ready
draft -> failed
scanning -> processing
scanning -> ready
scanning -> failed
processing -> ready
processing -> failed
failed -> draft
failed -> scanning
failed -> processing
draft|scanning|processing|ready|failed -> deleted
```

Notes:

- `draft -> ready` should remain allowed when scanning and processing are disabled.
- `failed -> draft` is useful for manual retry or re-confirm.
- `deleted` should be terminal in normal app flows.

## Database Migration Strategy

PostgreSQL enum changes are awkward to roll back. Prefer one of these approaches:

1. Add enum values in place with `ALTER TYPE file_status ADD VALUE`.
2. Create a replacement enum and cast through `text` if rollback discipline is more important.

Recommended conservative sequence:

1. Add new enum values.
2. Add nullable diagnostic columns before behavior changes:
   - `status_reason`
   - `failed_at`
   - `processing_started_at`
   - `processing_completed_at`
   - `scan_started_at`
   - `scan_completed_at`
3. Deploy code that can read all six statuses but still writes only current statuses.
4. Enable new write paths behind a feature flag.
5. Backfill derived timestamps only when needed for product UI.

## Validator Updates

Update `packages/apps/proto-cook/validators/src/internal/files.ts`:

- expand `fileStatusSchema`
- keep output schema backward-compatible for existing fields
- add optional diagnostic fields only after DB columns exist

Add tests that prove:

- all statuses parse
- older records without diagnostic timestamps still parse
- unknown statuses fail with a clear validation error

## API Updates

Affected API areas:

- `files.upload`
- `files.confirmUpload`
- `files.getAll`
- `files.issueSignedAccess`
- files binary read routes

Rules:

- `issueSignedAccess` should continue to require `ready`.
- direct/public URLs should continue to be emitted only for `ready` public files.
- read routes should avoid serving non-ready records by id-based flows. Key-based owner routes must still enforce ownership and storage key boundaries.
- `confirmUpload` should select the next state based on enabled capabilities:
  - no scanning/processing: `ready`
  - scanning enabled: `scanning`
  - processing enabled without scanning: `processing`

## UI Updates

Update `apps/proto-cook-web/src/files-page.tsx` with explicit status groups:

- Drafts: `draft`
- In progress: `scanning`, `processing`
- Ready: `ready`
- Needs attention: `failed`

Action rules:

- confirm action: visible for `draft`
- retry action: visible for `failed` only when the backend exposes retry support
- signed/direct/open actions: visible for `ready`
- delete action: visible for all non-deleted owner records

I18n additions:

- status badge labels for `scanning`, `processing`, `failed`
- empty state copy for in-progress and failed groups
- failure reason copy if `status_reason` is exposed

## Operational Concerns

- Background jobs should be idempotent by file id.
- Status updates should include `updated_at`.
- Workers should avoid moving records out of `deleted`.
- Any external scanner/processor callback must verify files ownership through server state, not callback payload trust.

## Tests Required Next Cycle

- DB migration test for all enum values.
- validator tests for expanded status output.
- router tests for confirm transition behavior under capability flags.
- signed access tests proving only `ready` records can receive signed URLs.
- files page tests for grouping and action visibility.
- worker tests for idempotent status transitions, if workers are added.

## Acceptance Checklist

- Existing `draft`, `ready`, and `deleted` records still render correctly.
- New statuses never expose signed or public direct access until `ready`.
- Failed files has a recoverable UX or a clear delete path.
- Feature flags can keep the app writing only old statuses during rollout.
- The migration can be deployed before workers are enabled.
