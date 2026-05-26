# Traefik Alternative Path

Traefik is supported as an alternative to the default Coolify plus Caddy path.

## When To Choose This

- You prefer Docker Compose driven routing.
- You need label-based dynamic routing workflows.
- You already operate Traefik in your infrastructure.

## Scope

- Keep parity with the primary deployment path for health checks, TLS, and rollback.
- Do not diverge from environment contracts used by app packages.

## Execution Docs

- ../../../../packages/apps/lms/infra/docs/traefik-deployment/service-setup.md

## Required Companions

- Pre-deploy checklist: ../../../../packages/apps/lms/infra/docs/checklists/pre-deploy-checklist.md
- Post-deploy smoke checklist: ../../../../packages/apps/lms/infra/docs/checklists/post-deploy-smoke-checklist.md
- Rollback runbook: ../../../../packages/apps/lms/infra/docs/runbooks/rollback-recovery.md
