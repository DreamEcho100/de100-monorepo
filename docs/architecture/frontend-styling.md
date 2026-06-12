# Frontend Styling Architecture

## Current styling stack

The Proto Cook app now layers styling in this order:

1. `tailwindcss`
2. `tw-animate-css`
3. `@de100/ui-shared/styles/base.css`
4. `@de100/ui-domains-solidjs/styles/base.css`
5. app-local shell, layout, and state styles in `apps/proto-cook-web/src/app.css`

That order matters because the shared UI stylesheet expects semantic colors, radius tokens, animation utilities, and a few custom utilities to already exist.

## Token source of truth

`@de100/ui-shared/styles/base.css` is now the source of truth and ownership boundary for shared baseline tokens and utilities, including:

- semantic colors like `background`, `foreground`, `primary`, and `ring`
- shared radius tokens
- repeated measurement tokens such as focus ring width, switch sizes, drawer handle width, and tooltip offsets

The app should prefer those variables over route-local RGB values or one-off arbitrary pixel literals.

## App compatibility layer

`apps/proto-cook-web/src/app.css` now does two jobs beyond importing Tailwind:

- imports the shared baseline package before the domains stylesheet
- imports `tw-animate-css` so animation utilities used by the shared UI package resolve during build
- defines the `supports-backdrop-filter` variant and `no-scrollbar` utility used by the shared UI base stylesheet
- owns the app-specific shell classes like the sticky header, page grids, auth shell, status banners, todo layout, and API reference presentation

This keeps app-shell styling at the app boundary instead of scattering one-off rules across route components.

## Shared UI package surface

The app should prefer imports from `@de100/ui-domains-solidjs` for the primitives already exposed by the package root.

Use deep file imports only when a component has not been added to the shared package barrel yet. That keeps the starter aligned with an actual package API instead of coupling routes to internal file paths.

## UI package boundary rules

`@de100/ui-domains-solidjs` boundary split:

- visual component surface: `src/components/*`
- non-visual contracts/runtime surface: `src/libs/*`

For this delivery, transitional shims still exist at `src/{uploader,typography,link-preview}` for compatibility. Prefer root exports or `src/libs/*`-backed surfaces when documenting or extending behavior.

## Shared UI rule of thumb

When the shared UI package needs a value outside the default Tailwind scale:

- prefer a named CSS variable through the `@de100/ui-shared/styles/base.css` contract
- consume it with a semantic utility or a variable-backed arbitrary value
- avoid introducing new raw color literals in `base.css`
- avoid repeating the same raw pixel value in multiple selectors

## Validation step

After changing the shared theme or shared UI stylesheet, validate with:

- `pnpm --filter @de100/apps-proto-cook-web build`

This catches missing semantic tokens, missing compatibility utilities, and unsupported `@apply` candidates before the styling change leaks further into the repo.
