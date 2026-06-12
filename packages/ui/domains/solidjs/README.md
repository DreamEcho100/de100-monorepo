# @de100/ui-domains-solidjs

Shared SolidJS UI domain package for Proto Cook apps.

## Purpose

`@de100/ui-domains-solidjs` contains reusable Solid primitives and domain contracts for:

- uploader
- image primitives
- link preview
- typography
- shared component set used by app surfaces

## Public API

Primary imports should come from the package root:

```ts
import { Button, Image, ArtDirectedImage, Uploader, P, useLinkPrefetch } from "@de100/ui-domains-solidjs";
```

Package subpaths are also exported through `./*` and map to `src/*`.

## Boundary Model (Phase 8R)

The package now follows this boundary split:

- `src/components/*`: visual components and UI primitives
- `src/libs/*`: non-visual contracts, policies, controllers, and runtime utilities

Transitional shim exports remain in these old locations for this delivery:

- `src/link-preview/*`
- `src/typography/*`
- `src/uploader/*`

Those files re-export from `src/libs/*` and are intended for compatibility while callers migrate.

## Uploader Transport Notes

Uploader runtime behavior:

- transport policy is contract-driven (`xhr`, `tus`, `auto`)
- browser upload execution uses maintained Uppy plugins:
  - `@uppy/xhr-upload`
  - `@uppy/tus`
- provider handshake remains stable:
  - `createUploadTarget`
  - `confirmUpload`
  - optional `cancelUpload`

## App Integration Notes

- app navigation prefetch should be route-owned (`export const route = { preload }`)
- app-level link wrappers (`AppLink`, `AuthAppLink`) stay in app code, not this package
- for gated routes, prefetch should be condition-aware and disabled when not authorized

## Validation

```bash
pnpm -F @de100/ui-domains-solidjs type:check
pnpm -F @de100/ui-domains-solidjs test
```
