# Docs

This folder is the working knowledge base for the Proto Cook starter.

Use it for three things:

- onboarding new contributors
- recording architecture and flow decisions
- keeping an append-only implementation log as the repo changes

Current entry points:

- `proto-cook/files/00-index.md`: ordered Files Platform architecture, flow, manual testing, and troubleshooting manual
- `onboarding.md`: repo layout, active packages, and first commands
- `setup/environment.md`: environment variables and local setup expectations
- `setup/ui-domains-migration.md`: migration guide for UI package rename, boundary realignment, and app prefetch architecture updates
- `setup/phase10-release-checklist.md`: ordered automation/manual QA checklist for release-gate execution
- `setup/custom-xhr-chunk-upload-backend.md`: deferred next-cycle contract spec for app-owned large-file chunk uploads
- `setup/files-status-migration.md`: deferred next-cycle migration memo for expanding files status values
- `setup/pinned-preview-persistence-rollout.md`: deferred next-cycle rollout playbook for optional server-side pinned previews
- `setup/production-deployment.md`: self-host production deployment workflow and service configuration
- `deployment/self-hosted/overview.md`: active self-host deployment direction, goals, and decision boundaries
- `deployment/self-hosted/orchestration/coolify-primary.md`: primary orchestration path for single-VPS-first rollout
- `deployment/self-hosted/orchestration/traefik-alternative.md`: alternative orchestration path and parity expectations
- `deployment/transition-paths/cloudflare-to-vps.md`: migration sequence and rollback posture from Cloudflare to VPS
- `architecture/database.md`: how DB driver selection works across local Postgres and Neon
- `architecture/frontend-styling.md`: how the shared Tailwind token layer, app CSS, and UI base styles fit together
- `architecture/link-preview-security.md`: link preview URL policy model (allowlist, protocol, SSRF, and decision reasons)
- `architecture/files-platform.md`: package topology, Hybrid/HTTP-native approach model, public interfaces, and future adapter direction
- `architecture/files-storage.md`: files storage primitives and the current public/private split
- `architecture/course-video-files.md`: course-video HLS artifact, playback, protection, and provider strategy
- `architecture/files-processing-addons.md`: image, video, audio, and document processing addon responsibilities
- `architecture/files-upload-delivery.md`: upload protocols, integrations, delivery strategies, and limits
- `flows/files-flow.md`: how uploads and public/private reads move through the app runtime
- `flows/todo-flow.md`: how the app reads and mutates user-owned todos end to end
- `setup/files-platform-examples.md`: Solid, framework-neutral, server pipeline, and Proto Cook route examples for the files platform
- `setup/files-storage-r2-minio.md`: local filesystem, MinIO, R2, AWS S3, and custom S3-compatible storage setup
- `setup/files-worker-deployment.md`: Proto Cook files worker queue, ffmpeg, retry, cleanup, and deployment guidance
- `../docs/archive/historical-evidence-2026-06-12/`: archived pre-Proto Cook evidence and worklog material

Infra execution docs entry point:

- `../packages/apps/proto-cook/infra/docs/README.md`: self-host implementation mechanics, checklists, and deployment steps
- `../packages/apps/proto-cook/infra/docs/providers/*.md`: provider-specific provisioning guides
- `../packages/apps/proto-cook/infra/docs/checklists/*.md`: deploy and hardening execution checklists
- `../packages/apps/proto-cook/infra/docs/runbooks/*.md`: migration, rollback, and incident operations

Rule of thumb:

- update a focused doc when a new subsystem or flow is introduced
- archive historical implementation notes under `docs/archive/**`
