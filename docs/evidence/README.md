# LMS Evidence Index

This folder stores verification artifacts for the LMS starter milestone.

Status labels used in docs:

- `implemented-and-evidenced`: behavior is implemented and verified with a linked artifact in this folder.
- `implemented-and-unverified`: behavior is implemented, but a matching evidence artifact is still pending.
- `not-yet-implemented`: behavior is not fully implemented yet.

## Current artifacts

- `2026-05-25-phase3-provider-refactor-validation.md`
- `2026-05-25-phase4-ui-regression.md`

## Secrets hygiene rules for evidence

- Never capture live API keys, tokens, passwords, cookies, or bearer headers in screenshots or logs.
- Never commit `.env.local`, `.env.deploy.local`, or provider dashboards exports.
- Redact secrets and account identifiers before attaching screenshots or request traces.
- Prefer seed/demo accounts for browser proofs.
