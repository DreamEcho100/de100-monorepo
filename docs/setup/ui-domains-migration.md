# UI Domains Migration Guide

This guide tracks migration from the old Solid UI package layout to the current domains/shared structure.

## Package Renames

- old: `@de100/ui-solidjs`
- current: `@de100/ui-domains-solidjs`

Shared baseline package introduced:

- `@de100/ui-shared`

## Import Migration

Preferred imports:

```ts
import { Button, Card, P, Uploader, Image } from "@de100/ui-domains-solidjs";
import { cn } from "@de100/ui-shared/libs/utils";
```

Stylesheet baseline ownership:

```css
@import "@de100/ui-shared/styles/base.css";
@import "@de100/ui-domains-solidjs/styles/base.css";
```

## Boundary Realignment (Phase 8R)

Current ownership model in `@de100/ui-domains-solidjs`:

- visual component surfaces: `src/components/*`
- non-visual contracts/runtime: `src/libs/*`

Transitional compatibility shims are still present at:

- `src/link-preview/*`
- `src/typography/*`
- `src/uploader/*`

These old paths now re-export from `src/libs/*`.

## Prefetch Architecture Migration

Old app architecture:

- `PrefetchAnchor`
- centralized route map (`libs/route-prefetch.ts`)

Current app architecture:

- `AppLink` for regular links
- `AuthAppLink` for gated/private links
- route-owned preload in route modules:
  - `export const route = { preload }`
- gated prefetch is condition-aware and disabled when unauthorized

## Route Preload Rules

- public routes preload only public queries
- gated routes preload only when auth preconditions pass
- preload query definitions reuse existing `orpc.*.queryOptions()`

## Uploader Transport Migration

Transport execution is now plugin-backed in browser runtime:

- `@uppy/xhr-upload` for regular/multipart target flows
- `@uppy/tus` for resumable flows

Public adapter contract is unchanged:

- `createUploadTarget`
- `confirmUpload`
- optional `cancelUpload`

## Verification Commands

```bash
pnpm -F @de100/ui-shared type:check
pnpm -F @de100/ui-domains-solidjs type:check
pnpm -F @de100/apps-lms-web type:check
pnpm -F @de100/apps-lms-web build
```
