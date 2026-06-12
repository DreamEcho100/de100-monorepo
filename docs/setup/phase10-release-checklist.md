# Phase 10 Release Gate Checklist

This checklist is the execution companion for Phase 10 QA and release readiness.

## Preconditions

- Phase 9 docs are marked complete in `current-plan.md`.
- Phase 8/8R code changes are merged and green on branch tip.
- No unresolved blockers in `current-plan.md`.

## Automated Gate Order

Run in this sequence:

```bash
pnpm install
pnpm -F @de100/ui-shared format-and-lint:check
pnpm -F @de100/ui-domains-solidjs format-and-lint:check
pnpm -F @de100/apps-proto-cook-web format-and-lint:check
pnpm -F @de100/ui-shared type:check
pnpm -F @de100/ui-domains-solidjs type:check
pnpm -F @de100/apps-proto-cook-web type:check
pnpm -F @de100/ui-shared test
pnpm -F @de100/ui-domains-solidjs test
pnpm -F @de100/apps-proto-cook-web test
pnpm -F @de100/apps-proto-cook-web build
```

## Manual QA Checklist

- keyboard-only navigation works on header, auth forms, files uploader actions, and todos
- uploader behaviors work:
  - drag/drop
  - pause/resume/cancel/retry
  - camera/clipboard paths (when available)
- route-owned preloads behave correctly:
  - public routes preload without auth
  - gated routes skip preload when unauthorized
- light/dark mode visual parity checks
- responsive checks on mobile + desktop breakpoints
- RTL direction checks on representative pages

## Documentation Gate

Confirm these docs are current and internally consistent:

- `docs/setup/ui-domains-migration.md`
- `docs/architecture/link-preview-security.md`
- `docs/architecture/frontend-styling.md`
- `docs/onboarding.md`
- package READMEs:
  - `packages/ui/shared/README.md`
  - `packages/ui/domains/solidjs/README.md`

## Release Output Artifacts

- command output summary (pass/fail per gate)
- manual QA summary
- updated `docs/worklog.md` entry with completion notes
