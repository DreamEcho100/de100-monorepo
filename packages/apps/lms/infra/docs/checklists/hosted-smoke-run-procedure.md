# Hosted Smoke Run Procedure

Use this procedure when you need a detailed, repeatable hosted smoke execution path after deploy.

## Purpose

This run validates the deployed public origin using the infra command surface and captures evidence artifacts for release approval.

## Inputs Required

- Deployed target origin (for example `https://your-app-domain.example`)
- Access to deployment environment variables
- Ability to run repo commands from the root workspace
- Location for evidence artifact under `docs/evidence/`

## Preconditions

- Pre-deploy checklist completed: `./pre-deploy-checklist.md`
- Deployment completed through one orchestration path
- Database migrations applied
- Rollback owner assigned and rollback runbook accessible: `../runbooks/rollback-recovery.md`

## Environment Preparation

1. Ensure deployment env values are loaded from `.env.deploy.local` or provider secret store.
2. Set smoke target explicitly to avoid accidental localhost checks:

```bash
export APP_LMS_SMOKE_BASE_URL="https://your-app-domain.example"
export APP_LMS_SMOKE_TIMEOUT_MS="15000"
```

3. If health endpoint differs from default, set:

```bash
export APP_LMS_HEALTHCHECK_URL="https://your-app-domain.example/health"
```

## Command Sequence

Recommended one-shot command from repository root:

```bash
pnpm -F @de100/apps-lms-infra selfhost:smoke:hosted -- --url https://your-app-domain.example --env <environment>
```

Equivalent manual sequence:

```bash
pnpm -F @de100/apps-lms-infra selfhost:health
pnpm -F @de100/apps-lms-infra selfhost:verify
pnpm -F @de100/apps-lms-infra selfhost:smoke:public
pnpm -F @de100/apps-lms-infra selfhost:verify:full
```

## Expected Output Contract

- `selfhost:health`: prints target URL and returns status 200-range
- `selfhost:verify`: completes preflight and health with exit code 0
- `selfhost:smoke:public`: prints PASS lines for `/en`, `/ar`, `/api/reference` redirect, and `/api/reference/spec.json`
- `selfhost:verify:full`: completes with exit code 0 and includes smoke pass output

## Failure Handling

1. If `selfhost:smoke:hosted` fails:
   - check which nested command failed in the command output
   - rerun the manual sequence command-by-command to isolate the failing step
2. If `selfhost:health` fails:
   - verify reverse proxy routing and `APP_LMS_HEALTHCHECK_URL`
   - confirm app service is running on expected port
3. If `selfhost:verify` fails:
   - fix reported env contract errors from preflight
4. If `selfhost:smoke:public` fails:
   - inspect route behavior and server logs for failing endpoint
   - confirm target origin and timeout values are correct
5. If `selfhost:verify:full` fails after previous passes:
   - re-run commands individually to isolate flaky step

Escalate to rollback when critical user-facing routes remain failing after mitigation: `../runbooks/rollback-recovery.md`.

## Manual Follow-Up Checks

After command passes, run checklist items from:

- `./post-deploy-smoke-checklist.md`

Focus on auth flows, media upload/read, and signed URL behavior.

## Evidence Capture

1. If you used `selfhost:smoke:hosted` without `--skip-evidence-init`, open the generated evidence file under `docs/evidence/`.
2. If you used the manual sequence (or skipped evidence init), generate the evidence artifact shell:

```bash
pnpm -F @de100/apps-lms-infra selfhost:evidence:init -- <environment>
```

3. Record:
   - command outputs and pass/fail status
   - route checks
   - auth/media checks
   - unresolved issues and mitigation owners

## Completion Gate

This procedure is complete only when:

- `selfhost:verify:full` passes for the target origin
- manual smoke checklist is complete
- evidence artifact is committed (or attached per repo process)
- deployment reviewer signs off
