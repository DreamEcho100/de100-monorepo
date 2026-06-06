# Pinned Preview Persistence Rollout Handoff

This document is a next-cycle rollout playbook. It does not change the current delivery.

## Current Baseline

The link-preview package currently owns reusable contracts and client-side preview behavior:

- preview action model
- pin/dismiss/open/copy action kinds
- URL security policy helpers
- Foresight-backed prefetch controller

The app owns route links and decides when to preload. Server-side persistence for pinned previews is deferred.

## Goal

Add optional server-side persistence for pinned link previews without making preview fetching a global app policy. Pages and components should still decide whether previewing, prefetching, and persistence are appropriate for their route and auth state.

## Non-Goals

- Do not globally persist every preview interaction.
- Do not server-fetch arbitrary private, local, or gated URLs.
- Do not remove the existing client-only behavior.
- Do not make pinned previews required for app navigation.

## Proposed Data Model

Recommended table: `link_preview_pins`

Fields:

- `id`
- `user_id`
- `canonical_url`
- `url_hash`
- `title`
- `description`
- `image_url`
- `site_name`
- `metadata_json`
- `pinned_at`
- `last_seen_at`
- `created_at`
- `updated_at`

Indexes:

- unique `user_id + url_hash`
- `user_id + pinned_at`

Notes:

- Store the canonical URL and a hash. Use the hash for uniqueness and lookup.
- Treat metadata as a snapshot. Refresh policy should be explicit and separate from pin/unpin.
- Never use persisted metadata as proof that a URL is safe to fetch again.

## API Shape

Recommended oRPC procedures:

- `linkPreviewPins.getAll`
- `linkPreviewPins.pin`
- `linkPreviewPins.unpin`
- `linkPreviewPins.refreshMetadata`

### Pin

Input:

```json
{
  "url": "https://docs.example.com/page",
  "metadata": {
    "title": "Page title",
    "description": "Optional description",
    "imageUrl": "https://docs.example.com/image.png",
    "siteName": "Example Docs"
  }
}
```

Behavior:

- require auth
- canonicalize URL
- evaluate the existing link-preview security policy
- upsert by `user_id + url_hash`
- return the persisted pin record

### Unpin

Input:

```json
{
  "url": "https://docs.example.com/page"
}
```

Behavior:

- require auth
- canonicalize URL
- delete or soft-delete the current user's pin

### Refresh Metadata

Behavior:

- require auth
- evaluate security policy before fetching
- use allowlist and SSRF protections
- rate-limit refresh requests
- update snapshot fields only after successful metadata parse

## Security Requirements

- Reuse `docs/architecture/link-preview-security.md` as the policy source.
- Enforce HTTPS unless a route explicitly opts out for local development.
- Block localhost, link-local, private networks, and blocked suffixes.
- Keep gated/private route preview decisions page-owned. A page may choose not to show or persist previews.
- Never persist sensitive request headers, cookies, auth tokens, or user-specific private preview payloads.

## Client Behavior

Recommended app flow:

1. Component renders with local preview state.
2. User clicks pin.
3. If authenticated and persistence is enabled, call `linkPreviewPins.pin`.
4. If unauthenticated or persistence is disabled, keep the pin local for the session only.
5. On failure, keep the UI recoverable and show a local-only pinned state only when the component explicitly allows that fallback.

This keeps persistence optional and avoids changing the semantics of app-owned `AppLink` and `AuthAppLink`.

## Rollout Flags

Recommended flags:

- `APP_LMS_LINK_PREVIEW_PIN_PERSISTENCE_ENABLED`
- `APP_LMS_LINK_PREVIEW_METADATA_REFRESH_ENABLED`
- `APP_LMS_LINK_PREVIEW_PIN_MAX_PER_USER`

Rollout order:

1. Add schema and read APIs with persistence disabled.
2. Enable pin/unpin for internal users.
3. Enable pinned-list reads in selected pages.
4. Enable metadata refresh only after rate limits and security logs are in place.

## Compatibility Plan

- Existing client-only pin behavior remains valid.
- Persisted pins should hydrate into the same preview card model.
- Missing metadata should render a URL-only fallback.
- Deleted or blocked URLs should be hidden or marked unavailable, not fetched blindly.

## Tests Required Next Cycle

- canonicalization and hashing tests
- per-user uniqueness tests
- auth-required API tests
- security-policy rejection tests for unsafe URLs
- optimistic pin/unpin UI tests
- local-only fallback tests when persistence is disabled
- metadata refresh rate-limit tests if refresh is enabled

## Acceptance Checklist

- Pin persistence can be disabled without breaking preview cards.
- One user's pins are never visible to another user.
- Unsafe URLs cannot be persisted through the server API.
- Metadata refresh cannot fetch private networks or localhost.
- Pages remain responsible for deciding whether preview persistence is appropriate.
