# Proto Cook Evidence Index

This folder stores verification artifacts for the Proto Cook starter milestone.

Status labels used in docs:

- `implemented-and-evidenced`: behavior is implemented and verified with a linked artifact in this folder.
- `implemented-and-unverified`: behavior is implemented, but a matching evidence artifact is still pending.
- `not-yet-implemented`: behavior is not fully implemented yet.

## Current artifacts

- `2026-05-25-phase3-provider-refactor-validation.md`
- `2026-05-25-phase4-ui-regression.md`

## Templates

- `templates/hosted-deploy-smoke-template.md`

## Hosted smoke artifact convention

Use this naming pattern for hosted smoke artifacts:

- `YYYY-MM-DD-hosted-smoke-<environment>.md`

Example:

- `2026-05-26-hosted-smoke-staging.md`

Store hosted smoke evidence files directly in `docs/evidence/`.

## Checklist to evidence mapping

When completing hosted smoke:

1. Run `packages/apps/proto-cook/infra/docs/checklists/hosted-smoke-run-procedure.md`.
2. Prefer `pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:hosted -- --url <origin> --env <environment>` to run verification plus evidence scaffolding in one command.
3. Complete `packages/apps/proto-cook/infra/docs/checklists/post-deploy-smoke-checklist.md`.
4. If manual flow was used, scaffold artifact with `pnpm -F @de100/apps-proto-cook-infra selfhost:evidence:init -- <environment>`.
5. Capture results with `docs/evidence/templates/hosted-deploy-smoke-template.md`.
6. Save the filled artifact using the hosted smoke naming convention in this folder.

## Secrets hygiene rules for evidence

- Never capture live API keys, tokens, passwords, cookies, or bearer headers in screenshots or logs.
- Never commit `.env.local`, `.env.deploy.local`, or provider dashboards exports.
- Redact secrets and account identifiers before attaching screenshots or request traces.
- Prefer seed/demo accounts for browser proofs.
