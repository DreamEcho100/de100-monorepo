# Files Labs 05 - HLS Playback Session Lab

Routes:

```txt
/en/files-lab/hls-playback
/en/courses/build-your-own-ui-library/intro/welcome
```

The goal is to validate signed HLS playback sessions, not raw MP4 delivery as the main course-video path.

## Playback Path

```txt
lesson page
  |
  | createPlaybackSession
  v
signed token
  |
  | manifest + segment requests
  v
HLS artifact group
  |
  | QoE events
  v
telemetry hook / DB records
```

## Basic Playback

1. Seed demo data.
2. Open `/en/courses/build-your-own-ui-library/intro/welcome`.
3. Click `Request playback`.
4. Select the package player.

Expected:

- The page receives a playback decision.
- If a session is issued, the player receives a manifest URL.
- Browser network requests include manifest and segment paths when artifacts are available.

## Player Prototype Comparison

1. Request playback.
2. Switch between:
   - package player
   - helper-only player
   - external adapter prototype
3. Trigger play, pause, wait, and complete events when possible.

Expected:

- All prototypes keep the same entitlement decision.
- QoE metadata includes enough detail to identify the prototype path.
- The package player remains the recommended product default.

## Token Scope Check

1. Copy a manifest URL.
2. Try it in the same signed-in browser.
3. Try it in a signed-out browser.
4. If possible, revoke or expire the token and retry.

Expected:

- Valid token plus valid entitlement can read.
- Missing, expired, or revoked token fails.
- Segment access is scoped to the same playback session policy as the manifest.

## Feedback To Capture

```txt
Did the player mode switch feel useful or confusing?
Were token and manifest failures distinguishable?
Could you inspect HLS behavior without reading implementation code?
Which QoE event names need better product terminology?
```
