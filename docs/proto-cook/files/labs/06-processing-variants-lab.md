# Files Labs 06 - Processing And Variants Lab

Route:

```txt
/en/files-lab/processing-variants
```

This lab checks the difference between simple variants and video artifact groups.

## Model

```txt
single-file variants
  optimized image
  poster image
  waveform
  thumbnail

artifact groups
  HLS master manifest
  rendition manifests
  segments
  captions
  poster
  metadata
```

## Image Variant Scenario

1. Upload an image from `/en/files` or a files approach lab.
2. Trigger processing.
3. Open the optimized variant route.

Expected:

- Optimized image variant is readable.
- Missing optional image adapters fail explicitly.
- Original retention follows route policy.

## Video Artifact Scenario

1. Upload a small MP4, MOV, WebM, or MKV file.
2. Attach it to a course lesson.
3. Queue or run HLS processing.
4. Inspect artifact records and storage keys.

Expected:

- HLS output is grouped as artifacts, not just `file_variants`.
- Staging-prefix writes are promoted only after validation.
- Failed staging output is cleaned or marked for cleanup.

## Disabled Adapter Scenario

1. Disable an optional adapter such as ffmpeg, ffprobe, audio metadata, or document preview.
2. Run a job that needs it.

Expected:

- The job fails with a clear disabled-adapter reason.
- The system does not pretend the variant exists.
- Retry behavior preserves enough state to diagnose the failed stage.

## Feedback To Capture

```txt
Is the difference between variant and artifact group clear?
Were processing failures actionable?
Did the lab expose enough job state?
Which processor outputs need thumbnails/previews in the UI?
```
