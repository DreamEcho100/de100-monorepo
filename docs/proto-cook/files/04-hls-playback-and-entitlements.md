# HLS Playback And Entitlements

Large course videos should not use raw MP4 delivery as the main playback path. The product path is HLS artifacts plus signed playback sessions.

```txt
course lesson page
  -> request playback access
  -> entitlement check
  -> signed playback session
  -> HLS manifest/segment/key route
  -> native <video> + lazy hls.js
```

Access policy:

- Preview lessons are readable by policy.
- Private lessons require enrolled user, admin, or course owner.
- Unavailable assets fail closed.
- Signed session TTL limits link sharing.
- AES-128 HLS is a prototype protection layer, not DRM.
- DRM/provider-managed playback remains a separate prototype track.

Manual expected behavior:

- Unauthorized private lesson: no playback session is issued.
- Enrolled private lesson: playback session is issued and manifest loads.
- Preview lesson: playback session is issued without enrollment.
- Expired/revoked token: manifest/segment/key route denies access.
- Missing artifact group: UI shows unavailable asset state.
