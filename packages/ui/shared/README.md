# @de100/ui-shared

Shared UI foundation package for workspace apps.

## Purpose

`@de100/ui-shared` owns cross-domain UI primitives that should not depend on any framework-specific component runtime:

- baseline style tokens
- design-system configuration
- small shared helpers

## Public API

From `package.json`:

- `@de100/ui-shared`
- `@de100/ui-shared/styles/base.css`
- `@de100/ui-shared/libs/utils`
- `@de100/ui-shared/libs/design-system`
- `@de100/ui-shared/libs/tokens`

## Usage

```ts
import { cn } from "@de100/ui-shared/libs/utils";
import { designSystemConfig } from "@de100/ui-shared/libs/design-system";
import { sharedToneTokens } from "@de100/ui-shared/libs/tokens";
```

```css
/* import before domains/app overrides */
@import "@de100/ui-shared/styles/base.css";
```

## Styling Order Contract

In app CSS, keep this order:

1. `tailwindcss`
2. `tw-animate-css`
3. `@de100/ui-shared/styles/base.css`
4. `@de100/ui-domains-solidjs/styles/base.css`
5. app-local overrides

## Validation

```bash
pnpm -F @de100/ui-shared type:check
pnpm -F @de100/ui-shared test
```
