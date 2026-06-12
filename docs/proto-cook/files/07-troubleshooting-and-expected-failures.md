# Troubleshooting And Expected Failures

## Dev Server Is Ready But Browser Refuses Connection

Check whether the server was started from the same host environment as the browser:

```sh
curl -I http://127.0.0.1:3000/health
```

If global Turbo dev exits or never keeps the app alive, confirm the `dev` task is persistent in `turbo.json`.

Use package-owned service commands when checking dependencies:

```sh
pnpm -F @de100/apps-proto-cook-infra services:status
pnpm -F @de100/apps-proto-cook-infra minio:status
```

## Env Parser Fails

Confirm the current names are used:

```txt
APP_PROTO_COOK_*
VITE_APP_PROTO_COOK_*
PROTO_COOK_APP_VITE_TRACE_MODE
```

Old app/env prefixes are not aliases.

## MinIO Smoke Fails

Check:

```sh
pnpm -F @de100/apps-proto-cook-infra services:status
curl -I http://127.0.0.1:9000/minio/health/ready
```

Expected local credentials:

```txt
access key: minioadmin
secret key: minioadmin
endpoint: http://127.0.0.1:9000
```

## HLS Smoke Fails

The smoke script uses `ffmpeg`. Confirm it is available:

```sh
ffmpeg -version
```

If playback session creation succeeds but manifest or segment reads fail, inspect:

- Token expiry.
- Manifest path binding.
- Segment path binding.
- Whether the asset is preview, enrolled-private, admin-private, or denied-private.
- Whether the file was processed into an artifact group before playback.

## Stale Terminology Scan Fails

Allowed:

- `docs/archive/**`
- dependency names such as `@solid-primitives/media`
- browser/platform terms such as CSS media queries and playback media metrics

Not allowed in active source/docs:

- old app package/path/env names
- old files-era API/router/env names

## Hardcoded Lab UI Copy

Visible Feature Lab copy must live in `apps/proto-cook-web/i18n/shared/messages/*`.

Check:

```sh
pnpm -F @de100/apps-proto-cook-web lint:lab-ui-copy
```

Allowed literals:

- Route slugs.
- Protocol IDs.
- File names.
- Metadata values.
- Status IDs that are rendered as data.

Not allowed:

- Button labels.
- Section headings.
- Field placeholders.
- Aria labels.
- User-facing error copy.
