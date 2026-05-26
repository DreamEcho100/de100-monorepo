# Traefik Service Setup

This is the alternative implementation path to Coolify plus Caddy.

## Goal

Provide equivalent deployment behavior using Traefik-driven routing.

## Baseline Topology

- Traefik v3 as edge router and TLS terminator
- LMS app service on internal Docker network
- managed or self-hosted data services selected through env mode switches

## Prerequisites

- Host baseline from `../coolify-deployment/setup-from-scratch.md` section 1
- Domain DNS record pointing to host
- `.env.deploy.local` prepared and uncommitted

## Example Compose Skeleton

Create `docker-compose.traefik.yml` (adjust paths to your host checkout):

```yaml
services:
	traefik:
		image: traefik:v3.1
		command:
			- --providers.docker=true
			- --providers.docker.exposedbydefault=false
			- --entrypoints.web.address=:80
			- --entrypoints.websecure.address=:443
			- --certificatesresolvers.le.acme.email=ops@your-app-domain.example
			- --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
			- --certificatesresolvers.le.acme.httpchallenge=true
			- --certificatesresolvers.le.acme.httpchallenge.entrypoint=web
		ports:
			- "80:80"
			- "443:443"
		volumes:
			- /var/run/docker.sock:/var/run/docker.sock:ro
			- ./letsencrypt:/letsencrypt
		restart: unless-stopped

	lms-web:
		image: node:22-alpine
		working_dir: /workspace
		env_file:
			- ./.env.deploy.local
		command: >-
			sh -lc "corepack enable && pnpm install --frozen-lockfile && pnpm -F @de100/apps-lms-web build && pnpm -F @de100/apps-lms-web start"
		volumes:
			- /opt/lms/repo:/workspace
		labels:
			- traefik.enable=true
			- traefik.http.routers.lms.rule=Host(`your-app-domain.example`)
			- traefik.http.routers.lms.entrypoints=websecure
			- traefik.http.routers.lms.tls.certresolver=le
			- traefik.http.services.lms.loadbalancer.server.port=3000
		restart: unless-stopped
```

Note: for higher reliability, move to a prebuilt immutable app image after first stable release.

## Deployment Steps

1. Place `.env.deploy.local` beside compose file on host.
2. Start stack:

```bash
docker compose -f docker-compose.traefik.yml up -d
```

3. Verify router and cert:

```bash
docker compose -f docker-compose.traefik.yml logs traefik --tail=100
```

4. Run infra verification from repo root:

```bash
pnpm -F @de100/apps-lms-infra selfhost:verify
```

5. Execute post-deploy checklist:

- `../checklists/post-deploy-smoke-checklist.md`

## Operational Parity Gates

Before approving Traefik path as production-ready, confirm:

1. `/health` stays healthy through restarts.
2. TLS cert renewals succeed automatically.
3. Forwarded headers preserve scheme and host for Better Auth callbacks.
4. Web app restarts do not break long-lived client sessions.

## Rollback Trigger

If parity gates fail under load, switch traffic back to previous path and execute `../runbooks/rollback-recovery.md`.
