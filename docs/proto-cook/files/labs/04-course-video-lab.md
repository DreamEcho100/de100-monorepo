# Files Labs 04 - Course Video Lab

Route:

```txt
/en/files-lab/course-video
```

This lab connects files to the course vertical module. It tests the product direction from the video roadmap: upload original, attach to lesson, queue HLS processing, request signed playback.

## Flow

```txt
uploaded source file
  |
  | attachLessonVideo
  v
course lesson video asset
  |
  | processing job
  v
artifact group
  |
  | signed playback session
  v
course lesson player
```

## Create Course Structure

1. Open `/en/files-lab/course-video`.
2. Keep the generated course slug or edit it.
3. Click `Create course`.
4. Click `Create chapter`.
5. Choose lesson visibility:
   - `Preview` for anonymous allowed playback policy.
   - `Enrolled` for enrollment-gated playback.
   - `Private` for strict owner/admin access.
6. Click `Create lesson`.

Expected:

- Run log records each created object.
- Duplicate slugs should fail clearly.
- Labels are localized through the app i18n messages.

## Attach A Video File

1. Open `/en/files` or `/en/files-lab/hybrid`.
2. Upload a video fixture or small local video.
3. Copy the file ID.
4. Paste the file ID into the course video lab.
5. Click `Attach video`.

Expected:

- The run log records the attached file ID and video asset status.
- Non-video files should fail validation or policy checks.
- A stored source can exist before HLS artifacts are ready.

## Request Playback

1. Click `Request playback`.
2. Copy the playback token if one is issued.
3. Open the lesson route from the lab button.

Expected:

- Preview lessons can issue playback based on policy.
- Enrolled/private lessons require the right session and entitlement.
- If artifacts are not ready, the failure should identify readiness, not auth.

## Feedback To Capture

```txt
Was it clear which ID to copy from Files into the video lab?
Was the difference between source file and video asset clear?
Did playback failure explain missing entitlement versus missing artifacts?
What copy needs to move from lab-only language into product language?
```
