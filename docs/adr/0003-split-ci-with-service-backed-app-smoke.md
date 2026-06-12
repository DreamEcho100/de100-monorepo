# ADR 0003: Split CI With Service-Backed App Smoke

## Status

Accepted

## Context

The existing single CI workflow still contains stale app identity and media-era env keys. Proto Cook also needs stricter service-backed smoke coverage for files flows that depend on Postgres, Redis, and MinIO, while reusable package checks should not always pay the full app smoke cost.

## Decision

Split CI into:

- `.github/workflows/proto-cook-ci.yml`
- `.github/workflows/general-packages-ci.yml`

Proto Cook CI uses GitHub service containers for Postgres, Redis, and MinIO and runs app-level smoke checks. General Packages CI runs reusable package hygiene, typecheck, tests, and script-shape validation.

## Consequences

- App-affecting changes get realistic service-backed validation.
- Reusable package changes get faster focused validation.
- Workflow path filters must be maintained as package topology changes.
- `actions/cache@v5` requires Actions Runner 2.327.1+ on self-hosted runners.
