# Files Labs 08 - Cleanup And Feedback

Use this after a lab run. It prevents stale service state, stale uploads, and vague feedback from hiding real defects.

## Stop Local Services

Use package-owned commands only:

```sh
pnpm -F @de100/apps-proto-cook-infra minio:status
pnpm -F @de100/apps-proto-cook-infra minio:down
pnpm -F @de100/apps-proto-cook-infra services:down
```

Expected:

- MinIO containers stop cleanly.
- No root-level feature command is required.
- Running `services:status` after shutdown shows the owned stack is not active.

If a port remains occupied:

```sh
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
```

Stop only the Proto Cook-owned service that is still running. Do not stop unrelated local development containers.

## Clean Temporary App State

If a lab produced disposable files, jobs, or sessions, reset through the owning package commands or the app's seeded test data flow:

```sh
pnpm -F @de100/apps-proto-cook-db db:migrate
pnpm -F @de100/apps-proto-cook-web db:seed
```

Expected:

- Route policies and seeded course fixtures return to the documented baseline.
- Previous signed playback sessions no longer matter.
- Private read tests are repeatable.

## Verify No Background Dev Process Is Hiding Problems

Before opening a new lab run, check the dev server you intend to use:

```sh
curl -I http://127.0.0.1:3000/health
```

Expected:

- A reachable server returns an HTTP response.
- A stopped server refuses connection.
- If Turbo says dev is running but the browser cannot connect, inspect `turbo.json` persistent dev configuration and whether the command was started from the same host environment as the browser.

## Feedback Template

Use this format so implementation issues can be traced to a route, storage mode, and policy decision:

```txt
Lab:
Route:
Git commit or branch:
Browser:
Storage profile: local-fs | minio-s3 | r2-s3
API approach: hybrid | http-native
Upload protocol: auto | orpc-direct | xhr | tus | s3-put | s3-multipart | custom
Delivery strategy: public-url | signed-url | private-http-route | provider-url | range-http | orpc-blob
User state: anonymous | enrolled | owner | admin
Steps:
Expected:
Actual:
Console/network evidence:
Server logs:
DX note:
UX note:
Decision recommendation:
```

## What Counts As A Defect

Report as a defect:

- A private object is readable without policy approval.
- A disabled integration silently falls back to another path.
- A forced protocol ignores the selected storage profile without explaining why.
- A range request returns full-object bytes when range delivery is expected.
- HLS manifest access succeeds but segment access fails for the same valid session.
- Visible UI copy appears hardcoded instead of using the app i18n catalog.
- Service commands require root package aliases instead of package-owned scripts.

Report as a documentation gap:

- The lab behaves correctly but the manual cannot predict the behavior.
- The UI shows a technical status that is not described in the tutorial.
- A failure is expected but the docs do not say how to recover.

