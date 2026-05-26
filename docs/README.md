# Docs

This folder is the working knowledge base for the LMS starter.

Use it for three things:

- onboarding new contributors
- recording architecture and flow decisions
- keeping an append-only implementation log as the repo changes

Current entry points:

- `onboarding.md`: repo layout, active packages, and first commands
- `setup/environment.md`: environment variables and local setup expectations
- `setup/production-deployment.md`: self-host production deployment workflow and service configuration
- `deployment/self-hosted/overview.md`: active self-host deployment direction, goals, and decision boundaries
- `deployment/self-hosted/orchestration/coolify-primary.md`: primary orchestration path for single-VPS-first rollout
- `deployment/self-hosted/orchestration/traefik-alternative.md`: alternative orchestration path and parity expectations
- `deployment/transition-paths/cloudflare-to-vps.md`: migration sequence and rollback posture from Cloudflare to VPS
- `evidence/templates/hosted-deploy-smoke-template.md`: standardized artifact format for hosted smoke validation
- `architecture/database.md`: how DB driver selection works across local Postgres and Neon
- `architecture/frontend-styling.md`: how the shared Tailwind token layer, app CSS, and UI base styles fit together
- `architecture/media-storage.md`: media storage primitives and the current public/private split
- `flows/media-flow.md`: how uploads and public/private reads move through the app runtime
- `flows/todo-flow.md`: how the app reads and mutates user-owned todos end to end
- `worklog.md`: chronological implementation notes

Infra execution docs entry point:

- `../packages/apps/lms/infra/docs/README.md`: self-host implementation mechanics, checklists, and deployment steps
- `../packages/apps/lms/infra/docs/providers/*.md`: provider-specific provisioning guides
- `../packages/apps/lms/infra/docs/checklists/*.md`: deploy and hardening execution checklists
- `../packages/apps/lms/infra/docs/runbooks/*.md`: migration, rollback, and incident operations

Rule of thumb:

- update `worklog.md` whenever a meaningful implementation slice lands
- add or update a focused doc when a new subsystem or flow is introduced
