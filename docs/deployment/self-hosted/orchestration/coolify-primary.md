# Coolify Primary Path

Coolify is the default deployment control plane for the self-host track.

## Baseline Topology

- 1 VPS
- Coolify for app lifecycle
- Caddy for reverse proxy and TLS
- External or local Postgres and Redis depending on selected mode

## Implementation Contract

This file defines what to do.
Execution details live in infra docs:

- ../../../../packages/apps/proto-cook/infra/docs/coolify-deployment/setup-from-scratch.md

## Acceptance Criteria

- App deploys from Git through Coolify.
- Health checks pass after each deployment.
- TLS is active and proxy headers are preserved.
- Rollback path is documented and tested.

## Required Companions

- Pre-deploy checklist: ../../../../packages/apps/proto-cook/infra/docs/checklists/pre-deploy-checklist.md
- Post-deploy smoke checklist: ../../../../packages/apps/proto-cook/infra/docs/checklists/post-deploy-smoke-checklist.md
- Migration runbook: ../../../../packages/apps/proto-cook/infra/docs/runbooks/migration-cutover.md
- Rollback runbook: ../../../../packages/apps/proto-cook/infra/docs/runbooks/rollback-recovery.md
