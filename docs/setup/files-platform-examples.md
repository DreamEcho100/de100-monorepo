# Files Platform Examples

## Solid uploader

Use the Solid package for product forms that need route-aware validation, queue state, progress, pause/resume/retry/cancel, and upload-complete hooks.

```tsx
import { FileUploader } from "@de100/files-domains-solidjs/client";

export function CourseAssetUploader() {
	return (
		<FileUploader
			accept="image/*,video/*,audio/*,application/pdf,text/plain"
			labels={{
				browse: "Choose assets",
				dropzone: "Drop course files here",
				uploadAll: "Upload assets",
			}}
			metadata={{ source: "course-assets" }}
			onUploadComplete={(item) => {
				console.info("uploaded", item.record?.id);
			}}
			restrictions={{
				maxFileCount: 8,
				maxFileSizeBytes: 100 * 1024 * 1024,
			}}
			routeSlug="course-assets"
			visibility={() => "private"}
		/>
	);
}
```

For custom UI, create a controller and render your own controls:

```tsx
import { createFileUploaderController } from "@de100/files-domains-solidjs/client";

const controller = createFileUploaderController({
	routeSlug: "course-assets",
	visibility: "private",
});

controller.addFiles(Array.from(input.files ?? []));
await controller.uploadAll();
```

## Framework-neutral runtime

Use `@de100/files-client` outside Solid or when a page needs complete control over the UI.

```ts
import { createFilesClient, createFilesUploaderRuntime } from "@de100/files-client";

const client = createFilesClient({
	baseUrl: "/api/files",
});

const runtime = createFilesUploaderRuntime({
	client,
	onChange(items) {
		console.info(items.map((item) => [item.file.name, item.status, item.progress]));
	},
});

runtime.addFiles([file], {
	metadata: { source: "manual" },
	routeSlug: "course-assets",
	visibility: "private",
});

await runtime.uploadAll();
```

The default runtime uses `/api/files/upload-mode` to decide between `orpc-direct` and upload-target flows. Direct oRPC upload requires a `rpc.uploadDirect` adapter on the client. Fetch-backed upload target executors are provided for `xhr`, `s3-put`, and `custom`; Tus, S3 multipart, Companion, and Transloadit need configured services or app-provided executors.

## Server pipeline

Apps provide operations and storage, then run a pipeline when an upload completes.

```ts
import { createFilesPipeline, runFilesProcessingJob } from "@de100/files-server";

const pipeline = createFilesPipeline(
	[
		{
			name: "metadata",
			async run({ file }) {
				return {
					metadata: {
						contentType: file.contentType,
						fileKind: file.kind,
					},
				};
			},
		},
		{
			name: "variant",
			async run({ file }) {
				if (file.kind !== "image") {
					return {
						reason: "Only images have this example variant.",
						status: "skipped",
					};
				}

				return {
					variants: [
						{
							contentType: "image/webp",
							key: `variants/${file.id}/optimized.webp`,
							kind: "optimized",
							size: file.size,
						},
					],
				};
			},
		},
	],
	{
		retry: {
			maxAttempts: 2,
		},
	},
);

await runFilesProcessingJob({
	context,
	file,
	kind: "upload-complete",
	operations,
	pipeline,
});
```

The Proto Cook app uses this pattern in its concrete processing bridge. Current generated variants are image `optimized`, video `poster`, and audio `waveform`. Images use `sharp` when available and a source-copy fallback otherwise. Video and audio variants require an injected ffmpeg-shaped adapter.

## Course HLS player

Use `HlsVideoPlayer` for product course playback once the app has created a signed playback session and returned a playback source.

```tsx
import {
	HlsVideoPlayer,
	type HlsVideoPlayerQoeEvent,
} from "@de100/files-domains-solidjs/client";

export function CourseLessonVideo(props: {
	playback: {
		captionTracks: {
			default?: boolean;
			kind?: "captions" | "chapters" | "descriptions" | "metadata" | "subtitles";
			label: string;
			language: string;
			src: string;
		}[];
		masterManifestUrl: string;
		posterUrl: string | null;
	} | null;
	recordQoeEvent(event: HlsVideoPlayerQoeEvent): void;
}) {
	return (
		<HlsVideoPlayer
			captionTracks={props.playback?.captionTracks ?? []}
			onQoeEvent={props.recordQoeEvent}
			poster={props.playback?.posterUrl}
			src={props.playback?.masterManifestUrl}
		/>
	);
}
```

The Proto Cook lesson route uses the same package player for the recommended product path. Helper-only and external-adapter prototypes remain in the app as comparison paths.

## Encrypted HLS planning

AES-128 HLS is selected by route/job policy, not by the player. The video processing addon exposes the planning pieces used by the Proto Cook worker bridge:

```ts
import {
	createFilesVideoHlsAes128KeyInfoFile,
	createFilesVideoHlsAes128KeyObject,
	createFilesVideoHlsPlan,
	filesVideoDefaultHlsProcessingPreset,
} from "@de100/files-processing-video";

const plan = createFilesVideoHlsPlan({
	preset: {
		...filesVideoDefaultHlsProcessingPreset,
		playbackProtection: "aes-128",
	},
	sourceMetadata: { height: 1080, width: 1920 },
	stagingPrefix: `staging/${fileId}`,
	targetPrefix: `courses/${courseId}/${lessonId}/hls`,
});

const keyInfo = createFilesVideoHlsAes128KeyInfoFile(plan);
const keyObject = createFilesVideoHlsAes128KeyObject(plan);
```

The app is responsible for writing the key-info file for ffmpeg, persisting `keyObject`, and making sure playback sessions for the artifact group use protection mode `aes-128`.

## Proto Cook routes to exercise

- Product flow: `/en/files`
- Approach comparison: `/en/files-lab`
- Hybrid lab: `/en/files-lab/hybrid`
- HTTP-native lab: `/en/files-lab/http`
- Course-video lab: `/en/files-lab/course-video`
- Course lesson shell: `/en/courses/{courseSlug}/{chapterSlug}/{lessonSlug}`
- Public reads: `/api/files/public/[...key]`
- Private reads: `/api/files/private/[...key]`
- Signed reads: `/api/files/signed/[token]`
- Variant reads: `/api/files/{id}/variants/{variant}`
- Signed HLS playback: `/api/files/playback/hls/{token}/{path}`
- Upload control and compatibility: `/api/files/config`, `/api/files/upload-mode`, `/api/files/targets`, `/api/files/{fileId}/complete`, `/api/files/sessions/{sessionId}/abort`, `/api/files/upload/{protocol}/{sessionId}`
