# Rollback And Recovery Runbook

Use this runbook when a production deploy causes unacceptable impact.

## Trigger Conditions

Start rollback when one or more are true:

- critical user paths are unavailable
- auth or session failures exceed threshold
- error rate exceeds threshold and does not recover
- data integrity risk is detected

## Immediate Actions

1. Announce incident in operations channel.
2. Freeze new deploys.
3. Assign incident commander and operator.

## Rollback Procedure

1. Re-route traffic to previous stable release or origin.
2. Re-deploy previous known-good app revision.
3. Validate health endpoint:
   - pnpm -F @de100/apps-lms-infra selfhost:health
4. Run targeted smoke checks for auth, todos, and media read paths.

## Data Recovery Decision

If schema/data changes were applied:

1. Assess whether forward-fix is safer than restore.
2. If restore is required, restore from latest verified snapshot.
3. Re-run migration state checks and app smoke checks.

Never restore blindly without confirming data-loss window and stakeholder approval.

## Communication

- Update status every agreed interval.
- Record timeline with UTC timestamps.
- Notify stakeholders when service is stable.

## Exit Criteria

Rollback is complete when:

- public health checks are stable
- critical flows pass smoke checks
- monitoring no longer shows active incident symptoms

## Follow-Up

1. Open post-incident report.
2. Add prevention tasks to backlog.
3. Update checklists/runbooks based on lessons learned.
