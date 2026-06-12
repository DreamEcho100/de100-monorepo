# Files Platform Architecture

The Files Platform is reusable package code plus Proto Cook app adapters.

```txt
@de100/files-shared
  ids, route config, upload planning contracts, storage/delivery taxonomies

@de100/files-server
  router builder, storage adapter contracts, signed access, worker/pipeline primitives

@de100/files-client
  framework-agnostic client runtime, upload executors, Uppy integration points

@de100/files-domains-solidjs
  Solid hooks/components: uploader, controller, HLS player, route-aware validation

@de100/files-processing-*
  image/video/audio/document planning helpers and optional heavy dependency seams

packages/apps/proto-cook/*
  auth, DB repositories, env, API routers, worker queues, infra scripts, app labs
```

Adapter flow:

```txt
Files package contract
      |
      v
Proto Cook adapters
  auth       -> Better Auth session/user context
  DB         -> Drizzle repositories
  storage    -> local filesystem or S3-compatible provider
  queue      -> Redis or DB polling
  telemetry  -> DB playback events plus optional external hooks
  worker     -> process runner for processing jobs
```

API approaches:

- Hybrid is the default. Use oRPC for typed control and HTTP/provider routes for byte-heavy paths.
- HTTP-native is maintained as the route-first second path.
- RPC-native is not a top-level approach. `orpc-direct` remains a small-file Hybrid protocol.

Reusable packages do not read Proto Cook env directly. Proto Cook env is parsed in `@de100/apps-proto-cook-env`, then passed as typed config/adapters into reusable packages.

Feature Labs are not product screens. They expose protocol overrides, storage profile selectors, disabled integration states, and diagnostic output so we can compare implementation approaches without polluting default user flows.
