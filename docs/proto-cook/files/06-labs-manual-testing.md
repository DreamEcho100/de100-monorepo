# Labs Manual Testing

Labs are gated Feature Labs. They are intended for local/manual evaluation, not normal product navigation.

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
pnpm -F @de100/apps-proto-cook-infra minio:up
pnpm -F @de100/apps-proto-cook-db db:migrate
pnpm -F @de100/apps-proto-cook-web db:seed
pnpm dev
```

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
