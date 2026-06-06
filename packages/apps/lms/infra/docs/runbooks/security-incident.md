# Security Incident Runbook

Use this runbook for suspected credential leakage, unauthorized access, or malicious runtime activity.

## Detection Sources

- monitoring alerts
- suspicious auth behavior
- infrastructure access anomalies
- manual reports from users or operators

## Triage

1. Record incident start time and reporter.
2. Classify severity (P1, P2, P3).
3. Identify affected systems and blast radius.

## Containment

1. Rotate exposed secrets immediately:
   - APP_LMS_BETTER_AUTH_SECRET
   - APP_LMS_FILES_SIGNING_SECRET
   - cache and storage credentials
2. Revoke compromised access tokens or API keys.
3. Restrict inbound access if active exploitation is suspected.

## Eradication And Recovery

1. Patch vulnerable service or configuration.
2. Redeploy fixed revision.
3. Run:
   - pnpm -F @de100/apps-lms-infra selfhost:verify
4. Execute post-deploy smoke checks.
5. Monitor for recurring malicious patterns.

## Evidence Handling

- Preserve logs and timeline notes.
- Redact secrets before storing artifacts.
- Keep chain-of-events document with UTC timestamps.

## Communication

- Notify internal stakeholders according to severity.
- If required by policy, prepare user-facing incident communication.

## Closure

Close incident only when:

- exploit path is removed
- secrets are rotated
- service behavior is stable
- follow-up prevention actions are scheduled
