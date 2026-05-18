# Database Architecture

## Goal

The LMS starter should run against:

- local Postgres, including Docker-based development
- hosted Neon without rewriting the app or auth packages

## Current design

The DB package exposes a single factory in `packages/apps/lms/db/src/index.ts`.

That factory now selects one of two Drizzle clients:

- `postgres` via `drizzle-orm/postgres-js`
- `neon-http` via `drizzle-orm/neon-http`

The selection logic lives in `packages/apps/lms/db/src/driver.ts`.

## Selection rules

1. If `APP_LMS_DATABASE_DRIVER` is explicitly set to `postgres` or `neon-http`, that wins.
2. If `APP_LMS_DATABASE_DRIVER=auto`, the code inspects `APP_LMS_DATABASE_URL`.
3. Neon hosts resolve to `neon-http`.
4. Everything else falls back to `postgres`.

## Why this shape

- app, auth, and API packages keep importing a single DB surface
- local development does not stay locked to Neon
- future infra work can decide deployment/runtime bindings without rewriting feature code
- driver selection is unit-testable without opening a real DB connection

## Validation

The driver-selection rules are covered by `packages/apps/lms/db/src/driver.test.ts`.
