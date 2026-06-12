# Files Labs 03 - Provider Smoke Lab

Route:

```txt
/en/files-lab/provider-smoke
```

This lab validates storage configuration before product flows depend on it.

## Profiles

```txt
local-fs
  simple offline storage, good for tests and single-node demos

minio-s3
  local S3-compatible parity for multipart, signed URL, and provider URL behavior

r2-s3
  remote production target through the generic S3-compatible model
```

## MinIO Lifecycle

Package-owned commands:

```sh
pnpm -F @de100/apps-proto-cook-infra minio:up
pnpm -F @de100/apps-proto-cook-infra minio:status
pnpm -F @de100/apps-proto-cook-infra minio:smoke
pnpm -F @de100/apps-proto-cook-infra minio:logs
pnpm -F @de100/apps-proto-cook-infra minio:down
```

Expected:

- `minio:up` starts the local service.
- `minio:status` reports container and health status.
- `minio:smoke` verifies public/private bucket behavior.
- `minio:down` releases ports and containers.

## Local-FS Scenario

1. Set storage driver to local.
2. Upload a small fixture from the Files page or Hybrid lab.
3. Inspect the local files root.

Expected:

- Files are written under the configured local root.
- This mode does not claim S3 parity.
- Public/private behavior is still enforced by app policy.

## MinIO Scenario

1. Start MinIO with the infra package.
2. Use the `minio-s3` storage profile in a lab.
3. Upload public and private files.
4. Run the smoke command again.

Expected:

- Buckets exist.
- Private objects are not accidentally public.
- Public object paths are only public when route policy allows.

## Missing Provider Config Scenario

1. Remove one S3 setting in `.env.local`.
2. Start the app and open the provider smoke lab.
3. Trigger a preflight or upload.

Expected:

- Failure happens before byte upload.
- Error names the missing config class.
- The app does not silently fall back to local storage.

## Feedback To Capture

```txt
Which service command did you need?
Did any container keep running after down?
Were port conflicts visible?
Was the error message package-owned and actionable?
```
