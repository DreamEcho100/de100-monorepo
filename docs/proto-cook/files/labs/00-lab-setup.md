# Files Labs 00 - Setup And Rules

Use this first before testing any files lab. The goal is to make every later check repeatable and to make failures diagnosable.

## Mental Model

```txt
browser
  |
  | 1. choose lab controls
  v
proto-cook-web
  |
  | 2. asks API for policy, upload target, signed read, or playback session
  v
proto-cook-api
  |
  | 3. writes records and talks to storage/worker adapters
  v
local-fs or MinIO or R2-shaped storage
```

Labs are Feature Labs. They are not product navigation. They intentionally expose controls that normal users should not see.

## Start Services

Run service commands from their owning package, not the root package:

```sh
pnpm -F @de100/apps-proto-cook-infra services:status
pnpm -F @de100/apps-proto-cook-infra minio:up
pnpm -F @de100/apps-proto-cook-infra minio:status
pnpm -F @de100/apps-proto-cook-infra minio:smoke
```

If ports are already occupied, stop the owned stack:

```sh
pnpm -F @de100/apps-proto-cook-infra minio:down
pnpm -F @de100/apps-proto-cook-infra services:down
```

Expected result:

- MinIO is reachable on `127.0.0.1:9000`.
- The smoke command reports public and private bucket access.
- No long-running root-level feature command is required.

## Prepare App Data

```sh
pnpm -F @de100/apps-proto-cook-db db:migrate
pnpm -F @de100/apps-proto-cook-web db:seed
pnpm dev
```

Open the app:

```txt
http://127.0.0.1:3000/en/files-lab
```

Expected result:

- If signed out, the lab redirects to login.
- If signed in, the lab shell displays links to Hybrid, HTTP-native, provider smoke, course video, HLS, processing, and entitlement labs.

## Test Identity

Use a seeded admin or owner account when a lab requires private files, course authoring, or entitlement bypass. Use an anonymous browser session only for negative access checks.

Record this before every manual run:

```txt
Date:
Git branch:
Storage profile:
Browser:
Signed-in user:
Lab route:
Expected:
Actual:
Screenshots or logs:
DX note:
UX note:
```

## Common Failure Signals

```txt
No app response
  -> check dev server, port, and Turbo persistent dev task.

MinIO refused connection
  -> start infra package services and run minio:status.

Upload target missing
  -> check env, storage profile, route slug, and disabled integration settings.

Private read allowed anonymously
  -> stop and treat as a security bug.

Private read denied to enrolled/admin user
  -> inspect entitlement records and playback session policy.
```
