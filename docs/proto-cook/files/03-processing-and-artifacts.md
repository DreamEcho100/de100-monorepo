# Processing And Artifacts

Processing is storage-first:

```txt
original upload -> storage
               -> file record ready/stored
               -> processing job queued
               -> worker downloads/streams original
               -> writes staging artifacts
               -> validates outputs
               -> promotes staging to final artifact prefix
               -> persists artifacts/groups/events
               -> cleans staging
```

Single-file outputs use `file_variants`:

- optimized image
- thumbnail
- video poster-only
- audio waveform
- document preview

Grouped outputs use artifact groups:

- HLS master manifest
- rendition manifests
- TS/fMP4 segments
- AES-128 keys when enabled
- poster
- captions
- metadata
- QoE playback records

Expected local worker behavior:

1. Job starts as `queued`.
2. Worker marks it `running`.
3. Staging keys are written under a staging prefix.
4. Required outputs are validated.
5. Final keys are promoted.
6. Job becomes `succeeded`.
7. Failures become `failed` with retry metadata and staging cleanup attempted.
