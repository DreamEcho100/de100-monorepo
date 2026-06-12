# ADR 0002: App-Domain Env Package

## Status

Accepted

## Context

Proto Cook needs one canonical environment contract shared by local development, CI, VPS-style deployment, and serverless dashboards. Moving env parsing into feature packages would spread deployment assumptions across reusable modules. Keeping env only inside the web app would make worker, infra, API, and scripts duplicate parsing rules.

## Decision

Keep the app-domain env package at `packages/apps/proto-cook/env`.

Canonical variable prefixes are:

- `APP_PROTO_COOK_*` for server/runtime values
- `VITE_APP_PROTO_COOK_*` for browser-exposed values

The env package parses `process.env`. Vercel, Netlify, and similar dashboards remain the deployment source; they provide the same variable names that local `.env.local`, CI env generation, and VPS env files use.

## Consequences

- The app-domain package owns validation, defaults, and deployment docs for Proto Cook env.
- Reusable packages receive typed config/adapters instead of reading app env directly.
- CI can validate generated env files through the same parser used by runtime code.
