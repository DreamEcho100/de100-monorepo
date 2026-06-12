# ADR 0001: Hard Rename LMS Identity To Proto Cook

## Status

Accepted

## Context

The app was originally named around LMS concepts, but the current direction is a prototype host app for many future verticals. Keeping `lms` as the app identity would make reusable platform work look course-specific and would keep old assumptions in package names, env names, CI, docs, and deployment defaults.

## Decision

Rename active app identity from `lms` to `proto-cook` with no compatibility aliases.

The `Course` model remains valid as a Vertical Module and Feature Lab domain. It must not define the host app identity.

## Consequences

- Active packages, paths, env variables, Docker resources, CI, docs, and cache prefixes use Proto Cook terminology.
- Historical terminology is allowed only in explicit archives such as `docs/archive/**`.
- Consumers must update to the new names; no old package/env aliases are maintained.
