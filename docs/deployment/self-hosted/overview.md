# Self-Hosted Deployment Overview

This track is the active deployment direction for Proto Cook.

## Goals

- Run Proto Cook on a single VPS first.
- Use Coolify as the primary deployment orchestrator.
- Use Caddy as the primary reverse proxy and TLS terminator.
- Keep Traefik as a documented alternative path.
- Support managed and self-hosted service modes for database, cache, storage, and email.

## Source-of-Truth Split

- Root docs in this folder define strategy, architecture, and migration decisions.
- Infra docs in packages/apps/proto-cook/infra/docs define exact execution steps, scripts, and verification checklists.

## Start Here

1. Read provider and architecture choices in this folder.
2. Follow implementation steps in ../../../packages/apps/proto-cook/infra/docs/README.md.
3. Run deployment verification scripts from infra docs before promoting changes.

## Linked Guides

- Orchestration (primary): ./orchestration/coolify-primary.md
- Orchestration (alternative): ./orchestration/traefik-alternative.md
- Provider guide (Hetzner): ../../../packages/apps/proto-cook/infra/docs/providers/hetzner.md
- Provider guide (DigitalOcean): ../../../packages/apps/proto-cook/infra/docs/providers/digitalocean.md
- Provider guide (Hostinger): ../../../packages/apps/proto-cook/infra/docs/providers/hostinger.md
- Infra pre-deploy checklist: ../../../packages/apps/proto-cook/infra/docs/checklists/pre-deploy-checklist.md
- Infra post-deploy checklist: ../../../packages/apps/proto-cook/infra/docs/checklists/post-deploy-smoke-checklist.md
- Migration runbook: ../../../packages/apps/proto-cook/infra/docs/runbooks/migration-cutover.md
- Rollback runbook: ../../../packages/apps/proto-cook/infra/docs/runbooks/rollback-recovery.md
- Security incident runbook: ../../../packages/apps/proto-cook/infra/docs/runbooks/security-incident.md
- Transition path: ../transition-paths/cloudflare-to-vps.md
