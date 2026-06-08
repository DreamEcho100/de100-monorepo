# LMS Files Worker Deployment

## Purpose

The LMS files worker runs app-injected processing outside the request/response path. It is responsible for durable jobs such as HLS packaging, generated variants, retries, and cleanup.

The package is `@de100/apps-lms-worker`. It currently exposes worker primitives instead of a committed production process wrapper:

- `resolveLmsFilesWorkerConfig()`
- `resolveLmsFilesWorkerConfigFromEnv()`
- `runLmsFilesWorkerOnce()`
- `runLmsFilesWorkerLoop()`
- DB polling queue adapter
- Redis queue adapter

Production deployment should wrap those primitives in a small process entrypoint owned by the app/deployment target.

## Worker References

Provider and tool behavior to keep in mind:

- FFmpeg HLS muxer docs: https://ffmpeg.org/ffmpeg-formats.html#hls-2
- Amazon S3 multipart limits: https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html
- Cloudflare R2 S3 API: https://developers.cloudflare.com/r2/api/s3/
- MinIO container docs: https://min.io/docs/minio/container/index.html

## Environment

Defaults are safe for local development:

```env
APP_LMS_FILES_WORKER_CONCURRENCY=1
APP_LMS_FILES_WORKER_POLL_INTERVAL_MS=5000
APP_LMS_FILES_WORKER_QUEUE_DRIVER=auto
APP_LMS_FILES_WORKER_REDIS_KEY_PREFIX=de100:lms:files
APP_LMS_FILES_WORKER_STALE_AFTER_MS=300000
```

Queue driver behavior:

- `auto`: use Redis when `REDIS_URL` is set, otherwise use DB polling
- `db`: always use DB polling
- `redis`: require `REDIS_URL`

Redis-backed queue example:

```env
APP_LMS_FILES_WORKER_QUEUE_DRIVER=redis
REDIS_URL=redis://127.0.0.1:6379
APP_LMS_FILES_WORKER_REDIS_KEY_PREFIX=de100:lms:files
```

## Processing Model

The worker takes a processing job from the queue, reloads the job and file records, then calls the LMS processing bridge. The bridge currently supports:

- upload-complete processing
- image `optimized` variant
- video `poster` variant
- audio `waveform` variant
- `video-hls` artifact-group generation
- `video-hls-encryption` artifact-group generation with AES-128 key artifacts

HLS processing is storage-first:

1. original file exists in storage
2. worker reads or stages the original
3. ffmpeg adapter writes HLS outputs into a staging prefix
4. output validation confirms required manifests, segments, poster, metadata, and optional key artifacts
5. worker promotes staging objects to the target prefix
6. app persists artifact groups and artifacts
7. cleanup removes staging outputs on success or failure

## FFmpeg And FFprobe

The core files packages do not depend on `ffmpeg` binaries. Video/audio processing requires an app-injected adapter or executable wrapper.

Recommended production policy:

- install `ffmpeg` and `ffprobe` in the worker image
- run one local worker by default for course-video HLS until CPU/memory evidence supports more
- keep `APP_LMS_FILES_WORKER_CONCURRENCY=1` for local/default course-video processing
- increase concurrency only after measuring CPU, memory, disk, and storage throughput
- keep temp/staging paths on a volume with enough free space for the largest configured source and generated HLS ladder

Do not use `fluent-ffmpeg` as the default wrapper because the project decision is to avoid deprecated defaults.

## Queue Strategy

Use Redis in production when available:

- lower DB polling load
- clearer job-claim semantics
- easier operational visibility for queue length

Use DB polling when:

- local development should stay simple
- Redis is unavailable
- the deployment is intentionally small/single-node

Both modes must keep job state in the database as the source of truth. The queue is a delivery mechanism, not the canonical processing record.

## Minimal Process Wrapper

The current package exports the loop primitive. A production process wrapper should own DB creation, queue adapter creation, signal handling, and logging.

Shape:

```ts
import { createDb } from "@de100/apps-lms-db";
import { createLmsFilesRepositories } from "@de100/apps-lms-api/files-repositories";
import {
	resolveLmsFilesWorkerConfigFromEnv,
	runLmsFilesWorkerLoop,
} from "@de100/apps-lms-worker";

const config = resolveLmsFilesWorkerConfigFromEnv();
const db = createDb();
const repositories = createLmsFilesRepositories(db);
const queue = createQueueAdapter(config, repositories);
const abort = new AbortController();

process.once("SIGINT", () => abort.abort());
process.once("SIGTERM", () => abort.abort());

await runLmsFilesWorkerLoop({
	db,
	pollIntervalMs: config.pollIntervalMs,
	queue,
	repositories,
	signal: abort.signal,
});
```

`createQueueAdapter` is app/deployment-owned. It should select the DB polling or Redis adapter from the worker package based on `config.queueDriver`.

## Operational Runbook

Before starting the worker:

1. Run database migrations.
2. Confirm storage credentials and buckets are available.
3. Confirm `ffmpeg`/`ffprobe` are installed or the adapter reports disabled paths clearly.
4. Confirm the worker has access to the same environment secrets as the web/API process.
5. Confirm the worker can read originals and write staging/promoted artifacts.

During processing:

- monitor job attempts, status, error payload, and output metadata
- monitor storage staging prefixes for abandoned outputs
- monitor worker CPU, memory, disk, and outbound storage bandwidth
- keep retries bounded

Failure policy:

- validation failures mark the job/file failed with structured error output
- adapter absence returns an explicit disabled/dependency error
- failed staging writes should be cleaned when possible
- incomplete multipart uploads should be aborted by the provider integration path

## Phase 12 Smoke Target

Phase 12 should add a real smoke run that:

1. starts Postgres, Redis, and MinIO
2. uploads a course video fixture
3. enqueues `video-hls`
4. enqueues `video-hls-encryption`
5. verifies persisted HLS artifact groups, manifests, segments, poster, metadata, and key artifacts
6. opens the course lesson route with headed Playwright or the VS Code browser when available

