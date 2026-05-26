# Migration Cutover Runbook

Use this runbook when migrating traffic from a previous environment to the active self-host path.

## Preconditions

- Pre-deploy checklist completed: ../checklists/pre-deploy-checklist.md.
- Rollback runbook reviewed: ./rollback-recovery.md.
- Snapshot or restore point created for data services.

## Phase 1: Deploy Candidate

1. Deploy candidate release to target self-host environment.
2. Run:
   - pnpm -F @de100/apps-lms-infra selfhost:preflight
   - pnpm -F @de100/apps-lms-db db:migrate
   - pnpm -F @de100/apps-lms-infra selfhost:verify
3. Execute smoke checklist: ../checklists/post-deploy-smoke-checklist.md.

Gate: no critical failures.

## Phase 2: Controlled Traffic Shift

1. Reduce DNS TTL (if not already reduced).
2. Shift a small traffic percentage to self-host origin.
3. Monitor:
   - health endpoint
   - auth success rate
   - API error rate
   - upload/read media flows

Gate: stable metrics for agreed soak window.

## Phase 3: Full Cutover

1. Shift all traffic to self-host origin.
2. Keep old environment available during observation window.
3. Re-run post-deploy smoke checklist.

Gate: no unresolved P1/P2 incidents during cutover window.

## Abort Criteria

Abort and rollback if any of these occur:

- sustained auth failures
- sustained 5xx increase beyond threshold
- failed critical data writes
- media access regressions on core user paths

## Post-Cutover Tasks

1. Capture evidence artifact under docs/evidence/.
2. Document issues and mitigations.
3. Schedule retrospective and hardening actions.
