# Cloudflare To VPS Transition

This guide tracks the migration path from Cloudflare deployment to self-host deployment.

## Preconditions

- i18n dev-start blocker is resolved.
- backup-v1 archive exists under \_old/backup-v1.
- Local secret files are documented but not copied to repository backup folders.

## Migration Sequence

1. Snapshot Cloudflare-era references from \_old/backup-v1.
2. Configure self-host environment variables and service modes.
3. Deploy on single VPS using Coolify primary path.
4. Verify health, auth, media, and API behavior.
5. Cut traffic with rollback-ready checkpoints.

## Rollback Principle

If a migration gate fails, stop the cutover and use archived references from \_old/backup-v1 to restore known working configuration behavior.
