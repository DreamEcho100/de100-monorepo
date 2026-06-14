# CI Workflows

Proto Cook uses two path-filtered GitHub Actions workflows:

- `.github/workflows/proto-cook-ci.yml` validates the app, app-domain packages, service-backed files integration, web build, stale terminology scans, MinIO smoke, and hosted smoke.
- `.github/workflows/general-packages-ci.yml` validates reusable package families such as files, i18n, and UI.

Path-filtered workflows can be skipped when a change does not match their `paths` list. Do not configure these workflows as required branch-protection checks unless the repository also has a wrapper that always reports a status, or unless pending skipped checks are acceptable for the branch-protection policy.

## Package-Owned CI Scripts

CI task ownership lives in package scripts, not in root feature aliases.

Packages that participate in Proto Cook CI expose the scripts that apply to their package:

```json
{
  "scripts": {
    "ci:proto-cook:format-and-lint": "pnpm format-and-lint:check",
    "ci:proto-cook:type:check": "pnpm type:check",
    "ci:proto-cook:test": "pnpm test"
  }
}
```

Reusable package families expose the general workflow equivalents:

```json
{
  "scripts": {
    "ci:general:format-and-lint": "pnpm format-and-lint:check",
    "ci:general:type:check": "pnpm type:check",
    "ci:general:test": "pnpm test"
  }
}
```

Only add `ci:*:test` when the package has behavior tests. Empty container packages should not add test scripts just to satisfy a convention.

The workflows call Turbo once per concern:

```sh
pnpm turbo run ci:proto-cook:format-and-lint --continue
pnpm turbo run ci:proto-cook:type:check --continue
pnpm turbo run ci:proto-cook:test --continue

pnpm turbo run ci:general:format-and-lint --continue
pnpm turbo run ci:general:type:check --continue
pnpm turbo run ci:general:test --continue
```

The root `package.json` remains workspace orchestration only.

## Service Containers

Proto Cook CI uses GitHub service containers for Postgres, Redis, and MinIO. The MinIO service uses the official `minio/minio:latest` image with the same server command shape as local Compose:

```sh
server /data --address ":9000" --console-address ":9001"
```

Bucket creation is not embedded in the workflow service definition. The existing MinIO smoke script creates missing buckets, writes and reads objects, checks multipart behavior, and cleans up the run.

## Local Ownership

Local service lifecycle belongs to `@de100/apps-proto-cook-infra`:

```sh
pnpm -F @de100/apps-proto-cook-infra services:up
pnpm -F @de100/apps-proto-cook-infra services:status
pnpm -F @de100/apps-proto-cook-infra minio:smoke
pnpm -F @de100/apps-proto-cook-infra services:down
```

The Compose file is package-local at `packages/apps/proto-cook/infra/docker-compose.yml`. Keep future app-specific Compose stacks under the owning app's infra package.
