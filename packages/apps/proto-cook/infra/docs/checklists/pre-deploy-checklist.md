# Pre-Deploy Checklist

Complete this checklist before every production deploy.

## Release Scope

- [ ] Change set reviewed and linked to issue/ticket.
- [ ] Deployment owner and rollback owner assigned.
- [ ] Maintenance window and communication channel agreed.

## Environment Contract

- [ ] `.env.deploy.local` (or provider secret store) includes required production values.
- [ ] `APP_PROTO_COOK_BETTER_AUTH_URL` and `APP_PROTO_COOK_CORS_ORIGIN` match final public domain.
- [ ] Cache driver choice (`memory`, `redis`, `upstash`) matches provisioned service.
- [ ] Files driver choice (`local`, `s3`) and S3 provider (`r2`, `minio`, `aws`, or `custom`) match runtime capability and storage availability.
- [ ] Secrets are sourced from secure storage and not committed.

## Data And Service Readiness

- [ ] Database is reachable from target runtime.
- [ ] `pnpm -F @de100/apps-proto-cook-db db:migrate` dry run or migration plan reviewed.
- [ ] Cache endpoint connectivity validated (if not using `memory`).
- [ ] Object storage endpoint and bucket names validated (if using `s3`).

## Infrastructure Readiness

- [ ] DNS points to active edge host.
- [ ] TLS termination path ready (Caddy or Traefik).
- [ ] Host firewall allows only required ports.
- [ ] Backup snapshot/restore point created for database and persistent volumes.

## Command Gates

- [ ] `pnpm -F @de100/apps-proto-cook-infra selfhost:preflight` passes.
- [ ] `pnpm -F @de100/apps-proto-cook-infra selfhost:health` passes against target URL.
- [ ] `pnpm -F @de100/apps-proto-cook-infra selfhost:verify` passes.

## Rollback Readiness

- [ ] Previous stable release identifier recorded.
- [ ] Rollback steps reviewed: `../runbooks/rollback-recovery.md`.
- [ ] Incident response contacts and paging path confirmed.
