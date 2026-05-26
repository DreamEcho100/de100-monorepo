# backup-v1 manifest

- Created: 2026-05-26
- Purpose: Preserve Cloudflare/Alchemy/Wrangler-era deployment references before self-host migration.
- Scope: Code, docs, env templates, and config/workflow references tied to Cloudflare runtime/deploy paths.
- Secret policy: Local secret files are not copied. Only template and key-reference documentation is preserved.

## Archived Files (path-preserved under files/)

### Code

- apps/lms-web/vite.config.ts
- apps/lms-web/src/routes/api/auth/[...auth].ts
- packages/apps/lms/api/src/media-storage.ts
- packages/apps/lms/infra/alchemy.run.ts
- packages/apps/lms/infra/package.json
- packages/apps/lms/infra/biome.json
- packages/apps/lms/infra/.gitignore

### Docs

- README.md
- docs/README.md
- docs/onboarding.md
- docs/setup/production-deployment.md
- docs/architecture/media-storage.md
- docs/flows/media-flow.md
- docs/worklog.md

### Env Templates

- .env.example
- .env.deploy.local.example

### Config and Workflows

- .github/workflows/ci.yml
- pnpm-workspace.yaml
- tooling/biome/base.json
- .gitignore

## Local Secret-Bearing Files (not copied)

- .env.deploy.local
- packages/apps/lms/infra/.env

## Notes

- These files are for historical reference and rollback context only.
- Active migration work should happen outside \_old/backup-v1.
