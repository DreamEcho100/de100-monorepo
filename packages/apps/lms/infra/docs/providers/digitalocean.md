# DigitalOcean Provider Guide

This guide maps LMS self-host deployment to DigitalOcean.

## Recommended Baseline

- Droplet: Basic or Premium AMD, 2 vCPU / 4 GB RAM minimum
- Region: closest to target users
- Disk: 50 GB+ recommended
- Backup: enable automated backups and snapshots

## Network Setup

1. Create Cloud Firewall:
   - allow 22/tcp from admin IP range
   - allow 80/tcp and 443/tcp from anywhere
   - deny non-required inbound ports
2. Attach firewall to Droplet.
3. Configure domain records to Droplet public IP.

## Runtime Stack Choices

- Orchestration (primary): Coolify + Caddy
- Orchestration (alternative): Traefik
- Database: DigitalOcean Managed PostgreSQL or external provider
- Cache: DigitalOcean Managed Redis or Upstash
- Media storage: S3-compatible endpoint (for example Spaces or external provider)

## Provisioning Sequence

1. Provision Droplet and harden host.
2. Install Docker and selected orchestrator path.
3. Load production env values into secret store or `.env.deploy.local`.
4. Run preflight, migrations, and verify flow.
5. Run post-deploy smoke checklist and capture evidence.

## DigitalOcean-Specific Notes

- Use VPC networking for app to managed database/cache where possible.
- Set CPU/memory alerts before cutover.
- Snapshot prior to major version upgrades.
