# @de100/monorepo

This monorepo is scafolded by the t3 monorepo, but is heavily modified to fit the needs of the project.

## Objectives

- [x] Migrate from prettier/eslint to biome.
- [-] Remove the current apps _(nextjs, expo, tanstack)_ and replace them with a single solid start app.
- [ ] Migrate the current packages and restructure them to general packages at the root of `packages/` _(for example, `packages/solid/ui` or `packages/i18n/`)_ and specific packages for each app _(for example, `packages/lms/api`)_.
