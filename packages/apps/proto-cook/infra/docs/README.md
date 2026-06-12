# Infra Deployment Docs

This folder is the execution source-of-truth for self-host deployment mechanics.

## Relationship To Root Docs

- Root docs under docs/deployment describe architecture decisions and migration strategy.
- Infra docs describe exact implementation steps, scripts, and verification.

## Sections

- coolify-deployment: primary orchestration path with Caddy edge termination.
- traefik-deployment: alternative orchestration path with parity checks.
- providers: host-level provisioning guides (Hetzner, DigitalOcean, Hostinger).
- checklists: pre-deploy, hosted smoke run, post-deploy smoke, and security hardening checklists.
- runbooks: migration cutover, rollback recovery, and security incident response.

## Command Surface

- `pnpm -F @de100/apps-proto-cook-infra selfhost:preflight`: validate env and mode wiring.
- `pnpm -F @de100/apps-proto-cook-infra selfhost:health`: hit the configured health endpoint.
- `pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:public`: validate key public routes and OpenAPI endpoint behavior.
- `pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:hosted -- --url <origin> --env <environment>`: run hosted smoke orchestration (`verify:full`) and scaffold evidence in one command.
- `pnpm -F @de100/apps-proto-cook-infra selfhost:verify`: run preflight and health checks together.
- `pnpm -F @de100/apps-proto-cook-infra selfhost:verify:full`: run verify plus public smoke checks.
- `pnpm -F @de100/apps-proto-cook-infra selfhost:evidence:init -- <environment>`: scaffold hosted smoke evidence from template.
- `pnpm -F @de100/apps-proto-cook-infra destroy`: print controlled destroy guidance.

## Execution Order

1. Choose a provider guide under `providers/`.
2. Complete `checklists/pre-deploy-checklist.md`.
3. Follow either:
   - `coolify-deployment/setup-from-scratch.md` (primary), or
   - `traefik-deployment/service-setup.md` (alternative).
4. Run `pnpm -F @de100/apps-proto-cook-infra selfhost:smoke:hosted -- --url https://your-app-domain.example --env <environment>`.
5. Execute `checklists/hosted-smoke-run-procedure.md`.
6. Complete `checklists/post-deploy-smoke-checklist.md` and fill the generated evidence file.
7. Keep `runbooks/rollback-recovery.md` and `runbooks/security-incident.md` accessible to on-call operators.
