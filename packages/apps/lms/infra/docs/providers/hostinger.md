# Hostinger Provider Guide

This guide maps LMS self-host deployment to Hostinger VPS offerings.

## Recommended Baseline

- VPS tier: at least 2 vCPU / 4 GB RAM
- Disk: 40 GB+ SSD
- OS: Ubuntu 24.04 LTS (recommended)

## Network Setup

1. Restrict SSH access to trusted admin ranges.
2. Allow only 80/tcp and 443/tcp publicly.
3. Configure DNS records to VPS public IP.

## Runtime Stack Choices

- Orchestration (primary): Coolify + Caddy
- Orchestration (alternative): Traefik
- Database: managed external Postgres or self-hosted Postgres
- Cache: managed external Redis/Upstash or self-hosted Redis
- Media storage: S3-compatible object storage configured through APP*LMS_MEDIA_S3*\*

## Provisioning Sequence

1. Harden VPS host and install Docker.
2. Deploy orchestrator path and edge proxy.
3. Configure production env values.
4. Run verification scripts and smoke checklist.

## Hostinger-Specific Notes

- Confirm available snapshot/backup features on your selected VPS plan.
- Prefer managed external data services when operational capacity is limited.
- Validate outbound connectivity to database, cache, email, and object storage providers.
