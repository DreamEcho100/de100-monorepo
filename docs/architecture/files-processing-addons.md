# Files Processing Addons

## Purpose

Processing addons keep heavy media-specific planning out of the core files packages. Core packages define shared contracts, storage, routing, pipeline, worker, and event primitives. Addons define domain-specific processing plans that apps can execute through injected dependencies.

Current addon packages:

- `@de100/files-processing-image`
- `@de100/files-processing-video`
- `@de100/files-processing-audio`
- `@de100/files-processing-document`

## Shared Rules

1. Addons may plan work and validate output shape.
2. Addons should not own Proto Cook DB, auth, queue, storage credentials, or route policy.
3. Addons should not require heavyweight native dependencies at import time.
4. Apps inject real processors, binaries, worker transport, storage, and telemetry.
5. Missing optional dependencies must fail explicitly or return skipped output, not silently degrade critical product paths.

## Image Addon

Current capability:

- responsive rendition planning
- placeholder planning
- EXIF flagging
- output content-type selection
- thumbnail/source-aware size planning

Current Proto Cook behavior:

- image `optimized` variant
- uses `sharp` when available
- source-copy fallback when optional dependencies are unavailable

Recommended next hardening:

- explicit route-level output sizes
- dominant-color and blur-data placeholders for product image components
- AVIF/WebP preference policy per route

## Video Addon

Current capability:

- accepted input detection for MP4, MOV, WebM, and MKV
- source-aware HLS rendition ladder
- TS and fMP4/CMAF plan shape
- ffmpeg command planning
- master manifest generation
- poster/caption object locations
- HLS generated-object validation
- HLS artifact group and artifact input creation
- AES-128 key-info planning and key artifact planning

Current Proto Cook behavior:

- video `poster` variant through an injected ffmpeg-shaped adapter
- `video-hls` worker job for normal HLS artifact groups
- `video-hls-encryption` worker job for AES-128 HLS artifact groups

Recommended next hardening:

- real ffmpeg smoke with a small fixture
- fMP4/CMAF output smoke before enabling it for product
- caption ingest and validation workflow
- worker disk/temp capacity checks

## Audio Addon

Current capability:

- metadata planning
- waveform planning
- normalized preview/transcode planning
- transcript hook planning
- dependency planning for `music-metadata`, `ffmpeg`, and `ffprobe`

Current Proto Cook behavior:

- audio `waveform` variant through an injected ffmpeg-shaped adapter

Recommended next hardening:

- route-level audio preview duration policy
- waveform JSON/image output contract
- transcript adapter boundary

## Document Addon

Current capability:

- PDF processing plan
- preview planning
- Office conversion proof-of-concept opt-in
- document-kind detection

Current Proto Cook behavior:

- document upload/read support through the generic files platform
- no product PDF/Office preview flow yet

Recommended next hardening:

- PDF thumbnail/text extraction adapter
- Office conversion container boundary
- explicit malware/scan hook before preview generation

## Optional Dependencies

Optional dependency policy:

- `sharp`: image optimization and responsive outputs
- `file-type`: magic-number detection
- `exifr`: EXIF extraction
- `music-metadata`: audio metadata
- `ffmpeg`: video/audio processing
- `ffprobe`: video/audio metadata

`ffmpeg` and `ffprobe` should be app-injected executables or adapters. Do not add a deprecated wrapper as the default path.

## Testing Policy

Keep tests focused on runtime behavior that types cannot catch:

- source-aware rendition skipping
- required output validation
- encryption key artifact planning
- disabled dependency behavior
- cleanup/retry output shape
- app-injected adapter contracts

Do not test import availability or static type guarantees unless a package-resolution boundary has broken before.

