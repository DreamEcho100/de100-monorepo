# Hetzner Provider Guide

This guide maps Proto Cook self-host deployment to Hetzner Cloud.

## Recommended Baseline

- VM: CPX21 or higher for first production traffic
- Region: closest to target users
- Disk: 40 GB+ SSD
- Backup: enable automatic snapshots

## Network Setup

1. Create Cloud Firewall:
   - allow 22/tcp from admin IP range
   - allow 80/tcp and 443/tcp from anywhere
   - deny all other inbound ports
2. Attach firewall to VPS.
3. Point DNS A/AAAA records to VPS public IP.

## Runtime Stack Choices

- Orchestration (primary): Coolify + Caddy
- Orchestration (alternative): Traefik
- Database: Hetzner managed Postgres or external managed Postgres
- Cache: Redis/Upstash depending desired ops model
- Files storage: S3-compatible provider with APP_PROTO_COOK_FILES_S3_* values

## Provisioning Sequence

1. Create VPS and apply host baseline hardening.
2. Install Docker and selected orchestrator.
3. Configure env using docs/setup/production-deployment.md.
4. Run preflight and health verification scripts.
5. Execute post-deploy smoke checklist.

## Hetzner-Specific Notes

- Keep SSH private networking or VPN for admin access where possible.
- Prefer periodic volume snapshots before schema changes.
- Monitor network egress if files traffic volume increases.
