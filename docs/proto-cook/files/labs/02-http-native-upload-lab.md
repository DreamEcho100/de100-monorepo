# Files Labs 02 - HTTP-Native Upload Lab

Route:

```txt
/en/files-lab/http
```

HTTP-native is the maintained second path. It is useful for teams that prefer explicit REST-like routes or need compatibility with tools that already speak HTTP upload/download protocols.

## Flow

```txt
browser form
  |
  | target request
  v
/api/files/*
  |
  | bytes, completion, reads, variants
  v
storage adapter
```

## Local XHR Check

1. Open `/en/files-lab/http`.
2. Select:
   - track: `practical`
   - storage profile: `local-fs`
   - upload protocol: `auto`
   - visibility: `private`
3. Generate fixtures and upload selected files.

Expected:

- The lab does not use direct oRPC upload or direct oRPC download.
- The run still records upload target and file record status.
- The UI rejects direct oRPC paths with localized policy errors if forced.

Evidence to capture:

- `/api/files/*` target or upload request in DevTools.
- Localized policy error when direct oRPC paths are forced.
- Completed file record ID and status.

## Public File Check

1. Change visibility to `public`.
2. Upload a small image.
3. Open the Files page and request regular access for the file.

Expected:

- Public delivery is allowed by policy.
- Private-only read checks should not be required for that object.
- The file metadata still records owner and route.

Evidence to capture:

- Public read request path and status code.
- File visibility in UI or run log.
- Confirmation that the object is not accidentally treated as private-only.

## Private File Check

1. Change visibility to `private`.
2. Upload a generated document.
3. Try to read it from a signed-out browser session.
4. Try again from the owning signed-in session.

Expected:

- Anonymous read fails.
- Owner read succeeds through private route or signed route behavior.
- Logs differentiate auth failure from storage failure.

Evidence to capture:

- Anonymous browser request and failure status.
- Owner browser request and success status.
- Error copy that separates auth denial from object-not-found.

## Range Read Check

1. Upload or use a video/audio fixture.
2. Request playback or direct route read from a browser.
3. Inspect network headers.

Expected:

- Range reads are delivery policy, not upload policy.
- The route supports byte serving only where configured.
- Unauthorized range requests fail the same as full-object requests.

Evidence to capture:

- Request headers showing the range request.
- Response status and content-range behavior when supported.
- Denied anonymous range read for private content.

## QA Checklist

| Check | Pass condition |
| --- | --- |
| Local XHR | Upload and completion use HTTP routes, not direct oRPC byte transfer |
| Public read | Public file can be read through the documented delivery path |
| Private read | Anonymous denied; owner allowed; denial reason is clear |
| Range read | Range support is visible where enabled and policy-gated where private |
| Localization | Forced-policy errors are localized and actionable |

## Feedback To Capture

```txt
Is HTTP-native easier to inspect in DevTools?
Is it too verbose compared with Hybrid?
Which route responses need better copy or status detail?
Does this path feel maintainable as a full second approach?
```
