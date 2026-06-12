# Security Hardening Checklist

Run this checklist before first production traffic and then quarterly.

## Host And Network

- [ ] SSH password login disabled; keys only.
- [ ] Root login disabled.
- [ ] UFW or equivalent firewall allows only required ports.
- [ ] Fail2ban (or equivalent) enabled.
- [ ] Automatic security updates enabled.

## Container And Runtime

- [ ] Runtime runs as non-root where possible.
- [ ] Unused container ports are not exposed publicly.
- [ ] Restart policies are configured.
- [ ] Image update cadence is defined.

## Secrets And Configuration

- [ ] Secrets are managed outside git.
- [ ] APP_PROTO_COOK_BETTER_AUTH_SECRET is strong and rotated on schedule.
- [ ] APP_PROTO_COOK_FILES_SIGNING_SECRET is set and rotated on schedule when configured separately from Better Auth.
- [ ] Production env access is restricted to required operators.

## TLS And Edge

- [ ] TLS certificates auto-renew and are monitored.
- [ ] HSTS header enabled.
- [ ] X-Content-Type-Options and X-Frame-Options configured.
- [ ] Proxy preserves X-Forwarded-Host and X-Forwarded-Proto.

## Data Services

- [ ] Database backups are automated and restore-tested.
- [ ] Cache and object storage credentials follow least privilege.
- [ ] Object storage buckets are private by default.

## Monitoring And Alerting

- [ ] Health endpoint alerting is configured.
- [ ] Error rate alerting is configured.
- [ ] Auth failure and suspicious access patterns are monitored.

## Incident Readiness

- [ ] On-call contact list is current.
- [ ] Security incident runbook reviewed: ../runbooks/security-incident.md.
- [ ] Rollback runbook reviewed: ../runbooks/rollback-recovery.md.
