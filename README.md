# @de100/monorepo

This monorepo is scafolded by the t3 monorepo, but is heavily modified to fit the needs of the project.

## Objectives

<details>

<summary>Meaning of the checkboxes</summary>

- `[ ]`: Not done yet
- `[~]`: In progress
- `[x]`: Donw

</details>

- [x] Migrate from prettier/eslint to biome.
- [~] Remove the current apps _(nextjs, expo, tanstack)_ and replace them with a single solid start app.
  - packages:
    - [x] ui/solidjs/
    - [ ] i18n/
      - [ ] i18n/core/
      - [ ] i18n/core/client/
      - [ ] i18n/core/server/
      - [ ] i18n/domains/solidjs/
      - [ ] i18n/domains/solidjs/client/
      - [ ] i18n/domains/solidjs/server/
    - [~] apps/lms/api/
    - [~] apps/lms/auth/
    - [~] apps/lms/config/
    - [~] apps/lms/db/
    - [~] apps/lms/env/
    - [~] apps/lms/validators/
    -
- [x] Migrate the current packages and restructure them to general packages at the root of `packages/` _(for example, `packages/ui/solidjs` or `packages/i18n/`)_ and specific packages for each app _(for example, `packages/apps/lms/api`)_.
- [ ] Removong `packages/proto`
