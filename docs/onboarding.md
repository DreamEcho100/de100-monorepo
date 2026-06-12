# Onboarding

## Active surfaces

- App: `apps/proto-cook-web`
- API package: `packages/apps/proto-cook/api`
- Auth package: `packages/apps/proto-cook/auth`
- Cache package: `packages/apps/proto-cook/cache`
- DB package: `packages/apps/proto-cook/db`
- Env package: `packages/apps/proto-cook/env`
- I18n package: `packages/apps/proto-cook/i18n`
- Infra package: `packages/apps/proto-cook/infra`
- Validators package: `packages/apps/proto-cook/validators`
- Shared UI foundation: `packages/ui/shared`
- Shared Solid UI: `packages/ui/domains/solidjs`

## First commands

Install dependencies:

```bash
pnpm install
```

Start the repo in watch mode:

```bash
pnpm dev
```

Run typechecks across the workspace:

```bash
pnpm type:check
```

Apply the checked-in migrations to the configured database:

```bash
pnpm -F @de100/apps-proto-cook-db db:migrate
```

Run self-host deployment checks through the infra package:

```bash
pnpm -F @de100/apps-proto-cook-infra selfhost:preflight
pnpm -F @de100/apps-proto-cook-infra selfhost:health
pnpm -F @de100/apps-proto-cook-infra selfhost:verify
pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:public
pnpm -F @de100/apps-proto-cook-infra selfhost:verify:full
```

## Current repo assumptions

- `apps/proto-cook-web` is the active Proto Cook application surface.
- shared UI baseline tokens and helpers are owned by `@de100/ui-shared`.
- Shared UI primitives that are already exposed should be consumed from the `@de100/ui-domains-solidjs` root barrel.
- In `@de100/ui-domains-solidjs`, visual primitives belong under `src/components/*`; non-visual contracts/runtime belong under `src/libs/*`.
- Transitional re-export shims under `src/{uploader,typography,link-preview}` are compatibility-only and should not be treated as long-term internal ownership boundaries.
- Better Auth is mounted in the app and reused by the API context package.
- Better Auth secondary storage is routed through `@de100/apps-proto-cook-cache`, with `memory`, `redis`, and `upstash` drivers selected by env.
- Drizzle schema and DB client creation live in the Proto Cook DB package.
- Database lifecycle and Drizzle commands are package-owned by `@de100/apps-proto-cook-db`; seeding is package-owned by `@de100/apps-proto-cook-web`.
- Validation contracts for app and API entry points should come from `@de100/apps-proto-cook-validators` instead of direct `zod` imports in feature code.
- Default app-facing data flow is oRPC plus TanStack Query using `queryOptions()` for reads and `mutationOptions()` for writes.
- Direct SolidStart routes are the exception for boundaries that need raw request/response control, such as Better Auth and binary files streaming.
- Locale and theme runtime helpers live in `@de100/i18n-core` and `@de100/i18n-domains/solidjs`, while app-owned locale definitions live under `i18n/*`.
- Locale and theme preferences are cookie-backed; locale falls back to `Accept-Language`, theme defaults to `system`, and canonical page routes now live under `/en/...` and `/ar/...` with middleware-based redirects from bare page URLs.
- Route prefetching is route-owned through `export const route = { preload }`; app links use `AppLink` and gated/private links use `AuthAppLink` with condition-aware preload disablement.
- Production deployment commands live in `packages/apps/proto-cook/infra` and are self-host-first.
- Documentation in this folder is part of the implementation, not a final cleanup step.

## Where to look first

- auth route wiring: `apps/proto-cook-web/src/routes/api/auth/[...auth].ts`
- RPC route wiring: `apps/proto-cook-web/src/routes/api/rpc/[...rpc].ts`
- typed RPC client: `apps/proto-cook-web/src/libs/apis/orpc.ts`
- session-aware API context: `packages/apps/proto-cook/api/src/context.ts`
- DB client factory: `packages/apps/proto-cook/db/src/index.ts`
