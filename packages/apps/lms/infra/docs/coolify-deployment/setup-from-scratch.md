# Coolify Setup From Scratch

This document defines the hands-on setup steps for the default self-host path.

## Target Topology

Single VPS baseline with:

- Coolify deployment control plane
- Caddy reverse proxy and TLS termination
- LMS web app service
- managed or self-hosted data services selected through env mode switches

## Required Inputs

- VPS host and SSH access
- Domain and DNS control
- Application environment variables

## 1. Host Baseline

Use an Ubuntu 24.04 or Debian 12 host with at least 2 vCPU, 4 GB RAM, and 40 GB SSD for first production traffic.

Recommended one-time baseline:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw fail2ban
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

If Docker is not already installed:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Log out and back in after changing Docker group membership.

## 2. Install Coolify

Follow the latest official Coolify installation flow. After installation:

1. Create one Coolify project for LMS.
2. Register the repo and branch.
3. Restrict deployment access to maintainers only.

## 3. Configure App Service In Coolify

Use one app service for LMS web runtime:

- Port: `3000` (or your `APP_LMS_SERVER_PORT` value)
- Build command: `pnpm install --frozen-lockfile && pnpm -F @de100/apps-lms-web build`
- Start command: `pnpm -F @de100/apps-lms-web start`
- Health path: `/health`

Environment injection:

1. Copy values from uncommitted `.env.deploy.local`.
2. Do not set local-only values unless intentionally needed.
3. For `APP_LMS_MEDIA_STORAGE_DRIVER=r2`, include all required `APP_LMS_MEDIA_S3_*` values.

## 4. Add Caddy As Edge Reverse Proxy

Run Caddy on the host or in a dedicated service that forwards to the LMS app container.

Example Caddyfile:

```caddy
your-app-domain.example {
	encode zstd gzip

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
	}

	reverse_proxy 127.0.0.1:3000 {
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Forwarded-For {remote_host}
	}
}
```

If Coolify exposes the app on a non-local interface, restrict access with firewall rules so only Caddy can reach the app port.

## 5. Deploy And Verify

From repo root (local or CI runner with deployment access):

```bash
pnpm -F @de100/apps-lms-infra selfhost:preflight
pnpm -F @de100/apps-lms-db db:migrate
pnpm -F @de100/apps-lms-infra selfhost:verify
```

Then execute:

- `../checklists/post-deploy-smoke-checklist.md`
- `docs/evidence/templates/hosted-deploy-smoke-template.md`

## 6. Rollback Readiness

Before first traffic cutover:

1. Save previous Coolify release identifier.
2. Confirm DB restore point or snapshot timestamp.
3. Validate `../runbooks/rollback-recovery.md` with operators.

If any smoke gate fails, stop rollout and execute rollback runbook immediately.
