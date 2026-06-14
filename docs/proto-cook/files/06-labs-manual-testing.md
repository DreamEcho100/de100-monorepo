# Labs Manual Testing

Labs are gated Feature Labs. They are intended for local/manual evaluation, not normal product navigation.

Start with `labs/00-lab-setup.md`, then use the tutorial for the specific lab route. This page is the short route map; the per-lab files are the step-by-step manuals.

Use this page when you want a compact checklist. Use the per-lab files when you want the full tutorial, expected evidence, failure mode, and cleanup detail.

Routes:

- `/en/files`
- `/en/files-lab`
- `/en/files-lab/hybrid`
- `/en/files-lab/http`
- `/en/files-lab/course-video`
- `/en/files-lab/provider-smoke`
- `/en/files-lab/hls-playback`
- `/en/files-lab/processing-variants`
- `/en/files-lab/entitlements`
- `/en/courses/build-your-own-ui-library/intro/welcome`

Baseline before testing:

```sh
pnpm install
pnpm -F @de100/apps-proto-cook-infra services:status
pnpm -F @de100/apps-proto-cook-infra minio:up
pnpm -F @de100/apps-proto-cook-db db:migrate
pnpm -F @de100/apps-proto-cook-web db:seed
pnpm dev
```

Detailed tutorials:

| Lab | Tutorial |
| --- | --- |
| Shared setup | `labs/00-lab-setup.md` |
| Hybrid upload | `labs/01-hybrid-upload-lab.md` |
| HTTP-native upload | `labs/02-http-native-upload-lab.md` |
| Provider smoke | `labs/03-provider-smoke-lab.md` |
| Course video | `labs/04-course-video-lab.md` |
| HLS playback | `labs/05-hls-playback-session-lab.md` |
| Processing and variants | `labs/06-processing-variants-lab.md` |
| Entitlement matrix | `labs/07-entitlement-matrix-lab.md` |
| Cleanup and feedback | `labs/08-cleanup-and-feedback.md` |

Hybrid lab checks:

1. Select `auto` protocol with local-fs profile.
2. Upload a small image.
3. Expected: planner chooses app-friendly path and completion appears in the log.
4. Force `xhr`.
5. Expected: app HTTP upload route is used.
6. Force disabled integration.
7. Expected: explicit disabled-state error, not silent fallback.

HTTP-native lab checks:

1. Create target through HTTP controls.
2. Upload generic file.
3. Request signed/private read.
4. Expected: route-level status/logs show target, upload, complete, and read behavior.

Entitlement checks:

| Scenario | Expected |
| --- | --- |
| Anonymous preview lesson | Playback allowed if lesson policy is preview |
| Anonymous private lesson | Playback denied |
| Enrolled private lesson | Playback allowed |
| Admin private lesson | Playback allowed |
| Expired token | Manifest/segment denied |

Visible browser evaluation:

```sh
pnpm -F @de100/apps-proto-cook-web test:browser:headed
pnpm -F @de100/apps-proto-cook-web test:browser:ui
```

After testing, run `labs/08-cleanup-and-feedback.md` so ports, containers, and temporary sessions do not leak into the next lab pass.

## Evidence Checklist

For every lab, capture at least one item from each layer that is involved:

| Layer | Evidence |
| --- | --- |
| UI | Screenshot or copied run-log line that shows selected approach/profile/protocol |
| Network | Request path, status code, and whether the call was oRPC, `/api/files/*`, or provider URL |
| Storage | Local file path, MinIO object, or explicit disabled-provider error |
| Policy | Visibility, entitlement, signed token, or disabled integration decision |
| Cleanup | Service status after shutdown or confirmation that seeded state was reset |

## Pass Or Fail Rules

| Result | Meaning |
| --- | --- |
| Pass | Behavior matches the tutorial and the evidence identifies the responsible layer |
| Product defect | Security, upload, storage, playback, or entitlement behavior is wrong |
| Documentation defect | Behavior is correct but the tutorial did not predict it |
| UX/DX defect | Behavior is technically correct but hard to understand, inspect, or recover from |

Stop testing and file a defect immediately if anonymous access can read private files, manifests, segments, or provider URLs.
