# Hosted Deploy Smoke Evidence Template

Use this template to document post-deploy validation in production-like environments.

## Metadata

- Date (UTC):
- Environment:
- Commit SHA:
- Operator:
- Reviewer:
- Deployment path: Coolify or Traefik

## Verification Commands

- pnpm -F @de100/apps-proto-cook-infra selfhost:preflight: pass or fail
- pnpm -F @de100/apps-proto-cook-infra selfhost:health: pass or fail
- pnpm -F @de100/apps-proto-cook-infra selfhost:verify: pass or fail
- pnpm -F @de100/apps-proto-cook-infra selfhost:verify:full: pass or fail

## Route Checks

- /en:
- /ar:
- /api/reference redirect:
- /api/reference/spec.json:

## Auth Checks

- sign in:
- sign out:
- password reset or verify email:

## Media Checks

- upload:
- public read:
- private read:
- signed URL issue and read:

## Service Dependency Checks

- database:
- cache:
- email:
- object storage:

## Logs And Notes

- Relevant log snippets (redacted):
- Unexpected behavior:
- Follow-up issues:

## Final Status

- Result: pass or fail
- Approver:
- Approval timestamp (UTC):
