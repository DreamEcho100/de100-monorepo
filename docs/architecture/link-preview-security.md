# Link Preview Security Architecture

## Purpose

The link-preview system supports predictive prefetch and metadata previews while enforcing strict URL security policy boundaries.

Implementation lives in:

- [packages/ui/domains/solidjs/src/libs/link-preview/security-policy.ts](/home/viavi/Desktop/workspaces/github/proto-cook/packages/ui/domains/solidjs/src/libs/link-preview/security-policy.ts)

## Policy Model

The resolver normalizes policy input into a stable runtime shape:

- allowlist rules (exact host or wildcard subdomain)
- blocked host suffixes
- HTTPS enforcement
- SSRF protections:
  - localhost blocking
  - link-local blocking
  - private-network blocking

## Decision Model

`evaluateLinkPreviewUrl()` returns an explicit typed decision:

- `allowed: true` with parsed `URL`
- `allowed: false` with a specific reason:
  - `invalid-url`
  - `protocol-blocked`
  - `blocked-host-suffix`
  - `localhost-blocked`
  - `link-local-address`
  - `private-network-blocked`
  - `allowlist-blocked`

This keeps policy handling deterministic and testable.

## Default Security Posture

When no custom input is provided:

- allowlist enforcement is enabled
- HTTPS enforcement is enabled
- localhost/link-local/private network protections are enabled

## App Integration Rules

- evaluate URLs before metadata fetch or preview rendering
- keep policy config app-owned (env/config driven), not hardcoded in component code
- for route prefetch, apply auth and route preconditions separately from URL policy checks

## Validation

Policy coverage is tested in:

- [packages/ui/domains/solidjs/src/link-preview/security-policy.test.ts](/home/viavi/Desktop/workspaces/github/proto-cook/packages/ui/domains/solidjs/src/link-preview/security-policy.test.ts)
